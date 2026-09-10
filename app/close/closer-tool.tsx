'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BrandMark } from '../brand-mark';
import { SITE_NAME, SITE_URL, SOURCE_URL, TWITTER_HANDLE } from '../site-config';
import { ToolToggle } from '../game/tool-toggle';
import { ToolCompare } from '../tool-compare';
import { StageAmount, type AmountMode } from '../game/stage-amount';
import { RENT_SOURCE_URL } from '../game/solana-reclaim';
import { TokenMetaContext, TokenPortrait, type TokenMeta } from '../token-portrait';
import { ClaimCard } from '../claim-card';
import { BatchSteps } from '../batch-steps';
import type { BatchProgress } from '../game/solana-reclaim';
import { CoinBar } from '../coin-bar';
import { ScrollReveal } from '../scroll-reveal';
import {
  closeTokenAccounts,
  estimatedNetworkFeeLamports,
  formatSol,
  getWalletProvider,
  isMobileBrowser,
  phantomBrowseLink,
  getRememberedWalletAddress,
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  explainScanError,
  forgetWalletAddress,
  rememberWalletAddress,
  CLOSE_SERVICE_FEE_PERCENT,
  PRO_SERVICE_FEE_PERCENT,
  scanClosableTokenAccounts,
  SERVICE_FEE_PERCENT,
  shortenAddress,
  TREASURY_ADDRESS,
  type ClosableTokenAccount,
} from '../game/solana-reclaim';

const COIN_ARCS = [
  { sx: -46, cx: -14, cy: -122, rot: -80, delay: 0.0 },
  { sx: 22, cx: 12, cy: -132, rot: 95, delay: 0.03 },
  { sx: -12, cx: -18, cy: -115, rot: -70, delay: 0.055 },
  { sx: 52, cx: 14, cy: -128, rot: 110, delay: 0.08 },
  { sx: -58, cx: -10, cy: -134, rot: -100, delay: 0.105 },
  { sx: 8, cx: 20, cy: -118, rot: 75, delay: 0.13 },
  { sx: -30, cx: -16, cy: -130, rot: -115, delay: 0.155 },
  { sx: 40, cx: 8, cy: -124, rot: 90, delay: 0.18 },
  { sx: -20, cx: 18, cy: -133, rot: -85, delay: 0.205 },
  { sx: 32, cx: -14, cy: -120, rot: 80, delay: 0.23 },
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
    rawAmount: '0',
    decimals: 0,
    uiAmount: '0',
    selected: true,
  }));
}


const PHASE_TEXT = {
  preparing: 'reading accounts…',
  approving: 'approve it in your wallet',
  confirming: 'confirming on-chain…',
  confirmed: 'paid',
  skipped: 'nothing left to send',
} as const;

