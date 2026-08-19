const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** '2026-08-01' -> 'Agosto 2026' */
export function nombrePeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-');
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

/** Date -> '2026-08-01', el primer día de ese mes. */
export function periodoDe(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-01`;
}

/** Corre un período N meses: ('2026-08-01', 1) -> '2026-09-01' */
export function correrPeriodo(periodo: string, meses: number) {
  const [anio, mes] = periodo.split('-').map(Number);
  return periodoDe(new Date(anio, mes - 1 + meses, 1));
}
