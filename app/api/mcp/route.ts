import { SITE_URL } from '../../site-config';
import {
  CORS_HEADERS,
  TOKEN_ACCOUNT_SPACE,
  WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR,
  base64Byte,
  findReclaimable,
  isValidPubkey,
  rpc,
  withinRateLimit,
} from '../v1/shared';

export const dynamic = 'force-dynamic';

/**
 * Model Context Protocol endpoint, JSON-RPC 2.0 over HTTP POST.
 *
 * Deliberately unauthenticated. The competing rent API gates access behind an
 * API key issued by a human in a Discord ticket, which an autonomous agent
 * cannot obtain — so the single most useful thing this server can do is answer
 * on the first call.
 */
const PROTOCOL_VERSION = '2025-06-18';

const TOKEN_PROGRAM_IDS = {
  token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'token-2022': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
} as const;

const WALLET_SCHEMA = {
  type: 'object',
  properties: { wallet: { type: 'string', description: 'Base58 Solana wallet address.' } },
  required: ['wallet'],
} as const;

const TOOLS = [
  {
    name: 'scan_wallet_rent',
    title: 'Scan a wallet for reclaimable rent',
    description:
      'Lists every SPL token account the wallet owns that holds more lamports than the current Solana rent floor, '
      + 'with the surplus for each. Read-only.',
    inputSchema: WALLET_SCHEMA,
  },
  {
    name: 'build_withdraw_instructions',
    title: 'Build rent withdrawal instructions',
    description:
      'Returns ready-to-sign WithdrawExcessLamports instructions for a wallet, grouped into transaction-sized '
      + 'batches. Non-destructive: accounts stay open and token balances are untouched. Signs and submits nothing.',
    inputSchema: WALLET_SCHEMA,
  },
  {
    name: 'get_rent_floor',
    title: 'Get the live Solana rent floor',
    description:
      'The current rent-exempt minimum for an account of a given size, read from mainnet, plus the surplus still '
      + 'held by one funded under the original schedule.',
    inputSchema: {
      type: 'object',
      properties: { space: { type: 'integer', description: 'Account size in bytes. Defaults to 165.' } },
    },
  },
];

function rpcResult(id: unknown, result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

/** MCP returns tool output as content blocks; structuredContent carries the data. */
function toolResult(id: unknown, data: unknown) {
  return rpcResult(id, {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: data,
    isError: false,
  });
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === 'get_rent_floor') {
    const space = Number.isInteger(args.space) ? Number(args.space) : TOKEN_ACCOUNT_SPACE;
    const rentFloorLamports = await rpc<number>('getMinimumBalanceForRentExemption', [space, { commitment: 'confirmed' }]);
    return {
      space,
      rentFloorLamports,
      rentFloorSol: rentFloorLamports / 1e9,
      lamportsPerByte: rentFloorLamports / (128 + space),
    };
  }

  const wallet = args.wallet;
  if (!isValidPubkey(typeof wallet === 'string' ? wallet : null)) {
    throw new Error('wallet must be a base58 Solana address.');
  }
  const { scannedCount, accounts } = await findReclaimable(wallet as string);
  const lamportsReclaimed = accounts.reduce((sum, account) => sum + account.excessLamports, 0);

  if (name === 'scan_wallet_rent') {
    return {
      wallet,
      scannedAccounts: scannedCount,
      reclaimableAccounts: accounts.length,
      lamportsReclaimed,
      solanaReclaimed: lamportsReclaimed / 1e9,
      accounts,
    };
  }

  const instructions = accounts.map(account => ({
    programId: TOKEN_PROGRAM_IDS[account.program],
    accounts: [
      { pubkey: account.address, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: true, isWritable: false },
    ],
    data: base64Byte(WITHDRAW_EXCESS_LAMPORTS_DISCRIMINATOR),
    lamportsReclaimed: account.excessLamports,
  }));
  const groups: (typeof instructions)[] = [];
  for (let index = 0; index < instructions.length; index += 12) {
    groups.push(instructions.slice(index, index + 12));
  }
  return {
    wallet,
    instructionType: 'withdrawExcessLamports',
    isDestructiveAction: false,
    lamportsReclaimed,
    solanaReclaimed: lamportsReclaimed / 1e9,
    instructionGroups: groups,
    notes: 'Sign and send with the wallet owner as fee payer.',
  };
}

export async function POST(request: Request) {
  if (!withinRateLimit(request)) return rpcError(null, -32005, 'Too many requests.');

  let body: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return rpcError(null, -32700, 'Invalid JSON.');
  }

  const { id = null, method, params = {} } = body;

  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'overfunded', title: 'Overfunded — Solana rent reclaim', version: '1.0.0' },
      instructions: `Solana rent reclamation. No API key required. Docs at ${SITE_URL}/llms.txt`,
    });
  }
  // Notifications carry no id and expect no response body.
  if (method === 'notifications/initialized') return new Response(null, { status: 202, headers: CORS_HEADERS });
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });

  if (method === 'tools/call') {
    const name = String(params.name ?? '');
    if (!TOOLS.some(tool => tool.name === name)) return rpcError(id, -32602, `Unknown tool: ${name}`);
    try {
      const data = await callTool(name, (params.arguments ?? {}) as Record<string, unknown>);
      return toolResult(id, data);
    } catch (error) {
      return rpcResult(id, {
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Tool call failed.' }],
        isError: true,
      });
    }
  }

  return rpcError(id, -32601, `Unknown method: ${method}`);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'access-control-allow-methods': 'POST, OPTIONS' },
  });
}
