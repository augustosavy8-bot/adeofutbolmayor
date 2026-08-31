'use client';

import { ImpresoraWebUSB } from './webusb';
import { ImpresoraNoDisponible, type Printer } from './tipos';

export { ImpresoraNoDisponible };
export type { Printer, EstadoImpresora } from './tipos';
export { ANCHO_TICKET, enLinea, separador, centrar } from './escpos';

/**
 * Una sola instancia para toda la app: la conexión USB se abre una vez y se
 * reusa entre pantallas. Cuando haya driver Bluetooth, se elige acá.
 */
let impresora: Printer | null = null;

export function getPrinter(): Printer {
  if (!impresora) impresora = new ImpresoraWebUSB();
  return impresora;
}

/**
 * Imprime sin poder romper la operación: si la impresora no está, devuelve el
 * motivo y el que llama decide qué avisar. Nunca lanza.
 */
export async function imprimirSeguro(
  lineas: string[]
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    const p = getPrinter();
    if (p.estado !== 'conectada' && !(await p.reconnect())) {
      return { ok: false, motivo: 'La impresora no está conectada.' };
    }
    await p.printText(lineas);
    await p.cut();
    return { ok: true };
  } catch (e) {
    const motivo =
      e instanceof Error ? e.message : 'Falló la impresión por un error desconocido.';
    console.error('Impresión fallida', e);
    return { ok: false, motivo };
  }
}
