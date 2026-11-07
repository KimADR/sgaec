import type { Metadata } from 'next';
import Shell from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SGAEC — Gestion administrative et état civil',
  description: 'Prototype de démonstration SGAEC pour Antananarivo II',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><Shell>{children}</Shell></body></html>;
}
