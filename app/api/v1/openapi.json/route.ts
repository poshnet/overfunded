import { SITE_URL } from '../../../site-config';
import { apiJson, preflight } from '../shared';

export const dynamic = 'force-dynamic';

const WALLET_PARAM = {
  name: 'wallet',
  in: 'query',
  required: true,
  description: 'Base58 Solana wallet address.',
  schema: { type: 'string' },
};

/** Machine-readable schema, so an agent can call this without reading prose. */
export function GET(request: Request) {
  return apiJson({
    openapi: '3.1.0',
    info: {
      title: 'Overfunded API',
      version: '1.0.0',
      description: 'Read-only Solana rent surplus data and ready-to-sign withdrawal instructions. No authentication.',
      license: { name: 'MIT' },
    },
    servers: [{ url: SITE_URL }],
    paths: {
      '/api/v1/scan': {
        get: {
          operationId: 'scanWallet',
          summary: 'Every token account the wallet owns that sits above the current rent floor.',
          parameters: [WALLET_PARAM],
          responses: { '200': { description: 'Reclaimable accounts and total surplus.' } },
        },
      },
      '/api/v1/withdraw-instructions': {
        get: {
          operationId: 'buildWithdrawInstructions',
          summary: 'Ready-to-sign WithdrawExcessLamports instructions, grouped into transaction-sized batches.',
          parameters: [WALLET_PARAM, {
            name: 'batchSize',
            in: 'query',
            required: false,
            description: 'Instructions per group, 1-25. Defaults to 12.',
            schema: { type: 'integer', minimum: 1, maximum: 25 },
          }],
          responses: { '200': { description: 'Instruction groups. Nothing is signed or submitted.' } },
        },
      },
      '/api/v1/floor': {
        get: {
          operationId: 'getRentFloor',
          summary: 'The live rent-exempt minimum for an account of a given size.',
          parameters: [{
            name: 'space',
            in: 'query',
            required: false,
            description: 'Account size in bytes. Defaults to 165, a token account.',
            schema: { type: 'integer', minimum: 0 },
          }],
          responses: { '200': { description: 'Rent floor, rate per byte, and surplus per legacy-funded account.' } },
        },
      },
    },
  }, 200, 3600, request);
}

export function OPTIONS() {
  return preflight();
}
