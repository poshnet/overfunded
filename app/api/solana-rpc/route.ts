/**
 * Upstream Solana RPC. Set SOLANA_RPC_URL as a Worker secret to point this at
 * a paid provider — the public fallback rate-limits under any real traffic:
 *
 *   npx wrangler secret put SOLANA_RPC_URL
 *
 * Read per request rather than at module load so a rotated secret takes effect
 * without a redeploy.
 */
// Verified reachable and willing to serve jsonParsed getTokenAccountsByOwner.
// Both throttle hard — they are a safety net, never a plan.
const PUBLIC_FALLBACK_RPCS = [
  'https://public.rpc.solanavibestation.com',
  'https://api.mainnet-beta.solana.com',
];

function upstreamPool(): string[] {
  const configured = process.env.SOLANA_RPC_URL?.trim();
  if (!configured) return PUBLIC_FALLBACK_RPCS;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:') return PUBLIC_FALLBACK_RPCS;
    // The paid provider is tried first; the public endpoints only catch its
    // failures rather than sharing the load.
    return [url.toString(), ...PUBLIC_FALLBACK_RPCS];
  } catch {
    return PUBLIC_FALLBACK_RPCS;
  }
}

/**
 * Answers that are the same for every visitor: the rent floor for a given
 * account size, and the treasury's balance and signature history. Uncached,
 * a hundred people opening the page at once becomes a few hundred upstream
 * calls for three distinct answers, which is precisely what a free RPC rejects.
 *
 * Nothing wallet-specific is cached. Account reads taken immediately before
 * signing must stay live, so getAccountInfo and getTokenAccountsByOwner are
 * deliberately absent.
 */
const SHARED_METHOD_TTL_MS: Record<string, number> = {
  getMinimumBalanceForRentExemption: 300_000,
  getSignaturesForAddress: 60_000,
  getBalance: 30_000,
};
const SHARED_CACHE_MAX_ENTRIES = 500;
const sharedCache = new Map<string, { expiresAt: number; result: unknown }>();

function cacheKeyFor(item: RpcRequest) {
  const method = item?.method;
  if (typeof method !== 'string' || !(method in SHARED_METHOD_TTL_MS)) return null;
  return { key: `${method}:${JSON.stringify(item.params ?? [])}`, ttl: SHARED_METHOD_TTL_MS[method] };
}

/**
 * Tries each endpoint in turn. A 429 or a 5xx means that provider is refusing
 * us rather than that the request is wrong, so the next one gets a chance;
 * any other 4xx is the caller's fault and is returned as-is.
 */
async function fetchUpstream(body: string): Promise<Response | null> {
  let lastRefusal: Response | null = null;
  for (const endpoint of upstreamPool()) {
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body,
      });
      if (upstream.ok) return upstream;
      if (upstream.status !== 429 && upstream.status < 500) return upstream;
      lastRefusal = upstream;
    } catch {
      // Network failure against this endpoint; fall through to the next.
    }
  }
  return lastRefusal;
}

const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getBalance',
  'getBlockHeight',
  'getLatestBlockhash',
  'getMinimumBalanceForRentExemption',
  'getRecentPrioritizationFees',
  'getSignatureStatuses',
  'getSignaturesForAddress',
  'getTokenAccountsByOwner',
  'sendTransaction',
  'simulateTransaction',
]);

// Soft per-IP throttle. Workers isolates are not shared state, so this caps a
// single isolate rather than the whole deployment, but it is enough to stop one
// client from turning the relay into a free public RPC endpoint.
// Sized for the worst honest case, not the average one: a wallet with dozens of
// accounts spends ~2 calls per account on freshness checks plus ~2/second per
// batch while confirming, and shared office/NAT addresses stack on one bucket.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 600;
const RATE_LIMIT_MAX_TRACKED_CLIENTS = 5_000;
const requestTimestamps = new Map<string, number[]>();

type RpcRequest = {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
};

function errorResponse(id: RpcRequest['id'], code: number, message: string, status = 400) {
  return Response.json({ jsonrpc: '2.0', error: { code, message }, id: id ?? null }, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

// Browsers attach Origin to every cross-site POST, so a mismatch is a request
// this site did not make. Non-browser callers send none and fall through to the
// rate limit instead.
function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function isWithinRateLimit(request: Request) {
  const client = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
  const now = Date.now();

  if (requestTimestamps.size > RATE_LIMIT_MAX_TRACKED_CLIENTS) requestTimestamps.clear();

  const recent = (requestTimestamps.get(client) ?? []).filter(at => now - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestamps.set(client, recent);
    return false;
  }

  recent.push(now);
  requestTimestamps.set(client, recent);
  return true;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return errorResponse(null, -32600, 'This relay only serves requests from the site itself.', 403);
  }
  if (!isWithinRateLimit(request)) {
    return errorResponse(null, -32005, 'Too many RPC requests. Slow down and try again shortly.', 429);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1_000_000) return errorResponse(null, -32600, 'RPC request is too large.', 413);

  let payload: RpcRequest | RpcRequest[];
  try {
    payload = await request.json() as RpcRequest | RpcRequest[];
  } catch {
    return errorResponse(null, -32700, 'Invalid JSON.');
  }

  const requests = Array.isArray(payload) ? payload : [payload];
  if (requests.length === 0 || requests.length > 20) {
    return errorResponse(null, -32600, 'Invalid RPC batch size.');
  }

  const rejected = requests.find(item => (
    item?.jsonrpc !== '2.0' || typeof item.method !== 'string' || !ALLOWED_METHODS.has(item.method)
  ));
  if (rejected) return errorResponse(rejected.id, -32601, 'RPC method is not available through this relay.');

  // Shared-answer reads are served from memory where possible. This is what
  // stops a traffic spike becoming one upstream call per visitor.
  const single = Array.isArray(payload) ? null : payload;
  const cacheable = single ? cacheKeyFor(single) : null;
  if (cacheable) {
    const hit = sharedCache.get(cacheable.key);
    if (hit && hit.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ jsonrpc: '2.0', result: hit.result, id: single?.id ?? null }), {
        headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
      });
    }
  }

  try {
    const upstream = await fetchUpstream(JSON.stringify(payload));
    if (!upstream) {
      return errorResponse(null, -32000, 'Solana RPC is temporarily unavailable.', 502);
    }

    const body = await upstream.text();

    if (cacheable && upstream.ok) {
      try {
        const parsed = JSON.parse(body) as { result?: unknown; error?: unknown };
        if (parsed && parsed.error === undefined && parsed.result !== undefined) {
          if (sharedCache.size > SHARED_CACHE_MAX_ENTRIES) sharedCache.clear();
          sharedCache.set(cacheable.key, { expiresAt: Date.now() + cacheable.ttl, result: parsed.result });
        }
      } catch {
        // A success body we cannot parse is passed through, just never cached.
      }
    }

    return new Response(body, {
      status: upstream.status,
      headers: {
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch {
    return errorResponse(null, -32000, 'Solana RPC is temporarily unavailable.', 502);
  }
}
