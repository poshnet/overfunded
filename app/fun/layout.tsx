import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './fun.css';

// Only the Fun Lab prototype paints with Geist Sans, so it is scoped here
// instead of being loaded and preloaded on every page of the product.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SolRent Fun Lab — Find the extra SOL',
  description: 'A playful prototype for reclaiming excess Solana rent without closing token accounts.',
};

export default function FunLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={geistSans.variable}>{children}</div>;
}
