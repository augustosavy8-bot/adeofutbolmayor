'use client';

import { useState } from 'react';
import type { GrupoConPersonas } from '@/lib/types';
import { contarTalles } from '@/lib/talles';
import { armarTextoPedido, copiarAlPortapapeles } from '@/lib/exportar';

function Bloque({
  titulo,
  items,
}: {
  titulo: string;
  items: { talle: string; cantidad: number }[];
}) {
  if (!items.length) return null;
  const total = items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {titulo} <span className="text-zinc-600">· {total}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <div
            key={i.talle}
            className="flex items-center gap-2 rounded-lg border border-panel-700 bg-panel-850 px-2.5 py-1.5"
          >
            <span className="text-sm font-semibold text-zinc-200">
              {i.talle}
            </span>
            <span className="chip bg-adeo-rojo px-2 py-0.5 text-white tabular-nums">
              {i.cantidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TallesPedido({ grupos }: { grupos: GrupoConPersonas[] }) {
  const [copiado, setCopiado] = useState(false);

  const numericos = grupos.filter((g) => g.tipo === 'talle_numerico');
  const letras = grupos.filter((g) => g.tipo === 'talle_letra_doble');

  const camisetas = contarTalles(
    numericos.flatMap((g) => g.personas.map((p) => p.talle))
  );
  const pantalones = contarTalles(
    letras.flatMap((g) => g.personas.map((p) => p.talle_pantalon))
  );
  const chombas = contarTalles(
    letras.flatMap((g) => g.personas.map((p) => p.talle_chomba))
  );

  async function exportar() {
    const ok = await copiarAlPortapapeles(armarTextoPedido(grupos));
    if (!ok) return;
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <section className="card p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-bold">Talles a pedir</h2>
        <button
          type="button"
          onClick={exportar}
          className="btn-primary ml-auto text-xs sm:text-sm"
        >
          {copiado ? '✓ Copiado' : '📋 Exportar pedido'}
        </button>
      </div>

      <div className="space-y-4">
        <Bloque titulo="Camisetas" items={camisetas} />
        <Bloque titulo="Pantalones (Comisión)" items={pantalones} />
        <Bloque titulo="Chombas (Comisión)" items={chombas} />
      </div>
    </section>
  );
}
