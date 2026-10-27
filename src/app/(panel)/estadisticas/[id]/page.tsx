import Link from 'next/link';
import { PartidoClient } from '@/components/estadisticas/PartidoClient';
import { createClient } from '@/lib/supabase/server';
import { conReintentos } from '@/lib/supabase/consultas';
import type { Citado, EventoPartido, Jugador, Partido } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PartidoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [partido, citados, eventos, plantel] = await Promise.all([
    conReintentos<Partido>(() => supabase.from('adeo_partidos').select('*').eq('id', params.id)),
    conReintentos<Citado>(() =>
      supabase
        .from('adeo_partido_jugadores')
        .select('*')
        .eq('partido_id', params.id)
        .order('orden')
    ),
    // Un partido no llega a 1000 toques por jugador citado: alcanza con una
    // consulta, pero se sube el tope por las dudas.
    conReintentos<EventoPartido>(() =>
      supabase
        .from('adeo_eventos')
        .select('*')
        .eq('partido_id', params.id)
        .order('created_at')
        .range(0, 4999)
    ),
    conReintentos<Jugador>(() =>
      supabase.from('adeo_jugadores').select('*').order('orden').order('created_at')
    ),
  ]);

  const error = partido.error ?? citados.error ?? eventos.error ?? plantel.error;
  const encontrado = partido.data?.[0];

  if (error || !encontrado) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-adeo-rojo-claro">
          {error ? 'No se pudo cargar el partido' : 'No encontramos el partido'}
        </p>
        {error && <p className="mt-2 text-sm text-zinc-400">{error.message}</p>}
        <Link href="/estadisticas" className="btn-primary mt-4">
          Volver a estadísticas
        </Link>
      </div>
    );
  }

  return (
    <PartidoClient
      partido={encontrado}
      citados={citados.data ?? []}
      eventos={eventos.data ?? []}
      plantel={plantel.data ?? []}
    />
  );
}
