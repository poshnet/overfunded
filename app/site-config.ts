/**
 * Single source of truth for the site's public identity.
 *
 * SITE_URL feeds metadataBase, canonicals, the sitemap and robots. Override it
 * at build time with NEXT_PUBLIC_SITE_URL when deploying to a preview host.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://overfunded.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Overfunded';
export const TWITTER_HANDLE = '@reclaimsol';

/** Public source repository. Update here and every link on the site follows. */
export const SOURCE_URL = 'https://github.com/poshnet/overfunded';

/**
 * Pump.fun mint for the community coin.
 *
 * Paste the address into COIN_MINT_FALLBACK after launch (or set
 * NEXT_PUBLIC_COIN_MINT for a preview build) and the contract-address bar
 * appears above the nav on every tool page. While it is empty the bar renders
 * nothing at all, so this can ship before the coin exists.
 */
const COIN_MINT_FALLBACK = '';

export const COIN_MINT = (process.env.NEXT_PUBLIC_COIN_MINT || COIN_MINT_FALLBACK).trim();
export const COIN_TICKER = 'OVERFUNDED';
export const COIN_URL = COIN_MINT ? `https://pump.fun/coin/${COIN_MINT}` : '';
