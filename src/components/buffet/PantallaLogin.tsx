'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  abrirTurno,
  cajerosActivos,
  crearCajero,
  turnoAbierto,
  verificarPin,
  type Cajero,
} from '@/db/buffet';
import { useSesion } from '@/lib/buffet/estado';
import { useLive } from '@/lib/buffet/useLive';
import { pesos } from '@/lib/buffet/ticket';
import { Teclado } from './Teclado';

type Paso = 'cajero' | 'pin' | 'fondo' | 'primer-cajero';

export function PantallaLogin() {
  const router = useRouter();
  const { entrar, cajero: sesionActiva } = useSesion();
  const { valor: cajeros, cargando } = useLive(cajerosActivos, []);

  const [paso, setPaso] = useState<Paso>('cajero');
  const [elegido, setElegido] = useState<Cajero | null>(null);
  const [pin, setPin] = useState('');
  const [fondo, setFondo] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Si ya hay turno abierto para este cajero, no tiene sentido volver a pedir.
  useEffect(() => {
    if (sesionActiva) router.replace('/buffet');
  }, [sesionActiva, router]);

  // Primera vez en la tablet: sin cajeros no se puede entrar a ningún lado.
  useEffect(() => {
    if (!cargando && cajeros.length === 0) setPaso('primer-cajero');
  }, [cargando, cajeros.length]);

  async function confirmarPin() {
    if (!elegido) return;
    if (!(await verificarPin(elegido, pin))) {
      setError('PIN incorrecto');
      setPin('');
      return;
    }

    const abierto = await turnoAbierto();
    if (abierto) {
      // El turno sigue abierto (por ejemplo, se recargó la tablet).
      entrar(elegido, abierto);
      router.replace('/buffet');
      return;
    }
    setError(null);
    setPaso('fondo');
  }

  async function confirmarFondo() {
    if (!elegido) return;
    const turno = await abrirTurno(elegido.id, Number(fondo || 0));
    entrar(elegido, turno);
    router.replace('/buffet');
  }

  async function crearPrimerCajero() {
    if (nombreNuevo.trim().length < 2 || pin.length !== 4) return;
    const cajero = await crearCajero(nombreNuevo, pin);
    setElegido(cajero);
    setNombreNuevo('');
    setPin('');
    setError(null);
    setPaso('fondo');
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          Buffet <span className="text-adeo-rojo">ADEO</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {paso === 'cajero' && 'Elegí tu usuario'}
          {paso === 'pin' && `PIN de ${elegido?.nombre}`}
          {paso === 'fondo' && 'Fondo inicial de caja'}
          {paso === 'primer-cajero' && 'Primer cajero de esta tablet'}
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
        </div>
      )}

      {paso === 'pin' && (
        <>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-5 w-5 rounded-full ${
                  i < pin.length ? 'bg-adeo-rojo' : 'bg-panel-700'
                }`}
              />
            ))}
          </div>

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

          <button
            type="button"
            onClick={() => {
              setPaso('cajero');
              setPin('');
              setError(null);
            }}
            className="text-sm text-zinc-500"
          >
            ← Cambiar de cajero
          </button>
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

      {paso === 'primer-cajero' && (
        <div className="space-y-3">
          <p className="text-center text-xs text-zinc-500">
            Todavía no hay ningún cajero en esta tablet. Creá el primero para
            poder entrar; después se agregan más desde Configuración.
          </p>

          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del cajero"
            className="input-base h-14 text-center text-lg"
          />

          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-5 w-5 rounded-full ${
                  i < pin.length ? 'bg-adeo-rojo' : 'bg-panel-700'
                }`}
              />
            ))}
          </div>

          <Teclado
            onDigito={(d) => setPin((p) => (p + d).slice(0, 4))}
            onBorrar={() => setPin((p) => p.slice(0, -1))}
            onAceptar={() => void crearPrimerCajero()}
            aceptarLabel="Crear"
            aceptarActivo={pin.length === 4 && nombreNuevo.trim().length >= 2}
          />
        </div>
      )}
    </main>
  );
}
