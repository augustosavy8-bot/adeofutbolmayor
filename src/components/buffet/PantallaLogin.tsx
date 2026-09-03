'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  abrirTurno,
  cajerosActivos,
  cambiarPin,
  crearCajero,
  turnoAbierto,
  verificarPin,
  type Cajero,
} from '@/db/buffet';
import { PUESTOS } from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos } from '@/lib/buffet/ticket';
import { Teclado } from './Teclado';

/** Los cuatro puntitos que se van llenando al tocar el teclado. */
function Puntos({ largo }: { largo: number }) {
  return (
    <div className="flex justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-5 w-5 rounded-full ${
            i < largo ? 'bg-adeo-rojo' : 'bg-panel-700'
          }`}
        />
      ))}
    </div>
  );
}

type Paso = 'cajero' | 'pin' | 'fondo' | 'nuevo-cajero' | 'nuevo-pin';

export function PantallaLogin() {
  const router = useRouter();
  const { puesto, entrar, cajero: sesionActiva } = useSesion();
  const { valor: cajeros, cargando } = useLive(cajerosActivos, []);

  const base = PUESTOS[puesto].base;
  const [paso, setPaso] = useState<Paso>('cajero');
  const [elegido, setElegido] = useState<Cajero | null>(null);
  const [pin, setPin] = useState('');
  const [fondo, setFondo] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Si ya hay turno abierto para este cajero, no tiene sentido volver a pedir.
  useEffect(() => {
    if (sesionActiva) router.replace(base);
  }, [sesionActiva, router, base]);

  // Primera vez en la tablet: sin cajeros no se puede entrar a ningún lado.
  useEffect(() => {
    if (!cargando && cajeros.length === 0) setPaso('nuevo-cajero');
  }, [cargando, cajeros.length]);

  /**
   * Qué hacer una vez que el cajero quedó identificado. Si el turno sigue
   * abierto se entra derecho; si no, se pide el fondo. Lo comparten el login
   * normal y el cambio de PIN: sin esto, cambiar el PIN pedía fondo inicial
   * otra vez y abría un segundo turno sobre uno ya abierto.
   */
  async function seguirConCajero(cajero: Cajero) {
    setError(null);
    setPin('');

    const abierto = await turnoAbierto(puesto);
    if (abierto) {
      // El turno sigue abierto (por ejemplo, se recargó la tablet).
      entrar(cajero, abierto);
      router.replace(base);
      return;
    }
    setPaso('fondo');
  }

  async function confirmarPin() {
    if (!elegido) return;
    if (!(await verificarPin(elegido, pin))) {
      setError('PIN incorrecto');
      setPin('');
      return;
    }
    await seguirConCajero(elegido);
  }

  async function confirmarFondo() {
    if (!elegido) return;
    const turno = await abrirTurno(elegido.id, Number(fondo || 0), puesto);
    entrar(elegido, turno);
    router.replace(base);
  }

  async function crearNuevoCajero() {
    if (nombreNuevo.trim().length < 2 || pin.length !== 4) return;
    const cajero = await crearCajero(nombreNuevo, pin);
    setElegido(cajero);
    setNombreNuevo('');
    await seguirConCajero(cajero);
  }

  /**
   * Salida para el PIN olvidado. Sin esto la caja quedaba inaccesible: la
   * pantalla de crear cajero sólo aparecía con la tablet vacía, y Configuración
   * está detrás de este mismo login.
   */
  async function ponerPinNuevo() {
    if (!elegido || pin.length !== 4) return;
    await cambiarPin(elegido.id, pin);
    await seguirConCajero(elegido);
  }

  function volverAElegir() {
    setPaso('cajero');
    setPin('');
    setNombreNuevo('');
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {PUESTOS[puesto].label} <span className="text-adeo-rojo">ADEO</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {paso === 'cajero' && 'Elegí tu usuario'}
          {paso === 'pin' && `PIN de ${elegido?.nombre}`}
          {paso === 'fondo' && 'Fondo inicial de caja'}
          {paso === 'nuevo-cajero' &&
            (cajeros.length === 0 ? 'Primer cajero de esta tablet' : 'Cajero nuevo')}
          {paso === 'nuevo-pin' && `PIN nuevo para ${elegido?.nombre}`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-adeo-rojo/10 px-3 py-2 text-center text-sm text-adeo-rojo-claro">
          {error}
        </p>
      )}

      {paso === 'cajero' && (
        <div className="space-y-2">
          {cajeros.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setElegido(c);
                setPin('');
                setError(null);
                setPaso('pin');
              }}
              className="card flex h-[90px] w-full items-center justify-center text-xl font-bold transition active:bg-panel-800"
            >
              {c.nombre}
            </button>
          ))}
          {!cargando && cajeros.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              No hay cajeros cargados.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setPin('');
              setNombreNuevo('');
              setError(null);
              setPaso('nuevo-cajero');
            }}
            className="w-full pt-1 text-sm text-zinc-500"
          >
            + Agregar cajero
          </button>
        </div>
      )}

      {paso === 'pin' && (
        <>
          <Puntos largo={pin.length} />

          <Teclado
            onDigito={(d) => {
              const siguiente = (pin + d).slice(0, 4);
              setPin(siguiente);
              setError(null);
            }}
            onBorrar={() => setPin((p) => p.slice(0, -1))}
            onAceptar={() => void confirmarPin()}
            aceptarLabel="Entrar"
            aceptarActivo={pin.length === 4}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={volverAElegir}
              className="text-sm text-zinc-500"
            >
              ← Cambiar de cajero
            </button>
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError(null);
                setPaso('nuevo-pin');
              }}
              className="text-sm text-zinc-500"
            >
              Olvidé el PIN
            </button>
          </div>
        </>
      )}

      {paso === 'fondo' && (
        <>
          <p className="text-center text-3xl font-bold tabular-nums">
            {pesos(Number(fondo || 0))}
          </p>
          <p className="text-center text-xs text-zinc-500">
            La plata con la que arranca la caja. Se usa para el arqueo del cierre.
          </p>

          <Teclado
            onDigito={(d) => setFondo((f) => (f + d).slice(0, 9))}
            onBorrar={() => setFondo((f) => f.slice(0, -1))}
            onAceptar={() => void confirmarFondo()}
            aceptarLabel="Abrir turno"
          />
        </>
      )}

      {paso === 'nuevo-cajero' && (
        <div className="space-y-3">
          <p className="text-center text-xs text-zinc-500">
            {cajeros.length === 0
              ? 'Todavía no hay ningún cajero en esta tablet. Creá el primero para poder entrar.'
              : 'El nombre es el que va a quedar en el cierre y en cada ticket.'}
          </p>

          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del cajero"
            className="input-base h-14 text-center text-lg"
          />

          <Puntos largo={pin.length} />

          <Teclado
            onDigito={(d) => setPin((p) => (p + d).slice(0, 4))}
            onBorrar={() => setPin((p) => p.slice(0, -1))}
            onAceptar={() => void crearNuevoCajero()}
            aceptarLabel="Crear"
            aceptarActivo={pin.length === 4 && nombreNuevo.trim().length >= 2}
          />

          {cajeros.length > 0 && (
            <button
              type="button"
              onClick={volverAElegir}
              className="w-full text-sm text-zinc-500"
            >
              ← Volver
            </button>
          )}
        </div>
      )}

      {paso === 'nuevo-pin' && (
        <>
          <p className="text-center text-xs text-zinc-500">
            Elegí un PIN nuevo para {elegido?.nombre}. El anterior deja de
            servir.
          </p>

          <Puntos largo={pin.length} />

          <Teclado
            onDigito={(d) => setPin((p) => (p + d).slice(0, 4))}
            onBorrar={() => setPin((p) => p.slice(0, -1))}
            onAceptar={() => void ponerPinNuevo()}
            aceptarLabel="Guardar PIN"
            aceptarActivo={pin.length === 4}
          />

          <button
            type="button"
            onClick={volverAElegir}
            className="text-sm text-zinc-500"
          >
            ← Volver
          </button>
        </>
      )}

    </main>
  );
}
