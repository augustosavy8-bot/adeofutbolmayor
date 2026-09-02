import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos assets estáticos, imágenes y los puntos de venta.
     *
     * `buffet` y `entrada` quedan afuera a propósito: son puntos de venta
     * offline, no usan la sesión de Supabase, y hacer un getUser() contra la
     * red en cada navegación sería latencia al pedo. `sw.js` y los manifests
     * van afuera porque son los archivos de las PWA: si el middleware los
     * redirigiera al login, no instalarían ni abrirían sin conexión.
     */
    '/((?!_next/static|_next/image|favicon.ico|adeo-logo.png|buffet|entrada|sw.js|manifest-buffet.webmanifest|manifest-entrada.webmanifest|icons/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
