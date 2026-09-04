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

  {
    slug: 'how-to-claim-sol-from-token-accounts',
    title: 'How to claim SOL back from your Solana token accounts',
    description:
      'A step-by-step guide to claiming the SOL locked in your Solana token accounts — what you can claim, the two instructions that release it, and how to check the transaction before you sign.',
    published: '2026-09-04',
    minutes: 6,
    blocks: [
      { kind: 'p', text: 'If you have traded on Solana, you are holding SOL you did not know about. Not a lot per account — but every token you have ever touched opened an account, and every one of those accounts is sitting on a deposit. Here is how to claim it back, and how to tell a legitimate claim tool from something you should close the tab on.' },
      { kind: 'h', text: 'What you are actually claiming' },
      { kind: 'p', text: 'Solana requires each account to hold a refundable deposit so validators are paid for keeping it in memory. For a standard SPL token account that deposit is 0.00203928 SOL, charged once when the account is created. It is not a fee. It has always been yours.' },
      { kind: 'p', text: 'Two separate things now make that deposit claimable:' },
      { kind: 'list', items: [
        'Accounts you have finished with can be closed, returning the entire deposit.',
        'Accounts you still use are now overfunded, because SIMD-0437 is lowering the deposit the network requires — so the difference can be withdrawn while the account stays open.',
      ] },
      { kind: 'h', text: 'Which claim applies to you' },
      { kind: 'table', head: ['Your situation', 'What to use', 'What you get back'], rows: [
        ['Token balance is zero, done with it', 'CloseAccount', 'The whole deposit, account deleted'],
        ['Still holding the token', 'WithdrawExcessLamports', 'Only the surplus, account untouched'],
        ['Account opened after the cut', 'Nothing to claim', 'It already started at the lower floor'],
      ] },
      { kind: 'p', text: 'Most wallets hold a mix. Accounts from tokens you sold out of years ago are candidates for closing; accounts holding positions you still care about are candidates for a surplus withdrawal. They are different instructions and they are not interchangeable.' },
      { kind: 'h', text: 'The steps' },
      { kind: 'list', items: [
        'Scan. Any honest tool reads your token accounts from public RPC data and compares each balance against the current rent-exempt minimum. Scanning is a read — it needs no signature and costs nothing.',
        'Review. You should see each account, its address, the amount claimable, the service fee, the estimated network fee, and where the fee is going, before anything is signed.',
        'Approve. Your wallet shows the actual instructions. This is the last checkpoint and the only one that matters.',
      ] },
      { kind: 'h', text: 'Read the transaction before you sign' },
      { kind: 'p', text: 'This is the part people skip, and it is the part that protects you. A claim transaction should contain the instruction that does the job and, if the service charges, one transfer to a disclosed address. Nothing else.' },
      { kind: 'list', items: [
        'SetAuthority — someone is taking control of an account. Reject.',
        'Transfer of a token (not SOL) — your tokens are leaving. Reject.',
        'Approve / delegate — you are granting spending rights. Reject.',
        'An unexpected extra SystemProgram transfer — an undisclosed fee. Reject.',
      ] },
      { kind: 'callout', label: 'THE ONE RULE', text: 'You need a small amount of SOL already in your wallet to pay the network fee, even though you are recovering SOL. A completely empty wallet cannot claim, because it cannot pay for the transaction that does the claiming.' },
      { kind: 'h', text: 'How much is worth claiming' },
      { kind: 'p', text: 'Closing an empty account returns the full 0.00203928 SOL. Withdrawing a surplus currently returns about 0.00018 SOL per account, rising to roughly 0.00184 once all five stages of the rent reduction land in late 2026. Network fees are about 0.000005 SOL per transaction, and a single transaction can carry several accounts, so both are comfortably net positive — but the surplus route is worth repeating after each stage rather than treating as a one-off.' },
    ],
  },
  {
    slug: 'is-claiming-solana-rent-safe',
    title: 'Is claiming Solana rent safe? What to check before you connect',
    description:
      'Rent claim tools ask you to connect a wallet and sign a transaction, which is exactly what a drainer asks for too. Here is how to tell them apart, and what a legitimate claim transaction contains.',
    published: '2026-09-04',
    minutes: 5,
    blocks: [
      { kind: 'p', text: 'Searching for a way to claim Solana rent puts you in front of a lot of sites asking you to connect a wallet and sign something. That is also, precisely, what a wallet drainer asks for. The mechanics of claiming rent are perfectly safe; the risk is entirely in which site you hand the signature to.' },
      { kind: 'h', text: 'Connecting is safe. Signing is the decision.' },
      { kind: 'p', text: 'Connecting a wallet grants a site your public address and nothing else. It cannot move funds, and it cannot sign on your behalf. Every real action requires a transaction you approve in your wallet, and that approval screen — not the website around it — is what actually authorises anything.' },
      { kind: 'p', text: 'So the useful question is never "does this site look trustworthy." It is "what exactly is in the transaction it is asking me to sign."' },
      { kind: 'h', text: 'What a legitimate rent claim contains' },
      { kind: 'table', head: ['Instruction', 'Should it be there?'], rows: [
        ['WithdrawExcessLamports', 'Yes, if you are recovering a surplus'],
        ['CloseAccount', 'Yes, if you are closing empty accounts'],
        ['SystemProgram transfer', 'One, to a disclosed fee address'],
        ['ComputeBudget instructions', 'Yes, they only set the fee priority'],
        ['SetAuthority', 'No — never'],
        ['Token Transfer or Approve', 'No — never'],
      ] },
      { kind: 'callout', label: 'THE TEST THAT ACTUALLY WORKS', text: 'Expand the transaction detail in your wallet and read the instruction list. A rent claim moves SOL out of accounts you control and pays one disclosed fee. If anything grants authority over an account or moves a token, reject it — no matter how the site explained itself.' },
      { kind: 'h', text: 'Signs worth taking seriously' },
      { kind: 'list', items: [
        'The fee is not stated as a number before you sign, or the destination address is not shown.',
        'You are asked to sign more than once for what was described as one action, with no explanation of batching.',
        'The site cannot tell you which instruction it uses, or uses the words "claim" and "close" interchangeably — those are different outcomes.',
        'The scan requires a signature. Reading public account data never does.',
        'Urgency: countdowns, limited windows, "claim before it expires". Rent does not expire.',
      ] },
      { kind: 'h', text: 'The one thing that is genuinely irreversible' },
      { kind: 'p', text: 'Closing a token account deletes it. That is a legitimate, normal operation — it returns your full deposit — but it cannot be undone, and reopening the same account later means paying a deposit again. Any tool that closes accounts should say so plainly and require a zero balance first. Be wary of one that closes accounts while describing itself only as a claim tool.' },
      { kind: 'h', text: 'Verify the numbers yourself' },
      { kind: 'p', text: 'The rent floor is public. One call tells you what any account size is required to hold, which means every claim figure a site shows you is checkable:' },
      { kind: 'code', text: 'curl -s https://api.mainnet-beta.solana.com \\\n  -X POST -H \'content-type: application/json\' \\\n  -d \'{"jsonrpc":"2.0","id":1,\n       "method":"getMinimumBalanceForRentExemption","params":[165]}\'' },
      { kind: 'p', text: 'Anything a token account holds above that result is genuinely claimable. Anything a site claims above that number is not.' },
    ],
  },
  {
    slug: 'simd-0437-explained',
    title: 'SIMD-0437 explained: Solana’s five-stage rent reduction',
    description:
      'SIMD-0437 lowers Solana’s rent rate from 6,960 to 696 lamports per byte across five gated stages. What each stage changes, which are live, and what the schedule means for accounts funded under the old rate.',
    published: '2026-09-04',
    minutes: 6,
    blocks: [
      { kind: 'p', text: 'SIMD-0437 is the proposal that makes Solana accounts dramatically cheaper to open. It does not change how rent is calculated — it changes one number in the formula, and it does so in five separately gated steps rather than all at once. That staging is the detail most summaries leave out, and it is the one that matters if you are holding accounts funded under the old rate.' },
      { kind: 'h', text: 'The formula stays the same' },
      { kind: 'code', text: 'rent = (128 + data_len) × lamports_per_byte' },
      { kind: 'p', text: 'The 128 is fixed per-account overhead. data_len is the size of what the account stores — 82 bytes for a mint, 165 for a token account, 355 for a multisig. SIMD-0437 only touches lamports_per_byte, which has been 6,960 since the beginning and ends at 696.' },
      { kind: 'h', text: 'The five gates' },
      { kind: 'table', head: ['Gate', 'Lamports/byte', 'Cut', 'Status'], rows: [
        ['Legacy', '6,960', '—', 'Original rate'],
        ['SIMD-0437-1', '6,333', '9%', 'Live on mainnet'],
        ['SIMD-0437-2', '5,080', '27%', 'Live on testnet'],
        ['SIMD-0437-3', '2,575', '63%', 'Agave 4.4'],
        ['SIMD-0437-4', '1,322', '81%', 'Agave 4.4'],
        ['SIMD-0437-5', '696', '90%', 'Agave 4.4'],
      ] },
      { kind: 'p', text: 'Each gate is an independent feature switch. Stage one is live on mainnet today, which is why a 165-byte token account currently needs 0.00185557 SOL instead of the original 0.00203928. Stage two is running on testnet with mainnet activation expected mid-September 2026, and the final three are held until the Agave 4.4 client release in November 2026.' },
      { kind: 'callout', label: 'WHY THE 90% HEADLINE IS BOTH RIGHT AND MISLEADING', text: 'The full reduction really is 90%, but only after all five gates activate. Today the live cut is 9%. Both numbers get quoted as if they were current, and they are two ends of the same schedule.' },
      { kind: 'h', text: 'What it means for a new account' },
      { kind: 'p', text: 'Opening a token account costs 293 billed bytes multiplied by the current rate. At the legacy rate that was 0.00203928 SOL. At the final rate it is 0.00020393 — a tenth. Solana’s own worked example puts a business opening a million token accounts at $159,000 before and $15,900 after.' },
      { kind: 'h', text: 'What it means for accounts you already have' },
      { kind: 'p', text: 'Nothing automatic. Lowering the required minimum does not move lamports out of existing accounts, and no process sweeps the difference back to owners. An account funded at 0.00203928 keeps holding 0.00203928 while the requirement drops beneath it.' },
      { kind: 'table', head: ['After gate', 'Floor for 165B', 'Surplus left behind'], rows: [
        ['1 (live)', '0.00185557', '0.00018371'],
        ['2', '0.00148844', '0.00055084'],
        ['3', '0.00075448', '0.00128481'],
        ['4', '0.00038735', '0.00165193'],
        ['5', '0.00020393', '0.00183535'],
      ] },
      { kind: 'p', text: 'That surplus can be withdrawn with the Token Program’s WithdrawExcessLamports instruction, which moves the excess without closing the account or touching its tokens. Because the gates land separately, a fresh surplus appears after each one — this is not a one-time claim.' },
      { kind: 'h', text: 'Checking which gate is live' },
      { kind: 'p', text: 'You do not have to trust an announcement. Ask the cluster what it currently requires and divide by 293:' },
      { kind: 'code', text: 'curl -s https://api.mainnet-beta.solana.com \\\n  -X POST -H \'content-type: application/json\' \\\n  -d \'{"jsonrpc":"2.0","id":1,\n       "method":"getMinimumBalanceForRentExemption","params":[165]}\'' },
      { kind: 'p', text: 'The result divided by 293 gives the live lamports_per_byte. Match it against the table above and you know exactly how far the rollout has progressed on the cluster you are talking to.' },
    ],
  },
  {
    slug: 'solana-rent-vs-transaction-fees',
    title: 'Solana rent vs transaction fees: what you are actually paying',
    description:
      'Rent is a refundable deposit you get back. Transaction fees are spent. Confusing the two is why most people never realise they have SOL to reclaim — here is the difference.',
    published: '2026-09-04',
    minutes: 4,
    blocks: [
      { kind: 'p', text: 'Solana charges you in two completely different ways, and they are constantly conflated. One is spent forever. The other is a deposit you still own. Most people never reclaim the second because they assume it works like the first.' },
      { kind: 'table', head: ['', 'Transaction fee', 'Rent'], rows: [
        ['What it is', 'Payment for execution', 'Refundable deposit'],
        ['Typical size', '~0.000005 SOL', '~0.00204 SOL per token account'],
        ['When charged', 'Every transaction', 'Once, at account creation'],
        ['Can you get it back', 'No', 'Yes'],
        ['Who holds it', 'Validators', 'The account itself'],
      ] },
      { kind: 'h', text: 'Fees are spent' },
      { kind: 'p', text: 'A base transaction fee is about 5,000 lamports — five thousandths of a thousandth of a SOL — paid to validators for processing. Priority fees add more when the network is busy. This money is gone the moment the transaction lands, and there is nothing to reclaim.' },
      { kind: 'h', text: 'Rent is a deposit sitting in your own account' },
      { kind: 'p', text: 'Rent is roughly four hundred times larger per token account, and it never leaves your control. It sits inside the account, satisfying the network’s requirement that accounts pay their way for the memory they occupy. Close the account and you get every lamport of it back.' },
      { kind: 'p', text: 'The word "rent" does the damage here. It implies a recurring charge draining your balance, which is what it originally was — Solana did once deduct rent periodically from accounts below the threshold. That mechanism was disabled, and accounts are now simply expected to hold the minimum permanently. The name stayed.' },
      { kind: 'callout', label: 'THE PRACTICAL CONSEQUENCE', text: 'If you have held thirty different tokens, roughly 0.061 SOL of your balance is deposits, not spending. It has never shown up as a loss because it was never spent — and it is recoverable in a way that fees are not.' },
      { kind: 'h', text: 'Why this matters right now' },
      { kind: 'p', text: 'Solana is lowering the rent requirement by 90% across five staged activations. Accounts opened under the old, higher requirement keep the larger deposit, and the network does not refund the difference. So there are now two separate pools of recoverable SOL: the full deposit in accounts you have finished with, and the surplus in accounts you still use.' },
      { kind: 'p', text: 'Neither is a windfall or an airdrop. Both are your own deposit, and the only reason it looks like found money is that it was never framed as yours to begin with.' },
    ],
  },
  {
    slug: 'what-happens-when-you-close-a-token-account',
    title: 'What happens when you close a Solana token account?',
    description:
      'Closing returns the full rent deposit and permanently deletes the account. What is reversible, what is not, when the balance must be zero, and what happens if the token is sent to that address afterwards.',
    published: '2026-09-04',
    minutes: 5,
    blocks: [
      { kind: 'p', text: 'Closing a token account is the fastest way to reclaim rent — it returns the entire 0.00203928 SOL deposit rather than a slice of it. It is also the only rent operation you cannot undo. Here is exactly what the instruction does.' },
      { kind: 'h', text: 'The mechanics' },
      { kind: 'p', text: 'CloseAccount takes the account, a destination for its lamports, and the owner’s signature. It transfers the entire balance to the destination and removes the account from the ledger. Afterwards the address holds nothing and is no longer an initialised token account.' },
      { kind: 'list', items: [
        'The full rent deposit is returned, not a portion of it.',
        'The account is deleted, not emptied.',
        'The token balance must already be zero — the instruction fails otherwise.',
        'It costs a normal transaction fee, so the net gain is the deposit minus roughly 0.000005 SOL.',
      ] },
      { kind: 'callout', label: 'THE ZERO-BALANCE RULE IS A SAFETY FEATURE', text: 'The Token Program refuses to close an account still holding tokens. That guard is the reason closing empty accounts is safe: the protocol itself will not let you delete a position by accident.' },
      { kind: 'h', text: 'What you lose' },
      { kind: 'p', text: 'The address stops working as a token account. If someone later sends you that token, the transfer needs an account to arrive in — so either the sender creates one for you, or it fails. Reopening it yourself costs a fresh deposit at whatever the rate is then.' },
      { kind: 'p', text: 'That last point cuts both ways at the moment. Because SIMD-0437 is lowering the rent rate in stages, reopening an account later will get cheaper — currently 0.00185557 SOL and heading toward 0.00020393. Closing an account today and reopening it after the full reduction actually nets you the difference.' },
      { kind: 'h', text: 'When closing is the wrong call' },
      { kind: 'table', head: ['Account', 'Close it?', 'Why'], rows: [
        ['Token you sold out of years ago', 'Yes', 'Nothing is lost, full deposit returned'],
        ['Token you still hold', 'No', 'Balance is not zero; the instruction fails'],
        ['Token you actively trade', 'No', 'You will pay to recreate it immediately'],
        ['Airdropped junk worth nothing', 'Yes', 'Clears clutter and returns the deposit'],
      ] },
      { kind: 'p', text: 'For accounts you intend to keep, there is a non-destructive alternative. WithdrawExcessLamports takes only the balance above the current rent floor and leaves the account open, rent-exempt and holding its tokens — smaller per account, but repeatable after every stage of the reduction.' },
      { kind: 'h', text: 'Before you sign' },
      { kind: 'p', text: 'A closing transaction should contain CloseAccount instructions and, if the service charges a fee, one disclosed SystemProgram transfer. If it also contains a token Transfer, a Burn you did not ask for, or SetAuthority, something other than closing is happening — reject it.' },
    ],
  },
];

export function findPost(slug: string) {
  return POSTS.find(post => post.slug === slug);
}
