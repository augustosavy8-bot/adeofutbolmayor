'use client';

import type { Jugador } from '@/lib/types';
import { formatPesos } from '@/lib/format';

export function ResumenPlantel({ jugadores }: { jugadores: Jugador[] }) {
  const total = jugadores.length;
  const alDia = jugadores.filter((j) => j.al_dia).length;
  const masaSalarial = jugadores.reduce((acc, j) => acc + j.sueldo, 0);
  const adeudado = jugadores
    .filter((j) => !j.al_dia)
    .reduce((acc, j) => acc + j.sueldo, 0);

  const cards = [
    { label: 'Jugadores', valor: String(total), detalle: 'en el plantel' },
    {
      label: 'Al día',
      valor: `${alDia}/${total}`,
      detalle: total ? `${Math.round((alDia / total) * 100)}% del plantel` : '—',
      acento: alDia > 0,
    },
    {
      label: 'Masa salarial',
      valor: formatPesos(masaSalarial),
      detalle: 'por mes',
    },
    {
      label: 'Pendiente',
      valor: formatPesos(adeudado),
      detalle: adeudado ? `${total - alDia} sin pagar` : 'todo al día',
      alerta: adeudado > 0,
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
