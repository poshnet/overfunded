import { shortenAddress } from './game/solana-reclaim';

/**
 * Deterministic chip for a mint: the address hashes to a hue, so the same
 * token always looks the same without fetching anything. Real logos would
 * need a per-mint metadata lookup — the token-list CDN 404s for most mints.
 */
export function TokenPortrait({ mint }: { mint: string }) {
  let hash = 0;
  for (const character of mint) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return (
    <span
      className="token-portrait"
      style={{ '--token-hue': hash } as React.CSSProperties}
      aria-label={`Token mint ${shortenAddress(mint, 4)}`}
    >
      <b aria-hidden="true">{mint.slice(0, 2).toUpperCase()}</b>
    </span>
  );
}
