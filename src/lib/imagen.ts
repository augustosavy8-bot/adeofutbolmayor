/**
 * `canvas.toBlob()` no falla cuando el navegador no sabe *generar* el formato
 * pedido: devuelve PNG en silencio. Y PNG, al ser sin perdida, para una foto
 * pesa como diez veces un webp o un JPEG equivalente. Por eso se verifica el
 * tipo del blob que vuelve y se prueba el siguiente formato, en vez de confiar
 * en el pedido.
 */
const FORMATOS = ['image/webp', 'image/jpeg'] as const;
const CALIDAD = 0.85;

function aBlob(canvas: HTMLCanvasElement, tipo: string) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, tipo, CALIDAD)
  );
}

/**
 * Achica la foto antes de subirla: las que salen del celular pesan varios MB
 * y en la tarjeta se ven a 220px (660px en una pantalla 3x). `imageOrientation`
 * respeta el EXIF, si no las fotos verticales del celular suben acostadas.
 */
export async function achicarImagen(file: File, ladoMax = 800): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  let ultimo: Blob | null = null;

  for (const formato of FORMATOS) {
    const blob = await aBlob(canvas, formato);
    if (blob?.type === formato) return blob;
    ultimo = blob ?? ultimo;
  }

  // Ni webp ni JPEG: queda el PNG que haya devuelto el navegador, que igual
  // suele pesar menos que la foto original del celular.
  return ultimo && ultimo.size < file.size ? ultimo : file;
}
