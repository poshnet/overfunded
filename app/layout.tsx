import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from './site-config';
import './globals.css';
import './game/game.css';
import './game/game-sections.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
  description: 'Solana lowered the rent-exempt minimum under SIMD-0437. Scan your SPL token accounts and reclaim the excess rent with WithdrawExcessLamports — no accounts closed, no tokens touched.',
  icons: { icon: '/favicon.svg' },
  keywords: ['solana rent', 'reclaim solana rent', 'solana rent refund', 'SIMD-0437',
    'WithdrawExcessLamports', 'solana rent exempt minimum', 'recover SOL', 'excess lamports'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
    description: 'Solana lowered the rent-exempt minimum under SIMD-0437. Scan your SPL token accounts and reclaim the excess rent with WithdrawExcessLamports — no accounts closed, no tokens touched.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Overfunded — reclaim excess Solana rent' }],
  },
  applicationName: SITE_NAME,
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
    description: 'Solana lowered the rent-exempt minimum under SIMD-0437. Scan your SPL token accounts and reclaim the excess rent with WithdrawExcessLamports — no accounts closed, no tokens touched.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
