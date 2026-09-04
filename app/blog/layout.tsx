import type { Metadata } from 'next';
import './blog.css';

export const metadata: Metadata = {
  title: 'Solana rent, explained — SolRent blog',
  description: 'Plain explanations of Solana account rent, the SIMD-0437 reduction, and how to recover the surplus sitting in your token accounts.',
};

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
