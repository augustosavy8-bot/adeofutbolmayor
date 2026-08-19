'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { GrupoConPersonas, Persona } from '@/lib/types';
import { ResumenCards } from './ResumenCards';
import { TallesPedido } from './TallesPedido';
import { GrupoTabla } from './GrupoTabla';

const DEBOUNCE_MS = 600;

type Estado = 'listo' | 'guardando' | 'error';

export function CamisetasClient({
  grupos: gruposIniciales,
}: {
  grupos: GrupoConPersonas[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [grupos, setGrupos] = useState<GrupoConPersonas[]>(gruposIniciales);
  const [estado, setEstado] = useState<Estado>('listo');

  /** Cambios locales que todavía no viajaron a Supabase, por persona. */
  const pendientes = useRef(new Map<string, Partial<Persona>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const guardar = useCallback(
    async (id: string) => {
      const patch = pendientes.current.get(id);
      pendientes.current.delete(id);
      timers.current.delete(id);
      if (!patch) return;

      const { error } = await supabase
        .from('adeo_personas')
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

  const actualizarPersona = useCallback(
    (id: string, patch: Partial<Persona>) => {
      // 1. optimista: la UI se mueve ya
      setGrupos((prev) =>
        prev.map((g) => ({
          ...g,
          personas: g.personas.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        }))
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

  const eliminarPersona = useCallback(
    async (id: string) => {
      const timer = timers.current.get(id);
      if (timer) clearTimeout(timer);
      timers.current.delete(id);
      pendientes.current.delete(id);

      const respaldo = grupos;
      setGrupos((prev) =>
        prev.map((g) => ({
          ...g,
          personas: g.personas.filter((p) => p.id !== id),
        }))
      );

      const { error } = await supabase
        .from('adeo_personas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('No se pudo eliminar', error);
        setEstado('error');
        setGrupos(respaldo);
      }
    },
    [grupos, supabase]
  );

  const agregarPersona = useCallback(
    async (grupoId: string, nombre: string) => {
      setEstado('guardando');
      const { data, error } = await supabase
        .from('adeo_personas')
        .insert({ grupo_id: grupoId, nombre })
        .select()
        .single();

      if (error || !data) {
        console.error('No se pudo agregar', error);
        setEstado('error');
        return;
      }

      const persona = data as Persona;
      setGrupos((prev) =>
        prev.map((g) =>
          g.id === grupoId && !g.personas.some((p) => p.id === persona.id)
            ? { ...g, personas: [...g.personas, persona] }
            : g
        )
      );
      setEstado('listo');
    },
    [supabase]
  );

  // ------------------------------------------------------------- realtime
  useEffect(() => {
    const canal = supabase
      .channel('adeo_personas_panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adeo_personas' },
        (payload: RealtimePostgresChangesPayload<Persona>) => {
          setGrupos((prev) => {
            if (payload.eventType === 'DELETE') {
              const viejo = payload.old as Persona;
              return prev.map((g) => ({
                ...g,
                personas: g.personas.filter((p) => p.id !== viejo.id),
              }));
            }

            const fila = payload.new as Persona;
            // Lo que todavía no se guardó tiene prioridad sobre el eco remoto.
            const local = pendientes.current.get(fila.id) ?? {};
            const persona = { ...fila, monto_sena: Number(fila.monto_sena), ...local };

            return prev.map((g) => {
              const tiene = g.personas.some((p) => p.id === persona.id);

              if (g.id === persona.grupo_id) {
                return tiene
                  ? {
                      ...g,
                      personas: g.personas.map((p) =>
                        p.id === persona.id ? persona : p
                      ),
                    }
                  : { ...g, personas: [...g.personas, persona] };
              }

              return tiene
                ? {
                    ...g,
                    personas: g.personas.filter((p) => p.id !== persona.id),
                  }
                : g;
            });
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
        void supabase.from('adeo_personas').update(patch).eq('id', id);
      });
    };
  }, [supabase]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Conjuntos</h1>
          <p className="text-sm text-zinc-400">
            Talles y señas del fútbol mayor
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

      <ResumenCards grupos={grupos} />
      <TallesPedido grupos={grupos} />

      <div className="space-y-4">
        {grupos.map((grupo) => (
          <GrupoTabla
            key={grupo.id}
            grupo={grupo}
            onCambio={actualizarPersona}
            onEliminar={eliminarPersona}
            onAgregar={agregarPersona}
          />
        ))}
      </div>
    </div>
  );
}
