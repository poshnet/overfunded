import type { Metadata } from 'next';
import './game.css';
import './game-sections.css';

export const metadata: Metadata = {
  title: 'Overfunded Quest — Unlock your excess SOL',
  description: 'A game-inspired Overfunded prototype that recovers excess Solana rent without closing token accounts.',
};

export default function GameLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
