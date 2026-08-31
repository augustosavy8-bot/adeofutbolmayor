'use client';

import { CMD, codificar, rasterDesdeCanvas, unir } from './escpos';
import {
  ImpresoraNoDisponible,
  type EstadoImpresora,
  type Printer,
} from './tipos';

/** Clase USB 7 = impresoras. Sirve para casi cualquier ESC/POS por USB. */
const CLASE_IMPRESORA = 7;

type Salida = { device: USBDevice; interfaz: number; endpoint: number };

function hayWebUSB() {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Busca la interfaz de impresora y su endpoint de salida. Un mismo aparato
 * puede exponer varias configuraciones; se toma la primera que sirva.
 */
function ubicarSalida(device: USBDevice): { interfaz: number; endpoint: number } {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass !== CLASE_IMPRESORA) continue;
        const salida = alt.endpoints.find((e) => e.direction === 'out');
        if (salida) {
          return { interfaz: iface.interfaceNumber, endpoint: salida.endpointNumber };
        }
      }
    }
  }
  throw new ImpresoraNoDisponible(
    'El dispositivo no expone una interfaz de impresora USB.'
  );
}

export class ImpresoraWebUSB implements Printer {
  readonly nombre = 'USB (ESC/POS)';
  private salida: Salida | null = null;

  get estado(): EstadoImpresora {
    if (!hayWebUSB()) return 'sin-soporte';
    return this.salida ? 'conectada' : 'desconectada';
  }

  private async preparar(device: USBDevice): Promise<Salida> {
    if (!device.opened) await device.open();
    if (!device.configuration) await device.selectConfiguration(1);

    const { interfaz, endpoint } = ubicarSalida(device);
    await device.claimInterface(interfaz);
    return { device, interfaz, endpoint };
  }

  async connect() {
    if (!hayWebUSB()) {
      throw new ImpresoraNoDisponible(
        'Este navegador no soporta WebUSB. Usá Chrome en la tablet.'
      );
    }

    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: CLASE_IMPRESORA }],
    });
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
      const device = conocidos.find((d) =>
        d.configurations.some((c) =>
          c.interfaces.some((i) =>
            i.alternates.some((a) => a.interfaceClass === CLASE_IMPRESORA)
          )
        )
      );
      if (!device) return false;

      this.salida = await this.preparar(device);
      return true;
    } catch (e) {
      console.warn('No se pudo reconectar la impresora', e);
      this.salida = null;
      return false;
    }
  }

  private async enviar(datos: Uint8Array) {
    if (!this.salida) {
      throw new ImpresoraNoDisponible('La impresora no está conectada.');
    }
    const { device, endpoint } = this.salida;
    const resultado = await device.transferOut(endpoint, datos);
    if (resultado.status !== 'ok') {
      throw new ImpresoraNoDisponible(`La impresora respondió "${resultado.status}".`);
    }
  }

  async printText(lines: string[]) {
    await this.enviar(unir(CMD.init(), codificar(lines.join('\n') + '\n')));
  }

  async printRaster(canvas: HTMLCanvasElement) {
    await this.enviar(unir(CMD.init(), rasterDesdeCanvas(canvas), codificar('\n')));
  }

  async cut() {
    await this.enviar(unir(CMD.avanzar(4), CMD.cortar()));
  }
}
