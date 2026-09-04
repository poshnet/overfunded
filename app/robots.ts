import type { MetadataRoute } from 'next';
import { SITE_URL } from './site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Unlinked design prototypes: real pages, but not what anyone should
        // land on from a search result.
        disallow: ['/classic', '/fun', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
