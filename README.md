# SolRent — Rent Quest

Recover the excess rent sitting in your Solana token accounts, **without closing them**.

Solana's rent-exempt minimum is being lowered in five gated stages under
**SIMD-0437** (`lamports_per_byte` steps down from 6,960 to 696 — a 90% cut once
all five activate). Accounts funded under an older, higher floor keep the
original deposit; nothing sweeps the difference back. SolRent finds that surplus
and withdraws it with the Token Program's `WithdrawExcessLamports` instruction,
leaving the account open, rent-exempt, and holding every token.

No `CloseAccount`. No `Burn`. No token transfers. Ever.

## Verify the premise yourself

```bash
curl -s https://api.mainnet-beta.solana.com \
  -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,
       "method":"getMinimumBalanceForRentExemption","params":[165]}'
```

Divide the result by `128 + 165 = 293` to get the live `lamports_per_byte`, then
match it against the ladder. That is exactly how the site decides which stages to
label ACTIVE — no figure on the site is hardcoded.

## How it works

1. **Scan** — read every SPL Token and Token-2022 account owned by the wallet and
   compare each balance against `getMinimumBalanceForRentExemption(space)`.
2. **Review** — the surplus, the service fee, the estimated network fee, and the
   destination are all shown before anything is signed.
3. **Reclaim** — batched `WithdrawExcessLamports` instructions plus one disclosed
   `SystemProgram.transfer` for the fee, simulated before the wallet is prompted.

### Safety properties

- Every batch is **simulated before the wallet prompt**, so an unsupported
  program build or an underfunded payer costs no signature.
- A failure part way through **returns the confirmed signatures and charged fees**
  rather than discarding them — earlier batches are already on-chain and paid for.
- Wrapped SOL accounts, accounts with a changed authority, and accounts already at
  the floor are skipped.
- The fee is **waived** rather than risking the user's transaction if the treasury
  account is not yet rent-exempt.

## Fees

5% of the gross surplus, capped at 0.05 SOL, collected only on success, in the
same transaction you approve. Nothing is charged if nothing is recovered.

## Stack

Next 16 (App Router) on `vinext` + Vite, React 19, deployed to Cloudflare Workers.
All Solana RPC is proxied through `/api/solana-rpc`, which enforces a method
allowlist, a same-origin check, and a per-IP rate limit.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
```

## Licence

MIT — see [LICENSE](./LICENSE).
