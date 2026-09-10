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
 * Accounts are chunked purely by count (ACCOUNTS_PER_TRANSACTION), since a
 * Solana transaction is capped at 1232 bytes — not by token type. Each chunk
 * needs its own wallet approval and lands its own SOL, so someone watching
 * their balance sees it arrive in instalments. Showing "1 of 3" only after the
 * fact made that look like a partial refund or a stuck job.
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
          Solana caps how much fits in a single transaction, so your accounts are
          spread across several. Each needs its own approval and pays out its own
          SOL &mdash; your balance goes up in steps, not all at once.
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
