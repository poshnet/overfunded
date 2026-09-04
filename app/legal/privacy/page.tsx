import type { Metadata } from 'next';
import { SITE_NAME, SOURCE_URL } from '../../site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for {SITE_NAME} — the non-custodial Solana rent recovery tool.'.replace('{SITE_NAME}', 'Overfunded'),
  alternates: { canonical: '/legal/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav">
        <a href="/">← {SITE_NAME.toUpperCase()}</a>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">SOURCE ↗</a>
      </nav>
      <article className="legal-doc">
        <small>PRIVACY</small>
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated 4 September 2026</p>
        <p className="legal-draft"><strong>Draft.</strong> This document was prepared for review and has not been checked by a lawyer. Have it reviewed before relying on it.</p>
          <h2>The short version</h2>
          <p dangerouslySetInnerHTML={{ __html: "Overfunded has <strong>no accounts, no sign-up and no database of users</strong>. We do not ask for your name, email address or any personal detail, and there is nothing to unsubscribe from." }} />
          <h2>What the site sees</h2>
          <p dangerouslySetInnerHTML={{ __html: "When you connect a wallet, the site receives your <strong>public wallet address</strong> \u2014 the same address visible to anyone on the blockchain. It is used in your browser to look up your token accounts and to build transactions. It is not stored on a server and is discarded when you close the tab." }} />
          <h2>Blockchain data is public</h2>
          <p dangerouslySetInnerHTML={{ __html: "Solana is a public ledger. Any transaction you approve \u2014 including the disclosed fee transfer \u2014 is permanently visible to everyone, and that is outside anyone's control, including ours." }} />
          <h2>The RPC relay</h2>
          <p dangerouslySetInnerHTML={{ __html: "Requests to the Solana network pass through this site's relay so the upstream endpoint is not exposed to your browser. The relay applies a per-IP rate limit, which means it processes your IP address transiently to count requests. It does not log request bodies or retain them." }} />
          <h2>Cookies and tracking</h2>
          <p dangerouslySetInnerHTML={{ __html: "This site sets <strong>no cookies</strong> and runs no advertising or cross-site tracking scripts." }} />
          <h2>Third parties</h2>
          <p dangerouslySetInnerHTML={{ __html: "Your wallet extension and the upstream RPC provider are operated by others and have their own privacy practices. Wallet software may see activity we never do." }} />
      </article>
    </main>
  );
}
