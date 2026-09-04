import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type ParsedAccountData,
} from '@solana/web3.js';
import { WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR as TOKEN_WITHDRAW_DISCRIMINATOR } from '@solana-program/token';
import { WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR as TOKEN_2022_WITHDRAW_DISCRIMINATOR } from '@solana-program/token-2022';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const ACCOUNTS_PER_TRANSACTION = 6;

export const connection = new Connection(RPC_ENDPOINT, 'confirmed');

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
  return Math.ceil(accountCount / ACCOUNTS_PER_TRANSACTION) * 5_000;
}

export async function scanReclaimableAccounts(owner: PublicKey): Promise<ReclaimableAccount[]> {
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

  return candidates.flatMap(candidate => {
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

  return new TransactionInstruction({
    programId: expectedProgram,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: new Uint8Array([discriminator]) as unknown as Buffer,
  });
}

export async function reclaimAccounts(
  provider: WalletProvider,
  owner: PublicKey,
  accounts: ReclaimableAccount[],
  onProgress?: (completed: number, total: number) => void,
) {
  const signatures: string[] = [];
  const batches = chunk(accounts, ACCOUNTS_PER_TRANSACTION);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const instructions = (await Promise.all(
      batches[batchIndex].map(account => getFreshInstruction(account, owner)),
    )).filter((instruction): instruction is TransactionInstruction => instruction !== null);

    if (instructions.length === 0) {
      onProgress?.(batchIndex + 1, batches.length);
      continue;
    }

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: owner,
      recentBlockhash: latestBlockhash.blockhash,
    }).add(...instructions);

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

    const confirmation = await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
    if (confirmation.value.err) throw new Error(`Transaction ${shortenAddress(signature, 7)} did not confirm.`);
    signatures.push(signature);
    onProgress?.(batchIndex + 1, batches.length);
  }

  return signatures;
}
