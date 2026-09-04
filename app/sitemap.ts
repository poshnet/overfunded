import type { MetadataRoute } from 'next';
import { POSTS } from './blog/posts';

const BASE = 'https://lamport-reclaim-sol.hunrtech.chatgpt.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/solana-rent-reduction`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    ...POSTS.map(post => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: new Date(post.published),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
