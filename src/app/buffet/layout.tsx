import type { Metadata } from 'next';
import { PosLayout } from '@/components/buffet/PosLayout';

/**
 * Server component pero sin fetch: solo declara el manifest de la PWA del
 * buffet. Cada puesto tiene el suyo para que la tablet instale el acceso
 * directo correcto.
 */
export const metadata: Metadata = {
  title: 'Buffet ADEO',
  manifest: '/manifest-buffet.webmanifest',
};

export default function BuffetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PosLayout puesto="buffet">{children}</PosLayout>;
}
