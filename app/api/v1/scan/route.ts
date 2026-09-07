import {
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  apiError,
  apiJson,
  findReclaimable,
  isValidPubkey,
  preflight,
  withinRateLimit,
} from '../shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/scan?wallet=<address>
 *
 * Every token account the wallet owns that is funded above the current rent
 * floor, with the surplus that WithdrawExcessLamports would return. Read-only:
 * it signs nothing and moves nothing.
 */
export async function GET(request: Request) {
  if (!withinRateLimit(request)) return apiError('Too many requests. Try again shortly.', 429, request);

  const wallet = new URL(request.url).searchParams.get('wallet');
  if (!isValidPubkey(wallet)) {
    return apiError('Pass ?wallet= with a base58 Solana address.', 400, request);
  }

  try {
    const { scannedCount, accounts } = await findReclaimable(wallet);

    const totalExcessLamports = accounts.reduce((sum, account) => sum + account.excessLamports, 0);

    return apiJson({
      wallet,
      scannedAccounts: scannedCount,
      reclaimableAccounts: accounts.length,
      totalExcessLamports,
      totalExcessSol: totalExcessLamports / 1e9,
      legacyRentLamports: LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
      accounts,
    }, 200, 0, request);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Scan failed.', 502, request);
  }
}

export function OPTIONS() {
  return preflight();
}
