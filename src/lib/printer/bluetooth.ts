'use client';

import { ImpresoraEscPos } from './base';
import { CMD } from './escpos';
import { getPerfil, type PerfilImpresora } from './perfiles';
import { ImpresoraNoDisponible, type EstadoImpresora } from './tipos';

/**
 * UUIDs de servicio que usan estas impresoras chinas. No hay uno estándar, así
 * que se piden todos como `optionalServices` y después se busca en cada uno la
 * característica que acepte escritura.
 */
const SERVICIOS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

function hayBluetooth() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * ESC/POS por Web Bluetooth, para la GOOJPRT portátil.
 *
 * Sólo sirve con impresoras **BLE**. Las de Bluetooth clásico (SPP) no se
 * pueden usar desde el navegador por ningún medio: para esas hay que ir por
 * USB. La GOOJPRT de 58 mm es BLE, por eso anda.
 */
export class ImpresoraBluetooth extends ImpresoraEscPos {
  readonly nombre = 'Bluetooth (BLE)';
  private caracteristica: BluetoothRemoteGATTCharacteristic | null = null;
  private dispositivo: BluetoothDevice | null = null;

  get estado(): EstadoImpresora {
    if (!hayBluetooth()) return 'sin-soporte';
    return this.caracteristica ? 'conectada' : 'desconectada';
  }

  private async engancharse(dispositivo: BluetoothDevice) {
    if (!dispositivo.gatt) {
      throw new ImpresoraNoDisponible('El dispositivo no expone GATT.');
    }

    // Si se apaga o se aleja, la conexión muere sin avisar: se limpia acá para
    // que la próxima impresión vuelva a buscarla en vez de escribir al vacío.
    dispositivo.addEventListener('gattserverdisconnected', () => {
      this.caracteristica = null;
    });

    const servidor = await dispositivo.gatt.connect();
    for (const servicio of await servidor.getPrimaryServices()) {
      const caracteristicas = await servicio.getCharacteristics();
      const escribible = caracteristicas.find(
        (c) => c.properties.writeWithoutResponse || c.properties.write
      );
      if (escribible) {
        this.caracteristica = escribible;
        this.dispositivo = dispositivo;
        return;
      }
    }

    throw new ImpresoraNoDisponible(
      'Se conectó, pero la impresora no expone por dónde mandarle el ticket. ' +
        'Fijate que sea un modelo Bluetooth LE: los de Bluetooth clásico no se ' +
        'pueden usar desde el navegador.'
    );
  }

  async connect() {
    if (!hayBluetooth()) {
      throw new ImpresoraNoDisponible(
        'Este navegador no soporta Bluetooth. Usá Chrome en Android.'
      );
    }

    let dispositivo: BluetoothDevice;
    try {
      // Sin filtro de nombre: estas impresoras se anuncian de mil formas
      // (PT-210, MTP-2, BlueTooth Printer) y filtrando quedaban afuera.
      dispositivo = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICIOS,
      });
    } catch (e) {
      const crudo = e instanceof Error ? e.message : String(e);
      if (/user cancel|no device selected/i.test(crudo)) {
        throw new ImpresoraNoDisponible('No se eligió ninguna impresora.');
      }
      if (/globally disabled|bluetooth adapter/i.test(crudo)) {
        throw new ImpresoraNoDisponible(
          'El Bluetooth está apagado. Prendelo y probá de nuevo.'
        );
      }
      throw new ImpresoraNoDisponible(crudo);
    }

    await this.engancharse(dispositivo);
    await this.enviar(CMD.init(), getPerfil());
  }

  /**
   * Al abrir la app se reconecta sola si el navegador todavía recuerda el
   * aparato. `getDevices()` no está en todos lados, y sin él Bluetooth exige
   * un toque del usuario: en ese caso se devuelve false y la pantalla ofrece
   * el botón de conectar.
   */
  async reconnect() {
    if (!hayBluetooth()) return false;

    try {
      if (this.dispositivo?.gatt?.connected && this.caracteristica) return true;

      const conocidos = (await navigator.bluetooth.getDevices?.()) ?? [];
      const dispositivo = this.dispositivo ?? conocidos[0];
      if (!dispositivo) return false;

      await this.engancharse(dispositivo);
      return true;
    } catch (e) {
      console.warn('No se pudo reconectar la impresora Bluetooth', e);
      this.caracteristica = null;
      return false;
    }
  }

  protected async enviar(datos: Uint8Array, perfil: PerfilImpresora) {
    const caracteristica = this.caracteristica;
    if (!caracteristica) {
      throw new ImpresoraNoDisponible(
        'La impresora Bluetooth no está conectada. Tocá "Conectar".'
      );
    }

    // BLE manda paquetes chicos y el buffer de estas impresoras es de unos
    // pocos cientos de bytes: sin partir y sin esperar, el ticket sale cortado
    // o con basura.
    const tamano = perfil.bleChunk > 0 ? perfil.bleChunk : 180;
    const espera = perfil.bleEsperaMs;

    for (let i = 0; i < datos.length; i += tamano) {
      const pedazo = datos.slice(i, i + tamano);
      if (caracteristica.properties.writeWithoutResponse) {
        await caracteristica.writeValueWithoutResponse(pedazo);
      } else {
        await caracteristica.writeValue(pedazo);
      }
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    }
  }
}
