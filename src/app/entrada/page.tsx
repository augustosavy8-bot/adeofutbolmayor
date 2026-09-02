'use client';

import dynamic from 'next/dynamic';

/**
 * ssr:false a propósito: la pantalla habla con IndexedDB y con WebUSB, que no
 * existen en el servidor.
 */
const Pantalla = dynamic(
  () => import('@/components/buffet/PantallaEntrada').then((m) => m.PantallaEntrada),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Abriendo la boletería…</p>
      </main>
    ),
  }
);

export default function Page() {
  return <Pantalla />;
}
