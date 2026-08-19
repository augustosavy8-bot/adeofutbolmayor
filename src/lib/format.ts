const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatPesos(monto: number) {
  return pesos.format(monto || 0);
}

const pesosExactos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Con centavos: en facturación el redondeo a pesos no sirve. */
export function formatPesosConCentavos(monto: number) {
  return pesosExactos.format(monto || 0);
}

/** "$ 30.000" -> 30000 */
export function parseMonto(valor: string) {
  const limpio = valor.replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}
