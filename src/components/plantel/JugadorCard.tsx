'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { Jugador } from '@/lib/types';
import {
  POSICIONES,
  POSICION_CLASE,
  POSICION_CORTA,
  POSICION_LABEL,
  esPosicion,
} from '@/lib/posiciones';
import { urlFoto } from '@/lib/supabase/storage';

type Props = {
  jugador: Jugador;
  onCambio: (patch: Partial<Jugador>) => void;
  onEliminar: () => void;
  onSubirFoto: (file: File) => Promise<void>;
};

/** "Julio Borini" -> "JB" */
function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}

export function JugadorCard({
  jugador,
  onCambio,
  onEliminar,
  onSubirFoto,
}: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const foto = urlFoto(jugador.foto_path);

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Se limpia el input para que elegir la misma foto otra vez vuelva a disparar.
    e.target.value = '';
    if (!file) return;

    setSubiendo(true);
    try {
      await onSubirFoto(file);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[4/5] bg-panel-850">
        {foto ? (
          <Image
            src={foto}
            alt={jugador.nombre}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 45vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-panel-800 to-panel-900">
            <span className="text-4xl font-bold text-zinc-700">
              {iniciales(jugador.nombre) || '?'}
            </span>
          </div>
        )}

        <span
          className={`chip absolute left-2 top-2 text-[10px] ${POSICION_CLASE[jugador.posicion]}`}
        >
          {POSICION_CORTA[jugador.posicion]}
        </span>

        <div className="absolute right-2 top-2">
          {confirmando ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEliminar}
                className="rounded-lg bg-adeo-rojo px-2 py-1 text-[11px] font-semibold text-white"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-lg bg-black/60 px-2 py-1 text-[11px] text-zinc-200 backdrop-blur"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label={`Eliminar a ${jugador.nombre}`}
              className="rounded-lg bg-black/50 px-2 py-1 text-xs text-zinc-300 backdrop-blur transition hover:bg-adeo-rojo hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputFoto.current?.click()}
          disabled={subiendo}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 text-xs font-medium text-zinc-200 transition hover:text-white disabled:opacity-70"
        >
          {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : '＋ Agregar foto'}
        </button>

        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          onChange={elegirFoto}
          className="hidden"
        />
      </div>

      <div className="space-y-2 p-3">
        <input
          aria-label="Nombre"
          value={jugador.nombre}
          onChange={(e) => onCambio({ nombre: e.target.value })}
          className="input-base border-transparent bg-transparent px-1.5 font-semibold"
        />

        <select
          aria-label="Posición"
          value={jugador.posicion}
          onChange={(e) => {
            if (esPosicion(e.target.value)) onCambio({ posicion: e.target.value });
          }}
          className="input-base appearance-none py-1.5 text-xs"
        >
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {POSICION_LABEL[p]}
            </option>
          ))}
        </select>

        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            $
          </span>
          <input
            aria-label={`Sueldo de ${jugador.nombre}`}
            inputMode="numeric"
            value={jugador.sueldo ? String(jugador.sueldo) : ''}
            placeholder="0"
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, ''));
              onCambio({ sueldo: Number.isFinite(n) ? n : 0 });
            }}
            className="input-base pl-5 text-right tabular-nums"
          />
        </div>

        <button
          type="button"
          onClick={() => onCambio({ al_dia: !jugador.al_dia })}
          className={`chip w-full justify-center py-2 transition ${
            jugador.al_dia
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40'
              : 'bg-adeo-rojo/10 text-adeo-rojo-claro ring-1 ring-adeo-rojo/30'
          }`}
        >
          {jugador.al_dia ? '✓ Al día' : 'Debe'}
        </button>
      </div>
    </div>
  );
}
