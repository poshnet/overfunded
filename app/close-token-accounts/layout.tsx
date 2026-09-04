import type { Metadata } from 'next';
import './closer.css';

export const metadata: Metadata = {
  title: 'Close Empty Solana Token Accounts & Reclaim Rent',
  description: 'Scan zero-balance SPL Token and Token-2022 accounts, review exactly which token accounts will close, and reclaim their rent deposit to your wallet.',
  keywords: [
    'close Solana token accounts',
    'Solana token account closer',
    'reclaim token account rent',
    'close empty SPL token accounts',
    'recover Solana rent',
    'Token-2022 account closer',
  ],
  alternates: { canonical: '/close-token-accounts' },
  openGraph: {
    type: 'website',
    url: '/close-token-accounts',
    title: 'Close Empty Solana Token Accounts & Reclaim Rent',
    description: 'A transparent Solana token account closer for zero-balance SPL Token and Token-2022 accounts.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Overfunded — Solana rent tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Close Empty Solana Token Accounts & Reclaim Rent',
    description: 'Scan, review, and close only zero-balance Solana token accounts to recover their rent.',
    images: ['/og.png'],
  },
};

export default function CloseTokenAccountsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
