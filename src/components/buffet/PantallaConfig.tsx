'use client';

import { useEffect, useState } from 'react';
import {
  AJUSTE_TICKET,
  crearCajero,
  db,
  guardarAjuste,
  guardarProducto,
  leerAjuste,
  productosDelPuesto,
  uuid,
  type Cajero,
  type Producto,
} from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos } from '@/lib/buffet/ticket';
import { getPrinter } from '@/lib/printer';
import { sincronizar } from '@/lib/buffet-sync';
import { Shell } from './Shell';

export function PantallaConfig() {
  return (
    <Shell>
      <Config />
    </Shell>
  );
}

function Config() {
  const { puesto } = useSesion();
  const { valor: productos } = useLive<Producto[]>(
    () => productosDelPuesto(puesto),
    [],
    [puesto]
  );
  const { valor: cajeros } = useLive<Cajero[]>(
    () => db().cajeros.orderBy('nombre').toArray(),
    []
  );

  const [ticket, setTicket] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');

  const [cajeroNombre, setCajeroNombre] = useState('');
  const [cajeroPin, setCajeroPin] = useState('');

  useEffect(() => {
    void leerAjuste(AJUSTE_TICKET).then((v) => setTicket(v === 'si'));
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function alternarTicket() {
    const nuevo = !ticket;
    setTicket(nuevo);
    await guardarAjuste(AJUSTE_TICKET, nuevo ? 'si' : 'no');
  }

  async function agregarProducto() {
    if (!nombre.trim() || !precio) return;
    await guardarProducto({
      id: uuid(),
      puesto,
      nombre: nombre.trim(),
      precio: Number(precio.replace(/[^\d]/g, '')),
      categoria: categoria.trim() || 'General',
      activo: true,
      orden: productos.length + 1,
    });
    setNombre('');
    setPrecio('');
  }

  async function conectarImpresora() {
    try {
      await getPrinter().connect();
      setAviso('Impresora conectada.');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo conectar.');
    }
  }

  async function sincronizarAhora() {
    setAviso('Sincronizando…');
    const r = await sincronizar();
    setAviso(
      r.ok
        ? `Listo: ${r.turnosSubidos} turnos y ${r.ventasSubidas} ventas subidas, ${r.productosBajados} productos actualizados.`
        : `No se pudo sincronizar: ${r.motivo}`
    );
  }

  /** Exporta todo lo local para poder arquear aunque nunca haya habido red. */
  async function exportar() {
    const datos = {
      exportadoEn: new Date().toISOString(),
      turnos: await db().turnos.toArray(),
      ventas: await db().ventas.toArray(),
      productos: await db().productos.toArray(),
    };
    const texto = JSON.stringify(datos, null, 2);
    const nombreArchivo = `buffet-${new Date().toISOString().slice(0, 10)}.json`;
    const archivo = new File([texto], nombreArchivo, { type: 'application/json' });

    // En la tablet conviene compartir (mail, WhatsApp); en la compu, bajar.
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Turnos del buffet' });
        return;
      } catch {
        // Si cancela el diálogo, cae a la descarga.
      }
    }

    const url = URL.createObjectURL(archivo);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-3">
      <h1 className="text-lg font-bold">Configuración</h1>

      {aviso && (
        <p className="rounded-lg bg-panel-850 px-3 py-2 text-sm text-zinc-300">
          {aviso}
        </p>
      )}

      <div className="card space-y-2 p-3">
        <button
          type="button"
          onClick={() => void alternarTicket()}
          className="flex h-14 w-full items-center justify-between rounded-lg bg-panel-850 px-3 text-sm font-medium"
        >
          Imprimir ticket en cada venta
          <span
            className={`chip ${
              ticket
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-panel-800 text-zinc-500'
            }`}
          >
            {ticket ? 'Sí' : 'No'}
          </span>
        </button>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void conectarImpresora()}
            className="btn-ghost h-14"
          >
            Conectar impresora
          </button>
          <button
            type="button"
            onClick={() => void sincronizarAhora()}
            className="btn-ghost h-14"
          >
            Sincronizar ahora
          </button>
          <button type="button" onClick={() => void exportar()} className="btn-ghost h-14">
            Exportar turnos (JSON)
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- productos */}
      <div className="card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Productos
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="input-base h-12 min-w-0 flex-1"
          />
          <input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="numeric"
            placeholder="Precio"
            className="input-base h-12 w-28 text-right tabular-nums"
          />
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Categoría"
            className="input-base h-12 w-32"
          />
          <button
            type="button"
            onClick={() => void agregarProducto()}
            disabled={!nombre.trim() || !precio}
            className="btn-primary h-12"
          >
            Agregar
          </button>
        </div>

        <ul className="mt-2 divide-y divide-panel-800">
          {productos.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
              <span className={`min-w-0 flex-1 truncate ${p.activo ? '' : 'text-zinc-600 line-through'}`}>
                {p.nombre}
                <span className="ml-2 text-xs text-zinc-500">{p.categoria}</span>
              </span>
              <span className="tabular-nums">{pesos(p.precio)}</span>
              <button
                type="button"
                onClick={() => void guardarProducto({ ...p, activo: !p.activo })}
                className="h-11 rounded-lg px-3 text-xs text-zinc-400 active:bg-panel-800"
              >
                {p.activo ? 'Ocultar' : 'Mostrar'}
              </button>
            </li>
          ))}
          {productos.length === 0 && (
            <li className="py-3 text-sm text-zinc-600">
              Sin productos. Cargá los del buffet para poder vender.
            </li>
          )}
        </ul>
      </div>

      {/* --------------------------------------------------------- cajeros */}
      <div className="card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Cajeros
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={cajeroNombre}
            onChange={(e) => setCajeroNombre(e.target.value)}
            placeholder="Nombre"
            className="input-base h-12 min-w-0 flex-1"
          />
          <input
            value={cajeroPin}
            onChange={(e) => setCajeroPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="PIN (4 dígitos)"
            className="input-base h-12 w-36 text-center tabular-nums"
          />
          <button
            type="button"
            onClick={async () => {
              await crearCajero(cajeroNombre, cajeroPin);
              setCajeroNombre('');
              setCajeroPin('');
            }}
            disabled={cajeroNombre.trim().length < 2 || cajeroPin.length !== 4}
            className="btn-primary h-12"
          >
            Agregar
          </button>
        </div>

        <ul className="mt-2 divide-y divide-panel-800">
          {cajeros.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
              <span className={`flex-1 ${c.activo ? '' : 'text-zinc-600 line-through'}`}>
                {c.nombre}
              </span>
              <button
                type="button"
                onClick={() => void db().cajeros.update(c.id, { activo: !c.activo })}
                className="h-11 rounded-lg px-3 text-xs text-zinc-400 active:bg-panel-800"
              >
                {c.activo ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
