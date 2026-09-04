'use client';

import { useState } from 'react';

type QuestState = 'idle' | 'scanning' | 'won';

export default function GamePrototype() {
  const [quest, setQuest] = useState<QuestState>('idle');

  function playDemo() {
    setQuest('scanning');
    window.setTimeout(() => setQuest('won'), 1300);
  }

  return (
    <main className={'game-shell quest-' + quest}>
      <nav className="game-nav">
        <a className="game-brand" href="/game"><i>L</i><span><b>LAMPORT</b><small>RENT QUEST</small></span></a>
        <div className="game-nav-stats"><span>MODE <b>SAFE</b></span><span>ACCOUNTS CLOSED <b>0</b></span><span>NETWORK <b>MAINNET</b></span></div>
        <button type="button">CONNECT WALLET <span>+</span></button>
      </nav>

      <section className="game-hero">
        <div className="game-grid" aria-hidden="true" />
        <div className="game-copy">
          <div className="game-level"><b>NEW QUEST</b><span>RENT FLOOR REDUCTION</span></div>
          <h1>Unlock the SOL<br /><em>your wallet already owns.</em></h1>
          <p>Solana lowered account rent. Your token accounts may now hold bonus lamports above the new minimum.</p>
          <div className="game-actions"><button type="button" onClick={playDemo} disabled={quest === 'scanning'}>{quest === 'scanning' ? 'SCANNING…' : quest === 'won' ? 'PLAY AGAIN ↻' : 'START SAFE DEMO ▶'}</button><a href="/">EXIT TO CLASSIC</a></div>
          <div className="game-warning"><i>!</i><div><b>NO TOKEN ACCOUNTS ARE EVER CLOSED</b><span>Only excess rent moves. Tokens and account addresses stay intact.</span></div></div>
        </div>

        <div className="game-stage">
          <div className="game-stage-head"><span>QUEST 01 / WALLET SCAN</span><b>{quest === 'won' ? 'COMPLETE' : 'READY'}</b></div>
          <div className="game-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="game-chest" aria-hidden="true"><div className="chest-glow" /><div className="chest-lid" /><div className="chest-body"><i /></div><span className="coin coin-one">◎</span><span className="coin coin-two">◎</span><span className="coin coin-three">◎</span></div>
          <div className="game-result"><small>{quest === 'scanning' ? 'SEARCHING 24 ACCOUNTS…' : quest === 'won' ? 'TREASURE FOUND' : 'UNCLAIMED SOL'}</small><strong>{quest === 'scanning' ? '••••' : quest === 'won' ? '0.0842 SOL' : '??? SOL'}</strong></div>
          <button type="button" onClick={playDemo} disabled={quest === 'scanning'}>{quest === 'scanning' ? 'SCANNING THE CHAIN…' : quest === 'won' ? 'CLAIM PREVIEW UNLOCKED ✓' : 'OPEN CHEST'}</button>
          <p>DEMO ONLY · YOU APPROVE EVERY REAL TRANSACTION</p>
        </div>
      </section>

      <div className="game-modebar"><span><i /> SAFE MODE ACTIVE</span><b>WITHDRAW EXCESS</b><b>KEEP ACCOUNTS</b><b>TOUCH ZERO TOKENS</b><a href="/">CLASSIC UI ↗</a></div>

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
        <div className="reward-copy"><small>OPTIONAL COMMUNITY QUEST</small><h2>Utility coin.<br /><em>No paywall.</em></h2><p>If $LAMPORT launches on pump.fun, holders can qualify for a lower success fee. Nobody needs the coin to scan, review, or reclaim their own SOL.</p><div className="reward-stats"><div><span>STANDARD FEE</span><b>5%</b></div><div><span>HOLDER RATE</span><b>2.5%</b></div><div><span>MAX FEE</span><b>0.05 SOL</b></div><div><span>FAILED QUEST</span><b>0 SOL</b></div></div><a href="https://pump.fun/create" target="_blank" rel="noreferrer">OPEN LAUNCH WORKSPACE ↗</a><i>CONCEPT ONLY · MEMECOINS ARE HIGH RISK · OFFICIAL MINT WILL APPEAR HERE FIRST</i></div>
      </section>

      <section className="game-finale">
        <div className="finale-rays" aria-hidden="true" />
        <small>READY PLAYER WALLET?</small><h2>Find the hidden SOL.<br /><em>Keep every account alive.</em></h2><button type="button" onClick={playDemo}>START SAFE DEMO ▶</button><a href="/">RETURN TO THE CLASSIC VERSION ↗</a>
      </section>

      <footer className="game-footer"><a className="game-brand" href="/game"><i>L</i><span><b>LAMPORT</b><small>RENT QUEST</small></span></a><p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p><div><a href="/">Classic</a><a href="/fun">Fun Lab</a><a href="#safety">Safety</a></div></footer>
    </main>
  );
}
