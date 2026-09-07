/**
 * Public read-only API.
 *
 * Unlike /api/solana-rpc, which is locked to this site's own origin, these
 * endpoints exist to be called from other people's software: CORS is open,
 * throttling is per-IP, and the responses are plain JSON rather than raw RPC.
 *
 * Nothing here imports the browser reclaim module — that builds a Connection
 * against a relative URL, which throws outside a browser — so the handful of
 * constants it needs are restated below.
 */

/** Token accounts are 165 bytes and were funded to this under the original schedule. */
export const TOKEN_ACCOUNT_SPACE = 165;
export const LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

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
    return [url.toString(), ...PUBLIC_FALLBACK_RPCS];
  } catch {
    return PUBLIC_FALLBACK_RPCS;
  }
}

/** Base58, 32 bytes. Rejects the empty string and anything with 0, O, I or l. */
export function isValidPubkey(value: string | null): value is string {
  return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
  let lastError = 'Solana RPC is unavailable.';
  for (const endpoint of upstreamPool()) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body,
      });
      if (!response.ok) {
        // 429 and 5xx mean this provider is refusing us, not that we asked wrongly.
        if (response.status !== 429 && response.status < 500) {
          lastError = `Upstream rejected the request (${response.status}).`;
          break;
        }
        continue;
      }
      const payload = await response.json() as { result?: T; error?: { message?: string } };
      if (payload.error) {
        lastError = payload.error.message || 'Solana RPC returned an error.';
        break;
      }
      if (payload.result !== undefined) return payload.result;
    } catch {
      // Try the next endpoint.
    }
  }
  throw new Error(lastError);
}

// Per-IP throttle. Workers isolates do not share memory, so this caps one
// isolate rather than the deployment, which is enough to stop a single caller
// turning a free endpoint into their own indexer.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const seen = new Map<string, number[]>();

export function withinRateLimit(request: Request) {
  const client = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const now = Date.now();
  if (seen.size > 5_000) seen.clear();
  const recent = (seen.get(client) ?? []).filter(at => now - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  seen.set(client, recent);
  return true;
}

export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

/**
 * Indented output is for people, not programs. A browser opening the URL gets
 * something readable; anything else gets the compact form, which on a wallet
 * with a few thousand accounts is around 30% less to transfer.
 */
function wantsPretty(request?: Request) {
  if (!request) return false;
  const url = new URL(request.url);
  const flag = url.searchParams.get('pretty');
  if (flag !== null) return flag !== '0' && flag !== 'false';
  return (request.headers.get('accept') || '').includes('text/html');
}

export function apiJson(body: unknown, status = 200, cacheSeconds = 0, request?: Request) {
  const pretty = wantsPretty(request);
  return new Response(pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json',
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  });
}

export function apiError(message: string, status: number, request?: Request) {
  return apiJson({ error: message }, status, 0, request);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export type ReclaimableAccount = {
  address: string;
  dataLength: number;
  lamports: number;
  mint: string;
  program: 'token' | 'token-2022';
  rentFloorLamports: number;
  excessLamports: number;
};

type ParsedTokenAccount = {
  pubkey: string;
  account: {
    lamports: number;
    data: { parsed?: { info?: { mint?: string; owner?: string; isNative?: boolean } }; space?: number };
  };
};

/**
 * Every token account the wallet owns that sits above the current rent floor.
 * Shared by the scan and instruction endpoints so they can never disagree about
 * what is reclaimable.
 */
export async function findReclaimable(wallet: string) {
  const [legacy, token2022] = await Promise.all([
    rpc<{ value: ParsedTokenAccount[] }>('getTokenAccountsByOwner',
      [wallet, { programId: TOKEN_PROGRAM_ID }, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
    rpc<{ value: ParsedTokenAccount[] }>('getTokenAccountsByOwner',
      [wallet, { programId: TOKEN_2022_PROGRAM_ID }, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
  ]);

  const candidates = [
    ...legacy.value.map(entry => ({ entry, program: 'token' as const })),
    ...token2022.value.map(entry => ({ entry, program: 'token-2022' as const })),
  ].flatMap(({ entry, program }) => {
    const info = entry.account.data.parsed?.info;
    // Wrapped SOL is excluded: its lamports are the token balance, not rent.
    if (!info?.mint || info.owner !== wallet || info.isNative) return [];
    return [{
      address: entry.pubkey,
      dataLength: entry.account.data.space ?? TOKEN_ACCOUNT_SPACE,
      lamports: entry.account.lamports,
      mint: info.mint,
      program,
    }];
  });

  const sizes = [...new Set(candidates.map(candidate => candidate.dataLength))];
  const floors = new Map(await Promise.all(sizes.map(async size =>
    [size, await rpc<number>('getMinimumBalanceForRentExemption', [size, { commitment: 'confirmed' }])] as const,
  )));

  const accounts: ReclaimableAccount[] = candidates.flatMap(candidate => {
    const rentFloorLamports = floors.get(candidate.dataLength) ?? candidate.lamports;
    const excessLamports = candidate.lamports - rentFloorLamports;
    if (excessLamports <= 0) return [];
    return [{ ...candidate, rentFloorLamports, excessLamports }];
  }).sort((a, b) => b.excessLamports - a.excessLamports);

  return { scannedCount: candidates.length, accounts };
}

/** WithdrawExcessLamports is opcode 38 on both token programs. */
export const WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR = 38;

export function base64Byte(value: number) {
  return btoa(String.fromCharCode(value));
}
