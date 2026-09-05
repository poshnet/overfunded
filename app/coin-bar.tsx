'use client';

import { useEffect, useState } from 'react';
import { COIN_MINT, COIN_TICKER, COIN_URL } from './site-config';

/**
 * Contract-address strip that sits above the nav on both tool pages.
 *
 * Renders nothing while COIN_MINT is empty, so it ships safely before the coin
 * exists and turns itself on the moment an address is filled in.
 */
export function CoinBar() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const reset = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(reset);
  }, [copied]);

  if (!COIN_MINT) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(COIN_MINT);
      setCopied(true);
    } catch {
      // Clipboard is blocked on insecure origins and in some embedded views.
      // The address stays selectable, so failing quietly is better than an alert.
      setCopied(false);
    }
  };

  return (
    <div className="ca-bar">
      <span className="ca-tag"><i aria-hidden="true" />${COIN_TICKER}</span>

      <button className="ca-addr" type="button" onClick={copyAddress} title="Copy the contract address">
        <span className="ca-full">{COIN_MINT}</span>
        <span className="ca-short">{`${COIN_MINT.slice(0, 6)}…${COIN_MINT.slice(-6)}`}</span>
        <b aria-hidden="true">{copied ? 'COPIED ✓' : 'COPY'}</b>
      </button>

      <span className="ca-live" role="status" aria-live="polite">
        {copied ? 'Contract address copied' : ''}
      </span>

      {COIN_URL ? (
        <a className="ca-link" href={COIN_URL} target="_blank" rel="noopener noreferrer">PUMP.FUN ↗</a>
      ) : null}
    </div>
  );
}
