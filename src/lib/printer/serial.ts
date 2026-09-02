'use client';

import { CMD, codificar, rasterDesdeCanvas, unir } from './escpos';
import {
  ImpresoraNoDisponible,
  type EstadoImpresora,
  type Printer,
} from './tipos';

/**
 * Baudios de fábrica de las XP-80 con puerto serie. Si alguna vez hay que
 * cambiarlo, se toca acá y en el dip switch de la impresora, que tienen que
 * coincidir.
 */
const BAUDIOS = 9600;

function haySerial() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * ESC/POS por Web Serial: el camino que sí funciona en Windows.
 *
 * A diferencia de WebUSB, acá el navegador no le pelea el aparato al driver
 * del sistema — habla con un puerto COM, que es justamente lo que expone el
 * driver de Xprinter (o un cable serie, o el conversor USB-serie). Por eso
 * anda con la impresora instalada y sin tocar nada.
 */
export class ImpresoraWebSerial implements Printer {
  readonly nombre = 'Puerto COM (ESC/POS)';
  private puerto: SerialPort | null = null;

  get estado(): EstadoImpresora {
    if (!haySerial()) return 'sin-soporte';
    return this.puerto?.writable ? 'conectada' : 'desconectada';
  }

  private async abrir(puerto: SerialPort) {
    // Un puerto ya abierto vuelve a abrirse con InvalidStateError: si ya tiene
    // writable está listo y no hay nada que hacer.
    if (!puerto.writable) await puerto.open({ baudRate: BAUDIOS });
    this.puerto = puerto;
  }

  async connect() {
    if (!haySerial()) {
      throw new ImpresoraNoDisponible(
        'Este navegador no soporta puertos COM. Usá Chrome o Edge de escritorio.'
      );
    }

    let puerto: SerialPort;
    try {
      puerto = await navigator.serial.requestPort();
    } catch (e) {
      const crudo = e instanceof Error ? e.message : String(e);
      if (/no port selected|cancel/i.test(crudo)) {
        throw new ImpresoraNoDisponible('No se eligió ningún puerto.');
      }
      throw new ImpresoraNoDisponible(crudo);
    }

    try {
      await this.abrir(puerto);
    } catch (e) {
      const crudo = e instanceof Error ? e.message : String(e);
      if (/access denied|failed to open|busy/i.test(crudo)) {
        throw new ImpresoraNoDisponible(
          'El puerto está ocupado. Cerrá cualquier otro programa que esté ' +
            'usando la impresora (o la otra pestaña del sistema) y probá de nuevo.'
        );
      }
      throw new ImpresoraNoDisponible(crudo);
    }

    await this.enviar(CMD.init());
  }

  /** El permiso de un puerto queda guardado igual que el de WebUSB. */
  async reconnect() {
    if (!haySerial()) return false;

    try {
      const [puerto] = await navigator.serial.getPorts();
      if (!puerto) return false;
      await this.abrir(puerto);
      return true;
    } catch (e) {
      console.warn('No se pudo reconectar el puerto COM', e);
      this.puerto = null;
      return false;
    }
  }

  private async enviar(datos: Uint8Array) {
    const escribible = this.puerto?.writable;
    if (!escribible) {
      throw new ImpresoraNoDisponible('La impresora no está conectada.');
    }

    // El writer se toma y se suelta por envío: dejarlo tomado bloquea el
    // stream y la próxima impresión no podría escribir.
    const escritor = escribible.getWriter();
    try {
      await escritor.write(datos);
    } finally {
      escritor.releaseLock();
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
