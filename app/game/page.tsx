'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  calculateServiceFeeLamports,
  estimatedNetworkFeeLamports,
  formatSol,
  getCurrentRentFloorLamports,
  getRememberedWalletAddress,
  getTreasuryActivity,
  activeStageIndex,
  getWalletProvider,
  lamportsPerByteFromFloor,
  LEGACY_LAMPORTS_PER_BYTE,
  LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS,
  RENT_SOURCE_URL,
  RENT_STAGES,
  rentFloorFor,
  stageState,
  stageReductionPercent,
  reclaimAccounts,
  rememberWalletAddress,
  scanReclaimableAccounts,
  SERVICE_FEE_PERCENT,
  shortenAddress,
  TOKEN_ACCOUNT_SPACE,
  TREASURY_ADDRESS,
  type ReclaimableAccount,
} from './solana-reclaim';
import { SITE_NAME, SITE_URL, SOURCE_URL } from '../site-config';
import { StageAmount, type AmountMode } from './stage-amount';
import { ToolCompare } from '../tool-compare';
import { TokenPortrait } from '../token-portrait';
import { BrandMark } from '../brand-mark';
import { ToolToggle } from './tool-toggle';

type QuestState = 'idle' | 'connecting' | 'scanning' | 'ready' | 'reclaiming' | 'won' | 'error' | 'demo';

// Each coin gets its own arc out of the chest mouth: sideways drift, peak
// height, where it falls to, spin and start offset. Fixed values keep the
// server and client markup identical.
const COIN_ARCS = [
  { cx: 46, cy: -96, fall: -188, rot: 340, delay: 0 },
  { cx: 92, cy: -74, fall: -164, rot: -290, delay: 0.34 },
  { cx: 28, cy: -122, fall: -226, rot: 420, delay: 0.68 },
  { cx: 128, cy: -88, fall: -152, rot: -380, delay: 1.02 },
  { cx: 64, cy: -110, fall: -206, rot: 300, delay: 1.36 },
  { cx: 156, cy: -66, fall: -138, rot: 460, delay: 1.7 },
  { cx: 12, cy: -84, fall: -176, rot: -330, delay: 2.04 },
  { cx: 108, cy: -128, fall: -214, rot: 390, delay: 0.17 },
  { cx: 74, cy: -58, fall: -148, rot: -420, delay: 0.51 },
  { cx: 182, cy: -100, fall: -170, rot: 350, delay: 0.85 },
  { cx: 40, cy: -142, fall: -238, rot: -270, delay: 1.19 },
  { cx: 140, cy: -112, fall: -196, rot: 430, delay: 1.53 },
];

const DEMO_MINTS = ['USDC', 'BONK', 'JUP', 'PYTH', 'WIF', 'JTO', 'RAY', 'ORCA'];

function buildDemoAccounts(rentFloorLamports: number): ReclaimableAccount[] {
  const excessLamports = Math.max(0, LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - rentFloorLamports);
  return Array.from({ length: 20 }, (_, index) => ({
    address: `DemoTokenAccount${String(index + 1).padStart(2, '0')}xRent`,
    dataLength: TOKEN_ACCOUNT_SPACE,
    excessLamports,
    mint: `${DEMO_MINTS[index % DEMO_MINTS.length]}demoMint${index + 1}`,
    program: index % 5 === 4 ? 'token-2022' as const : 'token' as const,
    rentFloorLamports,
    selected: true,
  }));
}

