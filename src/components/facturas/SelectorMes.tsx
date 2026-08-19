'use client';

import {
  MESES_CORTOS,
  anioDe,
  mesDe,
  mesesDelAnio,
  nombrePeriodo,
  periodoDeMes,
} from '@/lib/periodos';

type Props = {
  periodo: string;
  /** Períodos que ya tienen facturas cargadas. */
  conDatos: Set<string>;
  anios: number[];
  onCambio: (periodo: string) => void;
};

export function SelectorMes({ periodo, conDatos, anios, onCambio }: Props) {
  const anio = anioDe(periodo);
  const mes = mesDe(periodo);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambio(periodoDeMes(anio, mes - 1))}
          aria-label="Mes anterior"
          className="btn-ghost px-2.5"
        >
          ‹
        </button>

        <p className="flex-1 text-center text-base font-bold sm:text-lg">
          {nombrePeriodo(periodo)}
        </p>

        <button
          type="button"
          onClick={() => onCambio(periodoDeMes(anio, mes + 1))}
          aria-label="Mes siguiente"
          className="btn-ghost px-2.5"
        >
          ›
        </button>
      </div>

      {anios.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {anios.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onCambio(periodoDeMes(a, mes))}
              className={`chip text-xs transition ${
                a === anio
                  ? 'bg-panel-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Los doce meses siempre visibles: el que tiene facturas se marca con
          un punto, y los vacíos igual se pueden abrir para empezarlos. */}
      <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
        {mesesDelAnio(anio).map((p, i) => {
          const activo = p === periodo;
          const tiene = conDatos.has(p);

          return (
            <button
              key={p}
              type="button"
              onClick={() => onCambio(p)}
              className={`flex flex-col items-center rounded-lg px-1 py-1.5 text-xs font-medium transition ${
                activo
                  ? 'bg-adeo-rojo text-white'
                  : tiene
                    ? 'bg-panel-800 text-zinc-200 hover:bg-panel-700'
                    : 'text-zinc-600 hover:bg-panel-800 hover:text-zinc-300'
              }`}
            >
              {MESES_CORTOS[i]}
              <span
                className={`mt-0.5 h-1 w-1 rounded-full ${
                  tiene ? (activo ? 'bg-white' : 'bg-adeo-rojo') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
