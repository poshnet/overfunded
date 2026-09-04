'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BrandMark } from '../brand-mark';
import { SITE_NAME, SITE_URL, SOURCE_URL } from '../site-config';
import { ToolToggle } from '../game/tool-toggle';
import { ToolCompare } from '../tool-compare';
import { TokenPortrait } from '../token-portrait';
import {
  calculateServiceFeeLamports,
  closeTokenAccounts,
  estimatedNetworkFeeLamports,
  formatSol,
  getWalletProvider,
  getRememberedWalletAddress,
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  rememberWalletAddress,
  scanClosableTokenAccounts,
  SERVICE_FEE_PERCENT,
  shortenAddress,
  TREASURY_ADDRESS,
  type ClosableTokenAccount,
} from '../game/solana-reclaim';

const COIN_ARCS = [
  { cx: 40, cy: -92, fall: -178, rot: 320, delay: 0 },
  { cx: 88, cy: -70, fall: -154, rot: -300, delay: 0.36 },
  { cx: 20, cy: -118, fall: -214, rot: 400, delay: 0.72 },
  { cx: 122, cy: -84, fall: -146, rot: -360, delay: 1.08 },
  { cx: 60, cy: -106, fall: -196, rot: 290, delay: 1.44 },
  { cx: 150, cy: -62, fall: -132, rot: 440, delay: 1.8 },
  { cx: 8, cy: -80, fall: -168, rot: -320, delay: 2.16 },
  { cx: 104, cy: -124, fall: -204, rot: 370, delay: 0.18 },
  { cx: 70, cy: -54, fall: -140, rot: -400, delay: 0.54 },
  { cx: 172, cy: -96, fall: -162, rot: 330, delay: 0.9 },
  { cx: 34, cy: -138, fall: -226, rot: -260, delay: 1.26 },
  { cx: 134, cy: -108, fall: -188, rot: 410, delay: 1.62 },
];

type CloserState = 'idle' | 'connecting' | 'scanning' | 'ready' | 'closing' | 'won' | 'error' | 'demo';

const DEMO_MINTS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6hXNBWwG9Uj',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'HZ1JovNiVvGrGNiiYvEozEVgB5PhnCSuXzLNBHGomr',
];

function buildDemoAccounts(): ClosableTokenAccount[] {
  return Array.from({ length: 8 }, (_, index) => ({
    address: `SampleEmptyTokenAccount${String(index + 1).padStart(2, '0')}Rent`,
    mint: DEMO_MINTS[index % DEMO_MINTS.length],
    program: index === 3 || index === 7 ? 'token-2022' as const : 'token' as const,
    recoverableLamports: LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
    selected: true,
  }));
}


