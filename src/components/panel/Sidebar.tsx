'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';

type Props = {
  colapsado: boolean;
  onToggleColapsado: () => void;
  onNavegar?: () => void;
};

export function Sidebar({ colapsado, onToggleColapsado, onNavegar }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={`flex h-full flex-col border-r border-panel-700 bg-panel-900 transition-[width] duration-200 ${
        colapsado ? 'w-[68px]' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-panel-700 px-4">
        <Image
          src="/adeo-logo.png"
          alt="ADEO"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        {!colapsado && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">ADEO</p>
            <p className="truncate text-[11px] leading-tight text-zinc-400">
              Fútbol Mayor
            </p>
          </div>
        )}
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const activo = pathname.startsWith(item.href);

          if (!item.disponible) {
            return (
              <li key={item.href}>
                <span
                  title={`${item.label} — próximamente`}
                  className={`flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 ${
                    colapsado ? 'justify-center' : ''
                  }`}
                >
                  <span className="text-base opacity-60">{item.icon}</span>
                  {!colapsado && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="chip bg-panel-800 text-[10px] text-zinc-500">
                        pronto
                      </span>
                    </>
                  )}
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavegar}
                title={colapsado ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  colapsado ? 'justify-center' : ''
                } ${
                  activo
                    ? 'bg-adeo-rojo text-white'
                    : 'text-zinc-300 hover:bg-panel-800 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {!colapsado && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onToggleColapsado}
        className="hidden h-11 items-center justify-center border-t border-panel-700 text-zinc-500 transition hover:bg-panel-800 hover:text-zinc-200 md:flex"
        aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
      >
        {colapsado ? '»' : '«'}
      </button>
    </nav>
  );
}