export function CloserTool() {
  const [state, setState] = useState<CloserState>('idle');
  // Bumped on every scan so the coin elements remount. CSS animations do not
  // replay when the same class is simply reapplied, which left the coins frozen
  // at the end of their first run on a second scan.
  const [scanRun, setScanRun] = useState(0);
  // Shown after every successful claim. A wallet popup confirming and closing
  // is easy to miss, and people were left unsure anything had happened.
  const [claimCard, setClaimCard] = useState<{ amount: string; accounts: number } | null>(null);
  // One entry per transaction, updated as each is prepared, approved and paid.
  const [batchSteps, setBatchSteps] = useState<BatchProgress[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  // Logos and symbols, filled in after a scan. Missing entries are normal.
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta | null>>({});
  // Only offer to disconnect when this session actually connected. A trusted
  // wallet exposes a publicKey on load without any handshake, which turned the
  // nav button into a disconnect prompt for people who had not connected yet.
  const [connected, setConnected] = useState(false);
  // Set when no injected provider exists at all, which is every in-app browser.
  const [needsWallet, setNeedsWallet] = useState(false);
  // Pro mode also lists accounts that still hold something. Closing one of those
  // burns what is inside, permanently, so it is opt-in and nothing in it is ever
  // pre-selected.
  const [proMode, setProMode] = useState(false);
  // Dust view: fungible leftovers only. An NFT is exactly 1 with zero decimals,
  // so "less than one" excludes them for free and leaves the balances that are
  // almost certainly worthless.
  const [dustOnly, setDustOnly] = useState(false);
  // USD price per mint. null means unknown, which is deliberately not the same
  // as zero: a token we cannot price is never treated as dust.
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [dustLimit, setDustLimit] = useState(0.1);
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
      const provider = getWalletProvider();
      if (provider?.isConnected && provider.publicKey) setConnected(true);
    }, 0);
    return () => window.clearTimeout(syncWallet);
  }, []);

  function valueLabel(account: ClosableTokenAccount) {
    const value = usdValue(account);
    if (value === null) return 'value unknown';
    if (value < 0.01) return '< $0.01';
    return `≈ $${value.toFixed(2)}`;
  }

  function usdValue(account: ClosableTokenAccount) {
    const price = prices[account.mint];
    if (typeof price !== 'number') return null;
    return Number(account.uiAmount) * price;
  }

  /**
   * Dust is decided on value, never on quantity. Half a token sounds negligible
   * until the token is wrapped BTC, so an unpriced mint is excluded outright and
   * an NFT is excluded twice over: it is worth 1 unit and rarely has a price.
   */
  function isDust(account: ClosableTokenAccount) {
    if (account.rawAmount === '0' || account.nft) return false;
    const value = usdValue(account);
    return value !== null && value < dustLimit;
  }
  const visibleAccounts = useMemo(
    () => (proMode && dustOnly ? accounts.filter(isDust) : accounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accounts, proMode, dustOnly, prices, dustLimit],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dustCount = useMemo(() => accounts.filter(isDust).length, [accounts, prices, dustLimit]);
  const selectedAccounts = useMemo(() => accounts.filter(account => account.selected), [accounts]);
  const selectedLamports = useMemo(
    () => selectedAccounts.reduce((sum, account) => sum + account.recoverableLamports, 0),
    [selectedAccounts],
  );
  const serviceFeeLamports = Math.floor(
    (selectedLamports * (proMode ? PRO_SERVICE_FEE_PERCENT : CLOSE_SERVICE_FEE_PERCENT) * 100) / 10_000,
  );
  const networkFeeLamports = estimatedNetworkFeeLamports(selectedAccounts.length);
  const estimatedReceiveLamports = Math.max(0, selectedLamports - serviceFeeLamports - networkFeeLamports);
  const displayedServiceFee = state === 'won' ? chargedFeeLamports : serviceFeeLamports;
  const busy = state === 'connecting' || state === 'scanning' || state === 'closing';
  const showInventory = busy || state === 'ready' || state === 'won' || state === 'demo' || (state === 'error' && wallet !== '');
  const foundNothing = state === 'ready' && accounts.length === 0;

  function focusTool() {
    document.getElementById('token-closer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // People routinely hold several wallets, so the nav address doubles as a
  // sign-out. Confirm first: a stray click here would otherwise drop a scan.
  async function disconnectWallet() {
    if (!window.confirm(`Disconnect ${shortenAddress(wallet)}?\n\nYou can connect a different wallet straight after.`)) return;
    try {
      await getWalletProvider()?.disconnect?.();
    } catch {
      // Not every wallet exposes disconnect, and some reject it while locked.
      // Clearing local state still signs the visitor out of this site.
    }
    forgetWalletAddress();
    setConnected(false);
    setWallet('');
    setAccounts([]);
    setScannedCount(0);
    setSignatures([]);
    setChargedFeeLamports(0);
    setProgress('');
    setState('idle');
    setNotice('Connect a wallet to find empty token accounts on Solana mainnet.');
  }

  /** Prices are advisory: a failure leaves everything unpriced, which is the safe state. */
  async function loadPrices(list: ClosableTokenAccount[]) {
    const mints = [...new Set(list.filter(account => account.rawAmount !== '0').map(account => account.mint))];
    if (!mints.length) return;
    try {
      const response = await fetch(`/api/v1/prices?mints=${mints.slice(0, 100).join(',')}`);
      if (!response.ok) return;
      const payload = await response.json() as { prices?: Record<string, number | null> };
      if (payload.prices) setPrices(payload.prices);
    } catch {
      // Leave prices empty. Nothing becomes dust, so nothing gets bulk-selected.
    }
  }

  /** Cosmetic only: a failure leaves the generated chips in place. */
  async function loadTokenMeta(mints: string[]) {
    const unique = [...new Set(mints)].slice(0, 60);
    if (!unique.length) return;
    try {
      const response = await fetch(`/api/v1/tokens?mints=${unique.join(',')}`);
      if (!response.ok) return;
      const payload = await response.json() as { tokens?: Record<string, TokenMeta | null> };
      if (payload.tokens) setTokenMeta(current => ({ ...current, ...payload.tokens }));
    } catch {
      // Leave the chips as they are.
    }
  }

  function connectAndScan() {
    return runScan(proMode);
  }

  /** Turns pro mode on and immediately rescans with it, so the wider list is one click away. */
  function enableProAndScan() {
    setProMode(true);
    // Dust-only by default. Pro mode's unfiltered list puts real holdings —
    // USDC included — in a list whose button says "close", and the only thing
    // standing between that and a burn is the visitor reading carefully.
    setDustOnly(true);
    setAccounts([]);
    return runScan(true);
  }

  function disableProAndScan() {
    setProMode(false);
    setAccounts([]);
    return runScan(false);
  }

  async function runScan(pro: boolean) {
    focusTool();
    setScanRun(run => run + 1);
    setNeedsWallet(false);
    const provider = getWalletProvider();
    if (!provider) {
      setState('error');
      setNeedsWallet(true);
      setNotice(isMobileBrowser()
        ? 'This browser has no Solana wallet. Reopen the page inside Phantom to connect — links opened from Twitter or Telegram cannot reach a wallet.'
        : 'No compatible Solana browser wallet was detected. Install Phantom, Solflare or Backpack, or use the safe demo.');
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
      setConnected(true);
      setState('scanning');
      setNotice('Checking empty SPL Token and Token-2022 accounts on mainnet…');
      const scan = await scanClosableTokenAccounts(owner, pro);
      setAccounts(scan.accounts);
      void loadTokenMeta(scan.accounts.map(account => account.mint));
      setScannedCount(scan.scannedCount);
      if (pro) void loadPrices(scan.accounts);
      setState('ready');
      setNotice(scan.accounts.length
        ? `Found ${scan.accounts.length} empty token account${scan.accounts.length === 1 ? '' : 's'} you can close. Review every address before approving.`
        : 'Scan complete. No eligible empty token accounts were found.');
    } catch (error) {
      setState('error');
      setNotice(explainScanError(error));
    }
  }

  function playDemo() {
    focusTool();
    setScanRun(run => run + 1);
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

  /**
   * Anything filtered out of view is also deselected. Closing something the
   * visitor cannot see would be indefensible when the action is irreversible.
   */
  function toggleDustOnly() {
    const next = !dustOnly;
    setDustOnly(next);
    if (next) setAccounts(current => current.map(account => (
      isDust(account) ? account : { ...account, selected: false }
    )));
  }

  function selectAllVisible(selected: boolean) {
    const shown = new Set(visibleAccounts.map(account => account.address));
    setAccounts(current => current.map(account => (
      shown.has(account.address) ? { ...account, selected } : account
    )));
  }

  function toggleAccount(address: string) {
    setAccounts(current => current.map(account => account.address === address
      ? { ...account, selected: !account.selected }
      : account));
  }

  async function closeSelected() {
    // A connected wallet stays connected through a demo, so this is reachable
    // with sample accounts loaded. Refuse outright rather than relying on which
    // handler the button happens to be wired to.
    if (state === 'demo') {
      setNotice('This is sample data. Connect a wallet and run a real scan before closing anything.');
      return;
    }
    const provider = getWalletProvider();
    if (!provider || !wallet || selectedAccounts.length === 0) return;
    if (estimatedReceiveLamports <= 0) {
      setNotice('The selected rent is smaller than the service and estimated network fees. Select more token accounts.');
      return;
    }

    try {
      setState('closing');
      setBatchSteps([]);
      setBatchTotal(0);
      setProgress('Preparing transaction 1…');
      setNotice(`Review the CloseAccount instructions and the disclosed fee transfer to ${TREASURY_ADDRESS} in your wallet.`);
      const result = await closeTokenAccounts(
        provider,
        new PublicKey(wallet),
        selectedAccounts,
        (progress) => {
        setBatchTotal(progress.total);
        setBatchSteps(current => {
          const next = current.slice();
          next[progress.index - 1] = progress;
          return next;
        });
        setProgress(progress.total === 1
          ? PHASE_TEXT[progress.phase]
          : `Transaction ${progress.index} of ${progress.total} — ${PHASE_TEXT[progress.phase]}`);
      },
        proMode,
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
      setClaimCard({
        amount: formatSol(result.recoveredLamports - result.serviceFeeLamports, 5),
        accounts: selectedAccounts.length,
      });
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

  const amountMode: AmountMode = busy ? 'scanning'
    : foundNothing ? 'verdict'
      : accounts.length ? 'value'
        : 'unknown';

  const stageLabel = state === 'connecting' ? 'CONNECTING WALLET…'
    : state === 'scanning' ? 'SEARCHING FOR EMPTY TOKEN ACCOUNTS…'
      : state === 'closing' ? (progress || 'WAITING FOR APPROVAL…')
        : state === 'won' ? 'RENT RECOVERED'
          : state === 'demo' ? 'CLEANUP REWARD'
          : foundNothing ? 'NO EMPTY TOKEN ACCOUNTS FOUND'
            : accounts.length ? 'READY TO CLOSE' : 'RECLAIM SOL';

  return (
    <TokenMetaContext.Provider value={tokenMeta}>
    {claimCard && (
      <ClaimCard
        amountSol={claimCard.amount}
        accounts={claimCard.accounts}
        signatures={signatures}
        tone="close"
        onClose={() => setClaimCard(null)}
      />
    )}
    <main className={`game-shell closer-shell closer-${state} ${accounts.length ? 'has-closers' : 'no-closers'}`}>
      <CoinBar />
      <ScrollReveal />
      <nav className="game-nav">
        <a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <ToolToggle mode="close" />
        <button type="button" onClick={connected ? disconnectWallet : connectAndScan} disabled={busy} title={connected ? 'Disconnect this wallet' : undefined}>{connected ? shortenAddress(wallet) : busy ? 'SCANNING…' : 'CONNECT WALLET'} <span aria-hidden="true">{connected ? '×' : '+'}</span></button>
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
                <p>Checked {scannedCount} supported token account{scannedCount === 1 ? '' : 's'}. None are both empty and closable by this wallet, so there is nothing to remove.</p>
                <p className="empty-hint">No transaction was signed and no fee was charged.</p>
                {!proMode && (
                  <div className="empty-upsell">
                    <b>Accounts that still hold something were skipped.</b>
                    <span>
                      Every token account holds rent, including the ones with a leftover NFT or dust balance
                      in them. Pro mode lists those too &mdash; you pick which to close, and their balances
                      are burned to do it.
                    </span>
                    <button type="button" onClick={enableProAndScan} disabled={busy}>
                      LOOK FOR THOSE TOO <span aria-hidden="true">▶</span>
                    </button>
                  </div>
                )}
                <div className="empty-actions">
                  <button type="button" onClick={connectAndScan} disabled={busy}>SCAN AGAIN ↻</button>
                  <button className="game-demo-link" type="button" onClick={backToOverview}>← BACK</button>
                </div>
              </div>
            ) : (
              <>
                <div className="live-summary">
                  <div><span>Selected rent</span><b>{formatSol(selectedLamports, 6)} SOL</b></div>
                  <div><span>Est. you receive</span><b>~{formatSol(estimatedReceiveLamports, 6)} SOL</b></div>
                  <div><span>Total fees</span><b>~{formatSol(displayedServiceFee + networkFeeLamports, 6)} SOL</b><em>service + network</em></div>
                </div>
                <div className={proMode ? 'pro-bar is-on' : 'pro-bar'}>
                  <div>
                    <b>{proMode ? 'PRO MODE ON' : 'PRO MODE OFF'}</b>
                    <span>
                      {proMode
                        ? `Accounts holding tokens are listed. Ticking one burns what is inside, permanently. NFTs also give back their metadata and edition rent. ${PRO_SERVICE_FEE_PERCENT}% fee.`
                        : `Empty accounts only. Turn this on to also close accounts with an NFT or dust still in them.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={proMode ? disableProAndScan : enableProAndScan}
                    disabled={busy || state === 'won'}
                  >{proMode ? 'TURN OFF' : 'TURN ON'}</button>
                </div>
                {proMode && (
                  <div className="dust-bar">
                    <button
                      type="button"
                      className={dustOnly ? 'on' : ''}
                      onClick={toggleDustOnly}
                      disabled={busy || state === 'won'}
                    >{dustOnly ? `DUST ONLY · ${dustCount}` : `SHOWING EVERYTHING (${accounts.length})`}</button>
                    <span>
                      Worth under ${dustLimit.toFixed(2)}. Priced live &mdash; anything we cannot price,
                      and every NFT, stays out of this list.
                    </span>
                    <div className="dust-limits">
                      {[0.01, 0.1, 1].map(limit => (
                        <button
                          key={limit}
                          type="button"
                          className={dustLimit === limit ? 'on' : ''}
                          onClick={() => { setDustLimit(limit); selectAllVisible(false); }}
                          disabled={busy || state === 'won'}
                        >${limit.toFixed(2)}</button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => selectAllVisible(true)}
                      disabled={busy || state === 'won' || !visibleAccounts.length}
                    >SELECT ALL {visibleAccounts.length}</button>
                    <button
                      type="button"
                      onClick={() => selectAllVisible(false)}
                      disabled={busy || state === 'won'}
                    >CLEAR</button>
                  </div>
                )}
                {state === 'demo' && (
                  <div className="demo-banner">
                    <b>SAMPLE DATA</b>
                    <span>Nothing here is real and nothing can be signed. These accounts do not exist on mainnet.</span>
                  </div>
                )}
                <div className="live-account-list">
                  {visibleAccounts.length ? visibleAccounts.map(account => (
                    <label key={account.address} className={account.selected ? 'selected' : ''}>
                      <input type="checkbox" checked={account.selected} onChange={() => toggleAccount(account.address)} disabled={busy || state === 'won'} />
                      <i>{account.selected ? '✓' : ''}</i>
                      <TokenPortrait mint={account.mint} />
                      <span><b>{account.rawAmount === '0' ? (account.program === 'token-2022' ? 'Empty Token-2022 account' : 'Empty token account') : account.nft ? 'NFT — burned, metadata and edition closed too' : `HOLDS ${account.uiAmount} · ${valueLabel(account)} — will be burned`}</b><small>{shortenAddress(account.address, 6)} · token mint {shortenAddress(account.mint, 4)} is not deleted</small></span>
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
            {batchTotal > 0 && <BatchSteps steps={batchSteps} total={batchTotal} />}
            <p className={state === 'error' ? 'live-notice error' : 'live-notice'}>{notice}</p>
            {state === 'won' && (
              <a className="follow-strip" href="https://x.com/reclaimsol" target="_blank" rel="noreferrer">
                <b>ONE GATE OF FIVE IS LIVE</b>
                <span>
                  When the next one activates, these same accounts are worth roughly ten times this.
                  Follow {TWITTER_HANDLE} and we&rsquo;ll post the moment it lands.
                </span>
                <em>FOLLOW ON X <i aria-hidden="true">↗</i></em>
              </a>
            )}
            {signatures.length > 0 && <div className="live-signatures">{signatures.map((signature, index) => (
              <a key={signature} href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Transaction {index + 1}: {shortenAddress(signature, 7)} ↗</a>
            ))}</div>}
          </div>
        ) : (
          <div className="closer-copy">
            <h1>Empty accounts.<br /><em>Full refund.</em></h1>
            <p className="hero-lead">Sell or move a token and the account it lived in stays open behind you &mdash; holding nothing, still holding the ~0.002 SOL you paid to create it. This finds those empty shells and refunds the deposit from all of them at once. <strong>Accounts that still hold a token are never touched</strong>, and nothing is ever sold, swapped or burned. <a className="lead-more" href="#how-it-works">Learn more <span aria-hidden="true">→</span></a></p>
            <div className="closer-rules">
              <span><b>0</b> BALANCE ONLY &mdash; TOKENS YOU HOLD ARE SKIPPED</span>
              <span><b>✓</b> YOU REVIEW EVERY ADDRESS</span>
              <span><b>5%</b> SUCCESS FEE</span>
            </div>
            <div className="game-actions"><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + FIND EMPTY ACCOUNTS ▶</button><button className="game-demo-link" type="button" onClick={playDemo} disabled={busy}>TRY DEMO</button><a className="game-text-link verify-link" href={SOURCE_URL} target="_blank" rel="noreferrer">VERIFY THE CODE <span aria-hidden="true">↗</span></a></div>
            {state === 'error' && <p className="live-notice error">{notice}</p>}
            {needsWallet && (
              <a className="wallet-deeplink" href={phantomBrowseLink(`${SITE_URL}/close`)} target="_blank" rel="noreferrer">
                OPEN IN PHANTOM <span aria-hidden="true">→</span>
              </a>
            )}
            <div className="closer-warning"><i>!</i><div><b>DESTRUCTIVE: THIS MODE CLOSES EMPTY TOKEN ACCOUNTS</b><span>Selected empty token-account addresses are permanently deleted. Tokens are never burned, and your wallet is never closed.</span></div></div>
          </div>
        )}

        <div className="closer-stage">
          <div className="game-stage-head"><span>TOOL 02 / EMPTY ACCOUNT CLEANUP</span><b>{state === 'won' ? 'COMPLETE' : state === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="game-chest-frame">
            <div className="game-chest closer-chest" aria-hidden="true">
              <div className="chest-glow" />
              <div className="chest-dust" />
              <div className="chest-lid" />
              <div className="chest-body"><i /></div>
              {COIN_ARCS.map((arc, index) => (
                <span
                  key={`${scanRun}-${index}`}
                  className="coin"
                  style={{
                    '--sx': `${arc.sx}px`,
                    '--cx': `${arc.cx}px`,
                    '--cy': `${arc.cy}px`,
                      '--rot': `${arc.rot}deg`,
                    animationDelay: `${arc.delay}s`,
                  } as React.CSSProperties}
                ><i>◎</i></span>
              ))}
            </div>
          </div>
          <div className={foundNothing ? 'closer-stage-result is-verdict' : 'closer-stage-result'}><small>{stageLabel}</small><StageAmount mode={amountMode} lamports={selectedLamports} verdict="ALL CLEAN" /></div>
          <div className="stage-mark">{SITE_URL.replace(/^https?:\/\//, '')}</div>
        </div>
        <a className="hero-scroll-cue" href="#how-it-works">MORE DETAILS <span>↓</span></a>
      </section>

      <div className={proMode ? 'closer-modebar is-pro' : 'closer-modebar'}><span><i /> {proMode ? 'PRO MODE · BURNS TOKENS' : 'DESTRUCTIVE CLOSER MODE'}</span><b>{proMode ? `${PRO_SERVICE_FEE_PERCENT}% FEE` : `${CLOSE_SERVICE_FEE_PERCENT}% FEE`}</b><b>TOKEN ACCOUNT DELETED</b><b>{proMode ? 'BALANCES BURNED FOREVER' : 'TOKENS NEVER BURNED'}</b><button type="button" className="pro-switch" onClick={() => { setProMode(value => !value); setAccounts([]); }} disabled={busy}>{proMode ? 'PRO ON' : 'PRO OFF'}</button><a href={SOURCE_URL} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></div>

      <section className="rent-lifecycle" id="how-it-works">
        <div className="closer-section-head">
          <small>WHERE THE RENT COMES FROM</small>
          <h2>Every token account<br /><em>is holding your SOL.</em></h2>
          <p><strong>Not a fee, not a charge — a deposit.</strong> It goes in when the account opens, sits there for as long as the account exists, and comes back out <em>only when something asks for it</em>. Here is that whole life in three steps.</p>
        </div>

        <ol className="lifecycle-panel">
          <li>
            <span className="lc-mark"><i /></span>
            <div className="lc-body">
              <b>YOUR WALLET → THE ACCOUNT</b>
              <h3>It is created</h3>
              <p>The first time you hold a token, an account is opened for it and your wallet funds that account with the rent-exempt minimum — <strong>0.00203928 SOL</strong> under the legacy rate. You paid it without a prompt.</p>
            </div>
          </li>
          <li>
            <span className="lc-mark lc-hold"><i /></span>
            <div className="lc-body">
              <b>INSIDE THE ACCOUNT</b>
              <h3>It sits there</h3>
              <p>The deposit never leaves and is never spent. It exists so validators are paid for keeping the account in memory — and it stays yours the entire time.</p>
            </div>
          </li>
          <li>
            <span className="lc-mark"><i /></span>
            <div className="lc-body">
              <b>THE ACCOUNT → YOUR WALLET</b>
              <h3>It is released</h3>
              <p><strong>CloseAccount</strong> returns the whole deposit and deletes the account. <strong>WithdrawExcessLamports</strong> returns only what sits above today’s lowered floor and leaves the account alive — that floor is being cut by Solana under <a className="source-link" href={RENT_SOURCE_URL} target="_blank" rel="noreferrer">SIMD-0437<span aria-hidden="true">↗</span></a>.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="closer-choice">
        <div><small>YES — THIS ONE IS</small><h2>This is<br /><em>an incinerator.</em></h2><p>The rent reclaim tool is careful to tell you it is <em>not</em> one. This is the other tool. It <strong>deletes the account</strong>, returns the whole deposit, and the address stops working — so reach for it only when the balance is zero and you are <strong>finished with that address for good</strong>.</p></div>
        <ToolCompare current="close" />
      </section>

      <section className="closer-finale"><small>READY TO CLEAN YOUR WALLET?</small><h2>Close the empty.<br /><em>Bring the rent home.</em></h2><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN MAINNET ▶</button><p>{SERVICE_FEE_PERCENT}% service fee only on successful recoveries · same public fee wallet</p></section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${SITE_NAME} Token Account Closer`,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: `${SITE_URL}/close`,
        description: 'Scan and close zero-balance Solana SPL Token and Token-2022 accounts to recover their rent deposits.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: `${CLOSE_SERVICE_FEE_PERCENT}% success fee on recovered rent.` },
      }) }} />

      <footer className="game-footer"><a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/api/v1">API</a><a href="/">Keep token accounts</a><a href="/blog">Blog</a><a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a><a href={RENT_SOURCE_URL} target="_blank" rel="noreferrer">Solana&rsquo;s rollout</a><a href="/legal/risk">Risk</a><a href="/legal/terms">Terms</a><a href="/legal/privacy">Privacy</a></div></footer>
    </main>
    </TokenMetaContext.Provider>
  );
}