export default function CloseTokenAccountsPage() {
  const [state, setState] = useState<CloserState>('idle');
  const [wallet, setWallet] = useState('');
  const [accounts, setAccounts] = useState<ClosableTokenAccount[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [notice, setNotice] = useState('Connect a wallet to find empty token accounts on Solana mainnet.');
  const [signatures, setSignatures] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [chargedFeeLamports, setChargedFeeLamports] = useState(0);

  useEffect(() => {
    const syncWallet = window.setTimeout(() => {
      const remembered = getRememberedWalletAddress();
      if (remembered) setWallet(remembered);
    }, 0);
    return () => window.clearTimeout(syncWallet);
  }, []);

  const selectedAccounts = useMemo(() => accounts.filter(account => account.selected), [accounts]);
  const selectedLamports = useMemo(
    () => selectedAccounts.reduce((sum, account) => sum + account.recoverableLamports, 0),
    [selectedAccounts],
  );
  const serviceFeeLamports = calculateServiceFeeLamports(selectedLamports);
  const networkFeeLamports = estimatedNetworkFeeLamports(selectedAccounts.length);
  const estimatedReceiveLamports = Math.max(0, selectedLamports - serviceFeeLamports - networkFeeLamports);
  const displayedServiceFee = state === 'won' ? chargedFeeLamports : serviceFeeLamports;
  const busy = state === 'connecting' || state === 'scanning' || state === 'closing';
  const showInventory = busy || state === 'ready' || state === 'won' || state === 'demo' || (state === 'error' && wallet !== '');
  const foundNothing = state === 'ready' && accounts.length === 0;

  function focusTool() {
    document.getElementById('token-closer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function connectAndScan() {
    focusTool();
    const provider = getWalletProvider();
    if (!provider) {
      setState('error');
      setNotice('No compatible Solana browser wallet was detected. Install Phantom or Solflare and try again.');
      return;
    }

    try {
      setState('connecting');
      setNotice('Waiting for wallet permission…');
      setSignatures([]);
      setProgress('');
      setChargedFeeLamports(0);
      setScannedCount(0);
      const response = await provider.connect();
      const owner = new PublicKey(response.publicKey.toString());
      setWallet(owner.toBase58());
      rememberWalletAddress(owner.toBase58());
      setState('scanning');
      setNotice('Checking empty SPL Token and Token-2022 accounts on mainnet…');
      const scan = await scanClosableTokenAccounts(owner);
      setAccounts(scan.accounts);
      setScannedCount(scan.scannedCount);
      setState('ready');
      setNotice(scan.accounts.length
        ? `Found ${scan.accounts.length} empty token account${scan.accounts.length === 1 ? '' : 's'} you can close. Review every address before approving.`
        : 'Scan complete. No eligible empty token accounts were found.');
    } catch (error) {
      setState('error');
      setNotice(error instanceof Error ? error.message : 'The wallet scan was cancelled or could not complete.');
    }
  }

  function playDemo() {
    focusTool();
    setState('scanning');
    setAccounts([]);
    setSignatures([]);
    setProgress('');
    setChargedFeeLamports(0);
    setNotice('Running a sample empty-account scan. No wallet or network request is being used.');
    window.setTimeout(() => {
      const demoAccounts = buildDemoAccounts();
      setAccounts(demoAccounts);
      setScannedCount(demoAccounts.length);
      setState('demo');
      setNotice('Demo result: eight empty token accounts funded at the standard legacy rent deposit. Nothing here can be closed—connect your wallet for live mainnet results.');
    }, 700);
  }

  function backToOverview() {
    setState('idle');
    setAccounts([]);
    setScannedCount(0);
    setSignatures([]);
    setProgress('');
    setNotice('Connect a wallet to find empty token accounts on Solana mainnet.');
  }

  function toggleAccount(address: string) {
    setAccounts(current => current.map(account => account.address === address
      ? { ...account, selected: !account.selected }
      : account));
  }

  async function closeSelected() {
    const provider = getWalletProvider();
    if (!provider || !wallet || selectedAccounts.length === 0) return;
    if (estimatedReceiveLamports <= 0) {
      setNotice('The selected rent is smaller than the service and estimated network fees. Select more token accounts.');
      return;
    }

    try {
      setState('closing');
      setProgress('Preparing transaction 1…');
      setNotice(`Review the CloseAccount instructions and the disclosed fee transfer to ${TREASURY_ADDRESS} in your wallet.`);
      const result = await closeTokenAccounts(
        provider,
        new PublicKey(wallet),
        selectedAccounts,
        (completed, total) => setProgress(`Confirmed ${completed} of ${total} transaction${total === 1 ? '' : 's'}`),
      );
      setSignatures(result.signatures);
      setChargedFeeLamports(result.serviceFeeLamports);

      if (result.error) {
        setState('error');
        setProgress(result.signatures.length ? `Stopped after ${result.completedBatches} of ${result.totalBatches} transactions` : '');
        setNotice(result.signatures.length
          ? `${result.error} ${result.signatures.length} transaction${result.signatures.length === 1 ? '' : 's'} already confirmed; the remaining token accounts were left untouched. Scan again to refresh.`
          : `${result.error} No transaction was submitted and no fee was charged.`);
        return;
      }

      setState('won');
      setProgress('Cleanup complete');
      setNotice(`Closed ${selectedAccounts.length} empty token account${selectedAccounts.length === 1 ? '' : 's'} and returned ${formatSol(result.recoveredLamports - result.serviceFeeLamports)} SOL before network fees. ${result.serviceFeeWaived ? 'The service fee was waived.' : `${formatSol(result.serviceFeeLamports)} SOL went to the disclosed fee wallet.`}`);
    } catch (error) {
      setState('error');
      setProgress('');
      setNotice(error instanceof Error ? error.message : 'The transaction was cancelled or failed.');
    }
  }

  const action = state === 'won'
    ? { label: 'SCAN AGAIN ↻', onClick: connectAndScan, disabled: busy }
    : state === 'demo'
      ? { label: 'CONNECT A REAL WALLET →', onClick: connectAndScan, disabled: busy }
    : state === 'error'
      ? { label: 'TRY AGAIN ↻', onClick: connectAndScan, disabled: busy }
      : busy
        ? { label: state === 'closing' ? 'WAITING FOR WALLET…' : 'SCANNING MAINNET…', onClick: () => {}, disabled: true }
        : foundNothing
          ? { label: 'SCAN AGAIN ↻', onClick: connectAndScan, disabled: false }
          : {
            label: `CLOSE ${selectedAccounts.length} TOKEN ACCOUNT${selectedAccounts.length === 1 ? '' : 'S'} →`,
            onClick: closeSelected,
            disabled: selectedAccounts.length === 0 || estimatedReceiveLamports <= 0,
          };

  const stageLabel = state === 'connecting' ? 'CONNECTING WALLET…'
    : state === 'scanning' ? 'SEARCHING FOR EMPTY TOKEN ACCOUNTS…'
      : state === 'closing' ? (progress || 'WAITING FOR APPROVAL…')
        : state === 'won' ? 'RENT RECOVERED'
          : state === 'demo' ? 'SAMPLE CLEANUP REWARD'
          : foundNothing ? 'NO EMPTY TOKEN ACCOUNTS FOUND'
            : accounts.length ? 'READY TO CLOSE' : 'CLEANUP REWARD';

  return (
    <main className={`game-shell closer-shell closer-${state} ${accounts.length ? 'has-closers' : 'no-closers'}`}>
      <nav className="game-nav">
        <a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <ToolToggle mode="close" />
        <button type="button" onClick={connectAndScan} disabled={busy}>{wallet ? shortenAddress(wallet) : busy ? 'SCANNING…' : 'CONNECT WALLET'} <span>+</span></button>
      </nav>

      <section className="closer-hero" id="token-closer">
        <div className="game-grid" aria-hidden="true" />
        {showInventory ? (
          <div className="closer-copy closer-inventory" aria-live="polite">
            <div className="live-results-head">
              <div><small>{state === 'demo' ? 'DEMO EMPTY-ACCOUNT REVIEW' : 'EMPTY TOKEN ACCOUNT REVIEW'}</small><h2>{state === 'demo' ? 'Sample wallet' : wallet ? shortenAddress(wallet, 6) : 'Connected wallet'}</h2></div>
              <div className="results-head-actions"><button className="inventory-back" type="button" onClick={backToOverview}><span aria-hidden="true">←</span> BACK</button><span className={state === 'demo' ? 'demo' : ''}>{state === 'demo' ? 'DEMO DATA' : 'SOLANA MAINNET'}</span></div></div>

            {foundNothing ? (
              <div className="inventory-empty closer-empty">
                <i aria-hidden="true">✓</i>
                <b>NOTHING TO CLEAN UP</b>
                <p>Checked {scannedCount} supported token account{scannedCount === 1 ? '' : 's'}. None are both empty and closable by this wallet.</p>
                <p className="empty-hint">No transaction was signed and no fee was charged.</p>
              </div>
            ) : (
              <>
                <div className="live-summary">
                  <div><span>Selected rent</span><b>{formatSol(selectedLamports, 6)} SOL</b></div>
                  <div><span>Est. you receive</span><b>~{formatSol(estimatedReceiveLamports, 6)} SOL</b></div>
                  <div><span>Total fees</span><b>~{formatSol(displayedServiceFee + networkFeeLamports, 6)} SOL</b><em>service + network</em></div>
                </div>
                <div className="live-account-list">
                  {accounts.length ? accounts.map(account => (
                    <label key={account.address} className={account.selected ? 'selected' : ''}>
                      <input type="checkbox" checked={account.selected} onChange={() => toggleAccount(account.address)} disabled={busy || state === 'won'} />
                      <i>{account.selected ? '✓' : ''}</i>
                      <TokenPortrait mint={account.mint} />
                      <span><b>{account.program === 'token-2022' ? 'Empty Token-2022 account' : 'Empty token account'}</b><small>{shortenAddress(account.address, 6)} · token mint {shortenAddress(account.mint, 4)} is not deleted</small></span>
                      <strong>+{formatSol(account.recoverableLamports, 6)} SOL</strong>
                    </label>
                  )) : (
                    <div className="live-empty"><b>{busy ? 'READING MAINNET…' : 'NO ELIGIBLE TOKEN ACCOUNTS'}</b><span>{busy ? 'Checking balances and close authority.' : 'Only empty token accounts controlled by this wallet can appear here.'}</span></div>
                  )}
                </div>
                <div className="live-approval closer-approval">
                  <div>
                    <b>PERMANENT ACTION</b>
                    <span>Every selected address will stop working. Only zero-balance token accounts are shown; nothing is burned.</span>
                    <a href={`https://solscan.io/account/${TREASURY_ADDRESS}`} target="_blank" rel="noreferrer">FEE WALLET: {shortenAddress(TREASURY_ADDRESS, 8)} ↗</a>
                  </div>
                  <button type="button" onClick={action.onClick} disabled={action.disabled}>{action.label}</button>
                </div>
              </>
            )}
            <p className={state === 'error' ? 'live-notice error' : 'live-notice'}>{notice}</p>
            {signatures.length > 0 && <div className="live-signatures">{signatures.map((signature, index) => (
              <a key={signature} href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Transaction {index + 1}: {shortenAddress(signature, 7)} ↗</a>
            ))}</div>}
          </div>
        ) : (
          <div className="closer-copy">
            <h1>Dead accounts.<br /><em>Live SOL.</em></h1>
            <p>Close zero-balance Solana token accounts you no longer need and return their full rent deposits to your wallet.</p>
            <div className="closer-rules">
              <span><b>0</b> TOKEN BALANCE REQUIRED</span>
              <span><b>✓</b> YOU REVIEW EVERY ADDRESS</span>
              <span><b>5%</b> SUCCESS FEE</span>
            </div>
            <div className="game-actions"><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + FIND EMPTY ACCOUNTS ▶</button><button className="game-demo-link" type="button" onClick={playDemo} disabled={busy}>TRY DEMO</button><a className="game-text-link" href="#how-it-works">HOW IT WORKS ↓</a></div>
            {state === 'error' && <p className="live-notice error">{notice}</p>}
            <div className="closer-warning"><i>!</i><div><b>DESTRUCTIVE: THIS MODE CLOSES TOKEN ACCOUNTS</b><span>Selected empty token-account addresses are permanently deleted. Tokens are never burned, and your wallet is never closed.</span></div></div>
          </div>
        )}

        <div className="closer-stage">
          <div className="game-stage-head"><span>TOOL 02 / EMPTY ACCOUNT CLEANUP</span><b>{state === 'won' ? 'COMPLETE' : state === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="game-chest closer-chest" aria-hidden="true">
            <div className="chest-glow" />
            <div className="chest-dust" />
            <div className="chest-lid" />
            <div className="chest-body"><i /></div>
            {COIN_ARCS.map((arc, index) => (
              <span
                key={index}
                className="coin"
                style={{
                  '--cx': `${arc.cx}px`,
                  '--cy': `${arc.cy}px`,
                  '--fall': `${arc.fall}px`,
                  '--rot': `${arc.rot}deg`,
                  animationDelay: `${arc.delay}s`,
                } as React.CSSProperties}
              >◎</span>
            ))}
          </div>
          <div className="closer-stage-result"><small>{stageLabel}</small><strong>{busy ? '···' : accounts.length ? `${formatSol(selectedLamports, 5)} SOL` : foundNothing ? 'ALL CLEAN' : '??? SOL'}</strong></div>
          <div className="closer-stage-guard"><span>EMPTY ONLY</span><span>OWNER VERIFIED</span><span>DRY-RUN FIRST</span></div>
          <small className="closer-stage-fees">SERVICE + NETWORK</small>
        </div>
        <a className="hero-scroll-cue" href="#how-it-works">MORE DETAILS <span>↓</span></a>
      </section>

      <div className="closer-modebar"><span><i /> DESTRUCTIVE CLOSER MODE</span><b>ZERO-BALANCE ONLY</b><b>TOKEN ACCOUNT DELETED</b><b>TOKENS NEVER BURNED</b><a href={SOURCE_URL} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></div>

      <section className="rent-lifecycle" id="how-it-works">
        <div className="closer-section-head">
          <small>WHERE THE RENT COMES FROM</small>
          <h2>Every token account<br /><em>is holding your SOL.</em></h2>
          <p>Not a fee, not a charge — a deposit. It goes in when the account opens, sits there for as long as the account exists, and comes back out only when something asks for it. Here is that whole life in three steps.</p>
        </div>

        <div className="lifecycle-panel">
          <div className="lifecycle-track" aria-hidden="true">
            <div className="lc-node"><i /><b>YOUR WALLET</b><small>funds the account</small></div>
            <div className="lc-rail"><span /></div>
            <div className="lc-node lc-vault"><i /><b>TOKEN ACCOUNT</b><small>holds the deposit</small></div>
            <div className="lc-rail"><span /></div>
            <div className="lc-node"><i /><b>YOUR WALLET</b><small>gets it back</small></div>
          </div>

          <ol className="lifecycle-steps">
            <li>
              <b>01</b>
              <h3>It is created</h3>
              <p>The first time you hold a token, a token account is opened for it and your wallet funds that account with the rent-exempt minimum — <strong>0.00203928 SOL</strong> under the legacy rate. You paid it without a prompt.</p>
            </li>
            <li>
              <b>02</b>
              <h3>It sits there</h3>
              <p>The deposit never leaves the account and is never spent. It exists so validators are paid for keeping the account in memory — and it stays yours the entire time.</p>
            </li>
            <li>
              <b>03</b>
              <h3>It is released</h3>
              <p>Two instructions can move it. <strong>CloseAccount</strong> returns the whole deposit and deletes the account. <strong>WithdrawExcessLamports</strong> returns only what sits above today’s lowered floor and leaves the account alive.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="closer-choice">
        <div><small>YES — THIS ONE IS</small><h2>This is<br /><em>an incinerator.</em></h2><p>The rent reclaim tool is careful to tell you it is not one. This is the other tool. It deletes the account, returns the whole deposit, and the address stops working — so reach for it only when the balance is zero and you are finished with that address for good.</p></div>
        <ToolCompare current="close" />
      </section>

      <section className="closer-finale"><small>READY TO CLEAN YOUR WALLET?</small><h2>Close the empty.<br /><em>Bring the rent home.</em></h2><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN MAINNET ▶</button><p>{SERVICE_FEE_PERCENT}% service fee only on successful recoveries · same public fee wallet</p></section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${SITE_NAME} Token Account Closer`,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: `${SITE_URL}/close-token-accounts`,
        description: 'Scan and close zero-balance Solana SPL Token and Token-2022 accounts to recover their rent deposits.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: `${SERVICE_FEE_PERCENT}% success fee on recovered rent.` },
      }) }} />

      <footer className="game-footer"><a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/">Keep token accounts</a><a href="/blog">Blog</a><a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a></div></footer>
    </main>
  );
}
