'use client';

import { CMD, codificar, rasterDesdeCanvas, unir } from './escpos';
import type { PerfilImpresora } from './perfiles';
import type { EstadoImpresora, Printer } from './tipos';

/**
 * Todo lo que habla ESC/POS por un caño de bytes: USB, puerto COM, Bluetooth y
 * red. Sólo cambia cómo se mandan los bytes, así que el armado del ticket
 * (init, texto, avance y corte) vive una sola vez acá.
 *
 * La impresión por driver del sistema no entra: esa manda un documento, no
 * bytes, y por eso implementa `Printer` por su cuenta.
 */
export abstract class ImpresoraEscPos implements Printer {
  abstract readonly nombre: string;
  abstract get estado(): EstadoImpresora;
  abstract connect(): Promise<void>;
  abstract reconnect(): Promise<boolean>;
  protected abstract enviar(datos: Uint8Array, perfil: PerfilImpresora): Promise<void>;

  async imprimir(lineas: string[], perfil: PerfilImpresora) {
    await this.enviar(
      unir(CMD.init(), codificar(lineas.join('\n') + '\n'), this.cierre(perfil)),
      perfil
    );
  }

  async imprimirImagen(canvas: HTMLCanvasElement, perfil: PerfilImpresora) {
    await this.enviar(
      unir(CMD.init(), rasterDesdeCanvas(canvas), this.cierre(perfil)),
      perfil
    );
  }

  /**
   * Avance y corte. Sin guillotina se avanza de más: el papel tiene que salir
   * lo suficiente para cortarlo a mano sin romper el ticket.
   */
  private cierre(perfil: PerfilImpresora) {
    const avance = CMD.avanzar(perfil.lineasAvance);
    return perfil.guillotina ? unir(avance, CMD.cortar()) : avance;
  }
}
