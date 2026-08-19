'use client';

import { useState } from 'react';
import type { GrupoConPersonas, Persona } from '@/lib/types';
import { formatPesos } from '@/lib/format';
import { FilaPersona } from './FilaPersona';

type Props = {
  grupo: GrupoConPersonas;
  onCambio: (personaId: string, patch: Partial<Persona>) => void;
  onEliminar: (personaId: string) => void;
  onAgregar: (grupoId: string, nombre: string) => Promise<void>;
};

export function GrupoTabla({ grupo, onCambio, onEliminar, onAgregar }: Props) {
  const [nuevo, setNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const numerico = grupo.tipo === 'talle_numerico';

  const sinTalle = grupo.personas.filter((p) =>
    numerico ? !p.talle : !p.talle_pantalon || !p.talle_chomba
  ).length;
  const recaudado = grupo.personas.reduce(
    (acc, p) => acc + (p.pago_sena ? Number(p.monto_sena) : 0),
    0
  );

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nuevo.trim();
    if (!nombre) return;
    setGuardando(true);
    await onAgregar(grupo.id, nombre);
    setNuevo('');
    setGuardando(false);
  }

  const cols = numerico
    ? 'md:grid-cols-[minmax(0,1fr)_96px_128px_128px_40px]'
    : 'md:grid-cols-[minmax(0,1fr)_92px_92px_128px_128px_40px]';

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-panel-700 bg-panel-850 px-4 py-3">
        <h2 className="text-base font-bold">{grupo.nombre}</h2>
        <span className="chip bg-panel-800 text-zinc-400">
          {grupo.personas.length}
        </span>
        <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
          {sinTalle > 0 && (
            <span className="chip bg-adeo-rojo/15 text-adeo-rojo-claro">
              {sinTalle} sin talle
            </span>
          )}
          {recaudado > 0 && (
            <span className="tabular-nums">{formatPesos(recaudado)}</span>
          )}
        </div>
      </header>

      <div
        className={`hidden gap-2 border-b border-panel-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:grid ${cols}`}
      >
        <span className="pl-1.5">Nombre</span>
        {numerico ? (
          <span className="text-center">Talle</span>
        ) : (
          <>
            <span className="text-center">Pantalón</span>
            <span className="text-center">Chomba</span>
          </>
        )}
        <span className="text-center">Seña</span>
        <span className="text-right">Monto</span>
        <span />
      </div>

      <div>
        {grupo.personas.map((persona) => (
          <FilaPersona
            key={persona.id}
            persona={persona}
            tipo={grupo.tipo}
            onCambio={(patch) => onCambio(persona.id, patch)}
            onEliminar={() => onEliminar(persona.id)}
          />
        ))}
        {grupo.personas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Todavía no hay nadie en este grupo.
          </p>
        )}
      </div>

      <form
        onSubmit={agregar}
        className="flex gap-2 border-t border-panel-700 bg-panel-900 px-3 py-3"
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={`Agregar a ${grupo.nombre}…`}
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={guardando || !nuevo.trim()}
          className="btn-primary shrink-0"
        >
          + Agregar
        </button>
      </form>
    </section>
  );
}
