import type { MetadataRoute } from 'next';

const BASE = 'https://lamport-reclaim-sol.hunrtech.chatgpt.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/solana-rent-reduction`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
