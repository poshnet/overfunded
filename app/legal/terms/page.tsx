import type { Metadata } from 'next';
import { SITE_NAME, SOURCE_URL } from '../../site-config';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for {SITE_NAME} — the non-custodial Solana rent recovery tool.'.replace('{SITE_NAME}', 'Overfunded'),
  alternates: { canonical: '/legal/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav">
        <a href="/">← {SITE_NAME.toUpperCase()}</a>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">SOURCE ↗</a>
      </nav>
      <article className="legal-doc">
        <small>TERMS</small>
        <h1>Terms of Use</h1>
        <p className="updated">Last updated 4 September 2026</p>
        <p className="legal-draft"><strong>Draft.</strong> This document was prepared for review and has not been checked by a lawyer. Have it reviewed before relying on it.</p>
          <h2>What Overfunded is</h2>
          <p dangerouslySetInnerHTML={{ __html: "Overfunded is a <strong>non-custodial</strong> web interface that helps you build Solana transactions against your own accounts. It never takes possession of your funds, never holds your private keys, and cannot move anything without a transaction you approve in your own wallet." }} />
          <h2>You are responsible for what you sign</h2>
          <p dangerouslySetInnerHTML={{ __html: "Every action is a transaction you review and approve. You are responsible for reading the instructions your wallet displays before approving them. Blockchain transactions are <strong>irreversible</strong>; once confirmed, neither Overfunded nor anyone else can undo them." }} />
          <h2>Closing accounts is permanent</h2>
          <p dangerouslySetInnerHTML={{ __html: "The account-closing tool deletes token accounts. This cannot be undone, and reopening an account later costs a new rent deposit. Use it only on accounts you are finished with." }} />
          <h2>Fees</h2>
          <p dangerouslySetInnerHTML={{ __html: "A service fee of 5% of the recovered amount is charged only on a successful recovery, disclosed before you sign, and included in the same transaction you approve. Solana network fees are separate, are paid to validators, and are not received by Overfunded. If nothing is recovered, nothing is charged." }} />
          <h2>No warranty</h2>
          <p dangerouslySetInnerHTML={{ __html: "The service is provided <strong>as is</strong>, without warranties of any kind. Overfunded does not guarantee that any particular amount is recoverable, that transactions will confirm, or that the service will be available or error-free. Third-party infrastructure, including RPC providers and wallets, may fail independently of us." }} />
          <h2>Limitation of liability</h2>
          <p dangerouslySetInnerHTML={{ __html: "To the maximum extent permitted by law, Overfunded is not liable for any loss of funds, tokens, or opportunity arising from use of the service, including losses caused by network conditions, wallet software, third-party providers, or transactions you approved." }} />
          <h2>Not financial advice</h2>
          <p dangerouslySetInnerHTML={{ __html: "Nothing on this site is financial, investment, tax or legal advice. Rent recovery may have tax consequences in your jurisdiction, and determining that is your responsibility." }} />
          <h2>Changes</h2>
          <p dangerouslySetInnerHTML={{ __html: "These terms may change. The source of this site is public, so every change to it is visible in the repository's history." }} />
      </article>
    </main>
  );
}
