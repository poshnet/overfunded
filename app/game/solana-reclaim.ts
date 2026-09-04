import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type ParsedAccountData,
} from '@solana/web3.js';
import { WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR as TOKEN_WITHDRAW_DISCRIMINATOR } from '@solana-program/token';
import { WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR as TOKEN_2022_WITHDRAW_DISCRIMINATOR } from '@solana-program/token-2022';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const TREASURY_ADDRESS = '1Jpbzs17ihaezC18SaoBtJKMjoNx4ekjGKNDYs6NczM';
export const SERVICE_FEE_PERCENT = 5;
export const SERVICE_FEE_CAP_LAMPORTS = 50_000_000;
const TREASURY_PUBLIC_KEY = new PublicKey(TREASURY_ADDRESS);
const SERVICE_FEE_BASIS_POINTS = SERVICE_FEE_PERCENT * 100;
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (
  typeof window === 'undefined'
    ? 'http://localhost:3000/api/solana-rpc'
    : `${window.location.origin}/api/solana-rpc`
);
const ACCOUNTS_PER_TRANSACTION = 6;

// Rent-floor reference. Token accounts are 165 bytes and were funded to
// 2_039_280 lamports under the original rent schedule; the live floor is read
// from the cluster so the site never hard-codes a reduction it cannot prove.
export const TOKEN_ACCOUNT_SPACE = 165;
export const LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

// Rent is (128 + data_len) * lamports_per_byte. SIMD-0437 steps that rate down
// in five gated stages from the legacy 6,960 to 696 — a 90% cut once all five
// activate. Stage rates below are the published schedule; which of them are
// actually live is never assumed, it is derived from the cluster's own floor.
export const RENT_ACCOUNT_OVERHEAD_BYTES = 128;
export const LEGACY_LAMPORTS_PER_BYTE = 6_960;
export const RENT_STAGES = [
  { id: 'SIMD-0437-1', lamportsPerByte: 6_333 },
  { id: 'SIMD-0437-2', lamportsPerByte: 5_080 },
  { id: 'SIMD-0437-3', lamportsPerByte: 2_575 },
  { id: 'SIMD-0437-4', lamportsPerByte: 1_322 },
  { id: 'SIMD-0437-5', lamportsPerByte: 696 },
] as const;

export function rentFloorFor(space: number, lamportsPerByte: number) {
  return (RENT_ACCOUNT_OVERHEAD_BYTES + space) * lamportsPerByte;
}

export function stageReductionPercent(lamportsPerByte: number) {
  return Math.round((1 - lamportsPerByte / LEGACY_LAMPORTS_PER_BYTE) * 100);
}

export function lamportsPerByteFromFloor(floorLamports: number, space = TOKEN_ACCOUNT_SPACE) {
  return floorLamports / (RENT_ACCOUNT_OVERHEAD_BYTES + space);
}

/** Index of the last activated stage, or -1 while the cluster is still at the legacy rate. */
export function activeStageIndex(floorLamports: number, space = TOKEN_ACCOUNT_SPACE) {
  const rate = Math.round(lamportsPerByteFromFloor(floorLamports, space));
  let index = -1;
  RENT_STAGES.forEach((stage, position) => {
    if (rate <= stage.lamportsPerByte) index = position;
  });
  return index;
}

// Fee model. One signature per transaction plus a priority fee derived from the
// compute budget we request, so the quoted network cost matches what is sent.
const BASE_SIGNATURE_FEE_LAMPORTS = 5_000;
const COMPUTE_UNIT_MARGIN = 12_000;
const COMPUTE_UNITS_PER_ACCOUNT = 15_000;
const DEFAULT_PRIORITY_MICRO_LAMPORTS = 20_000;
const MAX_PRIORITY_MICRO_LAMPORTS = 100_000;

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

function computeUnitLimitFor(accountCount: number) {
  return COMPUTE_UNIT_MARGIN + accountCount * COMPUTE_UNITS_PER_ACCOUNT;
}

function priorityFeeLamports(accountCount: number, microLamportsPerUnit: number) {
  return Math.ceil((computeUnitLimitFor(accountCount) * microLamportsPerUnit) / 1_000_000);
}

