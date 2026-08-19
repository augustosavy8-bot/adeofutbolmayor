/** Talles numéricos de camiseta: 38 a 60, de a pares. */
export const TALLES_NUMERICOS = [
  '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60',
] as const;

/** Talles de letra para pantalón / chomba (Comisión). */
export const TALLES_LETRA = [
  'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL',
] as const;

const ORDEN_LETRA = new Map<string, number>(
  TALLES_LETRA.map((t, i) => [t, i])
);

/** Ordena un conteo de talles: numéricos por número, letras por progresión S→6XL. */
export function ordenarTalles(talles: string[]): string[] {
  return [...talles].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return (ORDEN_LETRA.get(a) ?? 99) - (ORDEN_LETRA.get(b) ?? 99);
  });
}

/** Cuenta ocurrencias de talle, ignorando vacíos. */
export function contarTalles(valores: (string | null | undefined)[]) {
  const conteo = new Map<string, number>();
  for (const v of valores) {
    const talle = (v ?? '').trim();
    if (!talle) continue;
    conteo.set(talle, (conteo.get(talle) ?? 0) + 1);
  }
  return ordenarTalles([...conteo.keys()]).map((talle) => ({
    talle,
    cantidad: conteo.get(talle)!,
  }));
}
