'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSesion } from '@/lib/buffet/estado';

const NAV = [
  { href: '/buffet', label: 'Venta' },
  { href: '/buffet/ventas', label: 'Ventas' },
  { href: '/buffet/cierre', label: 'Cierre' },
  { href: '/buffet/config', label: 'Config' },
];

function Conexion() {
  // Arranca en true para no dibujar "sin conexión" durante la hidratación.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const actualizar = () => setOnline(navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  return (
    <span
      title={online ? 'Con conexión' : 'Sin conexión (la venta funciona igual)'}
      className={`chip text-[11px] ${
        online
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-panel-800 text-zinc-500'
      }`}
    >
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  );
}

/**
 * Todas las pantallas operativas exigen turno abierto. Si no hay, se vuelve al
 * login: sin turno no se puede cobrar ni arquear.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { cajero, turno, cargando } = useSesion();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!cargando && (!cajero || !turno)) router.replace('/buffet/login');
  }, [cargando, cajero, turno, router]);

  if (cargando || !cajero || !turno) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Abriendo la caja…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-panel-700 bg-panel-900 px-3">
        <p className="shrink-0 text-sm font-bold">
          Buffet <span className="text-adeo-rojo">ADEO</span>
        </p>

        <nav className="flex flex-1 justify-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-adeo-rojo text-white'
                  : 'text-zinc-400 active:bg-panel-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Conexion />
          <span className="hidden text-xs text-zinc-500 sm:block">
            {cajero.nombre}
          </span>
        </div>
      </header>

      {children}
    </div>
  );
}
