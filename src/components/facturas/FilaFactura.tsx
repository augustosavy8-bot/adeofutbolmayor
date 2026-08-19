'use client';

import { useEffect, useState } from 'react';
import type { Factura } from '@/lib/types';
import { formatPesosConCentavos, parseMonto } from '@/lib/format';

/** 44264.98 -> "44264,98" */
function textoDe(monto: number) {
  return monto ? monto.toFixed(2).replace('.', ',') : '';
}

function InputMonto({
  valor,
  onChange,
  label,
}: {
  valor: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const [texto, setTexto] = useState(() => textoDe(valor));
  const [editando, setEditando] = useState(false);

  // Mientras se escribe manda lo tipeado; cuando no, refleja lo guardado
  // (por ejemplo si lo cambió otra persona).
  useEffect(() => {
    if (!editando) setTexto(textoDe(valor));
  }, [valor, editando]);

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={texto}
      placeholder="0,00"
      onFocus={() => setEditando(true)}
      onBlur={() => {
        setEditando(false);
        setTexto(textoDe(valor));
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(parseMonto(e.target.value));
      }}
      className="input-base text-right tabular-nums"
    />
  );
}

type Props = {
  factura: Factura;
  responsables: string[];
  onCambio: (patch: Partial<Factura>) => void;
  onEliminar: () => void;
};

export function FilaFactura({
  factura,
  responsables,
  onCambio,
  onEliminar,
}: Props) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="grid grid-cols-[minmax(160px,1fr)_130px_120px_130px_120px_130px_36px] items-center gap-2 border-b border-panel-800 px-3 py-2 last:border-b-0 hover:bg-panel-850/60">
      <input
        aria-label="Cliente"
        value={factura.cliente}
        onChange={(e) => onCambio({ cliente: e.target.value })}
        className="input-base border-transparent bg-transparent px-1.5 font-medium uppercase"
      />

      <InputMonto
        label={`Importe neto de ${factura.cliente}`}
        valor={factura.neto}
        onChange={(neto) => onCambio({ neto })}
      />

      <span className="px-1 text-right text-sm tabular-nums text-zinc-400">
        {formatPesosConCentavos(factura.iva)}
      </span>

      <span className="px-1 text-right text-sm font-semibold tabular-nums text-zinc-200">
        {formatPesosConCentavos(factura.total)}
      </span>

      <span className="px-1 text-right text-sm tabular-nums text-emerald-400">
        {formatPesosConCentavos(factura.futbol)}
      </span>

      <input
        aria-label="Responsable"
        list="adeo-responsables"
        value={factura.responsable ?? ''}
        placeholder="—"
        onChange={(e) => onCambio({ responsable: e.target.value || null })}
        className="input-base border-transparent bg-transparent px-1.5 uppercase"
      />

      <datalist id="adeo-responsables">
        {responsables.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="flex justify-end">
        {confirmando ? (
          <button
            type="button"
            onClick={onEliminar}
            className="rounded-lg bg-adeo-rojo px-2 py-1 text-[11px] font-semibold text-white"
          >
            Borrar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            onBlur={() => setConfirmando(false)}
            aria-label={`Eliminar la factura de ${factura.cliente}`}
            className="rounded-lg px-2 py-1.5 text-zinc-600 transition hover:bg-adeo-rojo/10 hover:text-adeo-rojo-claro"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
