/**
 * Los tickets de ficha: los que se le dan al que compra para que los canjee.
 *
 * Todas las medidas salen del handoff de diseño y están expresadas en los
 * mismos px que el HTML de referencia, sobre un área de 272 px = 72 mm a
 * 96 dpi. Se guardan tal cual para que comparar contra el diseño sea directo;
 * la conversión al ancho real de cada impresora se hace al dibujar.
 */

/** Área imprimible del rollo de 80 mm, y ancho del diseño de referencia. */
export const AREA_MM = 72;
export const DISENO_PX = 272;

/** Papel libre antes del corte. */
export const COLA_MM = 8;

export type EstiloTicket = 'entrada' | 'buffet';

/** Lo que cambia entre un estilo y el otro: nada más que el tamaño del texto. */
export const ESTILOS: Record<
  EstiloTicket,
  { club: number; clubLs: number; tipo: number; tipoLs: number }
> = {
  entrada: { club: 32, clubLs: 0.1, tipo: 26, tipoLs: 0.04 },
  buffet: { club: 24, clubLs: 0.08, tipo: 30, tipoLs: 0.02 },
};

/** Lo que es igual en los seis. */
export const COMUN = {
  padArriba: 22,
  padLado: 18,
  padAbajo: 24,
  club: { peso: 700, lh: 1 },
  sub: { tam: 10, ls: 0.3, mt: 5 },
  regla: { alto: 3, my: 16 },
  tipo: { peso: 700, lh: 1.1 },
};

export const CLUB = 'ADEO';

export type TipoTicket = {
  id: string;
  /** Lo que se ve en el botón. */
  label: string;
  /** Encabezado. Se puede ocultar con `showSubtitle`. */
  subtitulo: string;
  /**
   * El tipo, ya partido en renglones. Va así y no como una sola cadena porque
   * el diseño parte las entradas en dos líneas a propósito ("Entrada" /
   * "general"), y dejarlo al ajuste automático cambiaría el corte.
   */
  lineas: string[];
  estilo: EstiloTicket;
  /** En qué puesto se ofrece. */
  puesto: 'entrada' | 'buffet';
};

/**
 * Los seis tipos. Agregar uno es agregar una entrada acá: entre un ticket y
 * otro no cambia nada más que el texto del tipo y el subtítulo.
 */
export const TIPOS: TipoTicket[] = [
  {
    id: 'entrada-general',
    label: 'Entrada general',
    subtitulo: 'FÚTBOL MAYOR',
    lineas: ['Entrada', 'general'],
    estilo: 'entrada',
    puesto: 'entrada',
  },
  {
    id: 'entrada-socio',
    label: 'Entrada socio',
    subtitulo: 'FÚTBOL MAYOR',
    lineas: ['Entrada', 'socio'],
    estilo: 'entrada',
    puesto: 'entrada',
  },
  {
    id: 'menor-jubilado',
    label: 'Menor y jubilado',
    subtitulo: 'FÚTBOL MAYOR',
    lineas: ['Menor y', 'jubilado'],
    estilo: 'entrada',
    puesto: 'entrada',
  },
  {
    id: 'choripan',
    label: 'Choripán',
    subtitulo: 'BUFFET',
    lineas: ['Choripán'],
    estilo: 'buffet',
    puesto: 'buffet',
  },
  {
    id: 'hamburguesa',
    label: 'Hamburguesa',
    subtitulo: 'BUFFET',
    lineas: ['Hamburguesa'],
    estilo: 'buffet',
    puesto: 'buffet',
  },
  {
    id: 'bebida',
    label: 'Bebida',
    subtitulo: 'BUFFET',
    lineas: ['Bebida'],
    estilo: 'buffet',
    puesto: 'buffet',
  },
];

export function tiposDe(puesto: 'entrada' | 'buffet') {
  return TIPOS.filter((t) => t.puesto === puesto);
}

export function tipoPorId(id: string) {
  return TIPOS.find((t) => t.id === id);
}
