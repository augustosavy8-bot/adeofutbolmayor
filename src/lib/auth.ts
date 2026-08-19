/**
 * El panel se usa con usuario + contraseña, no con mail.
 * Supabase Auth necesita un email, así que el usuario se mapea a uno interno.
 */
const DOMINIO_INTERNO = '@adeofutbolmayor.com';

export function usuarioAEmail(usuario: string) {
  const limpio = usuario.trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}${DOMINIO_INTERNO}`;
}

export function emailAUsuario(email: string | null | undefined) {
  if (!email) return '';
  return email.endsWith(DOMINIO_INTERNO) ? email.slice(0, -DOMINIO_INTERNO.length) : email;
}
