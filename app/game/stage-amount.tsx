'use client';

import { formatSol } from './solana-reclaim';

const DECIMALS = 5;

export type AmountMode = 'unknown' | 'scanning' | 'value' | 'verdict';

/**
 * The headline figure. Every state renders as plain static text — the only
 * motion is a short bounce when a real amount lands, which is the one moment
 * worth marking.
 */
export function StageAmount({ mode, lamports = 0, verdict = '' }: {
  mode: AmountMode;
  lamports?: number;
  verdict?: string;
}) {
  if (mode === 'verdict') return <strong className="stage-verdict">{verdict}</strong>;
  if (mode === 'scanning') {
    return (
      <strong className="stage-scanning" aria-label="Scanning your accounts">
        {[0, 1, 2].map(index => (
          <em key={index} style={{ animationDelay: `${index * 0.16}s` }} aria-hidden="true">•</em>
        ))}
      </strong>
    );
  }
  if (mode === 'unknown') {
    return (
      <strong className="stage-unknown" aria-label="Amount unknown until you scan">
        ???<b>SOL</b>
      </strong>
    );
  }
  return (
    <strong className="stage-value">
      {formatSol(lamports, DECIMALS)}<b>SOL</b>
    </strong>
  );
}
