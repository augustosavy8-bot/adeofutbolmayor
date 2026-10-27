'use client';

import { useEffect, useState } from 'react';
import type { GrupoConPersonas } from '@/lib/types';
import {
  armarFilasPlanilla,
  armarTsv,
  copiarAlPortapapeles,
  descargarCsv,
  nombreArchivoCsv,
} from '@/lib/exportar';

/**
 * Saca la lista completa —una fila por persona— para llevarla a una planilla.
 *
 * Son dos salidas y no una porque sirven para cosas distintas: copiar pega las
 * columnas directo en Google Sheets, y el CSV queda como archivo para guardar,
 * mandar o abrir en Excel.
 */
export function ExportarPlanilla({ grupos }: { grupos: GrupoConPersonas[] }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const filas = armarFilasPlanilla(grupos).length;

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function copiar() {
    const ok = await copiarAlPortapapeles(armarTsv(grupos));
    setAviso(
      ok
        ? `${filas} filas copiadas. Pegalas en Sheets con Ctrl+V.`
        : 'No se pudo copiar. Probá con "Bajar CSV".'
    );
  }

  function bajar() {
    descargarCsv(grupos, nombreArchivoCsv());
    setAviso(`${filas} filas en el archivo.`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copiar()}
        disabled={filas === 0}
        className="btn-ghost text-xs disabled:opacity-40 sm:text-sm"
      >
        Copiar para Sheets
      </button>
      <button
        type="button"
        onClick={bajar}
        disabled={filas === 0}
        className="btn-ghost text-xs disabled:opacity-40 sm:text-sm"
      >
        Bajar CSV
      </button>
      {aviso && (
        <span className="text-xs text-zinc-400" role="status">
          {aviso}
        </span>
      )}
    </div>
  );
}
