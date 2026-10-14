'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  ACCION,
  ACCIONES,
  ESTADO_LABEL,
  contarPorCitado,
  conteoVacio,
  formatoReloj,
  minutoDeJuego,
  segundosDeJuego,
  totalAcciones,
  type Accion,
} from '@/lib/estadisticas';
import { POSICIONES, POSICION_CLASE, POSICION_CORTA } from '@/lib/posiciones';
import type {
  Citado,
  EventoPartido,
  Jugador,
  Partido,
  PartidoInsert,
  TipoEvento,
} from '@/lib/types';
import { Citacion } from './Citacion';
import { fechaCorta } from './EstadisticasClient';
import { TablaEstadisticas } from './TablaEstadisticas';

const SIGNO_CLASE: Record<Accion['signo'], string> = {
  positivo: 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
  negativo: 'border-adeo-rojo/40 bg-adeo-rojo/10 hover:bg-adeo-rojo/20',
  neutro: 'border-panel-700 bg-panel-850 hover:bg-panel-800',
};

/** Orden de cancha y, dentro del puesto, el orden del plantel. */
function ordenarCitados(citados: Citado[]) {
  const puesto = (c: Citado) => (c.posicion ? POSICIONES.indexOf(c.posicion) : 99);
  return [...citados].sort((a, b) => puesto(a) - puesto(b) || a.orden - b.orden);
}

