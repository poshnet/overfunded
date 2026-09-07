import { apiJson, preflight } from './shared';

export const dynamic = 'force-dynamic';

/** Index so the API is discoverable without documentation. */
export function GET() {
  return apiJson({
    name: 'Overfunded API',
    version: '1',
    description: 'Read-only Solana rent surplus data. Signs nothing, moves nothing.',
    endpoints: [
      {
        path: '/api/v1/scan?wallet=<address>',
        returns: 'Every token account the wallet owns that sits above the current rent floor.',
      },
      {
        path: '/api/v1/floor?space=165',
        returns: 'The live rent-exempt minimum for an account of that size, and the surplus in a legacy-funded one.',
      },
    ],
    limits: '60 requests per minute per IP.',
    source: 'https://github.com/poshnet/overfunded',
  }, 200, 3600);
}

export function OPTIONS() {
  return preflight();
}
