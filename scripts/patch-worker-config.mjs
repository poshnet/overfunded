/**
 * The Cloudflare Vite plugin regenerates dist/server/wrangler.json on every
 * build, so anything we need in the deployed config has to be re-applied
 * afterwards. Keeps the workers.dev URL and any custom domain in the repo
 * instead of in dashboard state nobody can find.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'dist/server/wrangler.json';
const config = JSON.parse(readFileSync(path, 'utf8'));

config.workers_dev = true;

const domain = process.env.WORKER_CUSTOM_DOMAIN?.trim();
if (domain) {
  config.routes = [{ pattern: domain, custom_domain: true }];
}

writeFileSync(path, JSON.stringify(config, null, 2));
console.log(`patched ${path}: workers_dev=true${domain ? `, custom_domain=${domain}` : ''}`);
