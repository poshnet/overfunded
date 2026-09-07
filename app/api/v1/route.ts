import { apiJson, preflight } from './shared';

export const dynamic = 'force-dynamic';

/** Index so the API is discoverable without documentation. */
export function GET(request: Request) {
  return apiJson({
    name: 'Overfunded API',
    version: '1',
    description: 'Read-only Solana rent surplus data. Signs nothing, moves nothing.',
    authentication: 'None. No API key, no signup, no allowlist.',
    endpoints: [
      {
        path: '/api/v1/scan?wallet=<address>',
        returns: 'Every token account the wallet owns that sits above the current rent floor.',
      },
      {
        path: '/api/v1/withdraw-instructions?wallet=<address>&batchSize=12',
        returns: 'Ready-to-sign WithdrawExcessLamports instructions, grouped into transaction-sized batches.',
        destructive: false,
      },
      {
        path: '/api/v1/floor?space=165',
        returns: 'The live rent-exempt minimum for an account of that size, and the surplus in a legacy-funded one.',
      },
      { path: '/api/v1/openapi.json', returns: 'Machine-readable schema for all endpoints.' },
      { path: '/llms.txt', returns: 'Plain-text description of this API for language models.' },
      {
        path: '/api/mcp',
        method: 'POST',
        returns: 'Model Context Protocol server (JSON-RPC 2.0). Tools: scan_wallet_rent, build_withdraw_instructions, get_rent_floor.',
      },
    ],
    limits: '60 requests per minute per IP. CORS open to any origin.',
    fees: {
      withdrawSurplus: '5% — account stays open, tokens untouched',
      closeEmptyAccount: '1.75%',
      burnAndClose: '5% — an NFT burn also closes its metadata and master edition, so ~10.5M lamports are reclaimed, not ~2M',
      note: 'Proportional and success-only, so the fee never outruns the amount recovered.',
    },
    signing: 'This API never signs or submits. You sign and send with the wallet owner as fee payer.',
    source: 'https://github.com/poshnet/overfunded',
  }, 200, 3600, request);
}

export function OPTIONS() {
  return preflight();
}
