import {
  WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR,
  apiError,
  apiJson,
  base64Byte,
  findReclaimable,
  isValidPubkey,
  preflight,
  withinRateLimit,
} from '../shared';

export const dynamic = 'force-dynamic';

const TOKEN_PROGRAM_IDS = {
  token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'token-2022': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
} as const;

// Roughly what fits in one transaction alongside a compute-budget prefix.
const DEFAULT_BATCH_SIZE = 12;

/**
 * GET /api/v1/withdraw-instructions?wallet=<address>
 *
 * Ready-to-sign WithdrawExcessLamports instructions for every overfunded
 * account the wallet owns. Nothing is signed or submitted here, and no key is
 * required to call it.
 *
 * The response is shaped to match the instruction format other reclaim APIs
 * already return, so an integration can be pointed here without being rewritten.
 */
export async function GET(request: Request) {
  if (!withinRateLimit(request)) return apiError('Too many requests. Try again shortly.', 429, request);

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  if (!isValidPubkey(wallet)) {
    return apiError('Pass ?wallet= with a base58 Solana address.', 400, request);
  }

  const rawBatch = Number(url.searchParams.get('batchSize') ?? DEFAULT_BATCH_SIZE);
  const batchSize = Number.isInteger(rawBatch) && rawBatch >= 1 && rawBatch <= 25 ? rawBatch : DEFAULT_BATCH_SIZE;

  try {
    const { scannedCount, accounts } = await findReclaimable(wallet);

    const instructions = accounts.map(account => ({
      programId: TOKEN_PROGRAM_IDS[account.program],
      accounts: [
        { pubkey: account.address, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: false, isWritable: true },
        { pubkey: wallet, isSigner: true, isWritable: false },
      ],
      data: base64Byte(WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR),
      lamportsReclaimed: account.excessLamports,
      sourceAccount: account.address,
      mint: account.mint,
    }));

    const groups: (typeof instructions)[] = [];
    for (let index = 0; index < instructions.length; index += batchSize) {
      groups.push(instructions.slice(index, index + batchSize));
    }

    const lamportsReclaimed = accounts.reduce((sum, account) => sum + account.excessLamports, 0);

    return apiJson({
      userPublicKey: wallet,
      instructionType: 'withdrawExcessLamports',
      // The account survives and keeps its tokens. Nothing is burned or deleted.
      isDestructiveAction: false,
      scannedAccounts: scannedCount,
      reclaimableAccounts: accounts.length,
      lamportsReclaimed,
      solanaReclaimed: lamportsReclaimed / 1e9,
      batchSize,
      instructionGroups: groups,
      instructions,
      notes: 'Sign and send with the wallet owner as fee payer. No API key is required to call this endpoint.',
    }, 200, 0, request);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Instruction build failed.', 502, request);
  }
}

export function OPTIONS() {
  return preflight();
}
