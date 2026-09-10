'use client';

import type { BatchPhase, BatchProgress } from './game/solana-reclaim';
import { formatSol } from './game/solana-reclaim';

const LABEL: Record<BatchPhase, string> = {
  preparing: 'Reading accounts…',
  approving: 'Waiting for your approval',
  confirming: 'Confirming on-chain…',
  confirmed: 'Paid',
  skipped: 'Nothing left to send',
};

/**
 * One row per transaction, because a batched reclaim is not one payment.
 * Solana's transaction size limit forces several, each needing its own wallet
 * approval and each landing its own SOL separately — so someone watching their
 * balance sees it arrive in instalments. Showing "1 of 3" only after the fact
 * made that look like a partial refund or a stuck job.
 */
export function BatchSteps({ steps, total }: { steps: BatchProgress[]; total: number }) {
  if (total === 0) return null;
  const rows = Array.from({ length: total }, (_, index) => steps[index]);
  const paid = rows.filter(row => row?.phase === 'confirmed').length;

  return (
    <div className="batch-steps">
      <div className="batch-head">
        <b>{total === 1 ? 'ONE TRANSACTION' : `${total} SEPARATE TRANSACTIONS`}</b>
        <span>{paid} of {total} paid</span>
      </div>
      {total > 1 && (
        <p className="batch-why">
          Too many accounts for one Solana transaction, so this is split. Each one
          is approved separately and its SOL arrives separately.
        </p>
      )}
      <ol>
        {rows.map((row, index) => {
          const phase = (row?.phase ?? 'queued') as BatchPhase | 'queued';
          return (
            <li key={index} className={`batch-${phase}`}>
              <i aria-hidden="true">{row?.phase === 'confirmed' ? '✓' : row ? '•' : ''}</i>
              <b>{index + 1}/{total}</b>
              <span>{row ? LABEL[row.phase] : 'Queued'}</span>
              {row?.lamports ? <strong>+{formatSol(row.lamports, 5)} SOL</strong> : <strong />}
              {row?.signature && (
                <a href={`https://solscan.io/tx/${row.signature}`} target="_blank" rel="noreferrer">verify ↗</a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
