'use client';

import { useEffect, useState } from 'react';
import type { Factura } from '@/lib/types';
import { formatPesosConCentavos, parseMonto } from '@/lib/format';

export const COLUMNAS =
  'grid-cols-[minmax(150px,1fr)_130px_120px_130px_120px_120px_32px]';

/** 44264.98 -> "44264,98" */
function textoDe(monto: number) {
  return monto ? monto.toFixed(2).replace('.', ',') : '';
}

function InputMonto({
  valor,
  onChange,
  label,
  className = '',
}: {
  valor: number;
  onChange: (n: number) => void;
  label: string;
  className?: string;
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
      className={`input-base text-right tabular-nums ${className}`}
    />
  );
}

function BotonBorrar({
  factura,
  onEliminar,
}: {
  factura: Factura;
  onEliminar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  return confirmando ? (
    <button
      type="button"
      onClick={onEliminar}
      onBlur={() => setConfirmando(false)}
      className="rounded-lg bg-adeo-rojo px-2 py-1 text-[11px] font-semibold text-white"
    >
      Borrar
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      aria-label={`Eliminar la factura de ${factura.cliente}`}
      className="rounded-lg px-2 py-1.5 text-zinc-600 transition hover:bg-adeo-rojo/10 hover:text-adeo-rojo-claro"
    >
      ✕
    </button>
  );
}

type Props = {
  factura: Factura;
  indice: number;
  onCambio: (patch: Partial<Factura>) => void;
  onEliminar: () => void;
};

export function FilaFactura({ factura, indice, onCambio, onEliminar }: Props) {
  // Alternar el fondo hace mucho por la lectura cuando la fila es ancha.
  const cebra = indice % 2 === 1 ? 'bg-panel-850/40' : '';

  const campoCliente = (
    <input
      aria-label="Cliente"
      value={factura.cliente}
      onChange={(e) => onCambio({ cliente: e.target.value })}
      className="input-base border-transparent bg-transparent px-1.5 font-semibold uppercase"
    />
  );

  const campoResponsable = (
    <input
      aria-label="Responsable"
      list="adeo-responsables"
      value={factura.responsable ?? ''}
      placeholder="—"
      onChange={(e) => onCambio({ responsable: e.target.value || null })}
      className="input-base border-transparent bg-transparent px-1.5 text-xs uppercase text-zinc-400"
    />
  );

  return (
    <>
      {/* Escritorio: una fila por factura */}
      <div
        className={`hidden items-center gap-2 px-3 py-1.5 transition hover:bg-panel-800/60 md:grid ${COLUMNAS} ${cebra}`}
      >
        {campoCliente}
        <InputMonto
          label={`Importe neto de ${factura.cliente}`}
          valor={factura.neto}
          onChange={(neto) => onCambio({ neto })}
        />
        <span className="px-1 text-right text-sm tabular-nums text-zinc-500">
          {formatPesosConCentavos(factura.iva)}
        </span>
        <span className="px-1 text-right text-sm font-semibold tabular-nums text-zinc-100">
          {formatPesosConCentavos(factura.total)}
        </span>
        <span className="px-1 text-right text-sm tabular-nums text-emerald-400">
          {formatPesosConCentavos(factura.futbol)}
        </span>
        {campoResponsable}
        <div className="flex justify-end">
          <BotonBorrar factura={factura} onEliminar={onEliminar} />
        </div>
      </div>

      {/* Celular: cada factura como bloque, sin scroll horizontal */}
      <div className={`px-3 py-2.5 md:hidden ${cebra}`}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{campoCliente}</div>
          <BotonBorrar factura={factura} onEliminar={onEliminar} />
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Neto
            <InputMonto
              label={`Importe neto de ${factura.cliente}`}
              valor={factura.neto}
              onChange={(neto) => onCambio({ neto })}
              className="mt-0.5"
            />
          </label>

          <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Responsable
            <div className="mt-0.5">{campoResponsable}</div>
          </label>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            IVA
            <span className="mt-0.5 block text-sm tabular-nums normal-case tracking-normal text-zinc-400">
              {formatPesosConCentavos(factura.iva)}
            </span>
          </p>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Fútbol
            <span className="mt-0.5 block text-sm tabular-nums normal-case tracking-normal text-emerald-400">
              {formatPesosConCentavos(factura.futbol)}
            </span>
          </p>

          <p className="col-span-2 flex items-baseline justify-between border-t border-panel-800 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Total
            <span className="text-base font-bold tabular-nums normal-case tracking-normal text-zinc-100">
              {formatPesosConCentavos(factura.total)}
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
