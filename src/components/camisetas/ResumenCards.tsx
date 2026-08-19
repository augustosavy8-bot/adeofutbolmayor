'use client';

import type { GrupoConPersonas } from '@/lib/types';
import { formatPesos } from '@/lib/format';

export function ResumenCards({ grupos }: { grupos: GrupoConPersonas[] }) {
  const personas = grupos.flatMap((g) =>
    g.personas.map((p) => ({ ...p, tipo: g.tipo }))
  );

  const total = personas.length;
  const pagaron = personas.filter((p) => p.pago_sena).length;
  const recaudado = personas.reduce(
    (acc, p) => acc + (p.pago_sena ? Number(p.monto_sena) : 0),
    0
  );
  const sinTalle = personas.filter((p) =>
    p.tipo === 'talle_numerico'
      ? !p.talle
      : !p.talle_pantalon || !p.talle_chomba
  ).length;

  const cards = [
    { label: 'Personas', valor: String(total), detalle: `${grupos.length} grupos` },
    {
      label: 'Señas pagadas',
      valor: `${pagaron}/${total}`,
      detalle: total ? `${Math.round((pagaron / total) * 100)}% del plantel` : '—',
      acento: pagaron > 0,
    },
    {
      label: 'Recaudado',
      valor: formatPesos(recaudado),
      detalle: 'señas cobradas',
      acento: recaudado > 0,
    },
    {
      label: 'Sin talle',
      valor: String(sinTalle),
      detalle: sinTalle ? 'falta cargar' : 'todo completo',
      alerta: sinTalle > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {c.label}
          </p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${
              c.alerta
                ? 'text-adeo-rojo-claro'
                : c.acento
                  ? 'text-emerald-400'
                  : 'text-zinc-100'
            }`}
          >
            {c.valor}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{c.detalle}</p>
        </div>
      ))}
    </div>
  );
}
