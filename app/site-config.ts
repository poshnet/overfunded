/**
 * Single source of truth for the site's public identity.
 *
 * SITE_URL feeds metadataBase, canonicals, the sitemap and robots, so pointing
 * a real domain at the deployment is a one-variable change. Set
 * NEXT_PUBLIC_SITE_URL at build time; the fallback is the current host.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://lamport-reclaim-sol.hunrtech.chatgpt.site'
).replace(/\/$/, '');

export const SITE_NAME = 'SolRent';

/** Public source repository. Update here and every link on the site follows. */
export const SOURCE_URL = 'https://github.com/poshnet/overfunded';
