'use client';

import { useEffect } from 'react';
import { BuffetProvider } from '@/lib/buffet/estado';
import { arrancarSyncAutomatico } from '@/lib/buffet-sync';
import { getPrinter } from '@/lib/printer';

/**
 * El buffet cuelga fuera del route group (panel): no pasa por el layout
 * protegido ni por la sesión de Supabase. Todo es cliente porque la tablet
 * trabaja sin red.
 */
export default function BuffetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // El permiso USB dado la primera vez queda guardado: se reconecta sin
    // preguntar nada al abrir la app.
    void getPrinter().reconnect();
    return arrancarSyncAutomatico();
  }, []);

  return (
    <BuffetProvider>
      <div className="min-h-dvh bg-panel-950 text-zinc-100">{children}</div>
    </BuffetProvider>
  );
}