async function getPriorityMicroLamports() {
  try {
    const recent = await connection.getRecentPrioritizationFees();
    const fees = recent.map(entry => entry.prioritizationFee).filter(fee => fee > 0).sort((a, b) => a - b);
    if (fees.length === 0) return DEFAULT_PRIORITY_MICRO_LAMPORTS;
    const median = fees[Math.floor(fees.length / 2)];
    return Math.min(Math.max(median, DEFAULT_PRIORITY_MICRO_LAMPORTS), MAX_PRIORITY_MICRO_LAMPORTS);
  } catch {
    return DEFAULT_PRIORITY_MICRO_LAMPORTS;
  }
}

async function confirmSignature(signature: string, lastValidBlockHeight: number) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const [statuses, blockHeight] = await Promise.all([
      connection.getSignatureStatuses([signature], { searchTransactionHistory: true }),
      connection.getBlockHeight('confirmed'),
    ]);
    const status = statuses.value[0];
    if (status?.err) throw new Error(`Transaction ${shortenAddress(signature, 7)} failed on-chain.`);
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return;
    if (blockHeight > lastValidBlockHeight) {
      throw new Error(`Transaction ${shortenAddress(signature, 7)} expired before confirmation.`);
    }
    await wait(1_000);
  }
  throw new Error(`Transaction ${shortenAddress(signature, 7)} is still pending. Check it on Solscan.`);
}

export type WalletProvider = {
  isConnected?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string } | string>;
};

type WalletWindow = Window & {
  solana?: WalletProvider;
  phantom?: { solana?: WalletProvider };
  solflare?: WalletProvider;
};

export type ReclaimableAccount = {
  address: string;
  dataLength: number;
  excessLamports: number;
  mint: string;
  program: 'token' | 'token-2022';
  rentFloorLamports: number;
  selected: boolean;
};

export type ReclaimOutcome = {
  completedBatches: number;
  serviceFeeWaived: boolean;
  error: string | null;
  recoveredLamports: number;
  serviceFeeLamports: number;
  signatures: string[];
  totalBatches: number;
};

type ParsedTokenInfo = {
  isNative?: boolean;
  mint?: string;
  owner?: string;
};

export function getWalletProvider(): WalletProvider | null {
  if (typeof window === 'undefined') return null;
  const walletWindow = window as WalletWindow;
  return walletWindow.phantom?.solana || walletWindow.solana || walletWindow.solflare || null;
}

export function shortenAddress(value: string, size = 4) {
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function formatSol(lamports: number, maximumFractionDigits = 6) {
  return (lamports / 1_000_000_000).toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: Math.min(4, maximumFractionDigits),
  });
}

export function estimatedNetworkFeeLamports(accountCount: number) {
  const batches = Math.ceil(accountCount / ACCOUNTS_PER_TRANSACTION);
  let total = 0;
  for (let index = 0; index < batches; index += 1) {
    const accountsInBatch = Math.min(ACCOUNTS_PER_TRANSACTION, accountCount - index * ACCOUNTS_PER_TRANSACTION);
    total += BASE_SIGNATURE_FEE_LAMPORTS + priorityFeeLamports(accountsInBatch, DEFAULT_PRIORITY_MICRO_LAMPORTS);
  }
  return total;
}

export function calculateServiceFeeLamports(grossLamports: number) {
  return Math.min(
    Math.floor((grossLamports * SERVICE_FEE_BASIS_POINTS) / 10_000),
    SERVICE_FEE_CAP_LAMPORTS,
  );
}

export function getCurrentRentFloorLamports(space = TOKEN_ACCOUNT_SPACE) {
  return connection.getMinimumBalanceForRentExemption(space, 'confirmed');
}

export type WalletScan = {
  accounts: ReclaimableAccount[];
  scannedCount: number;
};

