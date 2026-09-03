'use client';

import { ImpresoraEscPos } from './base';
import { CMD } from './escpos';
import { getPerfil, type PerfilImpresora } from './perfiles';
import { ImpresoraNoDisponible, type EstadoImpresora } from './tipos';

/**
 * UUIDs de servicio de impresoras térmicas BLE. No hay uno estándar: cada
 * fabricante usa el suyo, y hasta lotes distintos del mismo modelo cambian.
 *
 * La lista importa más de lo que parece. `getPrimaryServices()` devuelve
 * **solamente** los servicios que se pidieron en `optionalServices`: si el de
 * la impresora no está acá, el navegador se conecta pero no ve ningún
 * servicio, y parece que la impresora no sirve cuando en realidad anda.
 */
export const SERVICIOS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // el más común (char 2af1)
  '0000ff00-0000-1000-8000-00805f9b34fb', // char ff02
  '0000ffe0-0000-1000-8000-00805f9b34fb', // módulos tipo HM-10
  '0000ffe5-0000-1000-8000-00805f9b34fb',
  '0000ff80-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb', // char 36f5, muy visto en GOOJPRT
  '0000ae30-0000-1000-8000-00805f9b34fb', // char ae01
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // UART transparente de Microchip
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // UART de Nordic
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000180a-0000-1000-8000-00805f9b34fb', // información del fabricante
  // SPP. Si es lo único que aparece, la impresora es de Bluetooth clásico y
  // no hay forma de usarla desde el navegador; sirve para poder decirlo.
  '00001101-0000-1000-8000-00805f9b34fb',
];

function hayBluetooth() {
  // Que la clave exista no alcanza: una política del equipo puede dejarla en
  // undefined, y entonces el primer uso revienta con un error incomprensible.
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

/**
 * Por qué este navegador no tiene Web Bluetooth, mirando el user agent.
 *
 * Vale la pena distinguirlo: "no soporta Bluetooth" manda a cambiar de aparato
 * cuando muchas veces alcanza con abrir la app por HTTPS o con destildar una
 * opción. Y al revés — en iPhone no hay nada que probar, ni con Chrome.
 */
export function motivoSinBluetooth(): string {
  if (typeof navigator === 'undefined') return 'No hay navegador.';

  // Sin contexto seguro la API directamente no existe, y es lo más fácil de
  // arreglar, así que va primero.
  if (typeof isSecureContext !== 'undefined' && !isSecureContext) {
    return (
      'La app está abierta sin HTTPS y el navegador esconde el Bluetooth. ' +
      'Abrila por su dirección https:// y vuelve a aparecer.'
    );
  }

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return (
      'En iPhone y iPad ningún navegador tiene Bluetooth, ni el Chrome de ' +
      'iPhone: Apple no lo permite. Usá un Android, o conectá la impresora ' +
      'por USB o por el driver del sistema.'
    );
  }
  if (/FxiOS|Firefox/i.test(ua)) {
    return 'Firefox no soporta Bluetooth. Usá Chrome o Edge.';
  }
  if (/SamsungBrowser/i.test(ua)) {
    return 'Samsung Internet no soporta Bluetooth. Usá Chrome.';
  }
  if (/OPR|Opera/i.test(ua)) {
    return 'Este Opera no tiene Bluetooth habilitado. Usá Chrome o Edge.';
  }
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
    return 'Safari no soporta Bluetooth. Usá Chrome o Edge.';
  }
  if (/Brave/i.test(ua)) {
    return (
      'Brave trae el Bluetooth apagado de fábrica. Se prende en ' +
      'brave://settings/privacy → "Usar Web Bluetooth".'
    );
  }
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    return (
      'En Linux hay que habilitarlo en chrome://flags → ' +
      '"Experimental Web Platform features".'
    );
  }

  return (
    'Este navegador no expone Bluetooth. Chrome y Edge lo tienen en Android, ' +
    'Windows, Mac y ChromeOS; puede estar bloqueado por una política del equipo.'
  );
}

/**
 * En Windows una impresora Bluetooth emparejada aparece además como puerto COM
 * de salida, y por ahí sí se le puede escribir desde el navegador. Es la
 * vuelta para las de Bluetooth clásico, que por BLE no son alcanzables.
 */
export const SALIDA_POR_COM =
  'Si estás en Windows: emparejá la impresora desde Configuración de Windows → ' +
  'Bluetooth. Al emparejarla, Windows le crea un puerto COM de salida ' +
  '(Panel de control → Dispositivos e impresoras → botón derecho sobre la ' +
  'impresora → Propiedades → Servicios/Hardware). Con ese COM, elegí ' +
  '"Puerto COM" acá en Configuración y anda igual.';

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

    // Cero servicios y "servicios pero ninguno escribible" son problemas muy
    // distintos, y el que sufre no puede adivinar cuál le tocó.
    const cuantos = (await servidor.getPrimaryServices()).length;
    throw new ImpresoraNoDisponible(
      cuantos === 0
        ? 'Se conectó, pero el navegador no ve ningún servicio conocido en la ' +
          'impresora. Usá "Diagnóstico de impresora" en Configuración y ' +
          'pasame lo que dice.'
        : `Se conectó y encontró ${cuantos} servicio(s), pero ninguno acepta ` +
          'escritura, así que no hay por dónde mandarle el ticket. Usá ' +
          '"Diagnóstico de impresora" en Configuración y pasame lo que dice.'
    );
  }

  async connect() {
    if (!hayBluetooth()) {
      throw new ImpresoraNoDisponible(
        `${motivoSinBluetooth()} (Usá "Diagnóstico Bluetooth" para ver el detalle.)`
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
