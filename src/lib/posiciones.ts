export type Posicion = 'arquero' | 'defensor' | 'mediocampista' | 'delantero';

/** Orden de cancha: del arco para adelante. */
export const POSICIONES: readonly Posicion[] = [
  'arquero',
  'defensor',
  'mediocampista',
  'delantero',
];

export const POSICION_LABEL: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
};

export const POSICION_CORTA: Record<Posicion, string> = {
  arquero: 'ARQ',
  defensor: 'DEF',
  mediocampista: 'MED',
  delantero: 'DEL',
};

/** Un color por puesto, para ubicarlos de un vistazo en la grilla. */
export const POSICION_CLASE: Record<Posicion, string> = {
  arquero: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  defensor: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  mediocampista: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  delantero: 'bg-adeo-rojo/15 text-adeo-rojo-claro ring-1 ring-adeo-rojo/30',
};

export function esPosicion(valor: string): valor is Posicion {
  return (POSICIONES as readonly string[]).includes(valor);
}
