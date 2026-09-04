'use client';

import { useEffect, useState } from 'react';
import {
  activeStageIndex,
  formatSol,
  getCurrentRentFloorLamports,
  lamportsPerByteFromFloor,
  LEGACY_LAMPORTS_PER_BYTE,
  RENT_ACCOUNT_OVERHEAD_BYTES,
  RENT_STAGES,
  rentFloorFor,
  stageReductionPercent,
  TOKEN_ACCOUNT_SPACE,
} from '../game/solana-reclaim';

const ACCOUNT_KINDS = [
  { bytes: 82, label: 'Mint account', note: 'SPL token mint' },
  { bytes: 165, label: 'Token account', note: 'the one your wallet holds' },
  { bytes: 355, label: 'Multisig account', note: 'SPL multisig' },
];

export default function RentCutPage() {
  const [floorLamports, setFloorLamports] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentRentFloorLamports()
      .then(floor => { if (!cancelled) setFloorLamports(floor); })
      .catch(() => { if (!cancelled) setFloorLamports(null); });
    return () => { cancelled = true; };
  }, []);

  const liveRate = floorLamports === null ? null : Math.round(lamportsPerByteFromFloor(floorLamports));
  const stageIndex = floorLamports === null ? -1 : activeStageIndex(floorLamports);
  const stagesLive = stageIndex + 1;
  const finalRate = RENT_STAGES[RENT_STAGES.length - 1].lamportsPerByte;
  const chargeableBytes = RENT_ACCOUNT_OVERHEAD_BYTES + TOKEN_ACCOUNT_SPACE;
  const legacyTokenRent = chargeableBytes * LEGACY_LAMPORTS_PER_BYTE;

  return (
    <main className="cut-shell">
      <nav className="cut-nav">
        <a className="cut-brand" href="/"><i>L</i><span><b>LAMPORT</b><small>FIELD GUIDE</small></span></a>
        <a className="cut-nav-cta" href="/">SCAN MY WALLET →</a>
      </nav>

      <header className="cut-hero">
        <div className="cut-grid" aria-hidden="true" />
        <div className="cut-kicker"><b>FIELD GUIDE</b><span>SIMD-0437</span></div>
        <h1>Rent got cheaper.<br /><em>Your accounts didn’t notice.</em></h1>
        <p>Every account on Solana holds a deposit that keeps it alive. That deposit just got smaller — but the lamports already sitting in your accounts did not move. Here is exactly what changed, and where the difference went.</p>
        <div className="cut-hero-meta">
          <div><span>READING TIME</span><b>4 minutes</b></div>
          <div><span>ROLLOUT</span><b>{floorLamports === null ? '—' : `Stage ${stagesLive} of ${RENT_STAGES.length}`}</b></div>
          <div><span>LIVE RATE</span><b>{liveRate === null ? '—' : `${liveRate.toLocaleString('en-US')} /byte`}</b></div>
        </div>
      </header>

      <section className="cut-section">
        <div className="cut-num"><span>01</span></div>
        <div className="cut-body">
          <h2>What rent actually is</h2>
          <p>Solana charges every account a one-off deposit to stay resident in validator memory. It is not a fee — you keep it, and you get it back if the account is ever closed. The size of that deposit is pure arithmetic:</p>

          <div className="cut-formula">
            <code><b>rent</b> = ( <em>128</em> + <em>data_len</em> ) × <em>lamports_per_byte</em></code>
          </div>

          <p>The <code>128</code> is fixed overhead the runtime charges for every account, regardless of what it stores. A standard SPL token account stores {TOKEN_ACCOUNT_SPACE} bytes, so it is billed for {chargeableBytes}:</p>

          <div className="byte-diagram" aria-hidden="true">
            <div className="byte-block overhead" style={{ flex: RENT_ACCOUNT_OVERHEAD_BYTES }}><span>128</span><small>ACCOUNT OVERHEAD</small></div>
            <div className="byte-block data" style={{ flex: TOKEN_ACCOUNT_SPACE }}><span>165</span><small>TOKEN ACCOUNT DATA</small></div>
          </div>
          <p className="byte-total">= <b>{chargeableBytes} chargeable bytes</b> for every token account you own</p>

          <div className="cut-callout">
            <span>UNDER THE LEGACY RATE</span>
            <code>{chargeableBytes} × {LEGACY_LAMPORTS_PER_BYTE.toLocaleString('en-US')} = {legacyTokenRent.toLocaleString('en-US')} lamports = {formatSol(legacyTokenRent, 8)} SOL</code>
            <small>If you have ever opened a token account, this is what you paid. It is the same number for everyone.</small>
          </div>
        </div>
      </section>

      <section className="cut-section">
        <div className="cut-num"><span>02</span></div>
        <div className="cut-body">
          <h2>What SIMD-0437 changes</h2>
          <p>The proposal leaves the formula alone and lowers one variable: <code>lamports_per_byte</code>. It drops from {LEGACY_LAMPORTS_PER_BYTE.toLocaleString('en-US')} to {finalRate} across five independently gated stages — a {stageReductionPercent(finalRate)}% cut once all five activate. Each gate is a separate switch, so the rate steps down over time rather than all at once.</p>

          <div className="rate-chart">
            <div className="rate-row legacy">
              <span>LEGACY</span>
              <i><em style={{ width: '100%' }} /></i>
              <b>{LEGACY_LAMPORTS_PER_BYTE.toLocaleString('en-US')}</b>
            </div>
            {RENT_STAGES.map((stage, index) => (
              <div key={stage.id} className={index <= stageIndex ? 'rate-row live' : 'rate-row'}>
                <span>{stage.id.replace('SIMD-0437-', 'GATE ')}</span>
                <i><em style={{ width: `${(stage.lamportsPerByte / LEGACY_LAMPORTS_PER_BYTE) * 100}%` }} /></i>
                <b>{stage.lamportsPerByte.toLocaleString('en-US')}</b>
                <small>{index <= stageIndex ? 'ACTIVE' : 'PENDING'}</small>
              </div>
            ))}
          </div>
          <p className="chart-note">Bar length is the rate itself, relative to the legacy {LEGACY_LAMPORTS_PER_BYTE.toLocaleString('en-US')}. {floorLamports === null ? 'The live rate could not be read just now.' : `This cluster currently reports ${liveRate?.toLocaleString('en-US')} lamports per byte, which puts it at stage ${stagesLive}.`}</p>
        </div>
      </section>

      <section className="cut-section">
        <div className="cut-num"><span>03</span></div>
        <div className="cut-body">
          <h2>Why the difference is still yours</h2>
          <p>Here is the part people miss. Lowering the minimum does <em>not</em> claw anything back, and it does not push anything out. Your account was funded once, at whatever the floor was that day, and those lamports simply stay where they are. The runtime has no mechanism that sweeps the difference home for you.</p>

          <div className="gap-diagram">
            <div className="gap-col">
              <small>WHAT YOUR ACCOUNT HOLDS</small>
              <div className="gap-bar">
                <div className="gap-surplus" style={{ height: floorLamports === null ? '9%' : `${((legacyTokenRent - floorLamports) / legacyTokenRent) * 100}%` }}>
                  <span>SURPLUS</span>
                </div>
                <div className="gap-floor"><span>STILL REQUIRED</span></div>
              </div>
              <b>{formatSol(legacyTokenRent, 8)} SOL</b>
            </div>
            <div className="gap-arrow" aria-hidden="true">→</div>
            <div className="gap-col">
              <small>WHAT IT NOW NEEDS</small>
              <div className="gap-bar">
                <div className="gap-empty" style={{ height: floorLamports === null ? '9%' : `${((legacyTokenRent - floorLamports) / legacyTokenRent) * 100}%` }} />
                <div className="gap-floor"><span>RENT-EXEMPT FLOOR</span></div>
              </div>
              <b>{floorLamports === null ? '—' : `${formatSol(floorLamports, 8)} SOL`}</b>
            </div>
          </div>
          <p className="chart-note">The lime band is the gap between the two. It is not a reward, an airdrop, or a yield — it is your own deposit, no longer required.</p>
        </div>
      </section>

      <section className="cut-section">
        <div className="cut-num"><span>04</span></div>
        <div className="cut-body">
          <h2>What it is worth, per account</h2>
          <p>Because rent scales with account size, bigger accounts strand more. These are the three sizes you are most likely to own:</p>
          <div className="size-table">
            <div className="size-row head"><span>ACCOUNT</span><b>BYTES</b><b>LEGACY DEPOSIT</b><b>FLOOR NOW</b><b>SURPLUS NOW</b><b>AT FULL ROLLOUT</b></div>
            {ACCOUNT_KINDS.map(kind => {
              const legacy = rentFloorFor(kind.bytes, LEGACY_LAMPORTS_PER_BYTE);
              const now = liveRate === null ? null : rentFloorFor(kind.bytes, liveRate);
              const end = rentFloorFor(kind.bytes, finalRate);
              return (
                <div className="size-row" key={kind.bytes}>
                  <span><b>{kind.label}</b><small>{kind.note}</small></span>
                  <b>{kind.bytes}</b>
                  <b>{formatSol(legacy, 8)}</b>
                  <b>{now === null ? '—' : formatSol(now, 8)}</b>
                  <b className="gain">{now === null ? '—' : `+${formatSol(legacy - now, 8)}`}</b>
                  <b className="gain strong">+{formatSol(legacy - end, 8)}</b>
                </div>
              );
            })}
          </div>
          <p className="chart-note">Values in SOL. “Surplus now” is what today’s live rate leaves recoverable; the last column is what all five gates would leave. Accounts opened after a gate activates start at the newer floor and strand nothing.</p>
        </div>
      </section>

      <section className="cut-section">
        <div className="cut-num"><span>05</span></div>
        <div className="cut-body">
          <h2>How it comes back out</h2>
          <p>There are two ways to get rent out of an account, and they are not equivalent. The older tools use the destructive one because, before this change, it was the only one worth using.</p>
          <div className="method-pair">
            <article className="method destructive">
              <div className="method-head"><span>CloseAccount</span><b>DESTRUCTIVE</b></div>
              <ul>
                <li>Returns the entire deposit</li>
                <li>Deletes the account permanently</li>
                <li>Requires a zero token balance first</li>
                <li>The address stops working</li>
              </ul>
              <em>Right tool for dead, empty accounts.</em>
            </article>
            <article className="method safe">
              <div className="method-head"><span>WithdrawExcessLamports</span><b>NON-DESTRUCTIVE</b></div>
              <ul>
                <li>Returns only what sits above the floor</li>
                <li>Account stays open and rent-exempt</li>
                <li>Token balance is never touched</li>
                <li>The address keeps working</li>
              </ul>
              <em>Right tool for accounts you still use.</em>
            </article>
          </div>
          <p>The second instruction takes three accounts — the source, the destination, and the authority that signs — and moves exactly <code>lamports − minimum_balance</code>. There is no amount parameter to get wrong, and nothing to configure. It exists on both the Token Program and Token-2022.</p>
        </div>
      </section>

      <section className="cut-section">
        <div className="cut-num"><span>06</span></div>
        <div className="cut-body">
          <h2>Check it yourself</h2>
          <p>None of this requires trusting us. The rent floor is a public RPC call, and every number on this page is derived from it. Run this against any mainnet node:</p>
          <div className="cut-terminal">
            <div className="term-head"><span>curl</span><i>● ● ●</i></div>
            <pre>{`curl -s https://api.mainnet-beta.solana.com \\
  -X POST -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,
       "method":"getMinimumBalanceForRentExemption",
       "params":[165]}'`}</pre>
            <div className="term-out">
              <span>RESPONSE</span>
              <code>{floorLamports === null ? '{"jsonrpc":"2.0","result": …, "id":1}' : `{"jsonrpc":"2.0","result":${floorLamports},"id":1}`}</code>
            </div>
          </div>
          <p className="chart-note">Divide that result by {chargeableBytes} and you get the live <code>lamports_per_byte</code>. Match it against the ladder above and you know which gates are active — which is precisely how this page decides what to label ACTIVE.</p>
        </div>
      </section>

      <section className="cut-cta">
        <div className="cut-grid" aria-hidden="true" />
        <small>NOW THE USEFUL PART</small>
        <h2>See what your own<br /><em>wallet is holding.</em></h2>
        <p>The scanner reads your token accounts, compares each one against the live floor, and shows the surplus before you approve anything. No accounts are closed.</p>
        <a href="/">CONNECT + SCAN MAINNET ▶</a>
      </section>

      <footer className="cut-footer">
        <a className="cut-brand" href="/"><i>L</i><span><b>LAMPORT</b><small>FIELD GUIDE</small></span></a>
        <p>BUILT FOR SOLANA’S REDUCED-RENT ERA</p>
        <div><a href="/">Scanner</a><a href="#top">Top</a></div>
      </footer>
    </main>
  );
}
