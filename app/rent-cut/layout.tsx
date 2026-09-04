import type { Metadata } from 'next';
import './rent-cut.css';

export const metadata: Metadata = {
  title: 'How the Solana rent cut works — Lamport',
  description: 'A field guide to SIMD-0437: what account rent is, how the five-stage reduction works, and why the surplus stays in your token accounts until you withdraw it.',
  openGraph: {
    title: 'How the Solana rent cut works',
    description: 'A field guide to SIMD-0437 — the five-stage rent-exempt minimum reduction, and the SOL it leaves behind in your token accounts.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lamport — how the Solana rent cut works' }],
  },
};

export default function RentCutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
