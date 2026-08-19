const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** '2026-08-01' -> 'Agosto 2026' */
export function nombrePeriodo(periodo: string) {
  return `${MESES[mesDe(periodo) - 1] ?? ''} ${anioDe(periodo)}`;
}

/** '2026-08-01' -> 'Agosto' */
export function nombreMes(periodo: string) {
  return MESES[mesDe(periodo) - 1] ?? '';
}

export function anioDe(periodo: string) {
  return Number(periodo.slice(0, 4));
}

export function mesDe(periodo: string) {
  return Number(periodo.slice(5, 7));
}

/** (2026, 8) -> '2026-08-01' */
export function periodoDeMes(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

/** Date -> '2026-08-01', el primer día de ese mes. */
export function periodoDe(fecha: Date) {
  return periodoDeMes(fecha.getFullYear(), fecha.getMonth() + 1);
}

/** Los doce meses de un año, como períodos. */
export function mesesDelAnio(anio: number) {
  return MESES_CORTOS.map((_, i) => periodoDeMes(anio, i + 1));
}
