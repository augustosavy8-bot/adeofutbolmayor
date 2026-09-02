import type { Metadata } from 'next';
import { PosLayout } from '@/components/buffet/PosLayout';

export const metadata: Metadata = {
  title: 'Entrada ADEO',
  manifest: '/manifest-entrada.webmanifest',
};

export default function EntradaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PosLayout puesto="entrada">{children}</PosLayout>;
}
