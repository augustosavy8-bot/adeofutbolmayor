'use client';

import { ImpresoraBluetooth } from './bluetooth';
import { ImpresoraRed } from './red';
import { ImpresoraSistema } from './sistema';
import { ImpresoraWebSerial } from './serial';
import { ImpresoraWebUSB } from './webusb';
import { getPerfil, ordenAuto, type PerfilImpresora } from './perfiles';
import { ImpresoraNoDisponible, type Printer, type Transporte } from './tipos';
import type { TipoTicket } from '@/lib/tickets/diseno';
import type { OpcionesFicha } from '@/lib/tickets/render';

export { ImpresoraNoDisponible };
export type { Printer, EstadoImpresora, Transporte } from './tipos';
export { ANCHO_TICKET, enLinea, separador, centrar } from './escpos';
export {
  PERFILES,
  columnasActivas,
  getPerfil,
  listarPerfiles,
  setPerfil,
  type PerfilId,
  type PerfilImpresora,
} from './perfiles';
export { getPuente, setPuente } from './red';
export { getAltoJusto, setAltoJusto } from './sistema';
export { ordenAuto } from './perfiles';

export const TRANSPORTES: Record<
  Transporte,
  { label: string; detalle: string; necesitaConectar: boolean }
> = {
  usb: {
    label: 'USB directo',
    detalle: 'Tablet Android. En Windows suele dar "Access denied".',
    necesitaConectar: true,
  },
  serie: {
    label: 'Puerto COM',
    detalle: 'Windows con la impresora instalada o cable serie.',
    necesitaConectar: true,
  },
  bluetooth: {
    label: 'Bluetooth',
    detalle: 'La portátil de 58 mm. Sólo modelos BLE.',
    necesitaConectar: true,
  },
  red: {
    label: 'Red (puerto 9100)',
    detalle: 'La XP-80 con cable de red, por el puente local.',
    necesitaConectar: true,
  },
  sistema: {
    label: 'Driver del sistema',
    detalle: 'Anda siempre. Muestra el diálogo de impresión.',
    necesitaConectar: false,
  },
};

export type PreferenciaImpresora = 'auto' | Transporte;

const CLAVE = 'adeo.impresora.transporte';

export function getPreferencia(): PreferenciaImpresora {
  if (typeof localStorage === 'undefined') return 'auto';
  const guardado = localStorage.getItem(CLAVE);
  return guardado && guardado in TRANSPORTES
    ? (guardado as Transporte)
    : 'auto';
}

export function setPreferencia(p: PreferenciaImpresora) {
  if (typeof localStorage === 'undefined') return;
  if (p === 'auto') localStorage.removeItem(CLAVE);
  else localStorage.setItem(CLAVE, p);
  elegida = null;
  viaElegida = null;
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
          : t === 'bluetooth'
            ? new ImpresoraBluetooth()
            : t === 'red'
              ? new ImpresoraRed()
              : new ImpresoraSistema();
    instancias.set(t, p);
  }
  return p;
}

/** Última que respondió, para no reintentar el orden completo en cada venta. */
let elegida: Printer | null = null;

/** Por qué vía está imprimiendo, para poder decírselo al que configura. */
let viaElegida: Transporte | null = null;

export function getViaActiva() {
  return viaElegida;
}

/**
 * En automático se prueban las conexiones del perfil en el orden que conviene
 * a esta plataforma (ver `ordenAuto`), terminando siempre en el driver del
 * sistema. Antes el driver quedaba afuera y el resultado era que en una
 * computadora no imprimía nada: las otras vías necesitan emparejar algo, y si
 * no se había emparejado no quedaba ninguna.
 */
async function resolver(perfil: PerfilImpresora): Promise<Printer | null> {
  if (elegida && elegida.estado === 'conectada') return elegida;

  const preferencia = getPreferencia();
  const candidatos = preferencia === 'auto' ? ordenAuto(perfil) : [preferencia];

  for (const t of candidatos) {
    const p = impresoraDe(t);
    if (p.estado === 'sin-soporte') continue;
    if (p.estado === 'conectada' || (await p.reconnect())) {
      elegida = p;
      viaElegida = t;
      return p;
    }
  }

  elegida = null;
  viaElegida = null;
  return null;
}

/**
 * Reconecta sin preguntar nada al abrir la app: el permiso que se dio la
 * primera vez queda guardado en WebUSB, Web Serial y Bluetooth.
 */
export async function reconectar() {
  return (await resolver(getPerfil())) !== null;
}

/** Abre el diálogo de permiso del transporte elegido y lo deja listo. */
export async function conectar(t: Transporte) {
  const p = impresoraDe(t);
  await p.connect();
  elegida = p;
  viaElegida = t;
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
  return encolar((p, perfil) => p.imprimir(lineas, perfil));
}

/**
 * Una ficha de diseño, tantas veces como se pidan. Van encoladas igual que
 * todo lo demás: dos envíos solapados sobre la misma impresora salen mezclados
 * en el papel.
 */
export function imprimirFichas(
  tipo: TipoTicket,
  opciones: OpcionesFicha,
  cantidad = 1
): Promise<ResultadoImpresion> {
  return encolar(async (p, perfil) => {
    for (let i = 0; i < cantidad; i++) {
      await p.imprimirFicha(tipo, opciones, perfil);
    }
  });
}

function encolar(
  hacer: (p: Printer, perfil: PerfilImpresora) => Promise<void>
): Promise<ResultadoImpresion> {
  const tarea = cola.then(() => imprimirAhora(hacer));
  // La cola sobrevive a un ticket fallido: el siguiente igual se intenta.
  cola = tarea.catch(() => undefined);
  return tarea;
}

async function imprimirAhora(
  hacer: (p: Printer, perfil: PerfilImpresora) => Promise<void>
): Promise<ResultadoImpresion> {
  const perfil = getPerfil();
  try {
    const p = await resolver(perfil);
    if (!p) {
      return {
        ok: false,
        motivo:
          'La impresora no está conectada. Elegí cómo conectarla en Configuración.',
      };
    }
    await hacer(p, perfil);
    return { ok: true };
  } catch (e) {
    // Si falló en pleno uso, la próxima vuelve a buscar en vez de insistir con
    // una conexión que ya se cayó.
    elegida = null;
    viaElegida = null;
    const motivo =
      e instanceof Error ? e.message : 'Falló la impresión por un error desconocido.';
    console.error('Impresión fallida', e);
    return { ok: false, motivo };
  }
}
