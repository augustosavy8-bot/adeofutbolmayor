import Link from 'next/link';
import { CamisetasClient } from '@/components/camisetas/CamisetasClient';
import { createClient } from '@/lib/supabase/server';
import type { Grupo, GrupoConPersonas, Persona } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Supabase firma los tokens con claves asimetricas y PostgREST valida el `iat`
 * sin tolerancia. Cuando el reloj del nodo que valida va unos segundos atras
 * del que firma, la primera consulta despues del login rebota con un 401
 * PGRST303 ("JWT issued in future"). Es transitorio: alcanza con reintentar
 * hasta que el reloj pasa el `iat`.
 *
 * Se reintenta cada consulta por separado, porque el rebote pega en una sola
 * de las dos (cada una cae en un nodo distinto).
 */
const CODIGOS_TRANSITORIOS = ['PGRST301', 'PGRST303'];
const ESPERAS_MS = [700, 1400, 2100];

type ErrorConsulta = { code?: string; message?: string } | null;
type Respuesta<T> = { data: T[] | null; error: ErrorConsulta };

function esTransitorio(error: ErrorConsulta) {
  if (!error) return false;
  if (error.code && CODIGOS_TRANSITORIOS.includes(error.code)) return true;
  return /jwt/i.test(error.message ?? '');
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function conReintentos<T>(
  consulta: () => PromiseLike<Respuesta<T>>
): Promise<Respuesta<T>> {
  let respuesta = await consulta();

  for (const espera of ESPERAS_MS) {
    if (!esTransitorio(respuesta.error)) break;
    await dormir(espera);
    respuesta = await consulta();
  }

  return respuesta;
}

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
