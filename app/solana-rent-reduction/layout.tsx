import type { Metadata } from 'next';
import './solana-rent-reduction.css';

export const metadata: Metadata = {
  title: 'Solana Rent Reduction Explained — SIMD-0437, Stage by Stage',
  description: 'How much SOL can you reclaim from the Solana rent reduction? A field guide to SIMD-0437 — what account rent is, the five-stage cut from 6,960 to 696 lamports per byte, and why the surplus stays in your token accounts until you withdraw it.',
  alternates: { canonical: '/solana-rent-reduction' },
  openGraph: {
    title: 'Solana Rent Reduction Explained — SIMD-0437, Stage by Stage',
    description: 'A field guide to SIMD-0437 — the five-stage rent-exempt minimum reduction, and the SOL it leaves behind in your token accounts.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SolRent — how the Solana rent cut works' }],
  },
};

export default function SolanaRentReductionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
