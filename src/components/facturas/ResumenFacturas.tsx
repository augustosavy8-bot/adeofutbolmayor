'use client';

import type { Factura } from '@/lib/types';
import { formatPesosConCentavos } from '@/lib/format';

export function ResumenFacturas({ facturas }: { facturas: Factura[] }) {
  const neto = facturas.reduce((acc, f) => acc + f.neto, 0);
  const iva = facturas.reduce((acc, f) => acc + f.iva, 0);
  const total = facturas.reduce((acc, f) => acc + f.total, 0);
  const futbol = facturas.reduce((acc, f) => acc + f.futbol, 0);

  const cards = [
    {
      label: 'Importe neto',
      valor: formatPesosConCentavos(neto),
      detalle: `${facturas.length} factura${facturas.length === 1 ? '' : 's'}`,
    },
    { label: 'IVA', valor: formatPesosConCentavos(iva), detalle: 'del mes' },
    {
      label: 'Importe total',
      valor: formatPesosConCentavos(total),
      detalle: 'neto + IVA',
    },
    {
      label: 'Fútbol',
      valor: formatPesosConCentavos(futbol),
      detalle: 'mitad del IVA',
      acento: true,
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
            className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${
              c.acento ? 'text-emerald-400' : 'text-zinc-100'
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
