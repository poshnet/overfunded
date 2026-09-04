import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import './game/game.css';
import './game/game-sections.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lamport-reclaim-sol.hunrtech.chatgpt.site'),
  title: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
  description: 'Solana lowered the rent-exempt minimum under SIMD-0437. Scan your SPL token accounts and reclaim the excess rent with WithdrawExcessLamports — no accounts closed, no tokens touched.',
  icons: { icon: '/favicon.svg' },
  keywords: ['solana rent', 'reclaim solana rent', 'solana rent refund', 'SIMD-0437',
    'WithdrawExcessLamports', 'solana rent exempt minimum', 'recover SOL', 'excess lamports'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Reclaim Solana Rent — Recover Excess SOL Without Closing Token Accounts',
    description: 'Solana lowered the rent-exempt minimum under SIMD-0437. Scan your SPL token accounts and reclaim the excess rent with WithdrawExcessLamports — no accounts closed, no tokens touched.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Overfunded — reclaim excess Solana rent' }],
  },
  applicationName: 'Overfunded',
  twitter: {
    card: 'summary_large_image',
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
