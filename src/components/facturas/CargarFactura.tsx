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

      {/* En el celular se apila: cliente a lo ancho, importe y responsable a
          la mitad cada uno y el botón abajo. En una fila sola el campo de
          cliente quedaba de dos caracteres. */}
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto]">
        <label className="col-span-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:col-span-1">
          Cliente
          <input
            ref={campoCliente}
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre"
            className="input-base mt-0.5 uppercase"
          />
        </label>

        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Importe neto
          <input
            inputMode="decimal"
            value={neto}
            onChange={(e) => setNeto(e.target.value)}
            placeholder="0,00"
            className="input-base mt-0.5 text-right tabular-nums"
          />
        </label>

        <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Responsable
          <input
            list="adeo-responsables"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="—"
            className="input-base mt-0.5 uppercase"
          />
        </label>

        <button
          type="submit"
          disabled={!cliente.trim()}
          className="btn-primary col-span-2 sm:col-span-1"
        >
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
