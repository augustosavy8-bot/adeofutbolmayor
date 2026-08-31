import type { MetadataRoute } from 'next';

/**
 * La PWA se instala apuntando al buffet: la tablet del club abre directo en el
 * punto de venta, no en el panel.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buffet ADEO',
    short_name: 'Buffet',
    description: 'Punto de venta del buffet del Club ADEO. Funciona sin conexión.',
    start_url: '/buffet',
    scope: '/buffet',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#0b0b0d',
    theme_color: '#0b0b0d',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icono-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icono-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
