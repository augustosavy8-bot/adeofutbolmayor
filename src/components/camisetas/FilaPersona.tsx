'use client';

import { useState } from 'react';
import type { GrupoTipo, Persona } from '@/lib/types';
import { TALLES_LETRA, TALLES_NUMERICOS } from '@/lib/talles';

type Props = {
  persona: Persona;
  tipo: GrupoTipo;
  onCambio: (patch: Partial<Persona>) => void;
  onEliminar: () => void;
};

function SelectTalle({
  valor,
  opciones,
  onChange,
  label,
}: {
  valor: string | null;
  opciones: readonly string[];
  onChange: (v: string | null) => void;
  label: string;
}) {
  const vacio = !valor;
  return (
    <select
      aria-label={label}
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`input-base appearance-none px-2 py-2 text-center font-semibold ${
        vacio
          ? 'border-adeo-rojo bg-adeo-rojo/10 text-adeo-rojo-claro'
          : 'text-zinc-100'
      }`}
    >
      <option value="">—</option>
      {opciones.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

export function FilaPersona({ persona, tipo, onCambio, onEliminar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const numerico = tipo === 'talle_numerico';

  const cols = numerico
    ? 'md:grid-cols-[minmax(0,1fr)_96px_128px_128px_40px]'
    : 'md:grid-cols-[minmax(0,1fr)_92px_92px_128px_128px_40px]';

  return (
    <div
      className={`grid grid-cols-2 items-center gap-2 border-b border-panel-800 px-3 py-2.5 last:border-b-0 hover:bg-panel-850/60 ${cols}`}
    >
      <input
        aria-label="Nombre"
        value={persona.nombre}
        onChange={(e) => onCambio({ nombre: e.target.value })}
        className="input-base col-span-2 border-transparent bg-transparent px-1.5 font-medium md:col-span-1"
      />

      {numerico ? (
        <SelectTalle
          label="Talle"
          valor={persona.talle}
          opciones={TALLES_NUMERICOS}
          onChange={(v) => onCambio({ talle: v })}
        />
      ) : (
        <>
          <SelectTalle
            label="Talle de pantalón"
            valor={persona.talle_pantalon}
            opciones={TALLES_LETRA}
            onChange={(v) => onCambio({ talle_pantalon: v })}
          />
          <SelectTalle
            label="Talle de chomba"
            valor={persona.talle_chomba}
            opciones={TALLES_LETRA}
            onChange={(v) => onCambio({ talle_chomba: v })}
          />
        </>
      )}

      <button
        type="button"
        onClick={() => onCambio({ pago_sena: !persona.pago_sena })}
        className={`chip justify-center py-2 transition ${
          persona.pago_sena
            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40'
            : 'bg-panel-800 text-zinc-400 ring-1 ring-panel-700'
        }`}
      >
        {persona.pago_sena ? '✓ Pagó' : 'Pendiente'}
      </button>

      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
          $
        </span>
        <input
          aria-label="Monto de la seña"
          inputMode="numeric"
          value={persona.monto_sena ? String(persona.monto_sena) : ''}
          placeholder="0"
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d]/g, ''));
            onCambio({ monto_sena: Number.isFinite(n) ? n : 0 });
          }}
          className="input-base pl-5 text-right tabular-nums"
        />
      </div>

      <div className="flex justify-end">
        {confirmando ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEliminar}
              className="rounded-lg bg-adeo-rojo px-2 py-1.5 text-xs font-semibold text-white"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-panel-700 px-2 py-1.5 text-xs text-zinc-400"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label={`Eliminar a ${persona.nombre}`}
            className="rounded-lg px-2 py-1.5 text-zinc-600 transition hover:bg-adeo-rojo/10 hover:text-adeo-rojo-claro"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
