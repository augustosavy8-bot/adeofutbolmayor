import Link from 'next/link';
import { PlantelClient } from '@/components/plantel/PlantelClient';
import { createClient } from '@/lib/supabase/server';
import { conReintentos } from '@/lib/supabase/consultas';
import type { Jugador } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PlantelPage() {
  const supabase = createClient();

  const { data: jugadores, error } = await conReintentos<Jugador>(() =>
    supabase
      .from('adeo_jugadores')
      .select('*')
      .order('orden')
      .order('created_at', { ascending: true })
  );

  if (error) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-adeo-rojo-claro">
          No se pudo cargar el plantel
        </p>
        <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
        <Link href="/plantel" className="btn-primary mt-4">
          Reintentar
        </Link>
      </div>
    );
  }

  const datos = (jugadores ?? []).map((j) => ({
    ...j,
    sueldo: Number(j.sueldo),
  }));

  return <PlantelClient jugadores={datos} />;
}
