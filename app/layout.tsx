import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './game/game.css';
import './game/game-sections.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lamport-reclaim-sol.hunrtech.chatgpt.site'),
  title: 'Lamport Rent Quest — Unlock your excess SOL',
  description: 'Scan Solana token accounts and recover excess rent without closing accounts or touching tokens.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Lamport Rent Quest — Unlock your excess SOL',
    description: 'Scan Solana token accounts and recover excess rent without closing accounts or touching tokens.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lamport — reclaim excess Solana rent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lamport Rent Quest — Unlock your excess SOL',
    description: 'Scan Solana token accounts and recover excess rent without closing accounts or touching tokens.',
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
