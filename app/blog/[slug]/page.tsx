import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findPost, POSTS, type Block } from '../posts';
import { SOURCE_URL } from '../../site-config';
import { BrandMark } from '../../brand-mark';

export function generateStaticParams() {
  return POSTS.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: ['/og.png'] },
  };
}

function renderBlock(block: Block, key: number) {
  switch (block.kind) {
    case 'h': return <h2 key={key}>{block.text}</h2>;
    case 'p': return <p key={key}>{block.text}</p>;
    case 'code': return <pre key={key}><code>{block.text}</code></pre>;
    case 'list': return <ul key={key}>{block.items.map(item => <li key={item}>{item}</li>)}</ul>;
    case 'callout': return (
      <aside key={key} className="post-callout"><b>{block.label}</b><span>{block.text}</span></aside>
    );
    case 'table': return (
      <div key={key} className="post-table">
        <table>
          <thead><tr>{block.head.map(cell => <th key={cell}>{cell}</th>)}</tr></thead>
          <tbody>{block.rows.map(row => (
            <tr key={row.join()}>{row.map((cell, index) => index === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={cell + index}>{cell}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  const others = POSTS.filter(other => other.slug !== post.slug);

  return (
    <main className="blog-shell">
      <nav className="blog-nav">
        <a className="blog-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <a className="blog-nav-cta" href="/">SCAN MY WALLET →</a>
      </nav>

      <article className="post">
        <header className="post-head">
          <div className="blog-grid" aria-hidden="true" />
          <a className="post-back" href="/blog">← ALL WRITING</a>
          <h1>{post.title}</h1>
          <div className="post-meta">
            <time dateTime={post.published}>{new Date(post.published).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
            <span>{post.minutes} min read</span>
          </div>
        </header>

        <div className="post-body">{post.blocks.map(renderBlock)}</div>

        <div className="post-inline-cta">
          <div>
            <b>SEE IT ON YOUR OWN WALLET</b>
            <span>Overfunded scans your SPL token accounts against the live rent floor and withdraws only the surplus. Nothing is closed, no tokens move, and the source is public.</span>
          </div>
          <a href="/">SCAN MY WALLET →</a>
        </div>

        <div className="post-more">
          <small>KEEP READING</small>
          {others.map(other => (
            <a key={other.slug} href={`/blog/${other.slug}`}><b>{other.title}</b><span>{other.description}</span></a>
          ))}
          <a href="/solana-rent-reduction"><b>The full field guide to SIMD-0437</b><span>Every stage of the rent reduction, with the live floor read from mainnet and the gates derived from it.</span></a>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          datePublished: post.published,
          dateModified: post.published,
          author: { '@type': 'Organization', name: 'Overfunded' },
          publisher: { '@type': 'Organization', name: 'Overfunded' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': `/blog/${post.slug}` },
        }) }}
      />

      <footer className="blog-footer">
        <a className="blog-brand" href="/"><i><BrandMark /></i><span><b>OVERFUNDED</b><small>SOLANA RENT</small></span></a>
        <div>
          <a href="/">Scanner</a>
          <a href="/blog">Writing</a>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">Source</a>
        </div>
      </footer>
    </main>
  );
}
