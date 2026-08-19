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

export default nextConfig;
