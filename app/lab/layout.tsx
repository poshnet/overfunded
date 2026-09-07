import type { Metadata } from 'next';
import './lab.css';

export const metadata: Metadata = {
  title: 'Chest Lab',
  description: 'Internal workbench for comparing chest designs.',
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
