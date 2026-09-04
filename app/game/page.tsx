'use client';

import { useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  estimatedNetworkFeeLamports,
  formatSol,
  getWalletProvider,
  reclaimAccounts,
  scanReclaimableAccounts,
  shortenAddress,
  type ReclaimableAccount,
} from './solana-reclaim';

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

  const selectedAccounts = useMemo(() => accounts.filter(account => account.selected), [accounts]);
  const selectedLamports = useMemo(() => selectedAccounts.reduce((sum, account) => sum + account.excessLamports, 0), [selectedAccounts]);
  const networkFeeLamports = estimatedNetworkFeeLamports(selectedAccounts.length);
  const busy = quest === 'connecting' || quest === 'scanning' || quest === 'reclaiming';
  const isLiveResult = quest === 'ready' || quest === 'reclaiming' || quest === 'won';

  async function connectAndScan() {
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
      const response = await provider.connect();
      const owner = new PublicKey(response.publicKey.toString());
      setWallet(owner.toBase58());
      setQuest('scanning');
      setNotice('Reading Token Program and Token-2022 accounts from mainnet…');
      const liveAccounts = await scanReclaimableAccounts(owner);
      setAccounts(liveAccounts);
      setQuest('ready');
      setNotice(liveAccounts.length
        ? `Found ${liveAccounts.length} account${liveAccounts.length === 1 ? '' : 's'} with excess rent. Review and select them below.`
        : 'Scan complete. This wallet has no reclaimable excess in supported token accounts right now.');
    } catch (error) {
      setQuest('error');
      setNotice(error instanceof Error ? error.message : 'The wallet scan was cancelled or could not complete.');
    }
  }

  function playDemo() {
    setQuest('scanning');
    setNotice('Running a sample scan—no wallet or network request is being used.');
    setSignatures([]);
    window.setTimeout(() => {
      setAccounts(demoAccounts);
      setQuest('demo');
      setNotice('Demo result only. Connect a wallet to scan and reclaim live mainnet SOL.');
    }, 900);
  }

  function toggleAccount(address: string) {
    setAccounts(current => current.map(account => account.address === address
      ? { ...account, selected: !account.selected }
      : account));
  }

  async function reclaimSelected() {
    const provider = getWalletProvider();
    if (!provider || !wallet || selectedAccounts.length === 0) return;
    if (selectedLamports <= networkFeeLamports) {
      setNotice('The selected recovery is smaller than the estimated network fee. Select more accounts or wait for more excess.');
      return;
    }

    try {
      setQuest('reclaiming');
      setProgress('Preparing transaction 1…');
      setNotice('Your wallet will ask you to approve each transaction. Verify that every instruction is WithdrawExcessLamports.');
      const owner = new PublicKey(wallet);
      const confirmed = await reclaimAccounts(provider, owner, selectedAccounts, (completed, total) => {
        setProgress(`Confirmed ${completed} of ${total} transaction${total === 1 ? '' : 's'}`);
      });
      setSignatures(confirmed);
      setQuest('won');
      setProgress('Quest complete');
      setNotice(confirmed.length
        ? `Recovered approximately ${formatSol(selectedLamports)} SOL before network fees. No token accounts were closed.`
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
            : quest === 'ready' && accounts.length === 0 ? 'NO EXCESS FOUND'
              : isLiveResult ? 'TREASURE FOUND' : 'UNCLAIMED SOL';
  const stageAmount = busy ? '••••'
    : accounts.length ? `${formatSol(selectedLamports, 5)} SOL`
      : '??? SOL';
  const primaryLabel = quest === 'reclaiming' ? 'WAITING FOR WALLET…'
    : quest === 'ready' && accounts.length ? `RECLAIM ${formatSol(selectedLamports, 5)} SOL`
      : quest === 'won' ? 'SCAN AGAIN ↻'
        : quest === 'demo' ? 'CONNECT TO RECLAIM'
          : busy ? 'SCANNING MAINNET…' : 'CONNECT + SCAN ▶';
  const primaryAction = quest === 'ready' && accounts.length ? reclaimSelected : connectAndScan;

  return (
    <main className={'game-shell quest-' + quest}>
      <nav className="game-nav">
        <a className="game-brand" href="/game"><i>L</i><span><b>LAMPORT</b><small>RENT QUEST</small></span></a>
        <div className="game-nav-stats"><span>MODE <b>SAFE</b></span><span>ACCOUNTS CLOSED <b>0</b></span><span>NETWORK <b>MAINNET</b></span></div>
        <button type="button" onClick={connectAndScan} disabled={busy}>{wallet ? shortenAddress(wallet) : busy ? 'SCANNING…' : 'CONNECT WALLET'} <span>+</span></button>
      </nav>

      <section className="game-hero">
        <div className="game-grid" aria-hidden="true" />
        <div className="game-copy">
          <div className="game-level"><b>NEW QUEST</b><span>RENT FLOOR REDUCTION</span></div>
          <h1>Unlock the SOL<br /><em>your wallet already owns.</em></h1>
          <p>Solana lowered account rent. Your token accounts may now hold bonus lamports above the new minimum.</p>
          <div className="game-actions"><button type="button" onClick={primaryAction} disabled={busy || (quest === 'ready' && (selectedAccounts.length === 0 || selectedLamports <= networkFeeLamports))}>{primaryLabel}</button><button className="game-demo-link" type="button" onClick={playDemo} disabled={busy}>TRY DEMO</button><a href="/classic">EXIT TO CLASSIC</a></div>
          <div className="game-warning"><i>!</i><div><b>NO TOKEN ACCOUNTS ARE EVER CLOSED</b><span>Only excess rent moves. Tokens and account addresses stay intact.</span></div></div>
        </div>

        <div className="game-stage">
          <div className="game-stage-head"><span>QUEST 01 / WALLET SCAN</span><b>{quest === 'won' ? 'COMPLETE' : quest === 'error' ? 'CHECK LOG' : busy ? 'ACTIVE' : 'READY'}</b></div>
          <div className="game-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="game-chest" aria-hidden="true"><div className="chest-glow" /><div className="chest-lid" /><div className="chest-body"><i /></div><span className="coin coin-one">◎</span><span className="coin coin-two">◎</span><span className="coin coin-three">◎</span></div>
          <div className="game-result"><small>{stageLabel}</small><strong>{stageAmount}</strong></div>
          <button type="button" onClick={primaryAction} disabled={busy || (quest === 'ready' && (selectedAccounts.length === 0 || selectedLamports <= networkFeeLamports))}>{primaryLabel}</button>
          <p>LIVE MAINNET · BETA SERVICE FEE 0% · YOU APPROVE EVERY TRANSACTION</p>
        </div>
      </section>

      <div className="game-modebar"><span><i /> SAFE MODE ACTIVE</span><b>WITHDRAW EXCESS</b><b>KEEP ACCOUNTS</b><b>TOUCH ZERO TOKENS</b><a href="/classic">CLASSIC UI ↗</a></div>

      {(wallet || accounts.length > 0 || quest === 'error') && (
        <section className="game-live-results" aria-live="polite">
          <div className="live-results-head"><div><small>{quest === 'demo' ? 'DEMO INVENTORY' : 'LIVE WALLET INVENTORY'}</small><h2>{wallet ? shortenAddress(wallet, 6) : 'Sample wallet'}</h2></div><span className={quest === 'demo' ? 'demo' : ''}>{quest === 'demo' ? 'DEMO DATA' : 'SOLANA MAINNET'}</span></div>
          <div className="live-summary">
            <div><span>Selected excess</span><b>{formatSol(selectedLamports, 6)} SOL</b></div>
            <div><span>Eligible accounts</span><b>{accounts.length}</b></div>
            <div><span>Beta service fee</span><b>0 SOL</b></div>
            <div><span>Est. network fee</span><b>~{formatSol(networkFeeLamports, 6)} SOL</b></div>
          </div>
          <div className="live-account-list">
            {accounts.length ? accounts.map(account => (
              <label key={account.address} className={account.selected ? 'selected' : ''}>
                <input type="checkbox" checked={account.selected} onChange={() => toggleAccount(account.address)} disabled={busy || quest === 'won'} />
                <i>{account.selected ? '✓' : ''}</i>
                <span><b>{account.program === 'token-2022' ? 'Token-2022 account' : 'Token account'}</b><small>{shortenAddress(account.address, 6)} · mint {shortenAddress(account.mint, 4)}</small></span>
                <strong>+{formatSol(account.excessLamports, 6)} SOL</strong>
              </label>
            )) : <div className="live-empty"><b>NO RECLAIMABLE EXCESS FOUND</b><span>This wallet’s supported token accounts are already at the current rent floor.</span></div>}
          </div>
          <div className="live-approval"><div><b>TRANSACTION RULE</b><span>Only selected accounts are included. No CloseAccount, Burn, token transfer, or fee-transfer instruction is added.</span></div><button type="button" onClick={quest === 'demo' ? connectAndScan : reclaimSelected} disabled={busy || quest === 'won' || (!accounts.length || selectedAccounts.length === 0) || (quest !== 'demo' && selectedLamports <= networkFeeLamports)}>{quest === 'demo' ? 'CONNECT A REAL WALLET →' : quest === 'won' ? 'RECOVERY COMPLETE ✓' : `APPROVE ${selectedAccounts.length} ACCOUNT${selectedAccounts.length === 1 ? '' : 'S'} →`}</button></div>
          <p className={quest === 'error' ? 'live-notice error' : 'live-notice'}>{notice}</p>
          {signatures.length > 0 && <div className="live-signatures">{signatures.map((signature, index) => <a key={signature} href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Transaction {index + 1}: {shortenAddress(signature, 7)} ↗</a>)}</div>}
        </section>
      )}

      <section className="game-missions" id="missions">
        <div className="game-section-title"><small>MISSION BOARD</small><h2>Three moves.<br /><em>One clean win.</em></h2><p>Every step is visible before you sign. The game layer makes the process easier to follow; it does not hide what the transaction does.</p></div>
        <div className="mission-list">
          <article><span>01</span><i>⌁</i><div><b>SCAN THE MAP</b><h3>Connect your wallet</h3><p>Read public token-account data and compare each balance with today’s rent floor.</p></div><strong>+10 XP</strong></article>
          <article><span>02</span><i>◫</i><div><b>CHECK THE LOOT</b><h3>Review every lamport</h3><p>See eligible accounts, fees, and the receiving wallet before approving anything.</p></div><strong>+25 XP</strong></article>
          <article><span>03</span><i>↓</i><div><b>COMPLETE THE QUEST</b><h3>Bring the excess home</h3><p>Withdraw only the surplus. The live rent reserve and token balance remain untouched.</p></div><strong>+50 XP</strong></article>
        </div>
      </section>

      <section className="game-battle" id="safety">
        <div className="battle-head"><small>KNOW YOUR OPPONENT</small><h2>This is not<br /><em>an incinerator.</em></h2><p>Traditional cleanup tools reclaim rent by closing eligible accounts. Lamport’s target is different: surplus rent inside accounts you want to keep.</p></div>
        <div className="battle-arena">
          <article className="battle-card enemy"><div className="battle-name"><span>ACCOUNT CLOSER</span><b>DESTRUCTIVE MOVE</b></div><i className="battle-icon">×</i><strong>CLOSE ACCOUNT</strong><ul><li>Account is deleted</li><li>Address stops working</li><li>Empty balance required</li></ul><em>USE ON DEAD ACCOUNTS</em></article>
          <div className="battle-vs">VS</div>
          <article className="battle-card hero"><div className="battle-name"><span>LAMPORT</span><b>SAFE MOVE</b></div><i className="battle-icon">L</i><strong>WITHDRAW EXCESS</strong><ul><li>Account stays open</li><li>Address stays usable</li><li>Tokens stay untouched</li></ul><em>USE ON LIVE ACCOUNTS</em></article>
        </div>
        <div className="battle-alert"><b>!</b><span><strong>PERMADEATH DISABLED</strong>No account-closing instruction appears in a Lamport reclaim transaction.</span><i>0 CLOSED</i></div>
      </section>

      <section className="game-ledger">
        <div className="ledger-title"><small>WORLD MAP</small><h2>The rent-recovery<br /><em>opportunity.</em></h2><p>Network totals are modeled estimates. Your actual result is calculated from the public state of the accounts in your wallet.</p></div>
        <div className="ledger-screen primary"><span>ESTIMATED LEFT TO UNLOCK</span><strong>~$310M</strong><p>Directional estimate across the complete reduced-rent rollout.</p><i>MODELLED · NOT A LIVE BALANCE</i></div>
        <div className="ledger-screen"><span>CLAIMED THROUGH LAMPORT</span><strong>$0</strong><p>Pre-launch baseline. Updates only after verified reclaim transactions.</p><i>VERIFIABLE COUNTER</i></div>
        <div className="ledger-screen"><span>ACCOUNTS CLOSED</span><strong>0</strong><p>The defining score. It never moves.</p><i>NON-DESTRUCTIVE FOREVER</i></div>
      </section>

      <section className="game-rewards">
        <div className="reward-vault">
          <div className="reward-coin"><span>◎</span><b>L</b><small>$LAMPORT</small></div>
          <div className="reward-pixels" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="reward-label">BONUS LEVEL · NOT LIVE</div>
        </div>
        <div className="reward-copy"><small>OPTIONAL COMMUNITY QUEST</small><h2>Utility coin.<br /><em>No paywall.</em></h2><p>The live beta charges no service fee. If $LAMPORT launches on pump.fun later, holders could qualify for a lower future success fee. Nobody needs the coin to scan, review, or reclaim their own SOL.</p><div className="reward-stats"><div><span>LIVE BETA FEE</span><b>0%</b></div><div><span>FUTURE STANDARD</span><b>5%</b></div><div><span>PROPOSED HOLDER RATE</span><b>2.5%</b></div><div><span>FAILED QUEST</span><b>0 SOL</b></div></div><a href="https://pump.fun/create" target="_blank" rel="noreferrer">OPEN LAUNCH WORKSPACE ↗</a><i>CONCEPT ONLY · MEMECOINS ARE HIGH RISK · OFFICIAL MINT WILL APPEAR HERE FIRST</i></div>
      </section>

      <section className="game-finale">
        <div className="finale-rays" aria-hidden="true" />
        <small>READY PLAYER WALLET?</small><h2>Find the hidden SOL.<br /><em>Keep every account alive.</em></h2><button type="button" onClick={connectAndScan} disabled={busy}>CONNECT + SCAN MAINNET ▶</button><a href="/classic">RETURN TO THE CLASSIC VERSION ↗</a>
      </section>

      <footer className="game-footer"><a className="game-brand" href="/"><i>L</i><span><b>LAMPORT</b><small>RENT QUEST</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/classic">Classic</a><a href="/fun">Fun Lab</a><a href="#safety">Safety</a></div></footer>
    </main>
  );
}
