import type { Metadata } from 'next';
import { POSTS } from './posts';
import { SOURCE_URL } from '../site-config';
import { BrandMark } from '../brand-mark';

export const metadata: Metadata = {
  title: 'Solana Rent Claim Guides — How to Reclaim SOL',
  description: 'Guides to claiming SOL back from Solana token accounts: what the rent deposit on every account is, how much you can reclaim, whether claim tools are safe, and how the SIMD-0437 rent reduction works.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  return (
    <main className="blog-shell">
      <nav className="blog-nav">
        <a className="blog-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <a className="blog-nav-cta" href="/">SCAN MY WALLET →</a>
      </nav>

      <header className="blog-head">
        <div className="blog-grid" aria-hidden="true" />
        <div className="blog-kicker"><b>WRITING</b><span>SOLANA RENT</span></div>
        <h1>Solana rent,<br /><em>explained properly.</em></h1>
        <p>Every account on Solana holds a refundable deposit, and the rules that set its size just changed. These are the details, with the arithmetic shown and every figure checkable against a public RPC call.</p>
      </header>

      <section className="post-list">
        {POSTS.map((post, index) => (
          <a key={post.slug} className="post-card" href={`/blog/${post.slug}`}>
            <span className="post-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className="post-meta">
                <time dateTime={post.published}>{new Date(post.published).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                <span>{post.minutes} min read</span>
              </div>
            </div>
            <i aria-hidden="true">→</i>
          </a>
        ))}
      </section>

      <section className="blog-cta">
        <div className="blog-grid" aria-hidden="true" />
        <small>ENOUGH READING</small>
        <h2>Check your own wallet.</h2>
        <p>Scan your SPL token accounts against the live rent floor and see the surplus before approving anything. No accounts are closed.</p>
        <a href="/">CONNECT + SCAN MAINNET ▶</a>
      </section>

      <footer className="blog-footer">
        <a className="blog-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <div>
          <a href="/">Scanner</a>
          <a href="/solana-rent-reduction">Field guide</a>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a>
        </div>
      </footer>
    </main>
  );
}
