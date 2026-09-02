'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  MEDIOS_PAGO,
  productosActivos,
  registrarVenta,
  type MedioPago,
  type Producto,
} from '@/db/buffet';
import { useCarrito, useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos, ticketVenta } from '@/lib/buffet/ticket';
import { imprimirSeguro } from '@/lib/printer';
import { Shell } from './Shell';

type Aviso = { texto: string; tono: 'ok' | 'alerta' };

export function PantallaVenta() {
  return (
    <Shell>
      <Venta />
    </Shell>
  );
}

function Venta() {
  const { puesto, cajero, turno } = useSesion();
  const carrito = useCarrito();
  const { valor: productos } = useLive<Producto[]>(
    () => productosActivos(puesto),
    [],
    [puesto]
  );

  const [categoria, setCategoria] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [cobrando, setCobrando] = useState(false);

  const categorias = useMemo(
    () => [...new Set(productos.map((p) => p.categoria || 'General'))].sort(),
    [productos]
  );

  const visibles = productos.filter(
    (p) => !categoria || (p.categoria || 'General') === categoria
  );

  // El aviso se va solo: en el mostrador nadie va a cerrar un cartel.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  async function cobrar(medioPago: MedioPago) {
    if (!turno || carrito.items.length === 0 || cobrando) return;

    // Se bloquea sólo mientras se escribe en IndexedDB, que es instantáneo.
    setCobrando(true);
    const items = carrito.items;
    const total = carrito.total;

    try {
      const venta = await registrarVenta(turno.id, items, medioPago);
      carrito.limpiar();
      setAviso({ texto: `Cobrado ${pesos(total)}`, tono: 'ok' });

      // El ticket sale apenas se guardó la venta, y no se espera: la caja
      // queda libre para el próximo cliente mientras el papel corre. Si
      // falla, el aviso se corrige cuando la promesa resuelve.
      void imprimirSeguro(ticketVenta(venta, cajero?.nombre ?? '')).then((r) => {
        if (!r.ok) {
          setAviso({
            texto: `Cobrado ${pesos(total)} — sin ticket: ${r.motivo}`,
            tono: 'alerta',
          });
        }
      });
    } catch (e) {
      console.error('No se pudo registrar la venta', e);
      setAviso({ texto: 'No se pudo guardar la venta', tono: 'alerta' });
    } finally {
      setCobrando(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ------------------------------------------------------- productos */}
      <section className="flex min-w-0 flex-1 flex-col">
        {categorias.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-panel-800 p-2">
            <button
              type="button"
              onClick={() => setCategoria(null)}
              className={`chip shrink-0 px-4 py-2 ${
                categoria === null
                  ? 'bg-adeo-rojo text-white'
                  : 'bg-panel-850 text-zinc-400'
              }`}
            >
              Todo
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`chip shrink-0 px-4 py-2 ${
                  categoria === c
                    ? 'bg-adeo-rojo text-white'
                    : 'bg-panel-850 text-zinc-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {productos.length === 0 ? (
          // Tablet recién estrenada: sin productos no hay nada para tocar, así
          // que la pantalla tiene que decir qué hacer y llevarte hasta ahí.
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-lg font-semibold">Todavía no hay productos</p>
            <p className="max-w-sm text-sm text-zinc-500">
              Cargá lo que vende el buffet — nombre, precio y categoría — y van
              a aparecer acá como botones para cobrar.
            </p>
            <Link href="/buffet/config" className="btn-primary mt-1 h-[60px] px-6 text-lg">
              Cargar productos
            </Link>
          </div>
        ) : (
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => carrito.agregar(p)}
                className="flex min-h-[90px] flex-col justify-between rounded-xl bg-panel-800 p-3 text-left transition active:bg-adeo-rojo"
              >
                <span className="text-sm font-semibold leading-tight">
                  {p.nombre}
                </span>
                <span className="text-lg font-bold tabular-nums text-zinc-300">
                  {pesos(p.precio)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- carrito */}
      <aside className="flex w-full shrink-0 flex-col border-t border-panel-700 bg-panel-900 lg:w-[360px] lg:border-l lg:border-t-0">
        {aviso && (
          <p
            className={`px-3 py-2 text-center text-sm font-semibold ${
              aviso.tono === 'ok'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-adeo-rojo/15 text-adeo-rojo-claro'
            }`}
          >
            {aviso.texto}
          </p>
        )}

        <div className="min-h-[120px] flex-1 overflow-y-auto p-2">
          {carrito.items.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-600">
              Tocá un producto para empezar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {carrito.items.map((i) => (
                <li
                  key={i.productoId}
                  className="flex items-center gap-2 rounded-lg bg-panel-850 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.nombre}</p>
                    <p className="text-xs tabular-nums text-zinc-500">
                      {pesos(i.precio)} c/u
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => carrito.restar(i.productoId)}
                    aria-label={`Quitar uno de ${i.nombre}`}
                    className="h-11 w-11 shrink-0 rounded-lg bg-panel-800 text-xl font-bold active:bg-panel-700"
                  >
                    −
                  </button>
                  <span className="w-7 shrink-0 text-center text-lg font-bold tabular-nums">
                    {i.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => carrito.sumar(i.productoId)}
                    aria-label={`Agregar uno de ${i.nombre}`}
                    className="h-11 w-11 shrink-0 rounded-lg bg-panel-800 text-xl font-bold active:bg-panel-700"
                  >
                    +
                  </button>

                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {pesos(i.precio * i.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-panel-700 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-400">
              {carrito.unidades}{' '}
              {carrito.unidades === 1 ? 'unidad' : 'unidades'}
            </span>
            <span className="text-3xl font-bold tabular-nums">
              {pesos(carrito.total)}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {MEDIOS_PAGO.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => void cobrar(m.valor)}
                disabled={carrito.items.length === 0 || cobrando}
                className="h-[60px] rounded-xl bg-adeo-rojo text-lg font-bold text-white transition active:bg-adeo-rojo-oscuro disabled:bg-panel-800 disabled:text-zinc-600"
              >
                Cobrar · {m.label}
              </button>
            ))}

            <button
              type="button"
              onClick={carrito.limpiar}
              disabled={carrito.items.length === 0}
              className="h-11 rounded-xl text-sm text-zinc-500 active:bg-panel-800 disabled:opacity-40"
            >
              Vaciar carrito
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
