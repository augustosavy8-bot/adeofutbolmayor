'use client';

import { useRef, useState } from 'react';
import type { Jugador } from '@/lib/types';
import { emparejarFotos, type Emparejamiento } from '@/lib/emparejar';
import { POSICION_CORTA } from '@/lib/posiciones';

type Props = {
  jugadores: Jugador[];
  onSubir: (jugador: Jugador, file: File) => Promise<boolean>;
};

export function CargaFotos({ jugadores, onSubir }: Props) {
  const [cola, setCola] = useState<Emparejamiento[] | null>(null);
  const [subidas, setSubidas] = useState<number | null>(null);
  const [fallidas, setFallidas] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) {
      setCola(emparejarFotos(files, jugadores));
      setFallidas([]);
    }
  }

  function reasignar(indice: number, jugadorId: string) {
    setCola((prev) =>
      prev
        ? prev.map((item, i) =>
            i === indice ? { ...item, jugadorId: jugadorId || null } : item
          )
        : prev
    );
  }

  async function subirTodas() {
    if (!cola) return;

    const pendientes = cola.filter((c) => c.jugadorId);
    const errores: string[] = [];
    setSubidas(0);

    // De a una: son fotos de varios MB y se achican en el navegador antes de
    // salir. En paralelo se le traba la pestaña al celular.
    for (const [hechas, item] of pendientes.entries()) {
      const jugador = jugadores.find((j) => j.id === item.jugadorId);
      if (!jugador) continue;

      const ok = await onSubir(jugador, item.file);
      if (!ok) errores.push(item.file.name);
      setSubidas(hechas + 1);
    }

    setFallidas(errores);
    setSubidas(null);
    setCola(null);
  }

  const asignadas = cola?.filter((c) => c.jugadorId).length ?? 0;
  const sinAsignar = (cola?.length ?? 0) - asignadas;

  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Cargar fotos en lote</p>
          <p className="text-xs text-zinc-500">
            Elegí varias juntas: cada una va a la card del jugador según el
            nombre del archivo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subidas !== null}
          className="btn-ghost shrink-0"
        >
          Elegir fotos
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          onChange={elegir}
          className="hidden"
        />
      </div>

      {fallidas.length > 0 && (
        <p className="mt-3 rounded-lg bg-adeo-rojo/10 px-3 py-2 text-sm text-adeo-rojo-claro">
          No se pudieron subir: {fallidas.join(', ')}
        </p>
      )}

      {subidas !== null && (
        <p className="mt-3 text-sm text-zinc-400">
          Subiendo… {subidas} de {asignadas}
        </p>
      )}

      {cola && subidas === null && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-500">
            {asignadas} emparejada{asignadas === 1 ? '' : 's'}
            {sinAsignar > 0 && ` · ${sinAsignar} sin asignar`}
          </p>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {cola.map((item, i) => (
              <li
                key={`${item.file.name}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-panel-850 px-2.5 py-1.5"
              >
                <span
                  className={`min-w-0 flex-1 truncate text-xs ${
                    item.jugadorId ? 'text-zinc-300' : 'text-adeo-rojo-claro'
                  }`}
                >
                  {item.file.name}
                </span>
                <select
                  aria-label={`Jugador para ${item.file.name}`}
                  value={item.jugadorId ?? ''}
                  onChange={(e) => reasignar(i, e.target.value)}
                  className="input-base w-auto appearance-none py-1 text-xs"
                >
                  <option value="">— sin asignar —</option>
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} ({POSICION_CORTA[j.posicion]})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void subirTodas()}
              disabled={asignadas === 0}
              className="btn-primary"
            >
              Subir {asignadas} foto{asignadas === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={() => setCola(null)}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
