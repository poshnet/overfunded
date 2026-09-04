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
    setNotice('Demo complete: 0.0842 SOL reclaimed, 0 accounts closed, and no token balances touched.');
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
        <div className="nav-links"><a href="#how">How it works</a><a href="#community">Community coin</a><a href="#developers">Developers</a></div>
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
          <button className="reclaim-button" type="button" disabled={!isResults} onClick={reclaimDemo}>{isResults ? 'Reclaim 0.0842 SOL' : busy ? 'Scanning accounts…' : 'Connect wallet to continue'}</button>
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

      <section className="how-section" id="how">
        <div className="how-heading"><p className="section-kicker">THREE QUIET STEPS</p><h2>Nothing closes.<br />Nothing moves—<br /><em>except your SOL.</em></h2></div>
        <div className="steps">
          <article><span>01</span><div className="step-icon">⌁</div><h3>Connect & scan</h3><p>We read public account data and compare each balance with today’s rent-exempt minimum.</p></article>
          <article><span>02</span><div className="step-icon">◫</div><h3>Review everything</h3><p>See the exact accounts, estimated network fee, and destination before you approve.</p></article>
          <article><span>03</span><div className="step-icon acid">↓</div><h3>Reclaim</h3><p>Excess lamports return to your wallet. Accounts and token balances stay exactly where they are.</p></article>
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
          <p className="community-lead">$LAMPORT can turn every successful reclaim into a shareable community moment while the recovery tool remains free and useful on its own.</p>
          <div className="coin-principles">
            <div><b>Utility first</b><span>No token required to scan or reclaim.</span></div>
            <div><b>Fair launch</b><span>If launched, everyone enters through the same pump.fun market.</span></div>
            <div><b>One official address</b><span>The mint will appear here first—never in replies or DMs.</span></div>
            <div><b>No promises</b><span>A community coin is speculative, not a claim on product revenue.</span></div>
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
