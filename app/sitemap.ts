import type { MetadataRoute } from 'next';
import { POSTS } from './blog/posts';
import { SITE_URL } from './site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/solana-rent-reduction`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    ...POSTS.map(post => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.published),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
