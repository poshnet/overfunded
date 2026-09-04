import type { Metadata } from 'next';
import './fun.css';

export const metadata: Metadata = {
  title: 'Lamport Fun Lab — Find the extra SOL',
  description: 'A playful prototype for reclaiming excess Solana rent without closing token accounts.',
};

export default function FunLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
