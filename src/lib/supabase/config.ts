/**
 * Las variables se cargan a mano en el panel de Vercel y es facil que arrastren
 * un salto de linea o un espacio al pegarlas. En las cabeceras HTTP eso pasa
 * desapercibido (fetch recorta los blancos del borde del valor), pero la anon
 * key tambien viaja en la query del websocket de realtime, donde un `\n` se
 * codifica como %0A y rompe la conexion. Se limpian una sola vez acá.
 *
 * Son `NEXT_PUBLIC_*`, asi que Next las reemplaza por su valor en tiempo de
 * build y el trim queda resuelto en el bundle.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
).trim();
