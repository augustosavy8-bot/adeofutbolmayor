'use client';

import { useEffect, useState } from 'react';
import { useSesion } from '@/lib/buffet/estado';
import { imprimirFichas } from '@/lib/printer';
import { tiposDe, type TipoTicket } from '@/lib/tickets/diseno';
import { cargarFuentes, dibujarFicha } from '@/lib/tickets/render';
import { Shell } from './Shell';

export function PantallaFichas() {
  return (
    <Shell>
      <Fichas />
    </Shell>
  );
}

const CANTIDADES = [1, 2, 3, 5, 10];

function Fichas() {
  const { puesto } = useSesion();
  const tipos = tiposDe(puesto);

  const [cantidad, setCantidad] = useState(1);
  const [aviso, setAviso] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState<string | null>(null);

  // Sin las fuentes cargadas el ticket sale con la tipografía de reemplazo, y
  // el canvas no espera. Se piden al abrir la pantalla, no al imprimir.
  useEffect(() => {
    void cargarFuentes();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function imprimir(tipo: TipoTicket) {
    setImprimiendo(tipo.id);
    const r = await imprimirFichas(tipo, {}, cantidad);
    setImprimiendo(null);
    setAviso(
      r.ok
        ? `${cantidad} ${cantidad === 1 ? 'ticket' : 'tickets'} de ${tipo.label}.`
        : r.motivo
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 p-3">
      <h1 className="text-lg font-bold">Tickets</h1>

      {aviso && (
        <p className="rounded-lg bg-panel-850 px-3 py-2 text-sm text-zinc-300">
          {aviso}
        </p>
      )}

      <div className="card space-y-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Cuántos
        </p>
        <div className="flex gap-2">
          {CANTIDADES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCantidad(n)}
              aria-pressed={cantidad === n}
              className={`h-12 flex-1 rounded-lg text-base font-semibold ${
                cantidad === n
                  ? 'bg-adeo-rojo text-white'
                  : 'bg-panel-850 text-zinc-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tipos.map((tipo) => (
          <button
            key={tipo.id}
            type="button"
            onClick={() => void imprimir(tipo)}
            disabled={imprimiendo !== null}
            className="card flex flex-col items-center gap-3 p-3 transition active:bg-panel-800 disabled:opacity-50"
          >
            <Previa tipo={tipo} />
            <span className="text-base font-semibold">
              {imprimiendo === tipo.id ? 'Imprimiendo…' : `Imprimir ${cantidad}`}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

/**
 * La misma función que dibuja lo que sale por el papel, en chico. Así lo que se
 * ve en pantalla no puede diferir de lo impreso: es literalmente el mismo
 * dibujo.
 */
function Previa({ tipo }: { tipo: TipoTicket }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      await cargarFuentes();
      if (!vivo) return;
      setUrl(dibujarFicha(tipo, 272).toDataURL('image/png'));
    })();
    return () => {
      vivo = false;
    };
  }, [tipo]);

  return (
    <span className="block w-full max-w-[200px] bg-white p-1">
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt={tipo.label} className="block w-full" />
      ) : (
        <span className="block aspect-[272/190]" />
      )}
    </span>
  );
}
