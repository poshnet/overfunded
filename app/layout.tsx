import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
  title: 'Lamport — Solana lowered rent. Claim the difference.',
  description: 'The rent floor changed. Scan token accounts and recover excess SOL without closing them.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Solana lowered rent. Claim the difference.',
    description: 'Scan token accounts and recover excess SOL without closing them.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lamport — reclaim excess Solana rent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solana lowered rent. Claim the difference.',
    description: 'Scan token accounts and recover excess SOL without closing them.',
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
