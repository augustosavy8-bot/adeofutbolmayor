/** Bucket público donde viven las fotos del plantel. */
export const BUCKET_JUGADORES = 'jugadores';

/**
 * URL pública de una foto. El bucket es público, así que no hace falta firmar
 * nada y la URL se puede armar sin cliente de Supabase (sirve en server y en
 * el navegador).
 */
export function urlFoto(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_JUGADORES}/${path}`;
}
