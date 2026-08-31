import withSerwistInit from '@serwist/next';

/**
 * Las fotos del plantel viven en el Storage de Supabase, así que hay que
 * habilitar ese host para next/image. Se saca de la misma env que usa el
 * cliente para no repetir el dominio.
 */
const hostSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: hostSupabase
      ? [
          {
            protocol: 'https',
            hostname: hostSupabase,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

/**
 * PWA del buffet. Se precachean las cinco rutas de /buffet además de los
 * assets del build: la tablet tiene que abrir el punto de venta sin red
 * después de la primera carga.
 *
 * `revision: null` porque son URLs de rutas, no archivos con hash: la versión
 * la marca el propio deploy, que regenera el service worker.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // En desarrollo estorba: dejaría la app vieja cacheada entre recargas.
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [
    { url: '/buffet', revision: null },
    { url: '/buffet/login', revision: null },
    { url: '/buffet/ventas', revision: null },
    { url: '/buffet/cierre', revision: null },
    { url: '/buffet/config', revision: null },
    { url: '/manifest.webmanifest', revision: null },
    { url: '/icons/icono-192.png', revision: null },
    { url: '/icons/icono-512.png', revision: null },
  ],
});

export default withSerwist(nextConfig);
