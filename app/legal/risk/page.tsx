import type { Metadata } from 'next';
import { SITE_NAME, SOURCE_URL } from '../../site-config';

export const metadata: Metadata = {
  title: 'Risk Disclosure',
  description: 'Risk Disclosure for {SITE_NAME} — the non-custodial Solana rent recovery tool.'.replace('{SITE_NAME}', 'Overfunded'),
  alternates: { canonical: '/legal/risk' },
  robots: { index: true, follow: true },
};

export default function RiskPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav">
        <a href="/">← {SITE_NAME.toUpperCase()}</a>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer">SOURCE ↗</a>
      </nav>
      <article className="legal-doc">
        <small>RISK</small>
        <h1>Risk Disclosure</h1>
        <p className="updated">Last updated 4 September 2026</p>
        <p className="legal-draft"><strong>Draft.</strong> This document was prepared for review and has not been checked by a lawyer. Have it reviewed before relying on it.</p>
          <h2>Read this before connecting</h2>
          <p dangerouslySetInnerHTML={{ __html: "Recovering rent is a normal on-chain operation, but it is not risk-free. The risks below are real and worth understanding before you approve anything." }} />
          <h2>Transactions are irreversible</h2>
          <p dangerouslySetInnerHTML={{ __html: "Once a Solana transaction confirms it cannot be reversed, cancelled, or refunded by anyone. Review the instruction list in your wallet before approving \u2014 that screen, not this website, is what authorises the action." }} />
          <h2>Closing an account destroys it</h2>
          <p dangerouslySetInnerHTML={{ __html: "The closing tool permanently deletes token accounts. The address stops functioning as a token account, and if someone later sends you that token, the transfer needs an account to be created again at your cost." }} />
          <h2>Amounts are small at present</h2>
          <p dangerouslySetInnerHTML={{ __html: "Solana's rent reduction is rolling out in stages. Only the first has activated on mainnet, so the recoverable surplus per token account is currently a fraction of what it will be at full rollout. For a small wallet the recovered amount may be close to the network fees required to recover it." }} />
          <h2>You need SOL to recover SOL</h2>
          <p dangerouslySetInnerHTML={{ __html: "Every transaction costs a network fee. A wallet with no SOL cannot pay for the transaction that recovers its rent." }} />
          <h2>Third-party failure</h2>
          <p dangerouslySetInnerHTML={{ __html: "Wallets, RPC providers and the network itself can fail or be congested. A transaction can expire before confirming, and a batch can partially complete \u2014 recovering some accounts while leaving others untouched." }} />
          <h2>Impersonation</h2>
          <p dangerouslySetInnerHTML={{ __html: "Tools like this are a common target for cloned websites that drain wallets. Check the address bar, and verify any transaction's instructions before signing. The source of this site is public so its behaviour can be checked line by line." }} />
      </article>
    </main>
  );
}
