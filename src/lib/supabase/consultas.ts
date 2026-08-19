/**
 * Supabase firma los tokens con claves asimetricas y PostgREST valida el `iat`
 * sin tolerancia. Cuando el reloj del nodo que valida va unos segundos atras
 * del que firma, la primera consulta despues del login rebota con un 401
 * PGRST303 ("JWT issued in future"). Es transitorio: alcanza con reintentar
 * hasta que el reloj pasa el `iat`.
 *
 * Conviene envolver cada consulta por separado, porque el rebote pega en una
 * sola de las que salen en paralelo (cada una cae en un nodo distinto).
 */
const CODIGOS_TRANSITORIOS = ['PGRST301', 'PGRST303'];
const ESPERAS_MS = [700, 1400, 2100];

export type ErrorConsulta = { code?: string; message?: string } | null;
export type Respuesta<T> = { data: T[] | null; error: ErrorConsulta };

function esTransitorio(error: ErrorConsulta) {
  if (!error) return false;
  if (error.code && CODIGOS_TRANSITORIOS.includes(error.code)) return true;
  return /jwt/i.test(error.message ?? '');
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function conReintentos<T>(
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
