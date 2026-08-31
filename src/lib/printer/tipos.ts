export type EstadoImpresora = 'sin-soporte' | 'desconectada' | 'conectada';

/**
 * Contrato mínimo de una impresora de tickets. La implementación actual es
 * WebUSB; el día que haga falta una por Bluetooth alcanza con otra clase que
 * cumpla esto, sin tocar las pantallas.
 */
export interface Printer {
  readonly nombre: string;
  readonly estado: EstadoImpresora;
  /** Pide permiso al usuario y deja el dispositivo listo. */
  connect(): Promise<void>;
  /** Reconecta sin diálogo si el permiso ya fue dado antes. */
  reconnect(): Promise<boolean>;
  printText(lines: string[]): Promise<void>;
  printRaster(canvas: HTMLCanvasElement): Promise<void>;
  cut(): Promise<void>;
}

/** La impresora nunca puede frenar un cobro: los errores se avisan, no rompen. */
export class ImpresoraNoDisponible extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ImpresoraNoDisponible';
  }
}
