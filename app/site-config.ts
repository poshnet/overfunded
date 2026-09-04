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
