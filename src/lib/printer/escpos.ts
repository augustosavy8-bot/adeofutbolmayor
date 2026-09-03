/**
 * Columnas por defecto: las de una XP-80 (80 mm) en fuente A. La portátil de
 * 58 mm tiene 32, así que el ancho real sale del perfil activo y esto es sólo
 * el valor de arranque.
 */
export const ANCHO_TICKET = 48;

const ESC = 0x1b;
const GS = 0x1d;

export const ALINEACION = { izquierda: 0, centro: 1, derecha: 2 } as const;
export type Alineacion = (typeof ALINEACION)[keyof typeof ALINEACION];

export const CMD = {
  /** ESC @ — reinicia la impresora y limpia el formato anterior. */
  init: () => Uint8Array.from([ESC, 0x40]),
  /** ESC a n */
  alinear: (a: Alineacion) => Uint8Array.from([ESC, 0x61, a]),
  /** ESC E n */
  negrita: (on: boolean) => Uint8Array.from([ESC, 0x45, on ? 1 : 0]),
  /** GS ! n — 0x11 duplica alto y ancho. */
  doble: (on: boolean) => Uint8Array.from([GS, 0x21, on ? 0x11 : 0x00]),
  /** ESC d n — avanza n líneas. */
  avanzar: (lineas: number) => Uint8Array.from([ESC, 0x64, lineas]),
  /** GS V 66 n — corte parcial después de avanzar n puntos. */
  cortar: () => Uint8Array.from([GS, 0x56, 0x42, 0x00]),
};

/**
 * Las ESC/POS imprimen una tabla de códigos de 8 bits, no UTF-8. En vez de
 * pelear con la página de códigos de cada modelo, se sacan los acentos: es
 * preferible "CHORIPAN" a un ticket con símbolos raros.
 */
export function aAscii(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e\n]/g, ' ');
}

export function codificar(texto: string) {
  const limpio = aAscii(texto);
  const bytes = new Uint8Array(limpio.length);
  for (let i = 0; i < limpio.length; i++) bytes[i] = limpio.charCodeAt(i);
  return bytes;
}

export function unir(...partes: Uint8Array[]) {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const salida = new Uint8Array(total);
  let offset = 0;
  for (const p of partes) {
    salida.set(p, offset);
    offset += p.length;
  }
  return salida;
}

/** "Coca 500" + "$1.500" -> "Coca 500                            $1.500" */
export function enLinea(izq: string, der: string, ancho = ANCHO_TICKET) {
  const i = aAscii(izq);
  const d = aAscii(der);
  const relleno = Math.max(1, ancho - i.length - d.length);
  return i.slice(0, ancho - d.length - 1) + ' '.repeat(relleno) + d;
}

export function separador(caracter = '-', ancho = ANCHO_TICKET) {
  return caracter.repeat(ancho);
}

export function centrar(texto: string, ancho = ANCHO_TICKET) {
  const t = aAscii(texto).slice(0, ancho);
  const izq = Math.max(0, Math.floor((ancho - t.length) / 2));
  return ' '.repeat(izq) + t;
}

/** Sube si sale muy oscuro, baja si sale lavado. */
export const UMBRAL_TINTA = 160;

/**
 * GS v 0 — imagen en modo raster. Cada bit es un punto; el ancho se redondea
 * al byte, y un bit en 1 es tinta, por eso se invierte el brillo.
 *
 * El brillo va con los pesos de luma en vez del promedio de los tres canales:
 * el ojo ve el verde mucho más que el azul, y con el promedio un texto azul
 * salía casi blanco.
 */
export function rasterDesdeCanvas(canvas: HTMLCanvasElement, umbral = UMBRAL_TINTA) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El canvas no tiene contexto 2d');

  const { width, height } = canvas;
  const bytesPorFila = Math.ceil(width / 8);
  const datos = ctx.getImageData(0, 0, width, height).data;
  const bits = new Uint8Array(bytesPorFila * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Lo transparente es papel, no tinta.
      const luma =
        datos[i + 3] === 0
          ? 255
          : 0.299 * datos[i] + 0.587 * datos[i + 1] + 0.114 * datos[i + 2];
      if (luma < umbral) bits[y * bytesPorFila + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  const encabezado = Uint8Array.from([
    GS, 0x76, 0x30, 0x00,
    bytesPorFila & 0xff, (bytesPorFila >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
  ]);

  return unir(encabezado, bits);
}