export default function GamePrototype() {
  const [quest, setQuest] = useState<QuestState>('idle');
  const [wallet, setWallet] = useState('');
  const [accounts, setAccounts] = useState<ReclaimableAccount[]>([]);
  const [notice, setNotice] = useState('Connect a wallet to scan live Solana mainnet data.');
  const [signatures, setSignatures] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [chargedFeeLamports, setChargedFeeLamports] = useState(0);
  const [liveFloorLamports, setLiveFloorLamports] = useState<number | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [treasury, setTreasury] = useState<{ reclaimedLamports: number; feesCollectedLamports: number } | null>(null);

  // The root layout survives the client-side tool switch, and sessionStorage
  // keeps the public wallet identity visible if either page remounts.
  useEffect(() => {
    const syncWallet = window.setTimeout(() => {
      const remembered = getRememberedWalletAddress();
      if (remembered) setWallet(remembered);
    }, 0);
    return () => window.clearTimeout(syncWallet);
  }, []);

  // Read the cluster's own rent-exempt minimum so the reduction section quotes a
  // number the visitor can verify instead of a marketing figure.
  useEffect(() => {
    let cancelled = false;
    getCurrentRentFloorLamports()
      .then(floor => { if (!cancelled) setLiveFloorLamports(floor); })
      .catch(() => { if (!cancelled) setLiveFloorLamports(null); });
    return () => { cancelled = true; };
  }, []);

  // The settled-transactions counter is read from the treasury's own history
  // rather than hardcoded, so it moves the moment a reclaim charges a fee.
  useEffect(() => {
    let cancelled = false;
    getTreasuryActivity()
      .then(activity => { if (!cancelled) setTreasury(activity); })
      .catch(() => { if (!cancelled) setTreasury(null); });
    return () => { cancelled = true; };
  }, []);

  const selectedAccounts = useMemo(() => accounts.filter(account => account.selected), [accounts]);
  const selectedLamports = useMemo(() => selectedAccounts.reduce((sum, account) => sum + account.excessLamports, 0), [selectedAccounts]);
  const networkFeeLamports = estimatedNetworkFeeLamports(selectedAccounts.length);
  const serviceFeeLamports = calculateServiceFeeLamports(selectedLamports);
  const estimatedReceiveLamports = Math.max(0, selectedLamports - serviceFeeLamports - networkFeeLamports);
  const chargedOrQuotedFee = quest === 'won' ? chargedFeeLamports : serviceFeeLamports;
  const totalFeeLamports = chargedOrQuotedFee + networkFeeLamports;
  const busy = quest === 'connecting' || quest === 'scanning' || quest === 'reclaiming';
  const showInventory = busy || quest === 'ready' || quest === 'won' || quest === 'demo' || (quest === 'error' && wallet !== '');
  // A finished scan that found nothing gets its own state. The chest must not
  // burst open on an empty wallet, and zeroed summary tiles read as a bug.
  const foundNothing = quest === 'ready' && accounts.length === 0;

  const reductionPercent = liveFloorLamports === null
    ? null
    : Math.max(0, Math.round((1 - liveFloorLamports / LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS) * 100));
  const perAccountUnlockedLamports = liveFloorLamports === null
    ? null
    : Math.max(0, LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - liveFloorLamports);
  const newFloorBarWidth = liveFloorLamports === null
    ? 100
    : Math.max(2, Math.round((liveFloorLamports / LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS) * 100));

  // Which SIMD-0437 stages have actually activated is read off the live floor,
  // never assumed, so the ladder stays honest as the rollout advances.
  const liveRate = liveFloorLamports === null ? null : Math.round(lamportsPerByteFromFloor(liveFloorLamports));
  const stageIndex = liveFloorLamports === null ? -1 : activeStageIndex(liveFloorLamports);
  const stagesLive = stageIndex + 1;
  const finalStage = RENT_STAGES[RENT_STAGES.length - 1];
  const finalFloorLamports = rentFloorFor(TOKEN_ACCOUNT_SPACE, finalStage.lamportsPerByte);

  // What this exact wallet will be owed once every gate lands, derived per
  // account from its real size rather than assuming they are all 165 bytes.
  const futureSurplusLamports = accounts.reduce((sum, account) => {
    const heldNow = account.rentFloorLamports + account.excessLamports;
    return sum + Math.max(0, heldNow - rentFloorFor(account.dataLength, finalStage.lamportsPerByte));
  }, 0);
  const stagesRemaining = RENT_STAGES.length - stagesLive;
  const finalSurplusLamports = LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - finalFloorLamports;
  function focusQuest() {
    const hero = document.getElementById('quest');
    if (!hero) return;
    const box = hero.getBoundingClientRect();
    const alreadyLooking = box.top < window.innerHeight * 0.5 && box.bottom > 0;
    if (alreadyLooking) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    hero.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  async function connectAndScan() {
    focusQuest();
    const provider = getWalletProvider();
    if (!provider) {
      setQuest('error');
      setNotice('No compatible Solana browser wallet was detected. Install Phantom or Solflare, or use the safe demo.');
      return;
    }

    try {
      setQuest('connecting');
      setNotice('Waiting for wallet permission…');
      setSignatures([]);
      setProgress('');
      setChargedFeeLamports(0);
      setScannedCount(0);
      const response = await provider.connect();
      const owner = new PublicKey(response.publicKey.toString());
      setWallet(owner.toBase58());
      rememberWalletAddress(owner.toBase58());
      setQuest('scanning');
      setNotice('Reading Token Program and Token-2022 accounts from mainnet…');
      const scan = await scanReclaimableAccounts(owner);
      setAccounts(scan.accounts);
      setScannedCount(scan.scannedCount);
      setQuest('ready');
      setNotice(scan.accounts.length
        ? `Found ${scan.accounts.length} account${scan.accounts.length === 1 ? '' : 's'} with excess rent. Review and select them below.`
        : 'Scan complete. Nothing in this wallet is above the current rent floor.');
    } catch (error) {
      setQuest('error');
      setNotice(error instanceof Error ? error.message : 'The wallet scan was cancelled or could not complete.');
    }
  }

  function playDemo() {
    focusQuest();
    setQuest('scanning');
    setNotice('Running a sample scan—no wallet or network request is being used.');
    setSignatures([]);
    setProgress('');
    setChargedFeeLamports(0);
    window.setTimeout(() => {
      const demoFloor = liveFloorLamports ?? rentFloorFor(TOKEN_ACCOUNT_SPACE, RENT_STAGES[0].lamportsPerByte);
      const demoAccounts = buildDemoAccounts(demoFloor);
      setAccounts(demoAccounts);
      setScannedCount(demoAccounts.length);
      setQuest('demo');
      setNotice('Demo result: 20 standard token accounts funded at the legacy rent floor. Connect a wallet to scan live mainnet SOL.');
    }, 900);
  }

  function backToOverview() {
    setQuest('idle');
    setAccounts([]);
    setScannedCount(0);
    setSignatures([]);
    setProgress('');
    setNotice('Connect a wallet to scan live Solana mainnet data.');
  }

  function toggleAccount(address: string) {
    setAccounts(current => current.map(account => account.address === address
      ? { ...account, selected: !account.selected }
      : account));
  }

  async function reclaimSelected() {
    const provider = getWalletProvider();
    if (!provider || !wallet || selectedAccounts.length === 0) return;
    if (estimatedReceiveLamports <= 0) {
      setNotice('The selected recovery is smaller than the disclosed service fee and estimated network fee. Select more accounts or wait for more excess.');
      return;
    }

    try {
      setQuest('reclaiming');
      setProgress('Preparing transaction 1…');
      setNotice(`Your wallet will ask you to approve each transaction. Verify the WithdrawExcessLamports instructions and the disclosed fee transfer to ${TREASURY_ADDRESS}.`);
      const owner = new PublicKey(wallet);
      const result = await reclaimAccounts(provider, owner, selectedAccounts, (completed, total) => {
        setProgress(`Confirmed ${completed} of ${total} transaction${total === 1 ? '' : 's'}`);
      });

      // Confirmed batches are on-chain and already paid for, so they are always
      // reported — a failure part way through is a partial result, not a reset.
      setSignatures(result.signatures);
      setChargedFeeLamports(result.serviceFeeLamports);

      if (result.error) {
        setQuest('error');
        setProgress(result.signatures.length ? `Stopped after ${result.completedBatches} of ${result.totalBatches} transactions` : '');
        setNotice(result.signatures.length
          ? `${result.error} ${result.signatures.length} transaction${result.signatures.length === 1 ? '' : 's'} had already confirmed: ${formatSol(result.recoveredLamports - result.serviceFeeLamports)} SOL reached your wallet and ${formatSol(result.serviceFeeLamports)} SOL was charged as the disclosed fee. The remaining accounts were left untouched — scan again to finish them.`
          : `${result.error} No transaction was submitted and no fee was charged.`);
        return;
      }

      setQuest('won');
      setProgress('Quest complete');
      setNotice(result.signatures.length
        ? `Recovered ${formatSol(result.recoveredLamports - result.serviceFeeLamports)} SOL before network fees. ${result.serviceFeeWaived ? 'The service fee was waived on this reclaim.' : `The disclosed ${formatSol(result.serviceFeeLamports)} SOL service fee went to the treasury.`} No token accounts were closed.`
        : 'The accounts were already at the current rent floor. Nothing was changed.');
    } catch (error) {
      setQuest('error');
      setProgress('');
      setNotice(error instanceof Error ? error.message : 'The transaction was cancelled or failed. Nothing else was submitted.');
    }
  }

  const stageLabel = quest === 'connecting' ? 'CONNECTING WALLET…'
    : quest === 'scanning' ? 'SEARCHING TOKEN ACCOUNTS…'
      : quest === 'reclaiming' ? (progress || 'WAITING FOR APPROVAL…')
        : quest === 'won' ? 'RECOVERY CONFIRMED'
          : quest === 'demo' ? 'SAMPLE TREASURE FOUND'
            : quest === 'ready' && accounts.length === 0 ? 'ALREADY AT THE RENT FLOOR'
              : quest === 'ready' ? 'TREASURE FOUND' : 'UNCLAIMED SOL';
  // '?' only survives while the answer is genuinely unknown. Once a scan has
  // finished the figure is known, even when it is zero.
  const amountMode: AmountMode = busy ? 'scanning'
    : foundNothing ? 'verdict'
      : accounts.length ? 'value'
        : 'unknown';

  // One action at a time: the hero shows either the marketing CTA or the
  // inventory's own button, never two copies of the same control.
  const inventoryAction = quest === 'won'
    ? { label: 'SCAN AGAIN ↻', onClick: connectAndScan, disabled: busy }
    : quest === 'demo'
      ? { label: 'CONNECT A REAL WALLET →', onClick: connectAndScan, disabled: busy }
      : quest === 'error'
        ? { label: 'TRY AGAIN ↻', onClick: connectAndScan, disabled: busy }
        : busy
          ? { label: quest === 'reclaiming' ? 'WAITING FOR WALLET…' : 'SCANNING MAINNET…', onClick: () => {}, disabled: true }
          : accounts.length === 0
            ? { label: 'SCAN AGAIN ↻', onClick: connectAndScan, disabled: false }
            : {
              label: `RECLAIM ${formatSol(selectedLamports, 5)} SOL →`,
              onClick: reclaimSelected,
              disabled: selectedAccounts.length === 0 || estimatedReceiveLamports <= 0,
            };

  return (
    <main className={`game-shell quest-${quest} ${accounts.length ? 'has-loot' : 'no-loot'}`}>
      <nav className="game-nav">
        <a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <ToolToggle mode="reclaim" />
        <button type="button" onClick={connectAndScan} disabled={busy}>{wallet ? shortenAddress(wallet) : busy ? 'SCANNING…' : 'CONNECT WALLET'} <span>+</span></button>
      </nav>

      <section className="game-hero" id="quest">
        <div className="game-grid" aria-hidden="true" />

        {showInventory ? (
          <div className="game-copy hero-inventory" aria-live="polite">
            <div className="live-results-head">
              <div>
                <small>{quest === 'demo' ? 'DEMO INVENTORY' : 'LIVE WALLET INVENTORY'}</small>
                <h2>{wallet ? shortenAddress(wallet, 6) : 'Sample wallet'}</h2>
              </div>
              <div className="results-head-actions"><button className="inventory-back" type="button" onClick={backToOverview}><span aria-hidden="true">←</span> BACK</button><span className={quest === 'demo' ? 'demo' : ''}>{quest === 'demo' ? 'DEMO DATA' : 'SOLANA MAINNET'}</span></div></div>

            {foundNothing ? (
              <div className="inventory-empty">
                <i aria-hidden="true">∅</i>
                <b>NOTHING TO RECLAIM</b>
                <p>
                  {scannedCount === 0
                    ? 'This wallet holds no supported SPL token accounts, so there is no rent to check.'
                    : `Checked ${scannedCount} token account${scannedCount === 1 ? '' : 's'}. Every one is already sitting at the current rent floor${liveFloorLamports === null ? '' : ` of ${formatSol(liveFloorLamports, 8)} SOL`}, so there is no excess to withdraw.`}
                </p>
                <div className="empty-facts">
                  <div><span>Accounts checked</span><b>{scannedCount}</b></div>
                  <div><span>Excess found</span><b>0.000000 SOL</b></div>
                  <div><span>Accounts closed</span><b>0</b></div>
                </div>
                <p className="empty-hint">Accounts created after the rent change already start at the new floor. Nothing was signed and nothing was charged.</p>
                <div className="empty-actions">
                  <button type="button" onClick={connectAndScan} disabled={busy}>SCAN AGAIN ↻</button>
                  <button className="game-demo-link" type="button" onClick={backToOverview}>← BACK TO OVERVIEW</button>
                </div>
              </div>
            ) : (
            <>
            <div className="live-summary">
              <div><span>Selected excess</span><b>{formatSol(selectedLamports, 6)} SOL</b></div>
              <div><span>Est. you receive</span><b>~{formatSol(estimatedReceiveLamports, 6)} SOL</b></div>
              <div><span>Total fees</span><b>~{formatSol(totalFeeLamports, 6)} SOL</b><em>service {formatSol(chargedOrQuotedFee, 6)} + network ~{formatSol(networkFeeLamports, 6)}</em></div>
            </div>

            <div className="live-account-list">
              {accounts.length ? accounts.map(account => (
                <label key={account.address} className={account.selected ? 'selected' : ''}>
                  <input type="checkbox" checked={account.selected} onChange={() => toggleAccount(account.address)} disabled={busy || quest === 'won'} />
                  <i>{account.selected ? '✓' : ''}</i>
                  <TokenPortrait mint={account.mint} />
                  <span><b>{account.program === 'token-2022' ? 'Token-2022 account' : 'Token account'}</b><small>{shortenAddress(account.address, 6)} · mint {shortenAddress(account.mint, 4)}</small></span>
                  <strong>+{formatSol(account.excessLamports, 6)} SOL</strong>
                </label>
              )) : (
                <div className="live-empty">
                  <b>{busy ? 'READING MAINNET…' : 'NO RECLAIMABLE EXCESS FOUND'}</b>
                  <span>{busy ? 'Comparing every token account against today’s rent floor.' : 'This wallet’s supported token accounts are already at the current rent floor.'}</span>
                </div>
              )}
            </div>

            <div className="live-approval">
              <div>
                <b>TRANSACTION RULE</b>
                <span>Selected WithdrawExcessLamports instructions plus one disclosed System Program fee transfer. No CloseAccount, Burn, or token transfer instruction is added.</span>
                <a href={`https://solscan.io/account/${TREASURY_ADDRESS}`} target="_blank" rel="noreferrer">FEE WALLET: {shortenAddress(TREASURY_ADDRESS, 8)} ↗</a>
              </div>
              <button type="button" onClick={inventoryAction.onClick} disabled={inventoryAction.disabled}>{inventoryAction.label}</button>
            </div>
            </>
            )}

            {!foundNothing && accounts.length > 0 && liveFloorLamports !== null && stagesRemaining > 0 && futureSurplusLamports > selectedLamports && (
              <p className="future-value">
                <b>STILL COMING</b>
                <span>
                  {stagesRemaining} more {stagesRemaining === 1 ? 'gate' : 'gates'} of Solana’s rent cut are scheduled. Once they all land, this wallet will have about <strong>{formatSol(futureSurplusLamports, 5)} SOL</strong> waiting in the same accounts.
                </span>
              </p>
            )}
            {!foundNothing && <p className={quest === 'error' ? 'live-notice error' : 'live-notice'}>{notice}</p>}
            {signatures.length > 0 && (
              <div className="live-signatures">
                {signatures.map((signature, index) => (
                  <a key={signature} href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Transaction {index + 1}: {shortenAddress(signature, 7)} ↗</a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="game-copy">
            <h1>Rent dropped.<br /><em>Your accounts didn’t notice.</em></h1>
            <p className="hero-lead">Solana lowered the rent-exempt minimum, in a network upgrade called SIMD-0437. Your token accounts were funded at the old floor, and nothing sweeps the difference back to you. <a className="lead-more" href="/solana-rent-reduction">Learn more <span aria-hidden="true">→</span></a></p>
            <div className="rollout-panel rollout-compact">
              <div className="rollout-head">
                <span>SIMD-0437 · LIVE RENT UPDATE</span>
                <b className={liveFloorLamports === null ? 'pending' : ''}>
                  {liveFloorLamports === null ? 'READING MAINNET…' : `STAGE ${stagesLive} OF ${RENT_STAGES.length} LIVE`}
                </b>
              </div>

              <div className="rollout-pips" aria-hidden="true">
                {RENT_STAGES.map((stage, index) => (
                  <i key={stage.id} className={index <= stageIndex ? 'on' : ''} />
                ))}
              </div>

              <div className="rollout-values">
                <div><span>CURRENT FLOOR / ACCOUNT</span><b>{liveFloorLamports === null ? '—' : formatSol(liveFloorLamports, 8)}</b></div>
                <div className="rollout-target"><span>UNLOCKED NOW / ACCOUNT</span><b>{perAccountUnlockedLamports === null ? '—' : `+${formatSol(perAccountUnlockedLamports, 8)}`}</b></div>
              </div>
              <a className="rollout-more" href="#rollout">SEE THE 5-STAGE ROLLOUT <span>↓</span></a>
            </div>
            <div className="game-actions">
              <button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN ▶</button>
              <button className="game-demo-link" type="button" onClick={playDemo} disabled={busy}>TRY DEMO</button>
            </div>
            {quest === 'error' && <p className="live-notice error">{notice}</p>}
            <div className="game-warning"><i>!</i><div><b>KEEP-OPEN MODE NEVER DELETES TOKENS</b><span>No tokens or token accounts are deleted. Balances and account addresses stay intact.</span></div></div>
          </div>
        )}

        <div className="game-stage">
          <div className="game-stage-head"><span>QUEST 01 / WALLET SCAN</span><b>{quest === 'won' ? 'COMPLETE' : quest === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="game-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="game-chest-frame">
            <div className="game-chest" aria-hidden="true"><div className="chest-glow" /><div className="chest-dust" /><div className="chest-lid" /><div className="chest-body"><i /></div>{COIN_ARCS.map((arc, index) => (
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
            ))}</div>
          </div>
          <div className={foundNothing ? 'game-result is-verdict' : 'game-result'}><small>{stageLabel}</small><StageAmount mode={amountMode} lamports={selectedLamports} verdict="ALL CAUGHT UP" /></div>
          <small className="stage-fees">
            {amountMode === 'value'
              ? <>SERVICE {formatSol(chargedOrQuotedFee, 6)} + NETWORK ~{formatSol(networkFeeLamports, 6)}</>
              : <>SERVICE + NETWORK</>}
          </small>
        </div>
        <a className="hero-scroll-cue" href="#reduction">MORE DETAILS <span>↓</span></a>
      </section>

      <div className="game-modebar"><span><i /> SAFE MODE ACTIVE</span><b>WITHDRAW EXCESS</b><b>KEEP ACCOUNTS</b><b>TOUCH ZERO TOKENS</b><a href={SOURCE_URL} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></div>

      <section className="plain-english" id="plain-english">
        <div className="plain-head">
          <small>IN PLAIN ENGLISH</small>
          <h2>You paid a deposit.<br /><em>It just got smaller.</em></h2>
        </div>
        <div className="plain-steps">
          <article>
            <b>01</b>
            <h3>You already paid one</h3>
            <p>Every token you have ever held opened an account in your wallet, and each one asked for a small refundable deposit to stay alive. Roughly two thousandths of a SOL, paid once, without you really noticing.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Solana is cutting it by 90%</h3>
            <p>This is Solana’s own change, published as SIMD-0437: the network decided those deposits are far larger than they need to be, so it is lowering the amount it asks for — in five steps, ending at a tenth of the original.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Nobody hands back the difference</h3>
            <p>Your accounts were funded at the old, bigger amount and nothing adjusts them. The gap between what you paid and what is now required just sits there, still yours, until something moves it.</p>
          </article>
        </div>
        <p className="plain-close">That gap is the whole product. Overfunded finds it, moves it back to your wallet, and leaves the account exactly where it was — still open, still holding your tokens.</p>
      </section>

      <section className="game-reduction" id="reduction">
        <div className="reduction-copy">
          <small>PATCH NOTES · RENT FLOOR</small>
          <h2 id="rollout">Five gates.<br /><em>One shrinking floor.</em></h2>
          <p>Rent is <code>(128 + data_len) × lamports_per_byte</code>. Solana’s own SIMD-0437 upgrade steps that rate down in five gated stages, from the legacy 6,960 to 696 — a 90% cut by the end. This is a protocol change shipped by Solana, not something Overfunded does to your wallet. Each stage that activates widens the gap between what your accounts were funded with and what they now need, and nothing sweeps the difference back.</p>
          <div className="reduction-facts">
            <article><b>01</b><span>The floor moves down</span><p>The rent-exempt minimum for a 165-byte account is recalculated by the network.</p></article>
            <article><b>02</b><span>The deposit stays put</span><p>Your account keeps the lamports it was funded with. There is no automatic refund.</p></article>
            <article><b>03</b><span>The gap is yours</span><p>WithdrawExcessLamports moves the difference out while the account stays open.</p></article>
          </div>
        </div>

        <div className="reduction-panel">
          <div className="reduction-scan" aria-hidden="true" />
          <div className="reduction-panel-head">
            <span>RENT FLOOR · {TOKEN_ACCOUNT_SPACE}-BYTE TOKEN ACCOUNT</span>
            <b className={liveFloorLamports === null ? 'pending' : ''}>{liveFloorLamports === null ? 'READING…' : 'LIVE FROM MAINNET'}</b>
          </div>

          <div className="reduction-figure">
            <strong>{reductionPercent === null ? '—' : `−${reductionPercent}%`}</strong>
            <span>MEASURED AGAINST THE ORIGINAL {formatSol(LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS, 8)} SOL FLOOR</span>
          </div>

          <div className="reduction-bars">
            <div className="reduction-bar">
              <span>ORIGINAL FLOOR</span>
              <i><em className="bar-old" style={{ width: '100%' }} /></i>
              <b>{formatSol(LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS, 8)} SOL</b>
            </div>
            <div className="reduction-bar">
              <span>CURRENT FLOOR</span>
              <i><em className="bar-new" style={{ width: `${newFloorBarWidth}%` }} /></i>
              <b>{liveFloorLamports === null ? '—' : `${formatSol(liveFloorLamports, 8)} SOL`}</b>
            </div>
          </div>

          <div className="reduction-delta">
            <span>UNLOCKED PER TOKEN ACCOUNT<em>Multiply by every overfunded account in your wallet</em></span>
            <strong>{perAccountUnlockedLamports === null ? '— SOL' : `${formatSol(perAccountUnlockedLamports, 8)} SOL`}</strong>
          </div>

          <p className="reduction-note">
            {liveFloorLamports === null
              ? 'The current floor is read live from mainnet with getMinimumBalanceForRentExemption. It could not be reached just now, so no reduction is being claimed here.'
              : reductionPercent === 0
                ? 'This RPC still reports the original rent floor, so no reduction is being claimed. Your wallet’s real excess is whatever the scan finds account by account.'
                : 'Read live from mainnet with getMinimumBalanceForRentExemption. Accounts created after the change already sit at the new floor and will show no excess.'}
          </p>
        </div>

        <div className="stage-ladder">
          <div className="ladder-head">
            <span>ROLLOUT · SIMD-0437</span>
            <b className={liveFloorLamports === null ? 'pending' : ''}>
              {liveFloorLamports === null ? 'READING MAINNET…' : `STAGE ${stagesLive} OF ${RENT_STAGES.length} LIVE`}
            </b>
          </div>
          <div className="ladder-rows">
            <div className="ladder-row legend">
              <span>GATE</span><span>LAMPORTS / BYTE</span><span>FLOOR · 165 B</span><span>SURPLUS / ACCOUNT</span><span>CUT</span><span>STATUS</span>
            </div>
            {RENT_STAGES.map((stage, index) => {
              const floor = rentFloorFor(TOKEN_ACCOUNT_SPACE, stage.lamportsPerByte);
              const state = stageState(index, stageIndex);
              return (
                <div key={stage.id} className={`ladder-row stage-${state}`}>
                  <span><i />{stage.id}</span>
                  <span>{stage.lamportsPerByte.toLocaleString('en-US')}</span>
                  <span>{formatSol(floor, 8)} SOL</span>
                  <span>{formatSol(LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - floor, 8)} SOL</span>
                  <span>−{stageReductionPercent(stage.lamportsPerByte)}%</span>
                  <span title={stage.eta || stage.declared}>{state === 'live' ? 'MAINNET' : stage.short}</span>
                </div>
              );
            })}
          </div>
          <div className="ladder-foot">
            <div><span>LEGACY RATE</span><b>{LEGACY_LAMPORTS_PER_BYTE.toLocaleString('en-US')} / byte</b></div>
            <div><span>LIVE RATE</span><b>{liveRate === null ? '—' : `${liveRate.toLocaleString('en-US')} / byte`}</b></div>
            <div><span>UNLOCKED NOW</span><b>{perAccountUnlockedLamports === null ? '—' : `${formatSol(perAccountUnlockedLamports, 8)} SOL`}</b></div>
            <div className="ladder-target"><span>AT FULL ROLLOUT</span><b>{formatSol(finalSurplusLamports, 8)} SOL</b></div>
          </div>
          <small>
            SIMD-0437-2 is live on testnet with mainnet activation expected mid-September 2026. The remaining three gates are delayed until the Agave 4.4 client release in November 2026, so the full 90% reduction lands late in the year. Whether a gate is live <em>here</em> is never assumed — it is derived from this cluster’s own rent-exempt minimum, so rows flip to MAINNET on their own as the rollout advances. Schedule per <a href={RENT_SOURCE_URL} target="_blank" rel="noreferrer">solana.com/upgrades/reduced-rent</a>.
          </small>
        </div>
      </section>

      <section className="game-missions" id="missions">
        <div className="game-section-title"><small>MISSION BOARD</small><h2>Three moves.<br /><em>One clean win.</em></h2><p>Every step is visible before you sign. The game layer makes the process easier to follow; it does not hide what the transaction does.</p></div>
        <div className="mission-list">
          <article><span>01</span><i>⌁</i><div><b>SCAN THE MAP</b><h3>Connect your wallet</h3><p>Read public token-account data and compare each balance with today’s rent floor.</p></div><strong>+10 XP</strong></article>
          <article><span>02</span><i>◫</i><div><b>CHECK THE LOOT</b><h3>Review every lamport</h3><p>See eligible accounts, fees, and the receiving wallet before approving anything.</p></div><strong>+25 XP</strong></article>
          <article><span>03</span><i>↓</i><div><b>COMPLETE THE QUEST</b><h3>Bring the excess home</h3><p>Withdraw only the surplus. The live rent reserve and token balance remain untouched.</p></div><strong>+50 XP</strong></article>
        </div>
      </section>

      <section className="game-battle" id="safety">
        <div className="battle-head"><small>KNOW YOUR OPPONENT</small><h2>This is not<br /><em>an incinerator.</em></h2><p>Traditional cleanup tools reclaim rent by closing eligible accounts. Overfunded’s target is different: surplus rent inside accounts you want to keep.</p></div>
        <ToolCompare current="reclaim" />
        <div className="battle-alert"><b>!</b><span><strong>TOKEN ACCOUNT CLOSING: BLOCKED</strong>Overfunded never adds a CloseAccount instruction. Your token accounts stay open and usable.</span><i>0 CLOSED</i></div>
      </section>

      <section className="game-ledger">
        <div className="ledger-title"><small>WORLD MAP</small><h2>What the cut<br /><em>is actually worth.</em></h2><p>Every figure here is either published by Solana or read live from the chain. Your own result is calculated from the public state of the accounts in your wallet.</p></div>
        <div className="ledger-screen primary">
          <span>REDEEMABLE ONCE SIMD-0437-5 LANDS</span>
          <strong>~$307M<em>3,425,373 SOL</em></strong>
          <p>Network-wide surplus left stranded in accounts funded under the legacy rate, once all five gates activate. Moves with the SOL price and with live account state.</p>
          <i>ESTIMATE · NOT A LIVE BALANCE</i>
        </div>
        <div className="ledger-screen">
          <span>SAVED PER MILLION TOKEN ACCOUNTS</span>
          <strong>$143,100</strong>
          <p>Solana’s own worked example: opening a million token accounts costs $159,000 under the legacy rate and $15,900 once the cut completes.</p>
          <a href={RENT_SOURCE_URL} target="_blank" rel="noreferrer">PUBLISHED BY SOLANA ↗</a>
        </div>
        <div className="ledger-screen">
          <span>SOL SAVED FOR USERS</span>
          <strong>{treasury === null ? '—' : formatSol(treasury.reclaimedLamports, 4)}<em>{treasury === null ? 'reading mainnet' : `${formatSol(treasury.feesCollectedLamports, 4)} SOL in fees`}</em></strong>
          <p>Derived from what the fee wallet has actually received: the fee is {SERVICE_FEE_PERCENT}% of each recovery, so the surplus that reached wallets is twenty times it.</p>
          <a href={`https://solscan.io/account/${TREASURY_ADDRESS}`} target="_blank" rel="noreferrer">VERIFY ON SOLSCAN ↗</a>
        </div>
        <div className="ledger-screen locked">
          <span>TOKEN ACCOUNTS CLOSED</span>
          <strong>
            0
            <svg className="lock-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.6 10.4V7.4a4.4 4.4 0 0 1 8.8 0v3" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
              <rect x="3.9" y="10.4" width="16.2" height="11.2" rx="2.6" fill="currentColor" />
            </svg>
          </strong>
          <p>Locked at zero by construction. A reclaim transaction can only contain WithdrawExcessLamports and one disclosed fee transfer — there is no CloseAccount instruction for it to use.</p>
          <i>CANNOT MOVE</i>
        </div>
      </section>

      <div className="verify-strip">
        <div>
          <b>DON’T TAKE OUR WORD FOR IT</b>
          <span>Every instruction is public. Read the builder, check the fee maths.</span>
        </div>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">READ THE SOURCE ↗</a>
      </div>

      <section className="game-finale">
        <div className="finale-rays" aria-hidden="true" />
        <small>READY PLAYER WALLET?</small><h2>Find the hidden SOL.<br /><em>Keep every account alive.</em></h2><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN MAINNET ▶</button><a href="/solana-rent-reduction">READ: HOW THE RENT CUT WORKS ↗</a>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: `${SITE_URL}/og.png`,
            sameAs: [SOURCE_URL],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            url: SITE_URL,
            description: 'Scan Solana SPL token accounts against the live rent-exempt minimum and reclaim the excess with WithdrawExcessLamports, without closing accounts or moving tokens.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: `${SERVICE_FEE_PERCENT}% of the recovered surplus, charged only on success. Nothing is charged if nothing is recovered.`,
            },
          },
        ]) }}
      />

      <footer className="game-footer"><a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/blog">Blog</a><a href="/solana-rent-reduction">How the cut works</a><a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a><a href="/legal/risk">Risk</a><a href="/legal/terms">Terms</a><a href="/legal/privacy">Privacy</a></div></footer>
    </main>
  );
}
