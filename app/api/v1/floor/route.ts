import {
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  TOKEN_ACCOUNT_SPACE,
  apiError,
  apiJson,
  preflight,
  rpc,
  withinRateLimit,
} from '../shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/floor?space=165
 *
 * The live rent-exempt minimum for an account of that size, read from mainnet
 * rather than hard-coded, plus the surplus still sitting in one funded at the
 * original schedule. Cacheable: it only moves when a SIMD-0437 gate activates.
 */
export async function GET(request: Request) {
  if (!withinRateLimit(request)) return apiError('Too many requests. Try again shortly.', 429);

  const raw = new URL(request.url).searchParams.get('space');
  const space = raw === null ? TOKEN_ACCOUNT_SPACE : Number(raw);
  if (!Number.isInteger(space) || space < 0 || space > 10_485_760) {
    return apiError('space must be a whole number of bytes between 0 and 10485760.', 400);
  }

  try {
    const rentFloorLamports = await rpc<number>('getMinimumBalanceForRentExemption', [space, { commitment: 'confirmed' }]);
    // Rent is (128 + data_len) * lamports_per_byte, so the rate falls out of the floor.
    const lamportsPerByte = rentFloorLamports / (128 + space);
    const surplusLamports = space === TOKEN_ACCOUNT_SPACE
      ? Math.max(0, LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - rentFloorLamports)
      : null;

    return apiJson({
      space,
      rentFloorLamports,
      rentFloorSol: rentFloorLamports / 1e9,
      lamportsPerByte,
      legacyRentLamports: space === TOKEN_ACCOUNT_SPACE ? LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS : null,
      surplusPerAccountLamports: surplusLamports,
    }, 200, 300);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Floor lookup failed.', 502);
  }
}

export function OPTIONS() {
  return preflight();
}
