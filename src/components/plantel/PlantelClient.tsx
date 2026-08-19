'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Jugador } from '@/lib/types';
import {
  POSICIONES,
  POSICION_CORTA,
  POSICION_LABEL,
  type Posicion,
} from '@/lib/posiciones';
import { BUCKET_JUGADORES } from '@/lib/supabase/storage';
import { achicarImagen } from '@/lib/imagen';
import { ResumenPlantel } from './ResumenPlantel';
import { JugadorCard } from './JugadorCard';

const DEBOUNCE_MS = 600;

type Estado = 'listo' | 'guardando' | 'error';
type Filtro = Posicion | 'todos';

export function PlantelClient({
  jugadores: inicial,
}: {
  jugadores: Jugador[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [jugadores, setJugadores] = useState<Jugador[]>(inicial);
  const [estado, setEstado] = useState<Estado>('listo');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaPosicion, setNuevaPosicion] = useState<Posicion>('delantero');

  /** Cambios locales que todavía no viajaron a Supabase, por jugador. */
  const pendientes = useRef(new Map<string, Partial<Jugador>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const guardar = useCallback(
    async (id: string) => {
      const patch = pendientes.current.get(id);
      pendientes.current.delete(id);
      timers.current.delete(id);
      if (!patch) return;

      const { error } = await supabase
        .from('adeo_jugadores')
        .update(patch)
        .eq('id', id);

      if (error) {
        console.error('No se pudo guardar', error);
        setEstado('error');
        return;
      }
      setEstado(pendientes.current.size > 0 ? 'guardando' : 'listo');
    },
    [supabase]
  );

  const actualizarJugador = useCallback(
    (id: string, patch: Partial<Jugador>) => {
      // 1. optimista: la UI se mueve ya
      setJugadores((prev) =>
        prev.map((j) => (j.id === id ? { ...j, ...patch } : j))
      );

      // 2. se acumula y se manda con debounce
      pendientes.current.set(id, {
        ...(pendientes.current.get(id) ?? {}),
        ...patch,
      });
      setEstado('guardando');

      const anterior = timers.current.get(id);
      if (anterior) clearTimeout(anterior);
      timers.current.set(id, setTimeout(() => void guardar(id), DEBOUNCE_MS));
    },
    [guardar]
  );

  const eliminarJugador = useCallback(
    async (id: string) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
      pendientes.current.delete(id);

      const respaldo = jugadores;
      const borrado = jugadores.find((j) => j.id === id);
      setJugadores((prev) => prev.filter((j) => j.id !== id));

      const { error } = await supabase
        .from('adeo_jugadores')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('No se pudo eliminar', error);
        setEstado('error');
        setJugadores(respaldo);
        return;
      }

      // La foto no se borra sola al borrar la fila.
      if (borrado?.foto_path) {
        void supabase.storage.from(BUCKET_JUGADORES).remove([borrado.foto_path]);
      }
    },
    [jugadores, supabase]
  );

  const agregarJugador = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nombre = nuevoNombre.trim();
      if (!nombre) return;

      setEstado('guardando');
      const orden = jugadores.reduce((max, j) => Math.max(max, j.orden), 0) + 1;

      const { data, error } = await supabase
        .from('adeo_jugadores')
        .insert({ nombre, posicion: nuevaPosicion, orden })
        .select()
        .single();

      if (error || !data) {
        console.error('No se pudo agregar', error);
        setEstado('error');
        return;
      }

      const jugador = { ...(data as Jugador), sueldo: Number(data.sueldo) };
      setJugadores((prev) =>
        prev.some((j) => j.id === jugador.id) ? prev : [...prev, jugador]
      );
      setNuevoNombre('');
      setEstado('listo');
    },
    [jugadores, nuevaPosicion, nuevoNombre, supabase]
  );

  const subirFoto = useCallback(
    async (jugador: Jugador, file: File) => {
      const anterior = jugador.foto_path;

      // achicarImagen devuelve el archivo original si el navegador no puede
      // convertirlo, así que el tipo y la extensión salen del blob resultante.
      const foto = await achicarImagen(file);
      const tipo = foto.type || 'image/jpeg';
      const extension = tipo.split('/')[1] ?? 'jpg';

      // Nombre nuevo en cada subida: así el navegador no sirve la foto vieja
      // desde la caché y el reemplazo se ve al instante.
      const path = `${jugador.id}/${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from(BUCKET_JUGADORES)
        .upload(path, foto, {
          contentType: tipo,
          cacheControl: '31536000',
        });

      if (errorSubida) {
        console.error('No se pudo subir la foto', errorSubida);
        setEstado('error');
        return;
      }

      const { error } = await supabase
        .from('adeo_jugadores')
        .update({ foto_path: path })
        .eq('id', jugador.id);

      if (error) {
        console.error('No se pudo asociar la foto', error);
        setEstado('error');
        void supabase.storage.from(BUCKET_JUGADORES).remove([path]);
        return;
      }

      setJugadores((prev) =>
        prev.map((j) => (j.id === jugador.id ? { ...j, foto_path: path } : j))
      );
      if (anterior) {
        void supabase.storage.from(BUCKET_JUGADORES).remove([anterior]);
      }
    },
    [supabase]
  );

  // ------------------------------------------------------------- realtime
  useEffect(() => {
    const canal = supabase
      .channel('adeo_jugadores_panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adeo_jugadores' },
        (payload: RealtimePostgresChangesPayload<Jugador>) => {
          setJugadores((prev) => {
            if (payload.eventType === 'DELETE') {
              const viejo = payload.old as Jugador;
              return prev.filter((j) => j.id !== viejo.id);
            }

            const fila = payload.new as Jugador;
            // Lo que todavía no se guardó tiene prioridad sobre el eco remoto.
            const local = pendientes.current.get(fila.id) ?? {};
            const jugador = { ...fila, sueldo: Number(fila.sueldo), ...local };

            return prev.some((j) => j.id === jugador.id)
              ? prev.map((j) => (j.id === jugador.id ? jugador : j))
              : [...prev, jugador];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase]);

  // Al desmontar, se vacía lo que quedó en el debounce.
  useEffect(() => {
    const timersActuales = timers.current;
    const pendientesActuales = pendientes.current;
    return () => {
      timersActuales.forEach((t) => clearTimeout(t));
      pendientesActuales.forEach((patch, id) => {
        void supabase.from('adeo_jugadores').update(patch).eq('id', id);
      });
    };
  }, [supabase]);

  const visibles =
    filtro === 'todos'
      ? jugadores
      : jugadores.filter((j) => j.posicion === filtro);

  const filtros: { valor: Filtro; label: string; cantidad: number }[] = [
    { valor: 'todos', label: 'Todos', cantidad: jugadores.length },
    ...POSICIONES.map((p) => ({
      valor: p as Filtro,
      label: POSICION_CORTA[p],
      cantidad: jugadores.filter((j) => j.posicion === p).length,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Plantel</h1>
          <p className="text-sm text-zinc-400">
            Jugadores por puesto, sueldo y estado de pago
          </p>
        </div>
        <span
          className={`chip ml-auto shrink-0 ${
            estado === 'error'
              ? 'bg-adeo-rojo/15 text-adeo-rojo-claro'
              : estado === 'guardando'
                ? 'bg-panel-800 text-zinc-400'
                : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {estado === 'error'
            ? 'Error al guardar'
            : estado === 'guardando'
              ? 'Guardando...'
              : 'Guardado'}
        </span>
      </div>

      <ResumenPlantel jugadores={jugadores} />

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className={`chip gap-1.5 transition ${
              filtro === f.valor
                ? 'bg-adeo-rojo text-white'
                : 'bg-panel-850 text-zinc-400 ring-1 ring-panel-700 hover:text-zinc-100'
            }`}
          >
            {f.label}
            <span className="tabular-nums opacity-70">{f.cantidad}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="card p-6 text-center text-sm text-zinc-500">
          No hay jugadores en este puesto.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {visibles.map((jugador) => (
            <JugadorCard
              key={jugador.id}
              jugador={jugador}
              onCambio={(patch) => actualizarJugador(jugador.id, patch)}
              onEliminar={() => void eliminarJugador(jugador.id)}
              onSubirFoto={(file) => subirFoto(jugador, file)}
            />
          ))}
        </div>
      )}

      <form onSubmit={agregarJugador} className="card flex flex-wrap gap-2 p-3">
        <input
          aria-label="Nombre del jugador"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Agregar jugador…"
          className="input-base min-w-0 flex-1"
        />
        <select
          aria-label="Posición del jugador nuevo"
          value={nuevaPosicion}
          onChange={(e) => setNuevaPosicion(e.target.value as Posicion)}
          className="input-base w-auto appearance-none"
        >
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {POSICION_LABEL[p]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!nuevoNombre.trim()}
          className="btn-primary"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
