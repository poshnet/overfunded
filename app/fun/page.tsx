'use client';

import { useState } from 'react';
import { BrandMark } from '../brand-mark';

export default function FunPrototype() {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);

  function runDemo() {
    setScanning(true);
    setFound(false);
    window.setTimeout(() => {
      setScanning(false);
      setFound(true);
    }, 1100);
  }

  return (
    <main className="fun-shell">
      <div className={'fun-confetti ' + (found ? 'is-live' : '')} aria-hidden="true">
        {['L','◎','L','◎','L','◎','L','◎'].map((mark, index) => <i key={index}>{mark}</i>)}
      </div>
      <div className="fun-ticker" aria-hidden="true">
        <span>SOLANA RENT DROPPED&nbsp; ✦ &nbsp;YOUR ACCOUNTS STAY OPEN&nbsp; ✦ &nbsp;CLAIM THE EXTRA&nbsp; ✦ &nbsp;SOLANA RENT DROPPED</span>
      </div>
      <nav className="fun-nav">
        <a className="fun-brand" href="/fun"><i><BrandMark /></i><b>SOLRENT</b><em>FUN LAB</em></a>
        <div className="fun-nav-links"><a href="#why">Why different</a><a href="#how">How it works</a><a href="/solana-rent-reduction">How the cut works ↗</a></div>
        <a className="fun-nav-cta" href="/">OPEN LIVE APP <span>↗</span></a>
      </nav>

      <section className="fun-hero">
        <div className="fun-hero-copy">
          <div className="fun-badge"><span>●</span> SOLANA JUST CHANGED THE RENT RULES</div>
          <h1>Your SOL is<br /><em>hiding in plain sight.</em></h1>
          <p>Old token accounts may be holding more rent than they need. SolRent finds the extra and sends it home—without deleting a thing.</p>
          <div className="fun-actions">
            <button className="fun-primary" type="button" onClick={runDemo}>FIND MY SOL <span>→</span></button>
            <a href="#why">WHY THIS IS DIFFERENT</a>
          </div>
          <div className="fun-safety"><strong>0</strong><span>TOKEN ACCOUNTS<br />EVER CLOSED</span><b>GUARANTEED</b></div>
        </div>

        <div className={'fun-scanner ' + (found ? 'has-result' : '')}>
          <div className="fun-window-bar"><span>WALLET RENT CHECKER</span><i>● ● ●</i></div>
          <div className="fun-orbit"><span>◎</span><i>EXCESS<br />SOL</i></div>
          <p>{scanning ? 'CHECKING CURRENT RENT FLOORS…' : found ? 'WE FOUND EXTRA SOL' : 'READY WHEN YOU ARE'}</p>
          <strong>{scanning ? 'SCANNING' : found ? '0.0842 SOL' : 'LET’S LOOK'}</strong>
          <button type="button" onClick={runDemo} disabled={scanning}>{scanning ? 'READING ACCOUNTS…' : found ? 'RUN IT AGAIN ↻' : 'RUN A SAFE DEMO →'}</button>
          <small>NON-CUSTODIAL · YOU APPROVE EVERY TRANSACTION</small>
        </div>
      </section>

      <div className="fun-ribbon" aria-hidden="true"><span>WITHDRAW THE EXCESS</span><b>KEEP THE ACCOUNT</b><span>TOUCH ZERO TOKENS</span><b>REPEAT</b></div>

      <section className="fun-proof" id="why">
        <div className="fun-section-heading">
          <p>THE SERIOUS PART</p>
          <h2>Fun on the surface.<br /><em>Strict underneath.</em></h2>
          <span>SolRent is not an account burner. It uses the Token Program’s excess-lamport withdrawal path to move only what sits above today’s rent floor.</span>
        </div>
        <div className="fun-proof-grid">
          <article className="fun-proof-hero">
            <div><span>THE ACCOUNT</span><strong>STAYS OPEN</strong></div>
            <i>◎</i>
            <p>Same address. Same token balance. Same working account. Only the extra lamports leave.</p>
          </article>
          <article><b>01</b><strong>ZERO CLOSE INSTRUCTIONS</strong><p>A reclaim transaction contains no account-closing step.</p></article>
          <article><b>02</b><strong>YOU SEE EVERY NUMBER</strong><p>Review the account, destination, network fee, and service fee before signing.</p></article>
          <article><b>03</b><strong>NOTHING TO FIND? FREE.</strong><p>Scanning costs nothing. The proposed fee applies only to a successful recovery.</p></article>
        </div>
      </section>

      <section className="fun-versus" aria-label="Account closing compared with SolRent reclaim">
        <div className="fun-versus-title"><span>DELETE BUTTON ENERGY</span><h2>Burner <b>vs.</b> SolRent</h2></div>
        <div className="fun-versus-card bad">
          <div className="fun-card-tag">TRADITIONAL CLOSER</div>
          <strong>ACCOUNT DELETED</strong>
          <div className="fun-mini-account"><i>×</i><span>Token account<br /><small>8kP3…xR42</small></span><b>CLOSED</b></div>
          <p>Recovers the full rent deposit by permanently closing an eligible empty account.</p>
        </div>
        <div className="fun-versus-card good">
          <div className="fun-card-tag">SOLRENT RECLAIM</div>
          <strong>ONLY EXTRA SOL MOVES</strong>
          <div className="fun-mini-account"><i>◎</i><span>Token account<br /><small>8kP3…xR42</small></span><b>OPEN</b></div>
          <p>Leaves the current rent reserve, account address, and every token exactly where they are.</p>
        </div>
      </section>

      <section className="fun-how" id="how">
        <div className="fun-how-intro"><p>THREE TAPS. NO CHAOS.</p><h2>Spot it.<br />Check it.<br /><em>Bring it home.</em></h2></div>
        <div className="fun-steps">
          <article><span>01</span><i>⌁</i><div><h3>Connect & scan</h3><p>Read public account data and compare each balance with the current rent-exempt minimum.</p></div></article>
          <article><span>02</span><i>◫</i><div><h3>Review the receipt</h3><p>See eligible accounts, expected recovery, fee, and final wallet destination before approval.</p></div></article>
          <article><span>03</span><i>↓</i><div><h3>Reclaim the surplus</h3><p>Approve one transparent transaction. Excess SOL moves; token accounts do not.</p></div></article>
        </div>
      </section>

      <section className="fun-ledger">
        <div className="fun-ledger-copy"><p>THE BIG NUMBER, LABELED HONESTLY</p><h2>A lot of SOL may be<br /><em>waiting for a ride home.</em></h2><span>Network figures are estimates until a complete public index is running. Your personal result is calculated account by account.</span></div>
        <div className="fun-number-card"><small>MODELED NETWORK OPPORTUNITY</small><strong>~$310M</strong><p>Directional estimate across the complete reduced-rent rollout—not a live wallet balance or audited total.</p><i>ESTIMATE · CHANGES WITH SOL PRICE + NETWORK STATE</i></div>
        <div className="fun-number-card small"><small>CLAIMED THROUGH SOLRENT</small><strong>$0</strong><p>Pre-launch baseline. This moves only after confirmed reclaim transactions.</p><i>VERIFIABLE PRODUCT COUNTER</i></div>
      </section>

      <section className="fun-final">
        <div className="fun-final-marks" aria-hidden="true"><i><BrandMark /></i><i>◎</i><i>↓</i></div>
        <p>YOUR LAMPORTS. YOUR WALLET.</p>
        <h2>There might be SOL<br /><em>under the couch.</em></h2>
        <button className="fun-primary" type="button" onClick={runDemo}>CHECK THE CUSHIONS <span>→</span></button>
        <a href="/">Reclaim real SOL on the live app ↗</a>
      </section>

      <footer className="fun-footer"><a className="fun-brand" href="/fun"><i><BrandMark /></i><b>SOLRENT</b><em>FUN LAB</em></a><p>Built for Solana’s reduced-rent era.</p><div><a href="/">Live app</a><a href="/solana-rent-reduction">How the cut works</a><a href="#why">Safety</a></div></footer>
    </main>
  );
}