export function PartidoClient({
  partido: inicial,
  citados: citadosIniciales,
  eventos: eventosIniciales,
  plantel,
}: {
  partido: Partido;
  citados: Citado[];
  eventos: EventoPartido[];
  plantel: Jugador[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [partido, setPartido] = useState(inicial);
  const [citados, setCitados] = useState(() => ordenarCitados(citadosIniciales));
  const [eventos, setEventos] = useState(eventosIniciales);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [editandoCitados, setEditandoCitados] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const rodando = partido.estado === 'primer_tiempo' || partido.estado === 'segundo_tiempo';

  // El reloj corre solo mientras la pelota rueda; se recalcula desde las
  // marcas de inicio, así que un tic perdido no atrasa nada.
  useEffect(() => {
    if (!rodando) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rodando]);

  const segundos = segundosDeJuego(partido, ahora);
  const porCitado = useMemo(() => contarPorCitado(eventos), [eventos]);
  const golesFavor = useMemo(() => eventos.filter((e) => e.tipo === 'gol').length, [eventos]);
  const citadoActivo = citados.find((c) => c.id === seleccionado) ?? null;
  const ultimo = eventos[eventos.length - 1];

  // ------------------------------------------------------------- realtime
  // Para cargar desde dos teléfonos (uno por banda) sin pisarse.
  useEffect(() => {
    const canal = supabase
      .channel(`adeo_eventos_${partido.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'adeo_eventos',
          filter: `partido_id=eq.${partido.id}`,
        },
        (payload: RealtimePostgresChangesPayload<EventoPartido>) => {
          if (payload.eventType === 'DELETE') {
            const viejo = payload.old as EventoPartido;
            setEventos((prev) => prev.filter((e) => e.id !== viejo.id));
            return;
          }
          if (payload.eventType === 'INSERT') {
            const nuevo = payload.new as EventoPartido;
            // El propio ya está: se agregó optimista con el mismo id.
            setEventos((prev) =>
              prev.some((e) => e.id === nuevo.id) ? prev : [...prev, nuevo]
            );
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, partido.id]);

  // -------------------------------------------------------------- acciones

  const registrar = useCallback(
    async (tipo: TipoEvento) => {
      if (!seleccionado) return;
      setError(null);

      // El id sale del navegador: así el eco de realtime se reconoce y no se
      // duplica el toque en pantalla.
      const evento: EventoPartido = {
        id: crypto.randomUUID(),
        partido_id: partido.id,
        citado_id: seleccionado,
        tipo,
        minuto: minutoDeJuego(segundosDeJuego(partido)),
        created_at: new Date().toISOString(),
      };
      setEventos((prev) => [...prev, evento]);
      navigator.vibrate?.(15);

      const { error } = await supabase.from('adeo_eventos').insert(evento);
      if (error) {
        setEventos((prev) => prev.filter((e) => e.id !== evento.id));
        setError(`No se guardó "${ACCION[tipo].label}": ${error.message}`);
      }
    },
    [partido, seleccionado, supabase]
  );

  async function deshacer() {
    if (!ultimo) return;
    setError(null);
    setEventos((prev) => prev.filter((e) => e.id !== ultimo.id));
    const { error } = await supabase.from('adeo_eventos').delete().eq('id', ultimo.id);
    if (error) {
      setEventos((prev) => [...prev, ultimo].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setError(`No se pudo deshacer: ${error.message}`);
    }
  }

  async function actualizarPartido(patch: Partial<PartidoInsert>) {
    setError(null);
    const anterior = partido;
    setPartido((p) => ({ ...p, ...patch }) as Partido);
    const { error } = await supabase.from('adeo_partidos').update(patch).eq('id', partido.id);
    if (error) {
      setPartido(anterior);
      setError(`No se guardó el cambio: ${error.message}`);
    }
  }

  function avanzarReloj() {
    const marca = new Date().toISOString();
    if (partido.estado === 'previa') void actualizarPartido({ estado: 'primer_tiempo', inicio_at: marca });
    else if (partido.estado === 'primer_tiempo') void actualizarPartido({ estado: 'entretiempo' });
    else if (partido.estado === 'entretiempo')
      void actualizarPartido({ estado: 'segundo_tiempo', inicio_st_at: marca });
    else if (partido.estado === 'segundo_tiempo') void actualizarPartido({ estado: 'final' });
  }

  async function guardarCitacion(agregar: Jugador[], quitar: Citado[]) {
    setError(null);
    const base = citados.reduce((max, c) => Math.max(max, c.orden), 0);

    if (agregar.length) {
      const { data, error } = await supabase
        .from('adeo_partido_jugadores')
        .insert(
          agregar.map((j, i) => ({
            partido_id: partido.id,
            jugador_id: j.id,
            nombre: j.nombre,
            posicion: j.posicion,
            orden: base + i + 1,
          }))
        )
        .select();
      if (error) {
        setError(`No se pudo citar: ${error.message}`);
        return;
      }
      setCitados((prev) => ordenarCitados([...prev, ...((data ?? []) as Citado[])]));
    }

    if (quitar.length) {
      const ids = quitar.map((c) => c.id);
      const { error } = await supabase.from('adeo_partido_jugadores').delete().in('id', ids);
      if (error) {
        setError(`No se pudo sacar de la citación: ${error.message}`);
        return;
      }
      setCitados((prev) => prev.filter((c) => !ids.includes(c.id)));
      if (seleccionado && ids.includes(seleccionado)) setSeleccionado(null);
    }

    setEditandoCitados(false);
  }

  async function eliminarPartido() {
    if (!confirm(`¿Borrar el partido contra ${partido.rival} con todas sus estadísticas?`)) return;
    const { error } = await supabase.from('adeo_partidos').delete().eq('id', partido.id);
    if (error) {
      setError(`No se pudo borrar: ${error.message}`);
      return;
    }
    router.push('/estadisticas');
    router.refresh();
  }

  // ----------------------------------------------------------------- vista

  const local = partido.condicion !== 'visitante';
  const textoBotonReloj: Record<Partido['estado'], string | null> = {
    previa: '▶ Arrancar',
    primer_tiempo: '⏸ Entretiempo',
    entretiempo: '▶ Arrancar 2T',
    segundo_tiempo: '🏁 Final',
    final: null,
  };

  const filasPartido = citados.map((c) => ({
    clave: c.id,
    nombre: c.nombre,
    posicion: c.posicion,
    conteo: porCitado.get(c.id) ?? conteoVacio(),
  }));

  const sinCitados = citados.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/estadisticas" className="btn-ghost px-2.5" aria-label="Volver a estadísticas">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {local ? `ADEO vs ${partido.rival}` : `${partido.rival} vs ADEO`}
          </h1>
          <p className="text-sm text-zinc-400">
            {fechaCorta(partido.fecha)}
            {partido.torneo ? ` · ${partido.torneo}` : ''}
          </p>
        </div>
        <button type="button" onClick={eliminarPartido} className="btn-ghost text-zinc-400">
          Borrar
        </button>
      </div>

      {/* Marcador y reloj */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <Goles etiqueta="ADEO" valor={golesFavor} ayuda="Suma solo con cada Gol cargado" />
          <span className="text-2xl text-zinc-600">-</span>
          <Goles
            etiqueta={partido.rival}
            valor={partido.goles_contra}
            onMenos={() =>
              void actualizarPartido({ goles_contra: Math.max(0, partido.goles_contra - 1) })
            }
            onMas={() => void actualizarPartido({ goles_contra: partido.goles_contra + 1 })}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {ESTADO_LABEL[partido.estado]}
            </p>
            <p
              className={`font-mono text-3xl font-bold tabular-nums ${
                rodando ? 'text-zinc-100' : 'text-zinc-600'
              }`}
              aria-label="Tiempo de juego"
            >
              {segundos != null
                ? formatoReloj(segundos)
                : partido.estado === 'entretiempo'
                  ? '45:00'
                  : partido.estado === 'final'
                    ? '--:--'
                    : '00:00'}
            </p>
          </div>
          {textoBotonReloj[partido.estado] && (
            <button
              type="button"
              onClick={avanzarReloj}
              className={
                partido.estado === 'previa' || partido.estado === 'entretiempo'
                  ? 'btn-primary'
                  : 'btn-ghost'
              }
            >
              {textoBotonReloj[partido.estado]}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-adeo-rojo/40 bg-adeo-rojo/10 px-3 py-2 text-sm text-adeo-rojo-claro">
          {error}
        </p>
      )}

      {sinCitados || editandoCitados ? (
        <Citacion
          plantel={plantel}
          citados={citados}
          conAcciones={new Set(porCitado.keys())}
          onGuardar={guardarCitacion}
          onCancelar={sinCitados ? undefined : () => setEditandoCitados(false)}
        />
      ) : (
        <>
          {/* 1. A quién */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Jugador
              </h2>
              <button
                type="button"
                onClick={() => setEditandoCitados(true)}
                className="ml-auto text-xs text-zinc-500 hover:text-zinc-200"
              >
                Editar citados
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {citados.map((c) => {
                const activo = c.id === seleccionado;
                const acciones = totalAcciones(porCitado.get(c.id) ?? conteoVacio());
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSeleccionado(activo ? null : c.id)}
                    aria-pressed={activo}
                    className={`flex min-h-[64px] flex-col items-start justify-between rounded-xl border p-2 text-left transition ${
                      activo
                        ? 'border-adeo-rojo bg-adeo-rojo/20 ring-1 ring-adeo-rojo'
                        : 'border-panel-700 bg-panel-900 hover:border-panel-600'
                    }`}
                  >
                    <span className="line-clamp-2 text-sm font-semibold leading-tight">
                      {c.nombre}
                    </span>
                    <span className="flex w-full items-center gap-1">
                      {c.posicion && (
                        <span className={`chip px-1.5 py-0 text-[10px] ${POSICION_CLASE[c.posicion]}`}>
                          {POSICION_CORTA[c.posicion]}
                        </span>
                      )}
                      <span className="ml-auto text-xs tabular-nums text-zinc-500">{acciones}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Qué hizo */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {citadoActivo ? `Acción de ${citadoActivo.nombre}` : 'Elegí un jugador para cargar'}
            </h2>
            {(['con_pelota', 'sin_pelota'] as const).map((grupo) => (
              <div key={grupo} className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {ACCIONES.filter((a) => a.grupo === grupo).map((a) => {
                  const cantidad = citadoActivo ? (porCitado.get(citadoActivo.id)?.[a.tipo] ?? 0) : null;
                  return (
                    <button
                      key={a.tipo}
                      type="button"
                      disabled={!citadoActivo}
                      onClick={() => void registrar(a.tipo)}
                      className={`flex min-h-[58px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition active:scale-[0.97] disabled:opacity-35 ${SIGNO_CLASE[a.signo]}`}
                    >
                      <span>{a.label}</span>
                      {cantidad != null && (
                        <span className="text-lg font-black tabular-nums text-zinc-300">
                          {cantidad}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </section>

          {/* Deshacer junto a lo último, donde se ve el error */}
          <div className="card flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Último
              </p>
              <p className="truncate text-sm">
                {ultimo
                  ? `${ultimo.minuto != null ? `${ultimo.minuto}' · ` : ''}${
                      ACCION[ultimo.tipo].label
                    } · ${citados.find((c) => c.id === ultimo.citado_id)?.nombre ?? '—'}`
                  : 'Todavía no cargaste nada'}
              </p>
            </div>
            <button type="button" onClick={deshacer} disabled={!ultimo} className="btn-ghost">
              Deshacer
            </button>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Resumen del partido
            </h2>
            <TablaEstadisticas filas={filasPartido} vacio="Sin citados." />
          </section>
        </>
      )}
    </div>
  );
}

function Goles({
  etiqueta,
  valor,
  ayuda,
  onMenos,
  onMas,
}: {
  etiqueta: string;
  valor: number;
  ayuda?: string;
  onMenos?: () => void;
  onMas?: () => void;
}) {
  return (
    <div className="flex flex-col items-center" title={ayuda}>
      <span className="max-w-[110px] truncate text-xs text-zinc-400">{etiqueta}</span>
      <div className="flex items-center gap-1.5">
        {onMenos && (
          <button
            type="button"
            onClick={onMenos}
            aria-label={`Restar gol de ${etiqueta}`}
            className="h-7 w-7 rounded-md bg-panel-850 text-zinc-400 hover:text-zinc-100"
          >
            −
          </button>
        )}
        <span className="min-w-[1.5ch] text-center text-4xl font-black tabular-nums">{valor}</span>
        {onMas && (
          <button
            type="button"
            onClick={onMas}
            aria-label={`Sumar gol de ${etiqueta}`}
            className="h-7 w-7 rounded-md bg-panel-850 text-zinc-400 hover:text-zinc-100"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
