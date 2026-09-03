'use client';

import { useEffect, useState } from 'react';
import {
  PUESTOS,
  crearCajero,
  db,
  guardarProducto,
  productosDelPuesto,
  uuid,
  ventasDelTurno,
  type Venta,
  type Cajero,
  type Producto,
} from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { resumirTurno } from '@/lib/buffet/cierre';
import {
  pesos,
  ticketCierre,
  ticketEntrada,
  ticketPrueba,
  ticketReporte,
  ticketVenta,
  type TurnoDelReporte,
} from '@/lib/buffet/ticket';
import {
  TRANSPORTES,
  conectar,
  getPerfil,
  getPreferencia,
  getPuente,
  imprimirSeguro,
  listarPerfiles,
  setPerfil,
  setPreferencia,
  setPuente,
  type PerfilId,
  type PerfilImpresora,
  type PreferenciaImpresora,
  type Transporte,
} from '@/lib/printer';
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
  const { puesto, cajero, turno } = useSesion();
  const { valor: productos } = useLive<Producto[]>(
    () => productosDelPuesto(puesto),
    [],
    [puesto]
  );
  const { valor: cajeros } = useLive<Cajero[]>(
    () => db().cajeros.orderBy('nombre').toArray(),
    []
  );

  const [aviso, setAviso] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string[] | null>(null);
  const [impresion, setImpresion] = useState<PreferenciaImpresora>('auto');
  const [perfil, setPerfilEstado] = useState<PerfilImpresora>(listarPerfiles()[0]);
  const [puente, setPuenteEstado] = useState('');

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');

  const [cajeroNombre, setCajeroNombre] = useState('');
  const [cajeroPin, setCajeroPin] = useState('');

  useEffect(() => {
    setImpresion(getPreferencia());
    setPerfilEstado(getPerfil());
    setPuenteEstado(getPuente());
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

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

  /**
   * Muestra el ticket tal cual saldría por el papel, a 48 columnas. Sirve para
   * revisar el formato sin impresora — por ejemplo desde una computadora,
   * donde el sistema no deja que el navegador tome la impresora.
   */
  function previaVenta() {
    const tipo = productos.find((p) => p.activo) ?? productos[0];
    const ejemplo: Venta = {
      id: 'previa-de-ejemplo',
      turnoId: turno?.id ?? '',
      items: tipo
        ? [
            {
              productoId: tipo.id,
              nombre: tipo.nombre,
              precio: tipo.precio,
              cantidad: puesto === 'entrada' ? 1 : 2,
            },
          ]
        : [],
      total: tipo ? tipo.precio * (puesto === 'entrada' ? 1 : 2) : 0,
      medioPago: 'efectivo',
      creadoEn: new Date().toISOString(),
      anulada: false,
      synced: false,
    };
    const nombre = cajero?.nombre ?? '';
    setPrevia(
      puesto === 'entrada'
        ? ticketEntrada(ejemplo, nombre)
        : ticketVenta(ejemplo, nombre)
    );
  }

  /**
   * Reporte consolidado de los turnos cerrados del puesto. Es la alternativa
   * en papel al export JSON: no depende de mandar un archivo a ningún lado.
   */
  async function previaReporte() {
    const todos = await db().turnos.toArray();
    const delPuesto = todos
      .filter((t) => t.puesto === puesto && t.cerrado)
      .sort((a, b) => b.abiertoEn.localeCompare(a.abiertoEn));

    const filas: TurnoDelReporte[] = [];
    for (const t of delPuesto) {
      const ventas = await ventasDelTurno(t.id);
      const suCajero = await db().cajeros.get(t.cajeroId);
      filas.push({
        resumen: resumirTurno(t, ventas, suCajero ?? null),
        synced: t.synced,
      });
    }

    setPrevia(ticketReporte(PUESTOS[puesto].label, filas));
  }

  /** El cierre de verdad del turno abierto, no un ejemplo. */
  async function previaCierre() {
    if (!turno) return;
    const ventas = await ventasDelTurno(turno.id);
    setPrevia(ticketCierre(resumirTurno(turno, ventas, cajero)));
  }

  async function conectarImpresora(t: Transporte) {
    try {
      await conectar(t);
      setPreferencia(t);
      setImpresion(t);
      setAviso('Impresora conectada.');
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo conectar.');
    }
  }

  function elegirImpresion(p: PreferenciaImpresora) {
    setPreferencia(p);
    setImpresion(p);
  }

  /**
   * Cambiar de impresora cambia el ancho de todos los tickets, así que se
   * vuelve a automático: la conexión que servía para una no tiene por qué
   * servir para la otra.
   */
  function elegirPerfil(id: PerfilId) {
    setPerfil(id);
    setPerfilEstado(getPerfil());
    elegirImpresion('auto');
    setPrevia(null);
  }

  function guardarPuente(url: string) {
    setPuente(url);
    setPuenteEstado(url);
  }

  /** Manda un ticket de prueba por la vía elegida, para no descubrirlo vendiendo. */
  async function probarImpresion() {
    setAviso('Imprimiendo prueba…');
    const r = await imprimirSeguro(ticketPrueba());
    setAviso(r.ok ? 'Salió el ticket de prueba.' : r.motivo);
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

      <div className="card space-y-3 p-3">
        <h2 className="text-sm font-semibold text-zinc-200">Impresora</h2>
        <p className="rounded-lg bg-panel-850 px-3 py-2.5 text-sm text-zinc-400">
          El ticket se imprime solo en cada venta. Si la impresora no está
          conectada, la venta se guarda igual y avisa.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {listarPerfiles().map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => elegirPerfil(op.id)}
              aria-pressed={perfil.id === op.id}
              className={`rounded-lg border p-3 text-left ${
                perfil.id === op.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-panel-700 bg-panel-850'
              }`}
            >
              <span className="block text-sm font-medium text-zinc-100">
                {op.label}
              </span>
              <span className="block text-xs text-zinc-400">
                {op.columnas} columnas
                {op.guillotina ? ' · corta sola' : ' · se corta a mano'}
              </span>
            </button>
          ))}
        </div>

        <h3 className="pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Cómo conectarla
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => elegirImpresion('auto')}
            aria-pressed={impresion === 'auto'}
            className={`w-full rounded-lg border p-3 text-left ${
              impresion === 'auto'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-panel-700 bg-panel-850'
            }`}
          >
            <span className="block text-sm font-medium text-zinc-100">
              Automático
            </span>
            <span className="block text-xs text-zinc-400">
              Prueba{' '}
              {perfil.transportes
                .filter((t) => t !== 'sistema')
                .map((t) => TRANSPORTES[t].label)
                .join(', ')}
              .
            </span>
          </button>

          {/* Sólo las conexiones que tienen sentido para esta impresora: la
              portátil no tiene puerto de red ni COM, y la del mostrador no es
              Bluetooth. */}
          {perfil.transportes.map((t) => (
            <div
              key={t}
              className={`rounded-lg border p-3 ${
                impresion === t
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-panel-700 bg-panel-850'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => elegirImpresion(t)}
                  aria-pressed={impresion === t}
                  className="flex-1 text-left"
                >
                  <span className="block text-sm font-medium text-zinc-100">
                    {TRANSPORTES[t].label}
                  </span>
                  <span className="block text-xs text-zinc-400">
                    {TRANSPORTES[t].detalle}
                  </span>
                </button>
                {TRANSPORTES[t].necesitaConectar && (
                  <button
                    type="button"
                    onClick={() => void conectarImpresora(t)}
                    className="btn-ghost shrink-0 px-3 py-2 text-xs"
                  >
                    Conectar
                  </button>
                )}
              </div>

              {/* La impresora de red no la alcanza el navegador: hay que decirle
                  a qué puente mandarle el ticket. */}
              {t === 'red' && impresion === 'red' && (
                <label className="mt-3 block text-xs text-zinc-400">
                  Puente de impresión
                  <input
                    value={puente}
                    onChange={(e) => guardarPuente(e.target.value)}
                    placeholder="/api/print"
                    className="input-base mt-1"
                  />
                  <span className="mt-1 block text-[11px] text-zinc-500">
                    Impresora en {perfil.host}:{perfil.puerto}. Si la app está
                    publicada en internet, poné acá la dirección del puente que
                    corre en la red del club.
                  </span>
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void probarImpresion()}
            className="btn-ghost h-14"
          >
            Probar impresión
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
          <button type="button" onClick={previaVenta} className="btn-ghost h-14">
            Ver ticket de venta
          </button>
          <button
            type="button"
            onClick={() => void previaCierre()}
            className="btn-ghost h-14"
          >
            Ver cierre de este turno
          </button>
          <button
            type="button"
            onClick={() => void previaReporte()}
            className="btn-ghost h-14"
          >
            Reporte de turnos
          </button>
        </div>

        {previa && (
          <div className="rounded-lg bg-panel-950 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Así sale por el papel (48 columnas)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!previa) return;
                    const r = await imprimirSeguro(previa);
                    setAviso(r.ok ? 'Impreso.' : r.motivo);
                  }}
                  className="h-9 rounded-lg bg-adeo-rojo px-3 text-xs font-semibold text-white"
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setPrevia(null)}
                  className="h-9 rounded-lg px-3 text-xs text-zinc-400"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre font-mono text-[11px] leading-tight text-zinc-300">
              {previa.join('\n')}
            </pre>
          </div>
        )}
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
