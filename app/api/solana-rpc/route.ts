const SOLANA_RPC_URL = 'https://public.rpc.solanavibestation.com';

const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getBlockHeight',
  'getLatestBlockhash',
  'getMinimumBalanceForRentExemption',
  'getRecentPrioritizationFees',
  'getSignatureStatuses',
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

  try {
    const upstream = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await upstream.text();
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
