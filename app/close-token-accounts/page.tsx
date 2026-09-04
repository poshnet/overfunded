'use client';

import { useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BrandMark } from '../brand-mark';
import { SITE_NAME, SITE_URL, SOURCE_URL } from '../site-config';
import { ToolToggle } from '../game/tool-toggle';
import {
  calculateServiceFeeLamports,
  closeTokenAccounts,
  estimatedNetworkFeeLamports,
  formatSol,
  getWalletProvider,
  scanClosableTokenAccounts,
  SERVICE_FEE_PERCENT,
  shortenAddress,
  TREASURY_ADDRESS,
  type ClosableTokenAccount,
} from '../game/solana-reclaim';

type CloserState = 'idle' | 'connecting' | 'scanning' | 'ready' | 'closing' | 'won' | 'error';

export default function CloseTokenAccountsPage() {
  const [state, setState] = useState<CloserState>('idle');
  const [wallet, setWallet] = useState('');
  const [accounts, setAccounts] = useState<ClosableTokenAccount[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [notice, setNotice] = useState('Connect a wallet to find empty token accounts on Solana mainnet.');
  const [signatures, setSignatures] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [chargedFeeLamports, setChargedFeeLamports] = useState(0);

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
  const showInventory = busy || state === 'ready' || state === 'won' || (state === 'error' && wallet !== '');
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
              <div><small>EMPTY TOKEN ACCOUNT REVIEW</small><h2>{wallet ? shortenAddress(wallet, 6) : 'Connected wallet'}</h2></div>
              <span>SOLANA MAINNET</span>
            </div>

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
                      <span><b>{account.program === 'token-2022' ? 'Empty Token-2022 account' : 'Empty token account'}</b><small>{shortenAddress(account.address, 6)} · mint {shortenAddress(account.mint, 4)}</small></span>
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
            <small className="closer-kicker">EMPTY TOKEN ACCOUNT CLOSER</small>
            <h1>Dead accounts.<br /><em>Live SOL.</em></h1>
            <p>Close zero-balance Solana token accounts you no longer need and return their full rent deposits to your wallet.</p>
            <div className="closer-rules">
              <span><b>0</b> TOKEN BALANCE REQUIRED</span>
              <span><b>✓</b> YOU REVIEW EVERY ADDRESS</span>
              <span><b>5%</b> SUCCESS FEE</span>
            </div>
            <div className="game-actions"><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + FIND EMPTY ACCOUNTS ▶</button><a href="#how-it-works">HOW IT WORKS ↓</a></div>
            {state === 'error' && <p className="live-notice error">{notice}</p>}
            <div className="closer-warning"><i>!</i><div><b>THIS MODE CLOSES TOKEN ACCOUNTS</b><span>The selected token account addresses are permanently removed. Your wallet and tokens are not closed.</span></div></div>
          </div>
        )}

        <div className="closer-stage">
          <div className="game-stage-head"><span>TOOL 02 / EMPTY ACCOUNT CLEANUP</span><b>{state === 'won' ? 'COMPLETE' : state === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="closer-radar" aria-hidden="true"><i /><i /><i /><span>×</span></div>
          <div className="closer-stage-result"><small>{stageLabel}</small><strong>{busy ? '···' : accounts.length ? `${formatSol(selectedLamports, 5)} SOL` : foundNothing ? 'ALL CLEAN' : '?.???? SOL'}</strong></div>
          <div className="closer-stage-guard"><span>EMPTY ONLY</span><span>OWNER VERIFIED</span><span>DRY-RUN FIRST</span></div>
          <small className="closer-stage-fees">SERVICE + NETWORK</small>
        </div>
      </section>

      <div className="closer-modebar"><span><i /> CLOSER MODE ACTIVE</span><b>ZERO-BALANCE ONLY</b><b>FULL RENT RETURNED</b><b>YOU PICK EVERY ADDRESS</b><a href={SOURCE_URL} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></div>

      <section className="closer-steps" id="how-it-works">
        <div className="closer-section-head"><small>THE CLEANUP RUN</small><h2>Three checks.<br /><em>Then the exit.</em></h2><p>The red tool is intentionally separate from the green reclaim tool. It is for token accounts you are finished with—not active ones you want to keep.</p></div>
        <div className="closer-step-grid">
          <article><b>01</b><span>FIND EMPTY</span><h3>Scan public state</h3><p>We list only supported token accounts with a raw token balance of zero.</p></article>
          <article><b>02</b><span>CHECK CONTROL</span><h3>Verify authority</h3><p>Wrapped SOL and token accounts controlled by another close authority are excluded.</p></article>
          <article><b>03</b><span>CLOSE + RETURN</span><h3>Recover the rent</h3><p>Your wallet approves CloseAccount. The rent lands back in the same wallet.</p></article>
        </div>
      </section>

      <section className="closer-choice">
        <div><small>TWO TOOLS · TWO DIFFERENT JOBS</small><h2>Keep it—or clear it.</h2><p>Use the green Solana rent reclaim tool when a token account should stay alive. Use this red token account closer only when its balance is zero and you are finished with its address.</p></div>
        <div className="closer-choice-grid">
          <a href="/"><i><BrandMark /></i><span><b>GREEN / KEEP OPEN</b><strong>Withdraw excess rent</strong><small>Token account stays usable</small></span><em>GO →</em></a>
          <a className="active" href="/close-token-accounts"><i>×</i><span><b>RED / CLOSE EMPTY</b><strong>Recover full rent</strong><small>Token account is removed</small></span><em>YOU ARE HERE</em></a>
        </div>
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
