'use client';

import { useEffect } from 'react';
import type { Puesto } from '@/db/buffet';
import { BuffetProvider } from '@/lib/buffet/estado';
import { arrancarSyncAutomatico } from '@/lib/buffet-sync';
import { getPrinter } from '@/lib/printer';

/**
 * Envoltorio común de los dos puntos de venta (buffet y entrada). Todo lo que
 * habla con IndexedDB, WebUSB o la red vive de acá para abajo, en el cliente.
 */
export function PosLayout({
  puesto,
  children,
}: {
  puesto: Puesto;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // El permiso USB dado la primera vez queda guardado: se reconecta sin
    // preguntar nada al abrir la app.
    void getPrinter().reconnect();
    return arrancarSyncAutomatico();
  }, []);

  return (
    <BuffetProvider puesto={puesto}>
      <div className="min-h-dvh bg-panel-950 text-zinc-100">{children}</div>
    </BuffetProvider>
  );
}
