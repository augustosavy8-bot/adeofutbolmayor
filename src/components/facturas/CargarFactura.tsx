'use client';

import { useEffect, useRef, useState } from 'react';
import { nombreMes } from '@/lib/periodos';

type Props = {
  periodo: string;
  onAgregar: (
    cliente: string,
    neto: string,
    responsable: string
  ) => Promise<boolean>;
};

export function CargarFactura({ periodo, onAgregar }: Props) {
  const [cliente, setCliente] = useState('');
  const [neto, setNeto] = useState('');
  // El responsable no se limpia: cuando se cargan varias seguidas suele ser
  // el mismo, y volver a tipearlo cada vez es lo que más molesta.
  const [responsable, setResponsable] = useState('');
  const [ultima, setUltima] = useState<string | null>(null);
  const campoCliente = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ultima) return;
    const t = setTimeout(() => setUltima(null), 4000);
    return () => clearTimeout(t);
  }, [ultima]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = cliente.trim().toUpperCase();
    if (!nombre) return;

    if (await onAgregar(nombre, neto, responsable)) {
      setCliente('');
      setNeto('');
      setUltima(nombre);
      campoCliente.current?.focus();
    }
  }

  return (
    <form onSubmit={enviar} className="card p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Cargar factura en {nombreMes(periodo)}
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={campoCliente}
          aria-label="Cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Cliente"
          className="input-base min-w-0 flex-1 uppercase"
        />
        <input
          aria-label="Importe neto"
          inputMode="decimal"
          value={neto}
          onChange={(e) => setNeto(e.target.value)}
          placeholder="Importe neto"
          className="input-base w-32 text-right tabular-nums"
        />
        <input
          aria-label="Responsable"
          list="adeo-responsables"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          placeholder="Responsable"
          className="input-base w-32 uppercase"
        />
        <button type="submit" disabled={!cliente.trim()} className="btn-primary">
          Agregar
        </button>
      </div>

      {ultima && (
        <p className="mt-2 text-xs text-emerald-400">
          ✓ {ultima} agregada. Se sumó al final de la tabla.
        </p>
      )}
    </form>
  );
}