export async function scanReclaimableAccounts(owner: PublicKey): Promise<WalletScan> {
  const [legacyResponse, token2022Response] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed'),
  ]);

  const candidates = [
    ...legacyResponse.value.map(entry => ({ entry, program: 'token' as const })),
    ...token2022Response.value.map(entry => ({ entry, program: 'token-2022' as const })),
  ].flatMap(({ entry, program }) => {
    const data = entry.account.data as ParsedAccountData;
    const info = data.parsed?.info as ParsedTokenInfo | undefined;
    if (!info?.mint || info.owner !== owner.toBase58() || info.isNative) return [];
    return [{
      address: entry.pubkey.toBase58(),
      dataLength: data.space,
      lamports: entry.account.lamports,
      mint: info.mint,
      program,
    }];
  });

  const dataLengths = [...new Set(candidates.map(candidate => candidate.dataLength))];
  const rentEntries = await Promise.all(dataLengths.map(async dataLength => (
    [dataLength, await connection.getMinimumBalanceForRentExemption(dataLength, 'confirmed')] as const
  )));
  const rentByLength = new Map(rentEntries);

  const accounts = candidates.flatMap(candidate => {
    const rentFloorLamports = rentByLength.get(candidate.dataLength) ?? candidate.lamports;
    const excessLamports = candidate.lamports - rentFloorLamports;
    if (excessLamports <= 0) return [];
    return [{
      address: candidate.address,
      dataLength: candidate.dataLength,
      excessLamports,
      mint: candidate.mint,
      program: candidate.program,
      rentFloorLamports,
      selected: true,
    }];
  }).sort((a, b) => b.excessLamports - a.excessLamports);

  // scannedCount is every supported token account examined, so an empty result
  // can say what was actually checked instead of just showing nothing.
  return { accounts, scannedCount: candidates.length };
}

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => (
    items.slice(index * size, index * size + size)
  ));
}

async function getFreshInstruction(account: ReclaimableAccount, authority: PublicKey) {
  const source = new PublicKey(account.address);
  const expectedProgram = account.program === 'token' ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
  const freshAccount = await connection.getAccountInfo(source, 'confirmed');

  if (!freshAccount || !freshAccount.owner.equals(expectedProgram)) {
    throw new Error(`${shortenAddress(account.address)} is no longer owned by the expected Token Program.`);
  }
  if (freshAccount.data.length < 165) {
    throw new Error(`${shortenAddress(account.address)} is not a supported token account.`);
  }

  const currentAuthority = new PublicKey(freshAccount.data.subarray(32, 64));
  if (!currentAuthority.equals(authority)) {
    throw new Error(`Wallet authority changed for ${shortenAddress(account.address)}.`);
  }

  const isNativeOption = freshAccount.data.readUInt32LE(109);
  if (isNativeOption !== 0) {
    throw new Error(`Wrapped SOL account ${shortenAddress(account.address)} was skipped.`);
  }

  const currentFloor = await connection.getMinimumBalanceForRentExemption(freshAccount.data.length, 'confirmed');
  if (freshAccount.lamports <= currentFloor) return null;

  const discriminator = account.program === 'token'
    ? TOKEN_WITHDRAW_DISCRIMINATOR
    : TOKEN_2022_WITHDRAW_DISCRIMINATOR;

  return {
    excessLamports: freshAccount.lamports - currentFloor,
    instruction: new TransactionInstruction({
      programId: expectedProgram,
      keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      data: new Uint8Array([discriminator]) as unknown as Buffer,
    }),
  };
}

/**
 * Smallest fee transfer the treasury can legally receive.
 *
 * Solana rejects any transaction that leaves a newly created account holding
 * less than the rent-exempt minimum (InsufficientFundsForRent). If the treasury
 * has never been funded it does not exist on-chain yet, so a small fee transfer
 * would fail the user's entire reclaim along with it. Once the account holds
 * lamports, any amount is fine.
 */
async function minimumTreasuryTransferLamports() {
  try {
    const treasury = await connection.getAccountInfo(TREASURY_PUBLIC_KEY, 'confirmed');
    if (treasury && treasury.lamports > 0) return 1;
    return await connection.getMinimumBalanceForRentExemption(0, 'confirmed');
  } catch {
    return await connection.getMinimumBalanceForRentExemption(0, 'confirmed');
  }
}

