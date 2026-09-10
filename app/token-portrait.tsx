'use client';

import { createContext, useContext } from 'react';
import { shortenAddress } from './game/solana-reclaim';

export type TokenMeta = { symbol: string; name: string; icon: string | null };

/**
 * Metadata keyed by mint, filled in after a scan. A mint that is absent or null
 * simply has no listing, which is the common case in a cluttered wallet.
 */
export const TokenMetaContext = createContext<Record<string, TokenMeta | null>>({});

/**
 * Real logo where one exists, generated chip where it does not. The chip is not
 * a placeholder to be removed later: most mints sitting in an abandoned token
 * account are unlisted junk and will never have an icon, so the fallback is the
 * common path and has to look deliberate rather than broken.
 */
export function TokenPortrait({ mint }: { mint: string }) {
  const meta = useContext(TokenMetaContext)[mint];
  const label = meta?.symbol || shortenAddress(mint, 4);

  if (meta?.icon) {
    return (
      <span className="token-portrait has-icon" title={meta.name || meta.symbol}>
        {/* Plain img: these are arbitrary third-party URLs, not our own assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.icon}
          alt={`${label} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.style.display = 'none'; }}
        />
      </span>
    );
  }

  let hash = 0;
  for (const character of mint) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return (
    <span
      className="token-portrait"
      style={{ '--token-hue': hash } as React.CSSProperties}
      title={meta?.name || undefined}
      aria-label={`Token mint ${shortenAddress(mint, 4)}`}
    >
      <b aria-hidden="true">{(meta?.symbol || mint).slice(0, 2).toUpperCase()}</b>
    </span>
  );
}
