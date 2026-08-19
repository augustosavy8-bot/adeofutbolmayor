import Link from 'next/link';
import { CamisetasClient } from '@/components/camisetas/CamisetasClient';
import { createClient } from '@/lib/supabase/server';
import { conReintentos } from '@/lib/supabase/consultas';
import type { Grupo, GrupoConPersonas, Persona } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CamisetasPage() {
  const supabase = createClient();

  const [
    { data: grupos, error: errorGrupos },
    { data: personas, error: errorPersonas },
  ] = await Promise.all([
    conReintentos<Grupo>(() =>
      supabase.from('adeo_grupos').select('*').order('orden')
    ),
    conReintentos<Persona>(() =>
      supabase
        .from('adeo_personas')
        .select('*')
        .order('created_at', { ascending: true })
    ),
  ]);

  if (errorGrupos || errorPersonas) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold text-adeo-rojo-claro">
          No se pudieron cargar los datos
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {errorGrupos?.message ?? errorPersonas?.message}
        </p>
        <Link href="/camisetas" className="btn-primary mt-4">
          Reintentar
        </Link>
      </div>
    );
  }

  const datos: GrupoConPersonas[] = (grupos ?? []).map((g) => ({
    ...g,
    personas: (personas ?? [])
      .filter((p) => p.grupo_id === g.id)
      .map((p) => ({ ...p, monto_sena: Number(p.monto_sena) })),
  }));

  return <CamisetasClient grupos={datos} />;
}
