'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Factura } from '@/lib/types';
import { formatPesosConCentavos, parseMonto } from '@/lib/format';
import { calcularFactura } from '@/lib/factura';
import { anioDe, nombreMes, nombrePeriodo, periodoDe } from '@/lib/periodos';
import { ResumenFacturas } from './ResumenFacturas';
import { ResumenAnual } from './ResumenAnual';
import { SelectorMes } from './SelectorMes';
import { CargarFactura } from './CargarFactura';
import { COLUMNAS, FilaFactura } from './FilaFactura';

const DEBOUNCE_MS = 600;

type Estado = 'listo' | 'guardando' | 'error';

/** Rehace las columnas calculadas al vuelo, igual que la base. */
function conCalculos(f: Factura): Factura {
  return { ...f, ...calcularFactura(f.neto, f.alicuota) };
}

export function FacturasClient({
  facturas: inicial,
}: {
  facturas: Factura[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [facturas, setFacturas] = useState<Factura[]>(inicial);
  const [estado, setEstado] = useState<Estado>('listo');
  const [periodo, setPeriodo] = useState(
    () => inicial[0]?.periodo ?? periodoDe(new Date())
  );

  const pendientes = useRef(new Map<string, Partial<Factura>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const guardar = useCallback(
    async (id: string) => {
      const patch = pendientes.current.get(id);
      pendientes.current.delete(id);
      timers.current.delete(id);
      if (!patch) return;

      // iva, total y futbol las calcula la base: no se mandan.
      const { iva, total, futbol, ...guardable } = patch;
      void iva;
      void total;
      void futbol;

      const { error } = await supabase
        .from('adeo_facturas')
        .update(guardable)
        .eq('id', id);

      if (error) {
        console.error('No se pudo guardar', error);
        setEstado('error');
        return;
      }
      setEstado(pendientes.current.size > 0 ? 'guardando' : 'listo');
    },
    [supabase]
  );

  const actualizarFactura = useCallback(
    (id: string, patch: Partial<Factura>) => {
      setFacturas((prev) =>
        prev.map((f) => (f.id === id ? conCalculos({ ...f, ...patch }) : f))
      );

      pendientes.current.set(id, {
        ...(pendientes.current.get(id) ?? {}),
        ...patch,
      });
      setEstado('guardando');

      const anterior = timers.current.get(id);
      if (anterior) clearTimeout(anterior);
      timers.current.set(id, setTimeout(() => void guardar(id), DEBOUNCE_MS));
    },
    [guardar]
  );

  const eliminarFactura = useCallback(
    async (id: string) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
      pendientes.current.delete(id);

      const respaldo = facturas;
      setFacturas((prev) => prev.filter((f) => f.id !== id));

      const { error } = await supabase
        .from('adeo_facturas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('No se pudo eliminar', error);
        setEstado('error');
        setFacturas(respaldo);
      }
    },
    [facturas, supabase]
  );

  const agregarFactura = useCallback(
    async (cliente: string, neto: string, responsable: string) => {
      setEstado('guardando');
      const { data, error } = await supabase
        .from('adeo_facturas')
        .insert({
          periodo,
          cliente,
          neto: parseMonto(neto),
          responsable: responsable.trim().toUpperCase() || null,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('No se pudo agregar', error);
        setEstado('error');
        return false;
      }

      const factura = data as Factura;
      setFacturas((prev) =>
        prev.some((f) => f.id === factura.id) ? prev : [...prev, factura]
      );
      setEstado('listo');
      return true;
    },
    [periodo, supabase]
  );

  // ------------------------------------------------------------- realtime
  useEffect(() => {
    const canal = supabase
      .channel('adeo_facturas_panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adeo_facturas' },
        (payload: RealtimePostgresChangesPayload<Factura>) => {
          setFacturas((prev) => {
            if (payload.eventType === 'DELETE') {
              const vieja = payload.old as Factura;
              return prev.filter((f) => f.id !== vieja.id);
            }

            const fila = payload.new as Factura;
            const local = pendientes.current.get(fila.id) ?? {};
            const factura = conCalculos({
              ...fila,
              neto: Number(fila.neto),
              alicuota: Number(fila.alicuota),
              ...local,
            });

            return prev.some((f) => f.id === factura.id)
              ? prev.map((f) => (f.id === factura.id ? factura : f))
              : [...prev, factura];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase]);

  useEffect(() => {
    const timersActuales = timers.current;
    const pendientesActuales = pendientes.current;
    return () => {
      timersActuales.forEach((t) => clearTimeout(t));
      pendientesActuales.forEach((patch, id) => {
        const { iva, total, futbol, ...guardable } = patch;
        void iva;
        void total;
        void futbol;
        void supabase.from('adeo_facturas').update(guardable).eq('id', id);
      });
    };
  }, [supabase]);

  const conDatos = useMemo(
    () => new Set(facturas.map((f) => f.periodo)),
    [facturas]
  );

  const anios = useMemo(() => {
    const vistos = new Set(facturas.map((f) => anioDe(f.periodo)));
    vistos.add(anioDe(periodo));
    return [...vistos].sort();
  }, [facturas, periodo]);

  const delMes = facturas.filter((f) => f.periodo === periodo);
  const responsables = [
    ...new Set(facturas.map((f) => f.responsable).filter(Boolean) as string[]),
  ].sort();

  const totales = delMes.reduce(
    (acc, f) => ({
      neto: acc.neto + f.neto,
      iva: acc.iva + f.iva,
      total: acc.total + f.total,
      futbol: acc.futbol + f.futbol,
    }),
    { neto: 0, iva: 0, total: 0, futbol: 0 }
  );

  const porResponsable = [...new Set(delMes.map((f) => f.responsable ?? '—'))]
    .map((r) => {
      const suyas = delMes.filter((f) => (f.responsable ?? '—') === r);
      return {
        responsable: r,
        cantidad: suyas.length,
        neto: suyas.reduce((acc, f) => acc + f.neto, 0),
        futbol: suyas.reduce((acc, f) => acc + f.futbol, 0),
      };
    })
    .sort((a, b) => b.neto - a.neto);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Una sola vez para todas las filas: repetirlo por fila duplica el id. */}
      <datalist id="adeo-responsables">
        {responsables.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Facturas</h1>
          <p className="text-sm text-zinc-400">
            Facturación del fútbol mayor, mes a mes
          </p>
        </div>
        <span
          className={`chip ml-auto shrink-0 ${
            estado === 'error'
              ? 'bg-adeo-rojo/15 text-adeo-rojo-claro'
              : estado === 'guardando'
                ? 'bg-panel-800 text-zinc-400'
                : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {estado === 'error'
            ? 'Error al guardar'
            : estado === 'guardando'
              ? 'Guardando...'
              : 'Guardado'}
        </span>
      </div>

      <SelectorMes
        periodo={periodo}
        conDatos={conDatos}
        anios={anios}
        onCambio={setPeriodo}
      />

      <CargarFactura periodo={periodo} onAgregar={agregarFactura} />

      <ResumenFacturas facturas={delMes} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="md:min-w-[820px]">
            <div
              className={`sticky top-16 z-10 hidden gap-2 border-b border-panel-700 bg-panel-850 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:grid ${COLUMNAS}`}
            >
              <span>Cliente</span>
              <span className="text-right">Importe neto</span>
              <span className="text-right">IVA 21%</span>
              <span className="text-right">Importe total</span>
              <span className="text-right">Fútbol</span>
              <span>Responsable</span>
              <span />
            </div>

            {delMes.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">
                No hay facturas en {nombreMes(periodo)}. Cargá la primera con
                el formulario de arriba.
              </p>
            ) : (
              <div className="divide-y divide-panel-800 md:divide-y-0">
                {delMes.map((factura, i) => (
                  <FilaFactura
                    key={factura.id}
                    factura={factura}
                    indice={i}
                    onCambio={(patch) => actualizarFactura(factura.id, patch)}
                    onEliminar={() => void eliminarFactura(factura.id)}
                  />
                ))}
              </div>
            )}

            {delMes.length > 0 && (
              <>
                <div
                  className={`hidden gap-2 border-t-2 border-panel-700 bg-panel-850 px-3 py-2.5 text-sm font-bold tabular-nums md:grid ${COLUMNAS}`}
                >
                  <span className="text-zinc-400">
                    TOTAL {nombrePeriodo(periodo).toUpperCase()}
                  </span>
                  <span className="text-right">
                    {formatPesosConCentavos(totales.neto)}
                  </span>
                  <span className="text-right text-zinc-400">
                    {formatPesosConCentavos(totales.iva)}
                  </span>
                  <span className="text-right">
                    {formatPesosConCentavos(totales.total)}
                  </span>
                  <span className="text-right text-emerald-400">
                    {formatPesosConCentavos(totales.futbol)}
                  </span>
                  <span />
                  <span />
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t-2 border-panel-700 bg-panel-850 px-3 py-2.5 text-sm md:hidden">
                  <dt className="text-xs text-zinc-500">Neto</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatPesosConCentavos(totales.neto)}
                  </dd>
                  <dt className="text-xs text-zinc-500">IVA</dt>
                  <dd className="text-right tabular-nums text-zinc-400">
                    {formatPesosConCentavos(totales.iva)}
                  </dd>
                  <dt className="text-xs text-zinc-500">Fútbol</dt>
                  <dd className="text-right tabular-nums text-emerald-400">
                    {formatPesosConCentavos(totales.futbol)}
                  </dd>
                  <dt className="border-t border-panel-800 pt-1 font-semibold">
                    Total
                  </dt>
                  <dd className="border-t border-panel-800 pt-1 text-right text-base font-bold tabular-nums">
                    {formatPesosConCentavos(totales.total)}
                  </dd>
                </dl>
              </>
            )}
          </div>
        </div>
      </div>

      {porResponsable.length > 0 && (
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Por responsable · {nombreMes(periodo)}
          </p>
          <ul className="mt-2 divide-y divide-panel-800">
            {porResponsable.map((r) => (
              <li
                key={r.responsable}
                className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm"
              >
                <span className="font-medium">{r.responsable}</span>
                <span className="text-xs text-zinc-500">
                  {r.cantidad} factura{r.cantidad === 1 ? '' : 's'}
                </span>
                <span className="ml-auto tabular-nums text-zinc-300">
                  {formatPesosConCentavos(r.neto)}
                </span>
                <span className="w-32 text-right tabular-nums text-emerald-400">
                  {formatPesosConCentavos(r.futbol)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ResumenAnual
        facturas={facturas}
        anio={anioDe(periodo)}
        periodo={periodo}
        onElegir={setPeriodo}
      />
    </div>
  );
}
