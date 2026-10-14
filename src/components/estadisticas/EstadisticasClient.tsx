'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ESTADO_LABEL, totalesTemporada } from '@/lib/estadisticas';
import type { Citado, EventoPartido, Partido } from '@/lib/types';
import { TablaEstadisticas } from './TablaEstadisticas';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "2026-10-12" -> "dom 12/10". La fecha viene sin hora: se arma en local. */
export function fechaCorta(fecha: string) {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a, m - 1, d);
  return `${DIAS[dia.getDay()]} ${d}/${m}`;
}

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function EstadisticasClient({
  partidos,
  citados,
  eventos,
}: {
  partidos: Partido[];
  citados: Citado[];
  eventos: Pick<EventoPartido, 'partido_id' | 'citado_id' | 'tipo'>[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rival, setRival] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [torneo, setTorneo] = useState('');
  const [condicion, setCondicion] = useState<'local' | 'visitante'>('local');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const temporada = useMemo(() => totalesTemporada(citados, eventos), [citados, eventos]);

  const golesPorPartido = useMemo(() => {
    const goles = new Map<string, number>();
    for (const e of eventos) {
      if (e.tipo === 'gol') goles.set(e.partido_id, (goles.get(e.partido_id) ?? 0) + 1);
    }
    return goles;
  }, [eventos]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!rival.trim()) return;
    setCreando(true);
    setError(null);

    const { data, error } = await supabase
      .from('adeo_partidos')
      .insert({
        rival: rival.trim(),
        fecha,
        torneo: torneo.trim() || null,
        condicion,
      })
      .select('id')
      .single();

    if (error || !data) {
      setError(error?.message ?? 'No se pudo crear el partido');
      setCreando(false);
      return;
    }
    router.push(`/estadisticas/${data.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Estadísticas</h1>
        <p className="text-sm text-zinc-400">
          Cargá las acciones de cada jugador durante el partido
        </p>
      </div>

      <form onSubmit={crear} className="card grid gap-2 p-3 sm:grid-cols-[1fr_auto_1fr_auto_auto]">
        <input
          aria-label="Rival"
          value={rival}
          onChange={(e) => setRival(e.target.value)}
          placeholder="Rival…"
          className="input-base"
        />
        <input
          aria-label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="input-base sm:w-auto"
        />
        <input
          aria-label="Torneo"
          value={torneo}
          onChange={(e) => setTorneo(e.target.value)}
          placeholder="Torneo (opcional)"
          className="input-base"
        />
        <div className="flex rounded-lg border border-panel-700 bg-panel-850 p-0.5">
          {(['local', 'visitante'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCondicion(c)}
              aria-pressed={condicion === c}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition ${
                condicion === c ? 'bg-adeo-rojo text-white' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button type="submit" disabled={!rival.trim() || creando} className="btn-primary">
          {creando ? 'Creando…' : 'Nuevo partido'}
        </button>
        {error && <p className="text-sm text-adeo-rojo-claro sm:col-span-5">{error}</p>}
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Partidos
        </h2>
        {partidos.length === 0 ? (
          <p className="card p-6 text-center text-sm text-zinc-500">
            Todavía no cargaste ningún partido. Creá el primero arriba.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {partidos.map((p) => {
              const favor = golesPorPartido.get(p.id) ?? 0;
              const enCurso = p.estado !== 'previa' && p.estado !== 'final';
              return (
                <Link
                  key={p.id}
                  href={`/estadisticas/${p.id}`}
                  className="card flex items-center gap-3 p-3 transition hover:border-panel-600"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500">
                      {fechaCorta(p.fecha)}
                      {p.torneo ? ` · ${p.torneo}` : ''}
                    </p>
                    <p className="truncate font-semibold">
                      {p.condicion === 'visitante' ? `${p.rival} vs ADEO` : `ADEO vs ${p.rival}`}
                    </p>
                    <p
                      className={`text-xs ${
                        enCurso ? 'font-semibold text-adeo-rojo-claro' : 'text-zinc-500'
                      }`}
                    >
                      {ESTADO_LABEL[p.estado]}
                    </p>
                  </div>
                  {p.estado !== 'previa' && (
                    <span className="text-2xl font-black tabular-nums">
                      {p.condicion === 'visitante'
                        ? `${p.goles_contra}-${favor}`
                        : `${favor}-${p.goles_contra}`}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Temporada
        </h2>
        <TablaEstadisticas
          filas={temporada}
          vacio="Los totales por jugador aparecen cuando cargues el primer partido."
        />
      </section>
    </div>
  );
}
