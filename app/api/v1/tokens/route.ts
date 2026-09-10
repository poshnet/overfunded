import { apiError, apiJson, isValidPubkey, preflight, withinRateLimit } from '../shared';

export const dynamic = 'force-dynamic';

const JUPITER_SEARCH_URL = 'https://lite-api.jup.ag/tokens/v2/search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_MINTS = 60;

export type TokenMeta = { symbol: string; name: string; icon: string | null };

const cache = new Map<string, { expiresAt: number; meta: TokenMeta | null }>();

type JupiterToken = { id?: string; symbol?: string; name?: string; icon?: string };

/**
 * GET /api/v1/tokens?mints=a,b,c
 *
 * Symbol, name and logo for SPL mints. Cached for hours because token metadata
 * barely moves, and a null result is cached too — most mints in a cluttered
 * wallet are unlisted junk, and re-asking about them on every scan would spend
 * the whole rate limit on tokens that will never have a logo.
 */
export async function GET(request: Request) {
  if (!withinRateLimit(request)) return apiError('Too many requests. Try again shortly.', 429, request);

  const raw = new URL(request.url).searchParams.get('mints') || '';
  const mints = [...new Set(raw.split(',').map(mint => mint.trim()).filter(Boolean))];
  if (!mints.length) return apiError('Pass ?mints= with comma-separated mint addresses.', 400, request);
  if (mints.length > MAX_MINTS) return apiError(`At most ${MAX_MINTS} mints per request.`, 400, request);
  if (mints.some(mint => !isValidPubkey(mint))) {
    return apiError('Every mint must be a base58 address.', 400, request);
  }

  const now = Date.now();
  const tokens: Record<string, TokenMeta | null> = {};
  const missing: string[] = [];
  for (const mint of mints) {
    const hit = cache.get(mint);
    if (hit && hit.expiresAt > now) tokens[mint] = hit.meta;
    else missing.push(mint);
  }

  if (missing.length) {
    try {
      const response = await fetch(`${JUPITER_SEARCH_URL}?query=${missing.join(',')}`, {
        headers: { accept: 'application/json' },
      });
      const payload = response.ok ? await response.json() as JupiterToken[] : [];
      const found = new Map(payload.filter(token => token.id).map(token => [token.id as string, token]));
      for (const mint of missing) {
        const token = found.get(mint);
        const meta: TokenMeta | null = token
          ? { symbol: token.symbol || '', name: token.name || '', icon: token.icon || null }
          : null;
        tokens[mint] = meta;
        if (cache.size > 3_000) cache.clear();
        cache.set(mint, { expiresAt: now + CACHE_TTL_MS, meta });
      }
    } catch {
      // Upstream down. Unresolved mints stay null and the UI falls back to its
      // generated chip, which is why that fallback is never removed.
      for (const mint of missing) if (!(mint in tokens)) tokens[mint] = null;
    }
  }

  return apiJson({ tokens }, 200, 600, request);
}

export function OPTIONS() {
  return preflight();
}
