import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos assets estáticos, imágenes y el buffet.
     *
     * `buffet` queda afuera a propósito: es un punto de venta offline, no usa
     * la sesión de Supabase, y hacer un getUser() contra la red en cada
     * navegación sería latencia al pedo. `sw.js` y `manifest.webmanifest` van
     * afuera porque son los archivos de la PWA: si el middleware los
     * redirigiera al login, la app no instalaría ni abriría sin conexión.
     */
    '/((?!_next/static|_next/image|favicon.ico|adeo-logo.png|buffet|sw.js|manifest.webmanifest|icons/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
