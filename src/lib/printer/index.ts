'use client';

import { ImpresoraWebUSB } from './webusb';
import { ImpresoraWebSerial } from './serial';
import { ImpresoraSistema } from './sistema';
import { ImpresoraNoDisponible, type Printer } from './tipos';

export { ImpresoraNoDisponible };
export type { Printer, EstadoImpresora } from './tipos';
export { ANCHO_TICKET, enLinea, separador, centrar } from './escpos';

/**
 * Las tres formas de llegar al papel. Hacen falta las tres porque ninguna
 * anda en todos lados:
 *
 * - `usb` (WebUSB) es la más directa, pero en Windows y Mac el sistema toma la
 *   impresora con su propio driver y el navegador no puede reclamarla. Es la
 *   que sirve en la tablet Android.
 * - `serie` (Web Serial) habla con un puerto COM. Como el puerto lo publica el
 *   driver, convive con él en vez de pelearlo: anda en Windows con la
 *   impresora instalada.
 * - `sistema` le manda el ticket al driver como documento, que es lo que hace
 *   cualquier programa de escritorio. Anda siempre, a cambio del diálogo de
 *   impresión (ver --kiosk-printing en el README).
 */
export type Transporte = 'usb' | 'serie' | 'sistema';
export type PreferenciaImpresora = 'auto' | Transporte;

export const TRANSPORTES: {
  id: Transporte;
  label: string;
  detalle: string;
}[] = [
  {
    id: 'usb',
    label: 'USB directo',
    detalle: 'Tablet Android. En Windows suele dar "Access denied".',
  },
  {
    id: 'serie',
    label: 'Puerto COM',
    detalle: 'Windows con la impresora instalada o cable serie.',
  },
  {
    id: 'sistema',
    label: 'Driver de Windows',
    detalle: 'Anda siempre. Muestra el diálogo de impresión.',
  },
];

const CLAVE = 'adeo.impresora.transporte';

/** En automático se prueba primero lo que imprime sin diálogo. */
const ORDEN: Transporte[] = ['usb', 'serie'];

export function getPreferencia(): PreferenciaImpresora {
  if (typeof localStorage === 'undefined') return 'auto';
  const guardado = localStorage.getItem(CLAVE);
  return guardado === 'usb' || guardado === 'serie' || guardado === 'sistema'
    ? guardado
    : 'auto';
}

export function setPreferencia(p: PreferenciaImpresora) {
  if (typeof localStorage === 'undefined') return;
  if (p === 'auto') localStorage.removeItem(CLAVE);
  else localStorage.setItem(CLAVE, p);
  elegida = null;
}

/**
 * Una instancia por transporte para toda la app: la conexión se abre una vez y
 * se reusa entre pantallas.
 */
const instancias = new Map<Transporte, Printer>();

export function impresoraDe(t: Transporte): Printer {
  let p = instancias.get(t);
  if (!p) {
    p =
      t === 'usb'
        ? new ImpresoraWebUSB()
        : t === 'serie'
          ? new ImpresoraWebSerial()
          : new ImpresoraSistema();
    instancias.set(t, p);
  }
  return p;
}

/** Última que respondió, para no reintentar el orden completo en cada venta. */
let elegida: Printer | null = null;

async function resolver(): Promise<Printer | null> {
  if (elegida && elegida.estado === 'conectada') return elegida;

  const preferencia = getPreferencia();
  const candidatos: Transporte[] =
    preferencia === 'auto' ? ORDEN : [preferencia];

  for (const t of candidatos) {
    const p = impresoraDe(t);
    if (p.estado === 'sin-soporte') continue;
    if (p.estado === 'conectada' || (await p.reconnect())) {
      elegida = p;
      return p;
    }
  }

  elegida = null;
  return null;
}

/**
 * Reconecta sin preguntar nada al abrir la app: el permiso que se dio la
 * primera vez queda guardado, tanto en WebUSB como en Web Serial.
 */
export async function reconectar() {
  return (await resolver()) !== null;
}

/** Abre el diálogo de permiso del transporte elegido y lo deja listo. */
export async function conectar(t: Transporte) {
  const p = impresoraDe(t);
  await p.connect();
  elegida = p;
  return p;
}

export type ResultadoImpresion = { ok: true } | { ok: false; motivo: string };

/**
 * Las impresiones se encolan. En el mostrador se cobra una atrás de la otra y
 * dos envíos solapados sobre la misma impresora salen mezclados en el papel:
 * encolarlas garantiza que cada ticket se imprima entero.
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

async function imprimirAhora(lineas: string[]): Promise<ResultadoImpresion> {
  try {
    const p = await resolver();
    if (!p) {
      return {
        ok: false,
        motivo:
          'La impresora no está conectada. Elegí cómo conectarla en Configuración.',
      };
    }
    await p.printText(lineas);
    await p.cut();
    return { ok: true };
  } catch (e) {
    // Si falló en pleno uso, la próxima vuelve a buscar en vez de insistir con
    // una conexión que ya se cayó.
    elegida = null;
    const motivo =
      e instanceof Error ? e.message : 'Falló la impresión por un error desconocido.';
    console.error('Impresión fallida', e);
    return { ok: false, motivo };
  }
}
