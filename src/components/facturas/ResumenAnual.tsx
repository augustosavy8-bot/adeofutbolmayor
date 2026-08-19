'use client';

import type { Factura } from '@/lib/types';
import { formatPesosConCentavos } from '@/lib/format';
import { MESES_CORTOS, anioDe, mesDe, nombreMes } from '@/lib/periodos';

type Props = {
  facturas: Factura[];
  anio: number;
  periodo: string;
  onElegir: (periodo: string) => void;
};

/** El año completo mes por mes, para ver de dónde salió cada total. */
export function ResumenAnual({ facturas, anio, periodo, onElegir }: Props) {
  const delAnio = facturas.filter((f) => anioDe(f.periodo) === anio);
  if (delAnio.length === 0) return null;

  const meses = [...new Set(delAnio.map((f) => f.periodo))]
    .sort()
    .map((p) => {
      const suyas = delAnio.filter((f) => f.periodo === p);
      return {
        periodo: p,
        cantidad: suyas.length,
        neto: suyas.reduce((a, f) => a + f.neto, 0),
        iva: suyas.reduce((a, f) => a + f.iva, 0),
        total: suyas.reduce((a, f) => a + f.total, 0),
        futbol: suyas.reduce((a, f) => a + f.futbol, 0),
      };
    });

  const anual = meses.reduce(
    (a, m) => ({
      neto: a.neto + m.neto,
      iva: a.iva + m.iva,
      total: a.total + m.total,
      futbol: a.futbol + m.futbol,
    }),
    { neto: 0, iva: 0, total: 0, futbol: 0 }
  );

  const cols = 'grid-cols-[minmax(90px,1fr)_120px_110px_120px_110px]';

  return (
    <div className="card overflow-hidden">
      <p className="border-b border-panel-700 bg-panel-850 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Resumen {anio}
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div
            className={`grid ${cols} gap-2 border-b border-panel-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600`}
          >
            <span>Mes</span>
            <span className="text-right">Neto</span>
            <span className="text-right">IVA</span>
            <span className="text-right">Total</span>
            <span className="text-right">Fútbol</span>
          </div>

          {meses.map((m) => (
            <button
              key={m.periodo}
              type="button"
              onClick={() => onElegir(m.periodo)}
              className={`grid w-full ${cols} gap-2 px-3 py-1.5 text-left text-sm tabular-nums transition hover:bg-panel-800/60 ${
                m.periodo === periodo ? 'bg-panel-800/80' : ''
              }`}
            >
              <span className="font-medium">
                {MESES_CORTOS[mesDe(m.periodo) - 1]}
                <span className="ml-1.5 text-xs text-zinc-600">
                  {m.cantidad}
                </span>
              </span>
              <span className="text-right">
                {formatPesosConCentavos(m.neto)}
              </span>
              <span className="text-right text-zinc-500">
                {formatPesosConCentavos(m.iva)}
              </span>
              <span className="text-right font-semibold">
                {formatPesosConCentavos(m.total)}
              </span>
              <span className="text-right text-emerald-400">
                {formatPesosConCentavos(m.futbol)}
              </span>
            </button>
          ))}

          <div
            className={`grid ${cols} gap-2 border-t-2 border-panel-700 bg-panel-850 px-3 py-2 text-sm font-bold tabular-nums`}
          >
            <span className="text-zinc-400">AÑO</span>
            <span className="text-right">
              {formatPesosConCentavos(anual.neto)}
            </span>
            <span className="text-right text-zinc-300">
              {formatPesosConCentavos(anual.iva)}
            </span>
            <span className="text-right">
              {formatPesosConCentavos(anual.total)}
            </span>
            <span className="text-right text-emerald-400">
              {formatPesosConCentavos(anual.futbol)}
            </span>
          </div>
        </div>
      </div>

      <p className="px-3 py-2 text-xs text-zinc-600">
        Tocá un mes para abrirlo. {nombreMes(periodo)} es el que estás viendo.
      </p>
    </div>
  );
}
