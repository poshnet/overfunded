'use client';

import { useEffect, useRef, useState } from 'react';
import { formatSol } from './solana-reclaim';

const DECIMALS = 5;
const PLACEHOLDER = '?.?????';

export type AmountMode = 'unknown' | 'scanning' | 'value' | 'verdict';

/**
 * The only visual answer the site gives, so it earns an animation:
 * unknown glyphs flicker, a scan spins the digits like a counter, and a
 * result counts up to the real figure. Motion is skipped entirely when the
 * visitor asks for that.
 */
export function StageAmount({ mode, lamports = 0, verdict = '', replay = '' }: {
  mode: AmountMode;
  lamports?: number;
  verdict?: string;
  replay?: string;
}) {
  const [text, setText] = useState(() => formatSol(lamports, DECIMALS));
  const raf = useRef(0);

  useEffect(() => {
    if (mode === 'unknown' || mode === 'verdict') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = formatSol(0, DECIMALS);

    if (mode === 'scanning') {
      if (reduceMotion) { setText(width); return; }
      let last = 0;
      const spin = (now: number) => {
        if (now - last > 55) {
          last = now;
          setText(width.replace(/\d/g, () => String(Math.floor(Math.random() * 10))));
        }
        raf.current = requestAnimationFrame(spin);
      };
      raf.current = requestAnimationFrame(spin);
      return () => cancelAnimationFrame(raf.current);
    }

    if (reduceMotion || lamports === 0) { setText(formatSol(lamports, DECIMALS)); return; }
    const started = performance.now();
    const countUp = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      const eased = 1 - (1 - progress) ** 4;
      setText(formatSol(Math.round(lamports * eased), DECIMALS));
      if (progress < 1) raf.current = requestAnimationFrame(countUp);
    };
    raf.current = requestAnimationFrame(countUp);
    return () => cancelAnimationFrame(raf.current);
  }, [mode, lamports, replay]);

  if (mode === 'verdict') return <strong className="stage-verdict">{verdict}</strong>;

  if (mode === 'unknown') {
    return (
      <strong className="stage-unknown">
        <span className="sr-only">Amount unknown until you scan</span>
        {PLACEHOLDER.split('').map((glyph, index) => (
          <em key={index} style={{ animationDelay: `${index * 110}ms` }} aria-hidden="true">{glyph}</em>
        ))}
        <b>SOL</b>
      </strong>
    );
  }

  return (
    <strong className={mode === 'scanning' ? 'stage-spinning' : 'stage-value'}>
      {text}<b>SOL</b>
    </strong>
  );
}
