'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cerrarTurno, ventasDelTurno, type Venta } from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { resumirTurno } from '@/lib/buffet/cierre';
import { pesos, ticketCierre } from '@/lib/buffet/ticket';
import { imprimirSeguro } from '@/lib/printer';
import { sincronizar } from '@/lib/buffet-sync';
import { Shell } from './Shell';

export function PantallaCierre() {
  return (
    <Shell>
      <Cierre />
    </Shell>
  );
}

function Cierre() {
  const router = useRouter();
  const { cajero, turno, salir } = useSesion();
  const { valor: ventas } = useLive<Venta[]>(
    () => (turno ? ventasDelTurno(turno.id) : Promise.resolve([])),
    [],
    [turno?.id]
  );

  const [cerrando, setCerrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!turno) return null;
  const resumen = resumirTurno(turno, ventas, cajero);

  async function confirmar() {
    if (!turno || cerrando) return;
    setCerrando(true);

    // Se imprime antes de cerrar: si la impresora falla, el turno queda
    // abierto y se puede reintentar sin haber perdido el arqueo.
    const impresion = await imprimirSeguro(ticketCierre(resumen));
    if (!impresion.ok) {
      setAviso(
        `${impresion.motivo} El turno sigue abierto: podés reintentar, o cerrarlo igual sin ticket.`
      );
      setCerrando(false);
      return;
    }

    await cerrarTurno(turno.id);
    void sincronizar().catch(() => undefined);
    salir();
    router.replace('/buffet/login');
  }

  async function cerrarSinImprimir() {
    if (!turno) return;
    await cerrarTurno(turno.id);
    void sincronizar().catch(() => undefined);
    salir();
    router.replace('/buffet/login');
  }

  const filas: [string, string][] = [
    ['Cajero', resumen.cajero],
    ['Ventas', String(resumen.ventasValidas)],
    ['Fondo inicial', pesos(resumen.fondoInicial)],
    ['Cobrado en efectivo', pesos(resumen.efectivoVendido)],
    ['Efectivo esperado en caja', pesos(resumen.efectivoEsperado)],
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-3 p-3">
      <h1 className="text-lg font-bold">Cierre de caja</h1>

      <div className="card p-3">
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
          {filas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-400">{k}</dt>
              <dd className="text-right font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Por medio de pago
        </p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {resumen.porMedio.length === 0 && (
            <li className="text-zinc-600">Sin cobros.</li>
          )}
          {resumen.porMedio.map((m) => (
            <li key={m.medio} className="flex justify-between">
              <span className="capitalize text-zinc-300">
                {m.medio} ({m.cantidad})
              </span>
              <span className="font-semibold tabular-nums">{pesos(m.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Por producto
        </p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {resumen.porProducto.length === 0 && (
            <li className="text-zinc-600">Sin ventas.</li>
          )}
          {resumen.porProducto.map((p) => (
            <li key={p.nombre} className="flex justify-between">
              <span className="text-zinc-300">
                {p.cantidad} × {p.nombre}
              </span>
              <span className="font-semibold tabular-nums">{pesos(p.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      {resumen.anuladas.cantidad > 0 && (
        <p className="card p-3 text-sm text-adeo-rojo-claro">
          {resumen.anuladas.cantidad} anuladas por {pesos(resumen.anuladas.total)}
          <span className="text-zinc-500"> (no suman al total)</span>
        </p>
      )}

      <div className="flex items-baseline justify-between rounded-xl bg-panel-850 px-3 py-3">
        <span className="font-semibold">Total general</span>
        <span className="text-2xl font-bold tabular-nums">
          {pesos(resumen.totalGeneral)}
        </span>
      </div>

      {aviso && (
        <p className="rounded-lg bg-adeo-rojo/10 px-3 py-2 text-sm text-adeo-rojo-claro">
          {aviso}
        </p>
      )}

      <button
        type="button"
        onClick={() => void confirmar()}
        disabled={cerrando}
        className="h-[72px] w-full rounded-xl bg-adeo-rojo text-lg font-bold text-white active:bg-adeo-rojo-oscuro disabled:opacity-50"
      >
        Imprimir cierre y cerrar turno
      </button>

      {aviso && (
        <button
          type="button"
          onClick={() => void cerrarSinImprimir()}
          className="h-12 w-full rounded-xl border border-panel-700 text-sm text-zinc-400"
        >
          Cerrar turno sin imprimir
        </button>
      )}
    </main>
  );
}
