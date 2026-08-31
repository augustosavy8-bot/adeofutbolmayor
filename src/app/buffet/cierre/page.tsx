'use client';

import dynamic from 'next/dynamic';

/**
 * ssr:false a propósito: la pantalla habla con IndexedDB y con WebUSB, que no
 * existen en el servidor. Además garantiza que nada de /buffet se renderice
 * del lado del server.
 */
const Pantalla = dynamic(
  () => import('@/components/buffet/PantallaCierre').then((m) => m.PantallaCierre),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Abriendo el buffet…</p>
      </main>
    ),
  }
);

export default function Page() {
  return <Pantalla />;
}
