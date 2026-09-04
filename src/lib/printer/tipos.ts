import type { PerfilImpresora } from './perfiles';
import type { TipoTicket } from '@/lib/tickets/diseno';
import type { OpcionesFicha } from '@/lib/tickets/render';

export type EstadoImpresora = 'sin-soporte' | 'desconectada' | 'conectada';

/**
 * Las formas de llegar al papel. Ninguna anda en todos lados, por eso están
 * todas:
 *
 * - `usb` (WebUSB): la tablet Android. En Windows el sistema toma la impresora
 *   con su propio driver y el navegador no puede reclamarla.
 * - `serie` (Web Serial): el puerto COM que publica el driver. Convive con él
 *   en vez de pelearlo, así que anda en Windows.
 * - `bluetooth` (Web Bluetooth): la portátil GOOJPRT, que es BLE.
 * - `red`: la XP-80 con puerto Ethernet, por el puente local (ver `red.ts`).
 * - `sistema`: le manda el ticket al driver como documento. Anda siempre, a
 *   cambio del diálogo de impresión.
 */
export type Transporte = 'usb' | 'serie' | 'bluetooth' | 'red' | 'sistema';

/**
 * Contrato mínimo de una impresora de tickets. El perfil viaja en cada
 * impresión porque decide el ancho, el avance y si hay guillotina: la misma
 * conexión puede tener que imprimir distinto si se cambia de impresora.
 */
export interface Printer {
  readonly nombre: string;
  readonly estado: EstadoImpresora;
  /** Pide permiso al usuario y deja el dispositivo listo. */
  connect(): Promise<void>;
  /** Reconecta sin diálogo si el permiso ya fue dado antes. */
  reconnect(): Promise<boolean>;
  /** Imprime el ticket entero: texto, avance y corte según el perfil. */
  imprimir(lineas: string[], perfil: PerfilImpresora): Promise<void>;
  /**
   * Imprime una ficha de diseño. Va aparte de `imprimir` porque no es texto en
   * columnas: tiene tipografía y medidas propias, y cada transporte la resuelve
   * como puede — el driver del sistema con HTML, las ESC/POS como imagen.
   */
  imprimirFicha(
    tipo: TipoTicket,
    opciones: OpcionesFicha,
    perfil: PerfilImpresora
  ): Promise<void>;
}

/** La impresora nunca puede frenar un cobro: los errores se avisan, no rompen. */
export class ImpresoraNoDisponible extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ImpresoraNoDisponible';
  }
}
