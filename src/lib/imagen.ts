/**
 * Achica la foto antes de subirla: las que salen del celular pesan varios MB
 * y en la tarjeta se ven a 200px. `imageOrientation` respeta el EXIF, si no
 * las fotos verticales del celular suben acostadas.
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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85)
  );

  return blob ?? file;
}
