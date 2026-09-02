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

export type ResultadoImpresion = { ok: true } | { ok: false; motivo: string };

/**
 * Las impresiones se encolan. En el mostrador se cobra una atrás de la otra y
 * dos `transferOut` solapados sobre el mismo endpoint USB salen mezclados en
 * el papel: encolarlas garantiza que cada ticket se imprima entero.
 */
let cola: Promise<unknown> = Promise.resolve();

/**
 * Imprime sin poder romper la operación: si la impresora no está, devuelve el
 * motivo y el que llama decide qué avisar. Nunca lanza.
 *
 * No hace falta esperarla para seguir vendiendo: el que llama puede soltar la
 * promesa y mostrar el aviso cuando resuelva.
 */
export function imprimirSeguro(lineas: string[]): Promise<ResultadoImpresion> {
  const tarea = cola.then(() => imprimirAhora(lineas));
  // La cola sobrevive a un ticket fallido: el siguiente igual se intenta.
  cola = tarea.catch(() => undefined);
  return tarea;
}

async function imprimirAhora(
  lineas: string[]
): Promise<ResultadoImpresion> {
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
