'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PUESTOS } from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';

/** Las mismas cuatro pantallas para los dos puestos, colgadas de su base. */
const navDe = (base: string) => [
  { href: base, label: 'Venta' },
  { href: `${base}/ventas`, label: 'Ventas' },
  { href: `${base}/cierre`, label: 'Cierre' },
  { href: `${base}/config`, label: 'Config' },
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

  const texto = online ? 'En línea' : 'Sin conexión';

  return (
    <span
      title={online ? 'Con conexión' : 'Sin conexión (la venta funciona igual)'}
      className={`chip shrink-0 text-[11px] ${
        online
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-panel-800 text-zinc-500'
      }`}
    >
      {/* En el celular no entra el texto al lado de las cuatro pestañas: queda
          el punto, que alcanza para ver de un vistazo si hay conexión. */}
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full sm:hidden ${
          online ? 'bg-emerald-400' : 'bg-zinc-500'
        }`}
      />
      <span className="sr-only sm:not-sr-only">{texto}</span>
    </span>
  );
}

/**
 * Todas las pantallas operativas exigen turno abierto. Si no hay, se vuelve al
 * login: sin turno no se puede cobrar ni arquear.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { puesto, cajero, turno, cargando } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const base = PUESTOS[puesto].base;

  useEffect(() => {
    if (!cargando && (!cajero || !turno)) router.replace(`${base}/login`);
  }, [cargando, cajero, turno, router, base]);

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
        <p className="min-w-0 shrink truncate text-sm font-bold">
          {PUESTOS[puesto].label} <span className="text-adeo-rojo">ADEO</span>
        </p>

        <nav className="flex min-w-0 flex-1 justify-center gap-0.5 sm:gap-1">
          {navDe(base).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3 ${
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
