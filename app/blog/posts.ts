export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'callout'; label: string; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };

export type Post = {
  slug: string;
  title: string;
  description: string;
  published: string;
  minutes: number;
  blocks: Block[];
};

export const POSTS: Post[] = [
  {
    slug: 'how-much-rent-is-in-a-solana-token-account',
    title: 'How much SOL is locked in a Solana token account?',
    description:
      'Every SPL token account holds a refundable deposit of 0.00203928 SOL. Here is exactly where that number comes from, how much of it is now recoverable, and how to check your own wallet.',
    published: '2026-09-04',
    minutes: 5,
    blocks: [
      { kind: 'p', text: 'Every SPL token account you have ever opened is holding SOL you did not choose to deposit. Not a fee — a refundable deposit, and for a standard token account it is exactly 0.00203928 SOL. If your wallet has interacted with thirty tokens, roughly 0.061 SOL is sitting in account deposits right now.' },
      { kind: 'p', text: 'That number is not arbitrary, and part of it has recently become recoverable without closing anything. Here is the arithmetic.' },
      { kind: 'h', text: 'Where 0.00203928 SOL comes from' },
      { kind: 'p', text: 'Solana charges each account a deposit to remain resident in validator memory, called the rent-exempt minimum. It is calculated from the account size:' },
      { kind: 'code', text: 'rent = (128 + data_len) × lamports_per_byte' },
      { kind: 'p', text: 'The 128 is fixed overhead charged on every account regardless of contents. An SPL token account stores 165 bytes — mint, owner, amount, delegate, state and a few optional fields — so it is billed for 293 bytes. Under the long-standing rate of 6,960 lamports per byte:' },
      { kind: 'code', text: '293 × 6,960 = 2,039,280 lamports = 0.00203928 SOL' },
      { kind: 'p', text: 'The same figure for everyone, on every token account, since the beginning. It is why opening an associated token account has always cost about two-thousandths of a SOL.' },
      { kind: 'h', text: 'What changed' },
      { kind: 'p', text: 'SIMD-0437 lowers lamports_per_byte from 6,960 to 696 across five independently gated stages — a 90% reduction once all five activate. The formula is untouched; only the rate moves, and each gate flips separately.' },
      { kind: 'table', head: ['Gate', 'Lamports/byte', 'Floor for 165B', 'Recoverable', 'Status'], rows: [
        ['Legacy', '6,960', '0.00203928', '—', '—'],
        ['SIMD-0437-1', '6,333', '0.00185557', '0.00018371', 'Live on mainnet'],
        ['SIMD-0437-2', '5,080', '0.00148844', '0.00055084', 'Live on testnet'],
        ['SIMD-0437-3', '2,575', '0.00075448', '0.00128481', 'Agave 4.4'],
        ['SIMD-0437-4', '1,322', '0.00038735', '0.00165193', 'Agave 4.4'],
        ['SIMD-0437-5', '696', '0.00020393', '0.00183535', 'Agave 4.4'],
      ] },
      { kind: 'p', text: 'Only the first gate is live on mainnet today. The second is running on testnet with mainnet activation expected in mid-September 2026, and the final three are delayed until the Agave 4.4 client release in November 2026 — so the headline 90% figure lands late in the year, not now. Each activation leaves a fresh surplus in every account funded before it, which makes reclaiming worth repeating rather than a one-time event.' },
      { kind: 'p', text: 'Crucially, lowering the minimum does not move any lamports. Your account was funded once, at whatever the floor was that day, and the runtime has no mechanism that returns the difference. It simply stays there.' },
      { kind: 'callout', label: 'THE PART PEOPLE MISS', text: 'The surplus is not a reward, an airdrop, or yield. It is your own deposit, no longer required by the network — and nothing will hand it back to you automatically.' },
      { kind: 'h', text: 'It is not only token accounts' },
      { kind: 'p', text: 'Rent scales with size, so larger accounts strand more. An 82-byte mint holds 0.00146160 SOL under the legacy rate; a 355-byte multisig holds 0.00336168. And plenty of accounts hold far more than the floor for unrelated reasons — SOL sent to a mint address by mistake, program-derived accounts funded generously at creation. All of that surplus is subject to the same arithmetic.' },
      { kind: 'h', text: 'Checking your own wallet' },
      { kind: 'p', text: 'You do not need to trust any of the numbers above. The rent floor is a public RPC call, so run it yourself:' },
      { kind: 'code', text: `curl -s https://api.mainnet-beta.solana.com \\\n  -X POST -H 'content-type: application/json' \\\n  -d '{"jsonrpc":"2.0","id":1,\n       "method":"getMinimumBalanceForRentExemption","params":[165]}'` },
      { kind: 'p', text: 'Divide the result by 293 to recover the live lamports_per_byte, then match it against the table above to see which gates are active. Compare that floor against any token account balance from getTokenAccountsByOwner and the difference is what you can withdraw.' },
      { kind: 'p', text: 'The important detail is that recovering it does not require closing anything. The Token Program has an instruction, WithdrawExcessLamports, that moves only the balance above the floor and leaves the account open, rent-exempt, and holding every token.' },
    ],
  },
  {
    slug: 'close-vs-withdraw-solana-rent',
    title: 'Closing vs withdrawing: two ways to get Solana rent back',
    description:
      'Account closers delete the account to refund its deposit. WithdrawExcessLamports takes only the surplus and leaves the account working. When to use which, and why the answer changed.',
    published: '2026-09-04',
    minutes: 4,
    blocks: [
      { kind: 'p', text: 'There are two ways to get rent out of a Solana account, and they are not interchangeable. Most cleanup tools use the destructive one, because until recently it was the only one worth using.' },
      { kind: 'h', text: 'CloseAccount: all of it, but the account is gone' },
      { kind: 'p', text: 'CloseAccount refunds the entire deposit and deletes the account. The token balance must be zero first, the address stops working, and anything that referenced it has to handle its absence. For a genuinely dead account — a token you sold out of years ago — this is the right instruction and always has been.' },
      { kind: 'p', text: 'It is also irreversible. Reopening the same associated token account later means paying the deposit again at the current rate.' },
      { kind: 'h', text: 'WithdrawExcessLamports: only the surplus, account survives' },
      { kind: 'p', text: 'The second instruction moves exactly lamports − minimum_balance out of an account and leaves everything else alone. There is no amount parameter to get wrong. The account stays open, stays rent-exempt, keeps its address, and keeps its full token balance.' },
      { kind: 'p', text: 'Before the rent reduction this instruction had little to do, because a correctly funded account sat exactly at the floor with no surplus to take. Lowering the floor is what gave it a job.' },
      { kind: 'table', head: ['', 'CloseAccount', 'WithdrawExcessLamports'], rows: [
        ['Recovers', 'Entire deposit', 'Only the surplus'],
        ['Account afterward', 'Deleted', 'Open and rent-exempt'],
        ['Token balance', 'Must be zero first', 'Untouched'],
        ['Address still usable', 'No', 'Yes'],
        ['Repeatable', 'No', 'Yes, at each stage'],
        ['Best for', 'Dead, empty accounts', 'Accounts you still use'],
      ] },
      { kind: 'h', text: 'Why "repeatable" matters most' },
      { kind: 'p', text: 'SIMD-0437 lowers the rent rate in five gated stages rather than all at once, and the schedule stretches into November 2026. Each activation drops the floor again and leaves a fresh surplus in every account funded before it. Closing an account is a one-time event; withdrawing the excess is something you can do again after every gate.' },
      { kind: 'callout', label: 'PRACTICAL ADVICE', text: 'Use an account closer on tokens you are finished with. Use a surplus withdrawal on everything you still hold. They solve different problems, and running the destructive one on a live position to recover a fraction of a cent is a bad trade.' },
      { kind: 'h', text: 'Reading the transaction before you sign' },
      { kind: 'p', text: 'Whatever tool you use, the wallet approval screen is the last honest checkpoint. A non-destructive reclaim should contain WithdrawExcessLamports instructions and, if the service charges a fee, one SystemProgram transfer to a disclosed address. Nothing else.' },
      { kind: 'list', items: [
        'If you see CloseAccount, accounts are being deleted.',
        'If you see Burn, tokens are being destroyed.',
        'If you see a token Transfer, tokens are leaving your wallet.',
        'If you see SetAuthority, control of an account is changing hands.',
      ] },
      { kind: 'p', text: 'None of those belong in a transaction that claims to only recover surplus rent. Reject anything that contains them.' },
    ],
  },
  {
    slug: 'solana-rent-explained',
    title: 'What Solana rent actually is (and why you already paid it)',
    description:
      'Rent on Solana is not a recurring charge — it is a refundable deposit that keeps your account in validator memory. What the 128-byte overhead is, why rent collection was disabled, and what changed in 2026.',
    published: '2026-09-04',
    minutes: 5,
    blocks: [
      { kind: 'p', text: 'The word "rent" is the single most misleading term in Solana. It suggests a recurring charge that drains your balance over time. It is not that, and has not been for years.' },
      { kind: 'h', text: 'Rent is a deposit, not a fee' },
      { kind: 'p', text: 'Validators keep account state in memory, which costs real money. To stop the ledger filling with abandoned accounts, Solana requires each account to hold a minimum balance proportional to its size. Hold that balance and the account is rent-exempt: nothing is ever deducted.' },
      { kind: 'p', text: 'The deposit is yours the entire time. Close the account and you get all of it back. In accounting terms it is a security deposit, not rent.' },
      { kind: 'p', text: 'Solana originally did charge periodic rent to accounts below the threshold, but that mechanism was disabled — every account is now expected to be rent-exempt from creation. The name stuck.' },
      { kind: 'h', text: 'The 128-byte surcharge' },
      { kind: 'p', text: 'The formula charges for more bytes than your account stores:' },
      { kind: 'code', text: 'rent = (128 + data_len) × lamports_per_byte' },
      { kind: 'p', text: 'The extra 128 bytes cover per-account metadata the runtime maintains regardless of contents — owner, lamports, executable flag, and the bookkeeping around them. It matters more than it looks for small accounts: a 165-byte token account is billed for 293 bytes, so 44% of what you pay is overhead rather than your data.' },
      { kind: 'table', head: ['Account', 'Data bytes', 'Billed bytes', 'Overhead share'], rows: [
        ['Mint', '82', '210', '61%'],
        ['Token account', '165', '293', '44%'],
        ['Multisig', '355', '483', '27%'],
      ] },
      { kind: 'h', text: 'What changed in 2026' },
      { kind: 'p', text: 'Memory got cheaper; the rate did not follow. SIMD-0437 corrects that by stepping lamports_per_byte down from 6,960 to 696 in five gated stages — a 90% reduction at full rollout. The first gate is live on mainnet, the second is on testnet with mainnet activation expected mid-September 2026, and the last three are held until the Agave 4.4 release in November 2026. Opening new accounts gets dramatically cheaper, which is the point of the proposal.' },
      { kind: 'p', text: 'The side effect is the interesting part. Every account created before a gate activated was funded at the older, higher floor, and lowering the requirement does not move lamports. Those accounts now hold more than they need.' },
      { kind: 'callout', label: 'NO AUTOMATIC REFUND', text: 'There is no sweep, no airdrop, and no background process returning the difference. The surplus stays in each account until an instruction moves it, and the only party who can authorise that is the account owner.' },
      { kind: 'h', text: 'How to see it for yourself' },
      { kind: 'p', text: 'One RPC call returns the current floor for any account size:' },
      { kind: 'code', text: `curl -s https://api.mainnet-beta.solana.com \\\n  -X POST -H 'content-type: application/json' \\\n  -d '{"jsonrpc":"2.0","id":1,\n       "method":"getMinimumBalanceForRentExemption","params":[165]}'` },
      { kind: 'p', text: 'Divide by 293 and you have the live lamports_per_byte. Anything a token account holds above that result is surplus, and the Token Program can move it out with WithdrawExcessLamports without closing the account or touching a single token.' },
    ],
  },
];

export function findPost(slug: string) {
  return POSTS.find(post => post.slug === slug);
}
