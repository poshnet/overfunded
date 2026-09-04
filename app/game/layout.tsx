import type { Metadata } from 'next';
import './game.css';
import './game-sections.css';

export const metadata: Metadata = {
  title: 'Lamport Quest — Unlock your excess SOL',
  description: 'A game-inspired Lamport prototype that recovers excess Solana rent without closing token accounts.',
};

export default function GameLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
