'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  calculateServiceFeeLamports,
  estimatedNetworkFeeLamports,
  formatSol,
  getCurrentRentFloorLamports,
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
  scanReclaimableAccounts,
  SERVICE_FEE_PERCENT,
  shortenAddress,
  TOKEN_ACCOUNT_SPACE,
  TREASURY_ADDRESS,
  type ReclaimableAccount,
} from './solana-reclaim';
import { SITE_NAME, SITE_URL, SOURCE_URL } from '../site-config';
import { StageAmount, type AmountMode } from './stage-amount';
import { BrandMark } from '../brand-mark';

type QuestState = 'idle' | 'connecting' | 'scanning' | 'ready' | 'reclaiming' | 'won' | 'error' | 'demo';

const demoAccounts: ReclaimableAccount[] = [
  { address: '8kP3demoAccountxR42', dataLength: 165, excessLamports: 22_180_000, mint: 'USDCdemoMint', program: 'token', rentFloorLamports: 1_400_000, selected: true },
  { address: '3Dw9demoAccountkN18', dataLength: 165, excessLamports: 18_620_000, mint: 'BONKdemoMint', program: 'token', rentFloorLamports: 1_400_000, selected: true },
  { address: 'H7q1demoAccountmV05', dataLength: 170, excessLamports: 14_970_000, mint: 'Token2022demoMint', program: 'token-2022', rentFloorLamports: 1_430_000, selected: true },
  { address: 'P5w2demoAccountjA77', dataLength: 165, excessLamports: 28_430_000, mint: 'JUPdemoMint', program: 'token', rentFloorLamports: 1_400_000, selected: true },
];

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
  const [stagesOpen, setStagesOpen] = useState(false);

  // Read the cluster's own rent-exempt minimum so the reduction section quotes a
  // number the visitor can verify instead of a marketing figure.
  useEffect(() => {
    let cancelled = false;
    getCurrentRentFloorLamports()
      .then(floor => { if (!cancelled) setLiveFloorLamports(floor); })
      .catch(() => { if (!cancelled) setLiveFloorLamports(null); });
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
  const finalSurplusLamports = LEGACY_TOKEN_ACCOUNT_RENT_LAMPORTS - finalFloorLamports;
  const rolloutMultiplier = perAccountUnlockedLamports && perAccountUnlockedLamports > 0
    ? finalSurplusLamports / perAccountUnlockedLamports
    : null;

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
      setAccounts(demoAccounts);
      setScannedCount(demoAccounts.length);
      setQuest('demo');
      setNotice('Demo result only. Connect a wallet to scan and reclaim live mainnet SOL.');
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
        <div className="game-nav-stats"><span>MODE <b>SAFE</b></span><span>ACCOUNTS CLOSED <b>0</b></span><span>NETWORK <b>MAINNET</b></span></div>
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
              <span className={quest === 'demo' ? 'demo' : ''}>{quest === 'demo' ? 'DEMO DATA' : 'SOLANA MAINNET'}</span>
            </div>

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
            <div className="game-level"><b>NEW QUEST</b><span>RENT FLOOR REDUCTION</span></div>
            <h1>Rent dropped.<br /><em>Your accounts didn’t notice.</em></h1>
            <p className="hero-lead">Solana lowered the rent-exempt minimum. Your token accounts were funded at the old floor, and nothing sweeps the difference back to you.</p>
            <a className="hero-mech" href={SOURCE_URL} target="_blank" rel="noreferrer">
              <b>VERIFIED CODE</b>
              <span>Every instruction this site builds is public. Read the scanner, the transaction builder and the fee maths before you connect.</span>
              <i aria-hidden="true">↗</i>
            </a>

            <div className="rollout-panel">
              <div className="rollout-head">
                <span>SIMD-0437 · RENT ROLLOUT</span>
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
                <div><span>UNLOCKED NOW</span><b>{perAccountUnlockedLamports === null ? '—' : `+${formatSol(perAccountUnlockedLamports, 8)}`}</b></div>
                <div className="rollout-target"><span>AT FULL ROLLOUT</span><b>+{formatSol(finalSurplusLamports, 8)}</b></div>
                <div><span>PER ACCOUNT</span><b>{rolloutMultiplier === null ? '—' : `${Math.round(rolloutMultiplier * 10) / 10}× more`}</b></div>
              </div>

              <button className="rollout-toggle" type="button" onClick={() => setStagesOpen(open => !open)} aria-expanded={stagesOpen}>
                {stagesOpen ? 'HIDE STAGES ▴' : `SEE ALL ${RENT_STAGES.length} STAGES ▾`}
              </button>

              {stagesOpen && (
                <div className="rollout-stages">
                  {RENT_STAGES.map((stage, index) => {
                    const state = stageState(index, stageIndex);
                    return (
                      <div key={stage.id} className={`stage-${state}`}>
                        <i />
                        <span>{stage.id}</span>
                        <em>{stage.lamportsPerByte.toLocaleString('en-US')} / byte</em>
                        <b>−{stageReductionPercent(stage.lamportsPerByte)}%</b>
                        <small>{state === 'live' ? 'MAINNET' : stage.short}</small>
                      </div>
                    );
                  })}
                </div>
              )}

              <small className="rollout-source">
                Rent floor <code>{liveFloorLamports === null ? '—' : `${formatSol(liveFloorLamports, 8)} SOL`}</code> read live with <code>getMinimumBalanceForRentExemption({TOKEN_ACCOUNT_SPACE})</code>. Active gates are derived from it, not assumed.
              </small>
            </div>
            <div className="game-actions">
              <button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN ▶</button>
              <button className="game-demo-link" type="button" onClick={playDemo} disabled={busy}>TRY DEMO</button>
              <a href="/solana-rent-reduction">HOW THE CUT WORKS →</a>
            </div>
            {quest === 'error' && <p className="live-notice error">{notice}</p>}
            <div className="game-warning"><i>!</i><div><b>NO TOKEN ACCOUNTS ARE EVER CLOSED</b><span>Only excess rent moves. Tokens and account addresses stay intact.</span></div></div>
          </div>
        )}

        <div className="game-stage">
          <div className="game-stage-head"><span>QUEST 01 / WALLET SCAN</span><b>{quest === 'won' ? 'COMPLETE' : quest === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="game-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="game-chest" aria-hidden="true"><div className="chest-glow" /><div className="chest-dust" /><div className="chest-lid" /><div className="chest-body"><i /></div><span className="coin coin-one">◎</span><span className="coin coin-two">◎</span><span className="coin coin-three">◎</span><span className="coin coin-four">◎</span><span className="coin coin-five">◎</span></div>
          <div className={foundNothing ? 'game-result is-verdict' : 'game-result'}><small>{stageLabel}</small><StageAmount mode={amountMode} lamports={selectedLamports} verdict="ALL CAUGHT UP" replay={quest} /></div>
          <p>LIVE MAINNET · {SERVICE_FEE_PERCENT}% SUCCESS FEE · NOTHING RECOVERED, NOTHING CHARGED · YOU APPROVE EVERY TRANSACTION</p>
        </div>
      </section>

      <div className="game-modebar"><span><i /> SAFE MODE ACTIVE</span><b>WITHDRAW EXCESS</b><b>KEEP ACCOUNTS</b><b>TOUCH ZERO TOKENS</b><a href={SOURCE_URL} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a><a href="/solana-rent-reduction">HOW THE CUT WORKS ↗</a></div>

      <section className="game-reduction" id="reduction">
        <div className="reduction-copy">
          <small>PATCH NOTES · RENT FLOOR</small>
          <h2>Five gates.<br /><em>One shrinking floor.</em></h2>
          <p>Rent is <code>(128 + data_len) × lamports_per_byte</code>. SIMD-0437 steps that rate down in five gated stages, from the legacy 6,960 to 696 — a 90% cut by the end. Each stage that activates widens the gap between what your accounts were funded with and what they now need, and nothing sweeps the difference back.</p>
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
        <div className="battle-arena">
          <article className="battle-card enemy"><div className="battle-name"><span>ACCOUNT CLOSER</span><b>DESTRUCTIVE MOVE</b></div><i className="battle-icon">×</i><strong>CLOSE ACCOUNT</strong><ul><li>Account is deleted</li><li>Address stops working</li><li>Empty balance required</li></ul><em>USE ON DEAD ACCOUNTS</em></article>
          <div className="battle-vs">VS</div>
          <article className="battle-card hero"><div className="battle-name"><span>OVERFUNDED</span><b>SAFE MOVE</b></div><i className="battle-icon">L</i><strong>WITHDRAW EXCESS</strong><ul><li>Account stays open</li><li>Address stays usable</li><li>Tokens stay untouched</li></ul><em>USE ON LIVE ACCOUNTS</em></article>
        </div>
        <div className="battle-alert"><b>!</b><span><strong>PERMADEATH DISABLED</strong>No account-closing instruction appears in a Overfunded reclaim transaction.</span><i>0 CLOSED</i></div>
        <div className="battle-source"><div><b>DON’T TAKE OUR WORD FOR IT</b><span>Every instruction this site builds is in the open. Read the transaction builder, check the fee maths, and verify the rent floor against your own node.</span></div><a href={SOURCE_URL} target="_blank" rel="noreferrer">READ THE SOURCE ON GITHUB ↗</a></div>
      </section>

      <section className="game-ledger">
        <div className="ledger-title"><small>WORLD MAP</small><h2>The rent-recovery<br /><em>opportunity.</em></h2><p>Network totals are modeled estimates. Your actual result is calculated from the public state of the accounts in your wallet.</p></div>
        <div className="ledger-screen primary"><span>ESTIMATED LEFT TO UNLOCK</span><strong>~$310M</strong><p>Directional estimate across the complete reduced-rent rollout.</p><i>MODELLED · NOT A LIVE BALANCE</i></div>
        <div className="ledger-screen"><span>CLAIMED THROUGH OVERFUNDED</span><strong>$0</strong><p>Pre-launch baseline. Updates only after verified reclaim transactions.</p><i>VERIFIABLE COUNTER</i></div>
        <div className="ledger-screen"><span>ACCOUNTS CLOSED</span><strong>0</strong><p>The defining score. It never moves.</p><i>NON-DESTRUCTIVE FOREVER</i></div>
      </section>

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

      <footer className="game-footer"><a className="game-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/blog">Blog</a><a href="/solana-rent-reduction">How the cut works</a><a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a><a href="#safety">Safety</a></div></footer>
    </main>
  );
}
