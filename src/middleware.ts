import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos assets estáticos e imágenes.
     */
    '/((?!_next/static|_next/image|favicon.ico|adeo-logo.png|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
