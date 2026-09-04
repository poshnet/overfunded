const SOLANA_RPC_URL = 'https://public.rpc.solanavibestation.com';

const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getBlockHeight',
  'getLatestBlockhash',
  'getMinimumBalanceForRentExemption',
  'getSignatureStatuses',
  'getTokenAccountsByOwner',
  'sendTransaction',
]);

type RpcRequest = {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
};

function errorResponse(id: RpcRequest['id'], code: number, message: string, status = 400) {
  return Response.json({ jsonrpc: '2.0', error: { code, message }, id: id ?? null }, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1_000_000) return errorResponse(null, -32600, 'RPC request is too large.', 413);

  let payload: RpcRequest | RpcRequest[];
  try {
    payload = await request.json() as RpcRequest | RpcRequest[];
  } catch {
    return errorResponse(null, -32700, 'Invalid JSON.');
  }

  const requests = Array.isArray(payload) ? payload : [payload];
  if (requests.length === 0 || requests.length > 20) {
    return errorResponse(null, -32600, 'Invalid RPC batch size.');
  }

  const rejected = requests.find(item => (
    item?.jsonrpc !== '2.0' || typeof item.method !== 'string' || !ALLOWED_METHODS.has(item.method)
  ));
  if (rejected) return errorResponse(rejected.id, -32601, 'RPC method is not available through this relay.');

  try {
    const upstream = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch {
    return errorResponse(null, -32000, 'Solana RPC is temporarily unavailable.', 502);
  }
}
