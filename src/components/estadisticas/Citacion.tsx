'use client';

import { useState } from 'react';
import { POSICIONES, POSICION_LABEL } from '@/lib/posiciones';
import type { Citado, Jugador } from '@/lib/types';

/**
 * Elegir quiénes juegan, desde el plantel. Los que ya tienen acciones cargadas
 * no se pueden sacar: se perderían sus estadísticas del partido.
 */
export function Citacion({
  plantel,
  citados,
  conAcciones,
  onGuardar,
  onCancelar,
}: {
  plantel: Jugador[];
  citados: Citado[];
  conAcciones: Set<string>;
  onGuardar: (agregar: Jugador[], quitar: Citado[]) => Promise<void>;
  onCancelar?: () => void;
}) {
  const yaCitados = new Set(citados.map((c) => c.jugador_id));
  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(citados.map((c) => c.jugador_id).filter(Boolean) as string[])
  );
  const [guardando, setGuardando] = useState(false);

  const bloqueado = (jugadorId: string) => {
    const citado = citados.find((c) => c.jugador_id === jugadorId);
    return !!citado && conAcciones.has(citado.id);
  };

  function alternar(id: string) {
    if (bloqueado(id)) return;
    setElegidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function guardar() {
    setGuardando(true);
    const agregar = plantel.filter((j) => elegidos.has(j.id) && !yaCitados.has(j.id));
    const quitar = citados.filter(
      (c) => c.jugador_id && !elegidos.has(c.jugador_id) && !conAcciones.has(c.id)
    );
    await onGuardar(agregar, quitar);
    setGuardando(false);
  }

  if (plantel.length === 0) {
    return (
      <p className="card p-6 text-center text-sm text-zinc-500">
        El plantel está vacío. Cargá los jugadores en Plantel para poder citarlos.
      </p>
    );
  }

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">¿Quiénes juegan?</h2>
          <p className="text-sm text-zinc-400">Tocá a los citados para este partido.</p>
        </div>
        <button
          type="button"
          onClick={() => setElegidos(new Set(plantel.map((j) => j.id)))}
          className="btn-ghost"
        >
          Todos
        </button>
      </div>

      {POSICIONES.map((posicion) => {
        const delPuesto = plantel.filter((j) => j.posicion === posicion);
        if (delPuesto.length === 0) return null;
        return (
          <div key={posicion} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {POSICION_LABEL[posicion]}
            </p>
            <div className="flex flex-wrap gap-2">
              {delPuesto.map((j) => {
                const activo = elegidos.has(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => alternar(j.id)}
                    aria-pressed={activo}
                    title={bloqueado(j.id) ? 'Ya tiene acciones cargadas' : undefined}
                    className={`chip px-3 py-1.5 text-sm transition ${
                      activo
                        ? 'bg-adeo-rojo text-white'
                        : 'bg-panel-850 text-zinc-400 ring-1 ring-panel-700 hover:text-zinc-100'
                    } ${bloqueado(j.id) ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    {j.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="btn-ghost">
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={elegidos.size === 0 || guardando}
          className="btn-primary"
        >
          {guardando ? 'Guardando…' : `Citar ${elegidos.size}`}
        </button>
      </div>
    </div>
  );
}