// Simulate before the wallet prompt so an unsupported program build or an
// underfunded fee payer fails without costing the user a signature. A relay or
// RPC that cannot simulate degrades to the send-time preflight instead.
async function assertBatchSimulates(transaction: Transaction) {
  let logs: string[] = [];
  let simulationError: unknown;
  try {
    const simulation = await connection.simulateTransaction(transaction.compileMessage());
    simulationError = simulation.value.err;
    logs = simulation.value.logs ?? [];
  } catch {
    return;
  }
  if (!simulationError) return;

  const unsupportedInstruction = logs.some(line => (
    /invalid instruction data|InvalidInstructionData|not supported|unknown instruction/i.test(line)
  ));
  if (unsupportedInstruction) {
    throw new Error(
      'The Token Program deployed on this cluster does not support WithdrawExcessLamports yet, so nothing was signed.',
    );
  }
  throw new Error(`Simulation failed before signing: ${JSON.stringify(simulationError)}. Nothing was signed.`);
}

/**
 * Reclaims in batches and always reports what actually landed. A failure part
 * way through returns the confirmed signatures and charged fees alongside the
 * error instead of throwing them away, because earlier batches are already
 * on-chain and the user has already paid for them.
 */
export async function reclaimAccounts(
  provider: WalletProvider,
  owner: PublicKey,
  accounts: ReclaimableAccount[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ReclaimOutcome> {
  const signatures: string[] = [];
  const batches = chunk(accounts, ACCOUNTS_PER_TRANSACTION);
  const [priorityMicroLamports, minimumFeeTransfer] = await Promise.all([
    getPriorityMicroLamports(),
    minimumTreasuryTransferLamports(),
  ]);
  let recoveredLamports = 0;
  let serviceFeeLamports = 0;
  let completedBatches = 0;
  let serviceFeeWaived = false;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    try {
      const freshAccounts = (await Promise.all(
        batches[batchIndex].map(account => getFreshInstruction(account, owner)),
      )).filter((result): result is NonNullable<typeof result> => result !== null);

      if (freshAccounts.length === 0) {
        completedBatches += 1;
        onProgress?.(completedBatches, batches.length);
        continue;
      }

      const batchRecoveredLamports = freshAccounts.reduce((sum, account) => sum + account.excessLamports, 0);
      const remainingFeeCap = SERVICE_FEE_CAP_LAMPORTS - serviceFeeLamports;
      const chargeableFeeLamports = Math.min(
        Math.floor((batchRecoveredLamports * SERVICE_FEE_BASIS_POINTS) / 10_000),
        remainingFeeCap,
      );
      // Never fail a user's reclaim to collect our own fee.
      const batchServiceFeeLamports = chargeableFeeLamports >= minimumFeeTransfer ? chargeableFeeLamports : 0;
      if (chargeableFeeLamports > 0 && batchServiceFeeLamports === 0) serviceFeeWaived = true;

      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        feePayer: owner,
        recentBlockhash: latestBlockhash.blockhash,
      }).add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimitFor(freshAccounts.length) }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }),
        ...freshAccounts.map(account => account.instruction),
      );

      if (batchServiceFeeLamports > 0) {
        transaction.add(SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: TREASURY_PUBLIC_KEY,
          lamports: batchServiceFeeLamports,
        }));
      }

      await assertBatchSimulates(transaction);

      let signature: string;
      if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize(), {
          maxRetries: 3,
          skipPreflight: false,
        });
      } else if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(transaction);
        signature = typeof result === 'string' ? result : result.signature;
      } else {
        throw new Error('This wallet cannot sign Solana transactions from the browser.');
      }

      await confirmSignature(signature, latestBlockhash.lastValidBlockHeight);
      signatures.push(signature);
      recoveredLamports += batchRecoveredLamports;
      serviceFeeLamports += batchServiceFeeLamports;
      completedBatches += 1;
      onProgress?.(completedBatches, batches.length);
    } catch (error) {
      return {
        completedBatches,
        serviceFeeWaived,
        error: error instanceof Error
          ? error.message
          : 'The transaction was cancelled or failed.',
        recoveredLamports,
        serviceFeeLamports,
        signatures,
        totalBatches: batches.length,
      };
    }
  }

  return {
    completedBatches,
    serviceFeeWaived,
    error: null,
    recoveredLamports,
    serviceFeeLamports,
    signatures,
    totalBatches: batches.length,
  };
}
