'use client';

import { useMemo, useState } from 'react';
import {
  ACCIONES,
  precisionPases,
  totalAcciones,
  type Conteo,
} from '@/lib/estadisticas';
import { POSICION_CLASE, POSICION_CORTA } from '@/lib/posiciones';
import type { Citado, TipoEvento } from '@/lib/types';

export type FilaTabla = {
  clave: string;
  nombre: string;
  posicion: Citado['posicion'];
  /** Solo en la vista de temporada. */
  partidos?: number;
  conteo: Conteo;
};

type Orden = TipoEvento | 'nombre' | 'partidos' | 'precision' | 'total';

/** Columnas que se muestran, en este orden. Los pases van juntos con su %. */
const COLUMNAS: TipoEvento[] = ACCIONES.map((a) => a.tipo);

export function TablaEstadisticas({
  filas,
  vacio,
}: {
  filas: FilaTabla[];
  vacio: string;
}) {
  const [orden, setOrden] = useState<Orden>('total');
  const conPartidos = filas.some((f) => f.partidos != null);

  const ordenadas = useMemo(() => {
    const valor = (f: FilaTabla): number | string => {
      if (orden === 'nombre') return f.nombre.toLowerCase();
      if (orden === 'partidos') return f.partidos ?? 0;
      if (orden === 'precision') return precisionPases(f.conteo) ?? -1;
      if (orden === 'total') return totalAcciones(f.conteo);
      return f.conteo[orden];
    };
    return [...filas].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb);
      return (vb as number) - (va as number);
    });
  }, [filas, orden]);

  if (filas.length === 0) {
    return <p className="card p-6 text-center text-sm text-zinc-500">{vacio}</p>;
  }

  const Encabezado = ({
    columna,
    children,
    titulo,
  }: {
    columna: Orden;
    children: React.ReactNode;
    titulo?: string;
  }) => (
    <th scope="col" className="px-1.5 py-2 font-semibold">
      <button
        type="button"
        title={titulo}
        onClick={() => setOrden(columna)}
        className={`w-full whitespace-nowrap transition hover:text-zinc-100 ${
          orden === columna ? 'text-adeo-rojo-claro' : ''
        } ${columna === 'nombre' ? 'text-left' : 'text-center'}`}
      >
        {children}
      </button>
    </th>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-panel-700 text-xs text-zinc-400">
          <tr>
            <Encabezado columna="nombre">Jugador</Encabezado>
            {conPartidos && (
              <Encabezado columna="partidos" titulo="Partidos jugados">
                PJ
              </Encabezado>
            )}
            {COLUMNAS.map((tipo) => {
              const accion = ACCIONES.find((a) => a.tipo === tipo)!;
              return (
                <Encabezado key={tipo} columna={tipo} titulo={accion.label}>
                  {accion.corto}
                </Encabezado>
              );
            })}
            <Encabezado columna="precision" titulo="Precisión de pases">
              % pase
            </Encabezado>
            <Encabezado columna="total" titulo="Total de acciones">
              Total
            </Encabezado>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => {
            const precision = precisionPases(f.conteo);
            return (
              <tr key={f.clave} className="border-b border-panel-800 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 bg-panel-900 px-2 py-2 text-left font-medium"
                >
                  <span className="flex items-center gap-2">
                    {f.posicion && (
                      <span className={`chip px-1.5 py-0.5 text-[10px] ${POSICION_CLASE[f.posicion]}`}>
                        {POSICION_CORTA[f.posicion]}
                      </span>
                    )}
                    <span className="whitespace-nowrap">{f.nombre}</span>
                  </span>
                </th>
                {conPartidos && (
                  <td className="px-1.5 text-center tabular-nums text-zinc-400">
                    {f.partidos}
                  </td>
                )}
                {COLUMNAS.map((tipo) => (
                  <td
                    key={tipo}
                    className={`px-1.5 text-center tabular-nums ${
                      f.conteo[tipo] ? 'text-zinc-100' : 'text-zinc-600'
                    } ${tipo === 'gol' && f.conteo.gol ? 'font-bold text-emerald-400' : ''}`}
                  >
                    {f.conteo[tipo]}
                  </td>
                ))}
                <td className="px-1.5 text-center tabular-nums text-zinc-300">
                  {precision == null ? '—' : `${precision}%`}
                </td>
                <td className="px-1.5 text-center font-semibold tabular-nums">
                  {totalAcciones(f.conteo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
