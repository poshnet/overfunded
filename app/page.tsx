'use client';

import { useEffect, useState } from 'react';

type ScanState = 'idle' | 'connecting' | 'scanning' | 'results' | 'error';
type SolanaProvider = {
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
};

declare global {
  interface Window { solana?: SolanaProvider }
}

const demoAccounts = [
  { name: 'USDC token account', address: '8kP3…xR42', excess: 0.02218, tone: 'mint' },
  { name: 'BONK token account', address: '3Dw9…kN18', excess: 0.01862, tone: 'purple' },
  { name: 'JUP token account', address: 'H7q1…mV05', excess: 0.01497, tone: 'orange' },
  { name: '4 more accounts', address: 'Ready to reclaim', excess: 0.02843, tone: 'dark' },
];

const coins = Array.from({ length: 18 }, (_, i) => ({
  left: (6 + ((i * 37) % 88)) + '%',
  delay: ((i % 7) * 0.09) + 's',
  duration: (0.9 + (i % 4) * 0.14) + 's',
  size: 20 + (i % 4) * 7,
}));

function shortAddress(value: string) {
  return value.slice(0, 4) + '…' + value.slice(-4);
}

export default function Home() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [wallet, setWallet] = useState('');
  const [demo, setDemo] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!dropping) return;
    const timer = window.setTimeout(() => setDropping(false), 1900);
    return () => window.clearTimeout(timer);
  }, [dropping]);

  const loadDemo = () => {
    setDemo(true);
    setScanState('scanning');
    setNotice('');
    window.setTimeout(() => setScanState('results'), 900);
  };

  const connectWallet = async () => {
    if (!window.solana) {
      loadDemo();
      setNotice('No Solana wallet was detected, so we opened a clearly labeled demo scan.');
      return;
    }
    try {
      setScanState('connecting');
      const response = await window.solana.connect();
      setWallet(response.publicKey.toString());
      setDemo(false);
      setScanState('scanning');
      window.setTimeout(() => {
        setScanState('results');
        setNotice('Wallet connected. Results are illustrative while the audited transaction builder is being integrated.');
      }, 1100);
    } catch {
      setScanState('error');
      setNotice('The wallet connection was cancelled. Nothing was signed or changed.');
    }
  };

  const reclaimDemo = () => {
    setDropping(true);
    setNotice('Demo complete: 0.079985 SOL returned after the 5% service fee and estimated network fee. No accounts closed.');
  };

  const isResults = scanState === 'results';
  const busy = scanState === 'connecting' || scanState === 'scanning';

  return (
    <main className="site-shell">
      <div className={'coin-rain ' + (dropping ? 'is-raining' : '')} aria-hidden="true">
        {coins.map((coin, i) => (
          <i key={i} style={{ left: coin.left, animationDelay: coin.delay, animationDuration: coin.duration, width: coin.size, height: coin.size }}>◎</i>
        ))}
      </div>

      <nav className="nav">
        <a className="brand" href="#top" aria-label="Lamport home"><span className="brand-mark">L</span><span>LAMPORT</span></a>
        <div className="nav-links"><a href="#difference">Why different</a><a href="#how">How it works</a><a href="#community">Community coin</a></div>
        <button className="wallet-button" type="button" onClick={connectWallet} disabled={busy}>
          {wallet ? shortAddress(wallet) : busy ? 'Checking wallet…' : 'Connect wallet'} <span aria-hidden="true">↗</span>
        </button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-orbit orbit-one">◎</div><div className="hero-orbit orbit-two">◎</div>
        <div className="eyebrow"><span /> The reduced-rent era is here</div>
        <h1>Solana lowered rent.<br /><em>Claim the difference.</em></h1>
        <p className="hero-copy">Accounts funded under the old rent floor may now hold excess lamports. Scan and recover that SOL without closing the accounts or touching token balances.</p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={connectWallet} disabled={busy}><span className="sol-dot">◎</span> {busy ? 'Scanning…' : 'Scan my wallet'}</button>
          <button className="demo-action" type="button" onClick={loadDemo}>Try the demo <span>→</span></button>
        </div>
        <p className="trust-line">NON-CUSTODIAL&nbsp;&nbsp;·&nbsp;&nbsp; OPEN SOURCE&nbsp;&nbsp;·&nbsp;&nbsp; YOU APPROVE EVERY TRANSACTION</p>

        <div className={'reclaim-card ' + (isResults ? 'is-demo' : '')}>
          <div className="card-head">
            <div>
              <p>AVAILABLE TO RECLAIM</p>
              <strong>{isResults ? '0.0842' : busy ? 'Scanning' : '—.——'} {!busy && <small>SOL</small>}</strong>
              <span>{isResults ? 'Across 7 token accounts' : busy ? 'Reading account rent floors…' : 'Connect to scan your accounts'}</span>
            </div>
            <div className="status-pill"><i /> {demo && isResults ? 'DEMO SCAN' : wallet ? 'WALLET CONNECTED' : 'READY TO SCAN'}</div>
          </div>
          <div className="meter"><span style={{ width: busy ? '42%' : isResults ? '68%' : '0%' }} /></div>
          <div className="card-stats">
            <div><span>Accounts scanned</span><b>{isResults ? '24' : '—'}</b></div>
            <div><span>With excess rent</span><b>{isResults ? '7' : '—'}</b></div>
            <div><span>Accounts closed</span><b>0</b></div>
          </div>
          {isResults && <div className="fee-preview"><span>Service fee <b>0.004210 SOL</b></span><span>You receive <strong>0.079985 SOL</strong></span></div>}
          <button className="reclaim-button" type="button" disabled={!isResults} onClick={reclaimDemo}>{isResults ? 'Reclaim 0.079985 SOL after fee' : busy ? 'Scanning accounts…' : 'Connect wallet to continue'}</button>
          {notice && <p className="inline-notice" role="status">{notice}</p>}
        </div>
      </section>

      <section className="proof-strip" id="safety">
        <p>BUILT FOR THE NEW RENT ERA</p>
        <div className="proof-items"><span><b>↓</b> Rent floor is falling</span><span><b>◇</b> Token accounts stay open</span><span><b>✓</b> Balances stay untouched</span></div>
      </section>

      <section className="update-section">
        <div className="update-number" aria-hidden="true">↓</div>
        <div className="update-copy">
          <p className="section-kicker">THE UPDATE CREATED THE OPPORTUNITY</p>
          <h2>Old deposits.<br /><em>New rent floor.</em></h2>
          <p>Solana is rolling out lower account rent. Accounts that were funded to an older, higher rent-exempt minimum can end up holding more lamports than they need.</p>
        </div>
        <div className="update-facts">
          <article><span>01</span><b>The network lowers rent</b><p>The required minimum changes as the reduced-rent rollout advances.</p></article>
          <article><span>02</span><b>Your account keeps the old deposit</b><p>Nothing automatically sweeps the surplus back to your wallet.</p></article>
          <article><span>03</span><b>Lamport returns the difference</b><p>Withdraw only the excess and leave the account live and rent-exempt.</p></article>
          <a href="https://solana.com/upgrades/reduced-rent" target="_blank" rel="noreferrer">Follow Solana’s official rollout <span>↗</span></a>
        </div>
      </section>

      <section className="network-metrics" aria-label="Solana rent recovery opportunity">
        <div className="metrics-heading">
          <p className="section-kicker">THE RECOVERY LEDGER</p>
          <h2>A network-sized<br /><em>refund window.</em></h2>
          <p>These figures use different scopes on purpose. Product claims are verified transaction-by-transaction; network opportunity figures are estimates until a complete public index is operating.</p>
        </div>
        <div className="metrics-grid">
          <article className="metric-featured">
            <span>ESTIMATED LEFT TO UNLOCK</span>
            <strong>~$310M</strong>
            <p>Estimated network-wide opportunity across the complete 90% rent-reduction rollout. Changes with SOL price, live state, and future activations.</p>
            <i>MODELLED ESTIMATE • NOT A LIVE BALANCE</i>
          </article>
          <article>
            <span>CLAIMED THROUGH LAMPORT</span>
            <strong>$0</strong>
            <p>Pre-launch baseline. This counter will increase only after confirmed reclaim transactions.</p>
            <i>VERIFIABLE PRODUCT COUNTER</i>
          </article>
          <article>
            <span>PUBLICLY INDEXED IN SPL MINTS</span>
            <strong>176,178 <small>SOL</small></strong>
            <p>A separate public snapshot of excess SOL stranded in 17,049 token mint accounts.</p>
            <a href="https://lost-lamports.vercel.app/mints" target="_blank" rel="noreferrer">View public mint index ↗</a>
          </article>
        </div>
        <div className="metrics-source">
          <span>Method note</span>
          <p>The ~$310M figure is directional, not audited. Before public launch it should be replaced by a reproducible query covering eligible accounts and confirmed withdrawals.</p>
          <a href="https://solana.com/upgrades/reduced-rent" target="_blank" rel="noreferrer">Solana rent source ↗</a>
        </div>
      </section>

      <section className="results-section" aria-label="Example scan results">
        <div className="section-intro">
          <p className="section-kicker">SEE WHAT’S HIDING</p>
          <h2>Small amounts.<br /><em>Real SOL.</em></h2>
          <p>Rent was paid when these accounts were created. When the network lowers the rent floor, the difference becomes yours to take back.</p>
        </div>
        <div className="account-panel">
          <div className="panel-top"><span>EXAMPLE WALLET SCAN</span><span>EXCESS RENT</span></div>
          {demoAccounts.map((account) => (
            <div className="account-row" key={account.name}>
              <div className={'token-icon ' + account.tone}>◎</div>
              <div className="account-name"><b>{account.name}</b><span>{account.address}</span></div>
              <strong>+{account.excess.toFixed(5)} SOL</strong>
            </div>
          ))}
          <div className="panel-total"><span>Total available</span><b>0.08420 SOL</b></div>
        </div>
      </section>

      <section className="difference-section" id="difference">
        <div className="difference-heading">
          <p className="section-kicker">NOT ANOTHER INCINERATOR</p>
          <h2>Recover the surplus.<br /><em>Keep the account.</em></h2>
          <p>Traditional cleanup tools recover rent by permanently closing eligible token accounts. Lamport uses a different Token Program instruction that withdraws only what sits above today’s rent floor.</p>
        </div>
        <div className="comparison-wrap">
          <div className="comparison-cards">
            <article className="compare-card closer-card">
              <div className="compare-top"><span>TRADITIONAL ACCOUNT CLOSER</span><i>DESTRUCTIVE</i></div>
              <div className="account-visual"><div className="account-symbol">×</div><div><b>Token account</b><span>8kP3…xR42</span></div><strong>CLOSED</strong></div>
              <p>Recovers the full rent deposit by deleting an empty account.</p>
            </article>
            <div className="versus">VS</div>
            <article className="compare-card lamport-card">
              <div className="compare-top"><span>LAMPORT RECLAIM</span><i>NON-DESTRUCTIVE</i></div>
              <div className="account-visual"><div className="account-symbol">◎</div><div><b>Token account</b><span>8kP3…xR42</span></div><strong>OPEN</strong></div>
              <p>Recovers only the excess. The account keeps its address, tokens, and current rent reserve.</p>
            </article>
          </div>
          <div className="comparison-table" role="table" aria-label="Account closer compared with Lamport">
            <div className="compare-row compare-head" role="row"><span role="columnheader">WHAT CHANGES</span><b role="columnheader">ACCOUNT CLOSER</b><strong role="columnheader">LAMPORT</strong></div>
            <div className="compare-row" role="row"><span role="cell">Instruction</span><b role="cell">CloseAccount</b><strong role="cell">WithdrawExcessLamports</strong></div>
            <div className="compare-row" role="row"><span role="cell">Account afterward</span><b role="cell">Deleted</b><strong role="cell">Stays open</strong></div>
            <div className="compare-row" role="row"><span role="cell">Token balance</span><b role="cell">Must be handled first</b><strong role="cell">Untouched</strong></div>
            <div className="compare-row" role="row"><span role="cell">Address remains usable</span><b role="cell">No</b><strong role="cell">Yes</strong></div>
            <div className="compare-row" role="row"><span role="cell">SOL recovered</span><b role="cell">Entire rent reserve</b><strong role="cell">Only the new surplus</strong></div>
            <div className="compare-row" role="row"><span role="cell">Best for</span><b role="cell">Dead, empty accounts</b><strong role="cell">Active accounts you keep</strong></div>
          </div>
          <p className="difference-note"><b>Zero close instructions.</b> A Lamport reclaim transaction contains no account-closing step. You review every instruction before signing.</p>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="how-heading"><p className="section-kicker">THREE QUIET STEPS</p><h2>Nothing closes.<br />Nothing moves—<br /><em>except your SOL.</em></h2></div>
        <div className="steps">
          <article><span>01</span><div className="step-icon">⌁</div><h3>Connect & scan</h3><p>We read public account data and compare each balance with today’s rent-exempt minimum.</p></article>
          <article><span>02</span><div className="step-icon">◫</div><h3>Review everything</h3><p>See the exact accounts, estimated network fee, and destination before you approve.</p></article>
          <article><span>03</span><div className="step-icon acid">↓</div><h3>Reclaim</h3><p>Excess lamports return to your wallet. Accounts and token balances stay exactly where they are.</p></article>
        </div>
      </section>

      <section className="pricing-section">
        <div className="pricing-copy">
          <p className="section-kicker">SUCCESS-ONLY PRICING</p>
          <h2>We win only when<br /><em>you recover SOL.</em></h2>
          <p>The service fee is included in the transaction preview and collected only when the reclaim succeeds. Your wallet shows the destination and exact amounts before you sign.</p>
        </div>
        <div className="pricing-card">
          <div className="pricing-badge">PROPOSED LAUNCH PRICING</div>
          <div className="price-row"><span>Standard success fee</span><b>5%</b></div>
          <div className="price-row"><span>Maximum per transaction</span><b>0.05 SOL</b></div>
          <div className="price-row"><span>If nothing is recovered</span><b>0 SOL</b></div>
          <div className="price-row member"><span>Eligible $LAMPORT holder rate</span><b>2.5%</b></div>
          <p>Network fees remain separate and are estimated before signing. The holder threshold will be published before the coin launches.</p>
        </div>
      </section>

      <section className="community-section" id="community">
        <div className="community-coin" aria-hidden="true">
          <div className="coin-halo" />
          <div className="big-coin"><span>◎</span><b>L</b><small>$LAMPORT</small></div>
          <span className="coin-tag">CONCEPT • NOT LAUNCHED</span>
        </div>
        <div className="community-copy">
          <p className="section-kicker light">OPTIONAL COMMUNITY LAYER</p>
          <h2>A coin for the movement.<br /><em>Never a tollbooth.</em></h2>
          <p className="community-lead">$LAMPORT turns the community into product users: eligible holders receive a lower success fee, while everyone keeps access to the same recovery flow.</p>
          <div className="coin-principles">
            <div><b>Fee utility</b><span>Eligible holders receive the proposed 2.5% community rate.</span></div>
            <div><b>Fair launch</b><span>If launched, everyone enters through the same pump.fun market.</span></div>
            <div><b>One official address</b><span>The mint will appear here first—never in replies or DMs.</span></div>
            <div><b>Never required</b><span>No token is needed to scan, review, or reclaim SOL.</span></div>
          </div>
          <div className="coin-actions">
            <a className="coin-primary" href="https://pump.fun/create" target="_blank" rel="noreferrer">Open pump.fun launch page <span>↗</span></a>
            <span className="launch-status"><i /> OFFICIAL COIN NOT LIVE</span>
          </div>
          <p className="coin-risk">Pump.fun coins can move quickly and lose value. The reclaim product and its security must never depend on the token price.</p>
        </div>
      </section>

      <section className="developer-section" id="developers">
        <div className="developer-copy">
          <p className="section-kicker light">FOR BUILDERS</p>
          <h2>Your program’s PDAs<br />may be holding SOL, too.</h2>
          <p>Add a safe reclaim instruction to your own Solana program. Always read the current rent sysvar, verify authority, and move only the excess.</p>
          <a href="https://solana.com/upgrades/reduced-rent" target="_blank" rel="noreferrer">Read the rent rollout <span>↗</span></a>
        </div>
        <div className="code-card" aria-label="Rust reclaim example">
          <code className="code-dim">// Keep the current rent-exempt floor</code>
          <code><span className="code-green">let</span> reserve = Rent::get()?</code>
          <code>&nbsp;&nbsp;.minimum_balance(target.data_len());</code>
          <code>&nbsp;</code>
          <code><span className="code-green">let</span> excess = target.lamports()</code>
          <code>&nbsp;&nbsp;.saturating_sub(reserve);</code>
          <code>&nbsp;</code>
          <code className="code-dim">// Debit and credit the same amount</code>
          <code>**destination.try_borrow_mut_lamports()? += excess;</code>
          <code>**target.try_borrow_mut_lamports()? -= excess;</code>
        </div>
      </section>

      <section className="final-cta">
        <div className="coin-stack" aria-hidden="true"><i>◎</i><i>◎</i><i>◎</i></div>
        <p className="section-kicker">YOUR LAMPORTS. YOUR WALLET.</p>
        <h2>See what’s waiting.</h2>
        <p>A scan is free. You’ll review every account and every lamport before approving anything.</p>
        <button className="primary-action" type="button" onClick={connectWallet}><span className="sol-dot">◎</span> Scan my wallet</button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark">L</span><span>LAMPORT</span></a>
        <p>Built for Solana’s reduced-rent era.</p>
        <div><a href="https://solana.com/upgrades/reduced-rent" target="_blank" rel="noreferrer">Rent rollout</a><a href="#community">Community coin</a><a href="#safety">Safety</a></div>
      </footer>
    </main>
  );
}
