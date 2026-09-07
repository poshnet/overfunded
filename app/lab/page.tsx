'use client';

import { useEffect, useState } from 'react';

/**
 * Internal workbench for the chest. Every variant renders the exact markup the
 * real tools render, at the scale they actually ship at, so what is judged here
 * is what visitors will see. Variants differ only by a class on the wrapper.
 *
 * Not linked from anywhere, not in the sitemap, noindex.
 */
const COIN_ARCS = [
  { sx: -46, cx: -30, cy: -122, rot: -80, delay: 0.0 },
  { sx: 22, cx: 24, cy: -132, rot: 95, delay: 0.03 },
  { sx: -12, cx: -38, cy: -115, rot: -70, delay: 0.055 },
  { sx: 52, cx: 26, cy: -128, rot: 110, delay: 0.08 },
  { sx: -58, cx: -20, cy: -134, rot: -100, delay: 0.105 },
  { sx: 8, cx: 40, cy: -118, rot: 75, delay: 0.13 },
];

const VARIANTS = [
  { id: 'v1', name: 'Current', note: 'What ships today' },
  { id: 'v2', name: 'Tall barrel', note: 'Deeper dome, rounder curve' },
  { id: 'v3', name: 'Crate', note: 'Flat top, heavy planks' },
  { id: 'v4', name: 'Squat', note: 'Wider and lower' },
  { id: 'v5', name: 'Iron-banded', note: 'Vertical straps, darker timber' },
  { id: 'v6', name: 'Arcade', note: 'Flat colour, hard edges, no gradients' },
  { id: 'v7', name: 'Refined chest', note: 'Same idea, properly finished: bevel, gold hardware, deeper timber' },
  { id: 'v8', name: 'Vault door', note: 'Circular steel door on a dial, swings open sideways' },
  { id: 'v9', name: 'Deposit safe', note: 'Heavy square door and a lever handle' },
  { id: 'v10', name: 'Geode', note: 'Faceted crystal that splits along its seam' },
  { id: 'v11', name: 'Dispenser', note: 'Clean hardware slot that ejects, no fantasy at all' },
];

/** Seven lids on the iron-banded body, which is the one that won. */
const LIDS = [
  { id: 'lid1', name: 'Barrel', note: 'The current half-cylinder, for reference' },
  { id: 'lid2', name: 'Strongbox', note: 'Flat top with a band across the face' },
  { id: 'lid3', name: 'Keystone', note: 'Arched, with a wide iron plate at the crown' },
  { id: 'lid4', name: 'Ribbed', note: 'Three iron ribs following the curve' },
  { id: 'lid5', name: 'Staved', note: 'Visible plank seams, cooper-built' },
  { id: 'lid6', name: 'Low profile', note: 'Shallow arc, heavy overhanging trim' },
  { id: 'lid7', name: 'Gabled', note: 'Peaked roof line instead of a curve' },
];

/** Coin studies, all on the chosen body + strongbox lid so the read is honest. */
const COINS = [
  { id: 'coin1', name: 'Shipped', note: 'What the live chest now uses (fountain)' },
  { id: 'coin2', name: 'Burst arc', note: 'Thrown out hard, gravity takes them down past the chest' },
  { id: 'coin3', name: 'Fountain', note: 'Up and back down into the open lid' },
  { id: 'coin4', name: 'Spiral', note: 'Rising while circling an invisible axis' },
  { id: 'coin5', name: 'Overflow', note: 'Spill over the front lip and tumble down the face' },
  { id: 'coin6', name: 'Geyser', note: 'Tight column straight up, disperses at the top' },
];

export default function ChestLab() {
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(true);
  const [big, setBig] = useState(false);
  const [loop, setLoop] = useState(true);
  // Per-cell replay counters, so clicking one card restarts only that one.
  const [runs, setRuns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loop) return;
    const timer = window.setInterval(() => setRun(value => value + 1), 3200);
    return () => window.clearInterval(timer);
  }, [loop]);

  const cellKey = (id: string) => `${run}-${runs[id] ?? 0}-${id}-${open}`;
  const replay = (id: string) => setRuns(current => ({ ...current, [id]: (current[id] ?? 0) + 1 }));

  return (
    <main className="lab">
      <header className="lab-head">
        <div>
          <small>INTERNAL · NOT LINKED</small>
          <h1>Chest Lab</h1>
          <p>Same markup and scale as the live panel. Pick one and I&rsquo;ll make it the real chest.</p>
        </div>
        <div className="lab-controls">
          <button type="button" onClick={() => setRun(value => value + 1)}>REPLAY ▶</button>
          <button type="button" className={open ? 'on' : ''} onClick={() => setOpen(value => !value)}>
            {open ? 'OPEN' : 'CLOSED'}
          </button>
          <button type="button" className={big ? 'on' : ''} onClick={() => setBig(value => !value)}>
            {big ? '2× ZOOM' : 'REAL SIZE'}
          </button>
          <button type="button" className={loop ? 'on' : ''} onClick={() => setLoop(value => !value)}>
            {loop ? 'LOOPING' : 'LOOP OFF'}
          </button>
        </div>
      </header>

      <div className={`lab-grid${big ? ' lab-big' : ''}`}>
        {VARIANTS.map(variant => (
          <figure key={variant.id} className={`lab-cell lab-${variant.id}`} onClick={() => replay(variant.id)}>
            <div className="lab-stage">
              <div
                key={cellKey(variant.id)}
                className={`game-chest${open ? ' lab-open' : ''}`}
                aria-hidden="true"
              >
                <div className="chest-glow" />
                <div className="chest-lid" />
                <div className="chest-body"><i /></div>
                {open && COIN_ARCS.map((arc, index) => (
                  <span
                    key={index}
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
            <figcaption><b>{variant.name}</b><span>{variant.note}</span></figcaption>
          </figure>
        ))}
      </div>

      <h2 className="lab-section">Lid studies &mdash; iron-banded body</h2>
      <div className={`lab-grid${big ? ' lab-big' : ''}`}>
        {LIDS.map(lid => (
          <figure key={lid.id} className={`lab-cell lab-v5 lab-${lid.id}`} onClick={() => replay(lid.id)}>
            <div className="lab-stage">
              <div
                key={cellKey(lid.id)}
                className={`game-chest${open ? ' lab-open' : ''}`}
                aria-hidden="true"
              >
                <div className="chest-glow" />
                <div className="chest-lid" />
                <div className="chest-body"><i /></div>
                {open && COIN_ARCS.map((arc, index) => (
                  <span
                    key={index}
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
            <figcaption><b>{lid.name}</b><span>{lid.note}</span></figcaption>
          </figure>
        ))}
      </div>

      <h2 className="lab-section">Coin studies &mdash; strongbox lid</h2>
      <div className={`lab-grid${big ? ' lab-big' : ''}`}>
        {COINS.map(coin => (
          <figure key={coin.id} className={`lab-cell lab-v5 lab-lid2 lab-${coin.id}`} onClick={() => replay(coin.id)}>
            <div className="lab-stage">
              <div
                key={cellKey(coin.id)}
                className={`game-chest${open ? ' lab-open' : ''}`}
                aria-hidden="true"
              >
                <div className="chest-glow" />
                <div className="chest-lid" />
                <div className="chest-body"><i /></div>
                {open && COIN_ARCS.map((arc, index) => (
                  <span
                    key={index}
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
            <figcaption><b>{coin.name}</b><span>{coin.note}</span></figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
