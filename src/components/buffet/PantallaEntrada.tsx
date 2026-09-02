'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AJUSTE_TICKET,
  MEDIOS_PAGO,
  leerAjuste,
  productosActivos,
  registrarVenta,
  sembrarEntradas,
  ventasDelTurno,
  type MedioPago,
  type Producto,
  type Venta,
} from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos, ticketEntrada } from '@/lib/buffet/ticket';
import { imprimirSeguro } from '@/lib/printer';
import { Shell } from './Shell';

type Aviso = { texto: string; tono: 'ok' | 'alerta' };

export function PantallaEntrada() {
  return (
    <Shell>
      <Entrada />
    </Shell>
  );
}

function Entrada() {
  const { cajero, turno } = useSesion();

  // La primera vez en la tablet se cargan los precios del clásico; después
  // manda lo que haya en Config.
  useEffect(() => {
    void sembrarEntradas();
  }, []);

  const { valor: tipos } = useLive<Producto[]>(
    () => productosActivos('entrada'),
    []
  );
  const { valor: ventas } = useLive<Venta[]>(
    () => (turno ? ventasDelTurno(turno.id) : Promise.resolve([])),
    [],
    [turno?.id]
  );

  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  const validas = ventas.filter((v) => !v.anulada);
  const ingresados = validas.length;
  const recaudado = validas.reduce((acc, v) => acc + v.total, 0);

  /** Un toque = una entrada vendida y su ticket. Sin carrito ni confirmación. */
  async function vender(tipo: Producto) {
    if (!turno || cobrando) return;
    setCobrando(true);

    try {
      const venta = await registrarVenta(
        turno.id,
        [
          {
            productoId: tipo.id,
            nombre: tipo.nombre,
            precio: tipo.precio,
            cantidad: 1,
          },
        ],
        // Lo que no se cobra no tiene medio de pago que valga: va como
        // efectivo en 0 para que no ensucie los subtotales.
        tipo.precio === 0 ? 'efectivo' : medioPago
      );

      setAviso({
        texto:
          tipo.precio > 0
            ? `${tipo.nombre} · ${pesos(tipo.precio)}`
            : `${tipo.nombre} · ingresado`,
        tono: 'ok',
      });

      // El ticket de entrada se imprime siempre: es lo que la persona muestra
      // para pasar. El toggle de Config solo aplica al buffet.
      const r = await imprimirSeguro(ticketEntrada(venta, cajero?.nombre ?? ''));
      if (!r.ok) {
        setAviso({
          texto: `${tipo.nombre} registrada — sin ticket: ${r.motivo}`,
          tono: 'alerta',
        });
      }
    } catch (e) {
      console.error('No se pudo registrar la entrada', e);
      setAviso({ texto: 'No se pudo registrar la entrada', tono: 'alerta' });
    } finally {
      setCobrando(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-2 gap-2 border-b border-panel-800 p-2">
        <div className="rounded-xl bg-panel-850 p-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Ingresados
          </p>
          <p className="text-3xl font-bold tabular-nums">{ingresados}</p>
        </div>
        <div className="rounded-xl bg-panel-850 p-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Recaudado
          </p>
          <p className="text-3xl font-bold tabular-nums text-emerald-400">
            {pesos(recaudado)}
          </p>
        </div>
      </div>

      {aviso && (
        <p
          className={`px-3 py-2 text-center text-base font-bold ${
            aviso.tono === 'ok'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-adeo-rojo/15 text-adeo-rojo-claro'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="flex gap-2 p-2">
        {MEDIOS_PAGO.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => setMedioPago(m.valor)}
            className={`h-12 flex-1 rounded-lg text-sm font-semibold transition ${
              medioPago === m.valor
                ? 'bg-panel-700 text-zinc-100 ring-1 ring-zinc-500'
                : 'bg-panel-850 text-zinc-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {tipos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-semibold">No hay tipos de entrada</p>
          <Link href="/entrada/config" className="btn-primary h-[60px] px-6 text-lg">
            Cargar precios
          </Link>
        </div>
      ) : (
        <div className="grid flex-1 auto-rows-min gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {tipos.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void vender(t)}
              disabled={cobrando}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-panel-800 p-4 transition active:bg-adeo-rojo disabled:opacity-60"
            >
              <span className="text-2xl font-bold leading-tight">{t.nombre}</span>
              <span
                className={`text-3xl font-bold tabular-nums ${
                  t.precio > 0 ? 'text-zinc-300' : 'text-emerald-400'
                }`}
              >
                {t.precio > 0 ? pesos(t.precio) : 'Sin cargo'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
