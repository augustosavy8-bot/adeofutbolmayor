'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';

export function PanelShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const [colapsado, setColapsado] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Preferencia de colapso persistida en el navegador.
  useEffect(() => {
    setColapsado(localStorage.getItem('adeo:sidebar') === 'colapsado');
  }, []);

  function toggleColapsado() {
    setColapsado((prev) => {
      localStorage.setItem('adeo:sidebar', prev ? 'abierto' : 'colapsado');
      return !prev;
    });
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar fijo en desktop */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <Sidebar colapsado={colapsado} onToggleColapsado={toggleColapsado} />
      </aside>

      {/* Drawer en mobile */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDrawerAbierto(false)}
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar
              colapsado={false}
              onToggleColapsado={toggleColapsado}
              onNavegar={() => setDrawerAbierto(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-panel-700 bg-panel-900/95 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setDrawerAbierto(true)}
            className="btn-ghost px-2.5 py-2 md:hidden"
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <Image
            src="/adeo-logo.png"
            alt="ADEO"
            width={36}
            height={36}
            className="h-9 w-9 object-contain md:hidden"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight md:text-base">
              ADEO <span className="text-adeo-rojo">Fútbol Mayor</span>
            </p>
            <p className="hidden truncate text-xs text-zinc-400 sm:block">
              Panel de gestión
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-zinc-400 lg:block">
              {email}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost px-2.5 py-2 text-xs">
                Salir
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
