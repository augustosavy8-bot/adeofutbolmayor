import Link from 'next/link';
import { EstadisticasClient } from '@/components/estadisticas/EstadisticasClient';
import { createClient } from '@/lib/supabase/server';
import { conReintentos, type Respuesta } from '@/lib/supabase/consultas';
import type { Citado, EventoPartido, Partido } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGINA = 1000;

/**
 * PostgREST corta en 1000 filas por consulta y una temporada tiene bastantes
 * más eventos que eso: se piden por páginas hasta que vuelve una incompleta.
 */
async function traerTodos<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>
): Promise<Respuesta<T>> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await conReintentos<T>(() =>
      consulta(desde, desde + PAGINA - 1)
    );
    if (error) return { data: null, error };
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return { data: filas, error: null };
  }
}

export default async function EstadisticasPage() {
  const supabase = createClient();

  const [partidos, citados, eventos] = await Promise.all([
    conReintentos<Partido>(() =>
      supabase
        .from('adeo_partidos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
    ),
    traerTodos<Citado>((desde, hasta) =>
      supabase.from('adeo_partido_jugadores').select('*').order('id').range(desde, hasta)
    ),
    traerTodos<Pick<EventoPartido, 'partido_id' | 'citado_id' | 'tipo'>>((desde, hasta) =>
      supabase
        .from('adeo_eventos')
        .select('partido_id, citado_id, tipo')
        .order('id')
        .range(desde, hasta)
    ),
  ]);

  const error = partidos.error ?? citados.error ?? eventos.error;
  if (error) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-adeo-rojo-claro">
          No se pudieron cargar las estadísticas
        </p>
        <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
        <Link href="/estadisticas" className="btn-primary mt-4">
          Reintentar
        </Link>
      </div>
    );
  }

  return (
    <EstadisticasClient
      partidos={partidos.data ?? []}
      citados={citados.data ?? []}
      eventos={eventos.data ?? []}
    />
  );
}
