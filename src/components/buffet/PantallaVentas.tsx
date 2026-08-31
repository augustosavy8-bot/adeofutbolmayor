'use client';

import { useState } from 'react';
import { MEDIOS_PAGO, anularVenta, ventasDelTurno, type Venta } from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos } from '@/lib/buffet/ticket';
import { Shell } from './Shell';

export function PantallaVentas() {
  return (
    <Shell>
      <Ventas />
    </Shell>
  );
}

function hora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

function Ventas() {
  const { turno } = useSesion();
  const { valor: ventas } = useLive<Venta[]>(
    () => (turno ? ventasDelTurno(turno.id) : Promise.resolve([])),
    [],
    [turno?.id]
  );

  const [confirmando, setConfirmando] = useState<string | null>(null);

  const validas = ventas.filter((v) => !v.anulada);
  const total = validas.reduce((acc, v) => acc + v.total, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-3">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">Ventas del turno</h1>
        <p className="text-sm text-zinc-400">
          {validas.length} · <span className="tabular-nums">{pesos(total)}</span>
        </p>
      </div>

      {ventas.length === 0 ? (
        <p className="card mt-3 p-8 text-center text-sm text-zinc-500">
          Todavía no se cobró nada en este turno.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {/* La última arriba: es la que se suele querer anular. */}
          {[...ventas].reverse().map((v) => (
            <li
              key={v.id}
              className={`card p-3 ${v.anulada ? 'opacity-50' : ''}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {hora(v.creadoEn)}
                </span>
                <span className="text-xs text-zinc-500">
                  {MEDIOS_PAGO.find((m) => m.valor === v.medioPago)?.label}
                </span>
                {v.anulada && (
                  <span className="chip bg-adeo-rojo/15 text-[10px] text-adeo-rojo-claro">
                    anulada
                  </span>
                )}
                <span
                  className={`ml-auto text-lg font-bold tabular-nums ${
                    v.anulada ? 'line-through' : ''
                  }`}
                >
                  {pesos(v.total)}
                </span>
              </div>

              <ul className="mt-1 text-xs text-zinc-400">
                {v.items.map((i) => (
                  <li key={i.productoId}>
                    {i.cantidad} × {i.nombre}
                  </li>
                ))}
              </ul>

              {!v.anulada && (
                <div className="mt-2 flex justify-end">
                  {confirmando === v.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await anularVenta(v.id);
                          setConfirmando(null);
                        }}
                        className="h-11 rounded-lg bg-adeo-rojo px-4 text-sm font-semibold text-white"
                      >
                        Sí, anular
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmando(null)}
                        className="h-11 rounded-lg border border-panel-700 px-4 text-sm text-zinc-400"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmando(v.id)}
                      className="h-11 rounded-lg px-4 text-sm text-zinc-500 active:bg-panel-800"
                    >
                      Anular
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
