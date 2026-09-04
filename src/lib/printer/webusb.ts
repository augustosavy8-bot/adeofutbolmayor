'use client';

import { ImpresoraEscPos } from './base';
import { CMD } from './escpos';
import { ImpresoraNoDisponible, type EstadoImpresora } from './tipos';

/** Clase USB 7 = impresoras. */
const CLASE_IMPRESORA = 7;

type Salida = { device: USBDevice; interfaz: number; endpoint: number };

function hayWebUSB() {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

/**
 * "Access denied" al abrir no tiene que ver con instalar o no el driver del
 * fabricante: el sistema operativo le asigna uno *generico* a toda impresora
 * USB apenas se enchufa (usbprint.sys en Windows, usblp en Linux y Android, el
 * subsistema de impresion en macOS), y WebUSB no puede reclamar una interfaz
 * que ya tiene un driver del kernel.
 *
 * En Windows la unica salida es cambiar ese driver por WinUSB, lo que deja la
 * impresora inutilizable para el resto del sistema. En Android normalmente no
 * pasa, que es donde va a correr esto.
 */
function explicar(e: unknown) {
  const crudo = e instanceof Error ? e.message : String(e);

  if (/access denied|acceso denegado/i.test(crudo)) {
    // En Windows y Mac esto no es una falla que se pueda arreglar: el sistema
    // toma la impresora al enchufarla y no la suelta. Decirlo como catástrofe
    // asusta al pedo cuando al lado hay dos vías que sí funcionan.
    return new ImpresoraNoDisponible(
      'En Windows y Mac el USB directo no se puede usar: el sistema toma la ' +
        'impresora al enchufarla. Elegí "Puerto COM" o "Driver del sistema", ' +
        'que imprimen igual. El USB directo es para la tablet Android.'
    );
  }
  if (/no device selected|cancel/i.test(crudo)) {
    return new ImpresoraNoDisponible('No se eligió ninguna impresora.');
  }
  return new ImpresoraNoDisponible(crudo);
}

type Candidata = { interfaz: number; endpoint: number; clase: number };

/**
 * Todas las interfaces con un endpoint bulk de salida, no solo las clase 7.
 *
 * Importa porque varias ESC/POS exponen ademas una interfaz vendor-specific
 * (clase 0xFF): cuando el driver del sistema se queda con la clase 7, la otra
 * suele seguir libre y sirve igual. Se prueban en orden, primero la de
 * impresora.
 */
function candidatasDeSalida(device: USBDevice): Candidata[] {
  const encontradas: Candidata[] = [];

  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const salida = alt.endpoints.find(
          (e) => e.direction === 'out' && e.type === 'bulk'
        );
        if (salida) {
          encontradas.push({
            interfaz: iface.interfaceNumber,
            endpoint: salida.endpointNumber,
            clase: alt.interfaceClass,
          });
        }
      }
    }
  }

  return encontradas.sort(
    (a, b) =>
      Number(b.clase === CLASE_IMPRESORA) - Number(a.clase === CLASE_IMPRESORA)
  );
}

export class ImpresoraWebUSB extends ImpresoraEscPos {
  readonly nombre = 'USB (ESC/POS)';
  private salida: Salida | null = null;

  get estado(): EstadoImpresora {
    if (!hayWebUSB()) return 'sin-soporte';
    return this.salida ? 'conectada' : 'desconectada';
  }

  private async preparar(device: USBDevice): Promise<Salida> {
    try {
      if (!device.opened) await device.open();
      if (!device.configuration) await device.selectConfiguration(1);
    } catch (e) {
      throw explicar(e);
    }

    const candidatas = candidatasDeSalida(device);
    if (candidatas.length === 0) {
      throw new ImpresoraNoDisponible(
        'El dispositivo no expone ninguna salida de datos: no parece una impresora.'
      );
    }

    // Se prueba una por una: que el sistema tenga tomada la primera no quiere
    // decir que las demas esten ocupadas.
    let ultimo: unknown = null;
    for (const c of candidatas) {
      try {
        await device.claimInterface(c.interfaz);
        return { device, interfaz: c.interfaz, endpoint: c.endpoint };
      } catch (e) {
        ultimo = e;
      }
    }

    throw explicar(ultimo);
  }

  async connect() {
    if (!hayWebUSB()) {
      throw new ImpresoraNoDisponible(
        'Este navegador no soporta WebUSB. Usá Chrome en la tablet.'
      );
    }

    // Sin filtro: filtrando por clase 7 quedaban afuera las impresoras que se
    // presentan como vendor-specific y no aparecian en la lista de Chrome. Se
    // muestran todos los dispositivos y la elige el que configura, que es algo
    // que se hace una sola vez por tablet.
    let device: USBDevice;
    try {
      device = await navigator.usb.requestDevice({ filters: [] });
    } catch (e) {
      throw explicar(e);
    }

    this.salida = await this.preparar(device);
    await this.enviar(CMD.init());
  }

  /**
   * Al abrir la app se reconecta sola: el permiso que se dio la primera vez
   * queda guardado y `getDevices()` devuelve el aparato sin preguntar nada.
   */
  async reconnect() {
    if (!hayWebUSB()) return false;

    try {
      const conocidos = await navigator.usb.getDevices();
      const device = conocidos.find((d) => candidatasDeSalida(d).length > 0);
      if (!device) return false;

      this.salida = await this.preparar(device);
      return true;
    } catch (e) {
      console.warn('No se pudo reconectar la impresora', e);
      this.salida = null;
      return false;
    }
  }

  protected async enviar(datos: Uint8Array) {
    if (!this.salida) {
      throw new ImpresoraNoDisponible('La impresora no está conectada.');
    }
    const { device, endpoint } = this.salida;
    const resultado = await device.transferOut(endpoint, datos);
    if (resultado.status !== 'ok') {
      throw new ImpresoraNoDisponible(`La impresora respondió "${resultado.status}".`);
    }
  }
}
