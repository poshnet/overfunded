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
  metadataBase: new URL('https://lamport-reclaim-sol.open-hinny-7742.chatgpt.site'),
  title: 'Lamport — Reclaim excess Solana rent',
  description: 'Scan token accounts and reclaim excess rent without closing them.',
  openGraph: {
    title: 'Your SOL is waiting',
    description: 'Reclaim excess rent. Keep every account open.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lamport — reclaim excess Solana rent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your SOL is waiting',
    description: 'Reclaim excess rent. Keep every account open.',
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
