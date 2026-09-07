import { SITE_URL } from '../site-config';

export const dynamic = 'force-static';

/**
 * /llms.txt — the convention for telling a language model what a site offers
 * without making it parse the marketing pages. Everything an agent needs to use
 * the API is here, in the order it needs it.
 */
export function GET() {
  const body = `# Overfunded

> Reclaims excess SOL rent from Solana token accounts. Solana's SIMD-0437 upgrade
> lowered the rent-exempt minimum, so accounts funded under the old schedule now
> hold more lamports than they need. The surplus can be withdrawn without closing
> the account or touching the tokens inside it.

## API

No API key. No signup. No rate-limit tier to negotiate. 60 requests per minute
per IP, CORS open to any origin, every endpoint is a GET.

- [Index](${SITE_URL}/api/v1): endpoint list, machine readable
- [OpenAPI spec](${SITE_URL}/api/v1/openapi.json): full schema
- [Scan a wallet](${SITE_URL}/api/v1/scan?wallet=ADDRESS): every overfunded account and its surplus
- [Withdraw instructions](${SITE_URL}/api/v1/withdraw-instructions?wallet=ADDRESS): ready-to-sign instructions, batched
- [Rent floor](${SITE_URL}/api/v1/floor?space=165): the live rent-exempt minimum, read from mainnet

## MCP

An MCP server runs at ${SITE_URL}/api/mcp (JSON-RPC 2.0 over HTTP POST, protocol
2025-06-18). No key, no handshake beyond initialize. Tools: scan_wallet_rent,
build_withdraw_instructions, get_rent_floor.

## What makes the withdraw path different

Closing a token account returns its whole deposit but deletes the account and
requires the token balance to be zero first. WithdrawExcessLamports (opcode 38 on
both the Token and Token-2022 programs) takes only the surplus above the current
floor and leaves the account and its tokens intact. It is non-destructive and
needs no burn.

## Notes for agents

- The API is read-only. It signs nothing and submits nothing. You sign and send.
- Set the wallet owner as fee payer. The owner must sign.
- Instructions come pre-grouped into transaction-sized batches via instructionGroups.
- isDestructiveAction is present on every instruction response and is false for withdrawals.
- Amounts are lamports; solanaReclaimed is the same figure in SOL.
- Compact JSON by default. Add ?pretty=1 for indented output.

## Fees

Taken only on success, deducted from what is recovered, disclosed in the
transaction before signing.

- Withdraw surplus (account stays open): 5%
- Close an empty account: 1.75%
- Burn a balance and close the account: 4%

Burning an NFT closes its metadata and master edition accounts too, not just the
token account, so roughly 10.5M lamports come back rather than 2M.

Proportional, so the cost never outruns the amount recovered.

## Source

- [Repository](https://github.com/poshnet/overfunded)
- [Solana's rollout page](https://solana.com/upgrades/reduced-rent)
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  });
}
