import { apiError, apiJson, isValidPubkey, preflight, withinRateLimit } from '../shared';

export const dynamic = 'force-dynamic';

const JUPITER_PRICE_URL = 'https://lite-api.jup.ag/price/v3';
const CACHE_TTL_MS = 60_000;
const MAX_MINTS = 100;

const cache = new Map<string, { expiresAt: number; usdPrice: number | null }>();

type JupiterPrice = { usdPrice?: number };

/**
 * GET /api/v1/prices?mints=a,b,c
 *
 * USD prices for SPL mints, used to decide what counts as dust. A missing price
 * is returned as null rather than zero: "we do not know" and "worth nothing" are
 * very different answers when the next step is burning the token.
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
  const prices: Record<string, number | null> = {};
  const missing: string[] = [];
  for (const mint of mints) {
    const hit = cache.get(mint);
    if (hit && hit.expiresAt > now) prices[mint] = hit.usdPrice;
    else missing.push(mint);
  }

  if (missing.length) {
    try {
      const response = await fetch(`${JUPITER_PRICE_URL}?ids=${missing.join(',')}`, {
        headers: { accept: 'application/json' },
      });
      const payload = response.ok ? await response.json() as Record<string, JupiterPrice> : {};
      for (const mint of missing) {
        const usdPrice = typeof payload[mint]?.usdPrice === 'number' ? payload[mint].usdPrice as number : null;
        prices[mint] = usdPrice;
        if (cache.size > 2_000) cache.clear();
        cache.set(mint, { expiresAt: now + CACHE_TTL_MS, usdPrice });
      }
    } catch {
      // Upstream unavailable. Every unresolved mint stays null, which callers
      // must treat as unknown rather than worthless.
      for (const mint of missing) if (!(mint in prices)) prices[mint] = null;
    }
  }

  return apiJson({ prices, unknown: mints.filter(mint => prices[mint] === null) }, 200, 0, request);
}

export function OPTIONS() {
  return preflight();
}
