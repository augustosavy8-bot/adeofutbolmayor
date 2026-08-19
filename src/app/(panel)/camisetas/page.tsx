import Link from 'next/link';
import { CamisetasClient } from '@/components/camisetas/CamisetasClient';
import { createClient } from '@/lib/supabase/server';
import type { Grupo, GrupoConPersonas, Persona } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * El proyecto firma los tokens con claves asimétricas y valida el `iat` sin
 * tolerancia: un token recién emitido queda un segundo "en el futuro" para
 * quien lo valida y la primera consulta después del login rebota. Se reintenta
 * una vez, para entonces el reloj ya pasó el `iat`.
 */
const ERRORES_TRANSITORIOS = ['issued at future', 'JWT', 'jwt'];

async function traerDatos() {
  const supabase = createClient();
  return Promise.all([
    supabase.from('adeo_grupos').select('*').order('orden'),
    supabase
      .from('adeo_personas')
      .select('*')
      .order('created_at', { ascending: true }),
  ]);
}

export default async function CamisetasPage() {
  let [{ data: grupos, error: errorGrupos }, { data: personas, error: errorPersonas }] =
    await traerDatos();

  const mensaje = errorGrupos?.message ?? errorPersonas?.message;
  const esTransitorio =
    !!mensaje && ERRORES_TRANSITORIOS.some((t) => mensaje.includes(t));

  if (esTransitorio) {
    await new Promise((r) => setTimeout(r, 1500));
    [{ data: grupos, error: errorGrupos }, { data: personas, error: errorPersonas }] =
      await traerDatos();
  }

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

  const datos: GrupoConPersonas[] = ((grupos ?? []) as Grupo[]).map((g) => ({
    ...g,
    personas: ((personas ?? []) as Persona[])
      .filter((p) => p.grupo_id === g.id)
      .map((p) => ({ ...p, monto_sena: Number(p.monto_sena) })),
  }));

  return <CamisetasClient grupos={datos} />;
}
