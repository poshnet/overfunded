import {
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  apiError,
  apiJson,
  isValidPubkey,
  preflight,
  rpc,
  withinRateLimit,
} from '../shared';

export const dynamic = 'force-dynamic';

type ParsedTokenAccount = {
  pubkey: string;
  account: {
    lamports: number;
    data: { parsed?: { info?: { mint?: string; owner?: string; isNative?: boolean } }; space?: number };
  };
};

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
        dataLength: entry.account.data.space ?? 165,
        lamports: entry.account.lamports,
        mint: info.mint,
        program,
      }];
    });

    // One floor lookup per distinct account size rather than per account.
    const sizes = [...new Set(candidates.map(candidate => candidate.dataLength))];
    const floors = new Map(await Promise.all(sizes.map(async size =>
      [size, await rpc<number>('getMinimumBalanceForRentExemption', [size, { commitment: 'confirmed' }])] as const,
    )));

    const accounts = candidates.flatMap(candidate => {
      const rentFloorLamports = floors.get(candidate.dataLength) ?? candidate.lamports;
      const excessLamports = candidate.lamports - rentFloorLamports;
      if (excessLamports <= 0) return [];
      return [{ ...candidate, rentFloorLamports, excessLamports }];
    }).sort((a, b) => b.excessLamports - a.excessLamports);

    const totalExcessLamports = accounts.reduce((sum, account) => sum + account.excessLamports, 0);

    return apiJson({
      wallet,
      scannedAccounts: candidates.length,
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
