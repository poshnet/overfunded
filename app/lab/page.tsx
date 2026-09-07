'use client';

import { useState } from 'react';

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
];

export default function ChestLab() {
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(true);
  const [big, setBig] = useState(false);

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
        </div>
      </header>

      <div className={`lab-grid${big ? ' lab-big' : ''}`}>
        {VARIANTS.map(variant => (
          <figure key={variant.id} className={`lab-cell lab-${variant.id}`}>
            <div className="lab-stage">
              <div
                key={`${run}-${variant.id}-${open}`}
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
    </main>
  );
}
