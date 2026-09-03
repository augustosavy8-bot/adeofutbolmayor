'use client';

import type { PerfilImpresora } from './perfiles';
import {
  ImpresoraNoDisponible,
  type EstadoImpresora,
  type Printer,
} from './tipos';

/**
 * Margen que no imprime el cabezal, sumando los dos costados: en 80 mm el área
 * útil son 72 y en 58 mm son 48, así que en ambos casos se pierden 8 mm.
 */
const MARGEN_MM = 8;

/**
 * En una fuente monoespaciada el avance de cada carácter es ~0.6 em, así que
 * para meter las columnas del perfil en el ancho útil el cuerpo tiene que ser
 * útil / columnas / 0.6.
 */
function medidas(perfil: PerfilImpresora) {
  const util = perfil.papelMm - MARGEN_MM;
  return { util, cuerpo: util / perfil.columnas / 0.6 };
}

/**
 * Impresión por el driver del sistema.
 *
 * Es la vía que usan casi todos los sistemas de caja en Windows: en vez de
 * pelearle el aparato al sistema operativo, se le manda el ticket como
 * documento y el driver de Xprinter hace el resto. Funciona siempre que la
 * impresora esté instalada, sin cambiar drivers ni permisos.
 *
 * A cambio, el navegador muestra el diálogo de impresión en cada ticket. Para
 * que salga solo hay que abrir Chrome con --kiosk-printing (está explicado en
 * el README), que es lo que se hace en el mostrador.
 */
export class ImpresoraSistema implements Printer {
  readonly nombre = 'Driver del sistema';

  get estado(): EstadoImpresora {
    return typeof document === 'undefined' ? 'sin-soporte' : 'conectada';
  }

  /** No hay nada que conectar: el driver ya está. */
  async connect() {}

  async reconnect() {
    return this.estado === 'conectada';
  }

  async imprimir(lineas: string[], perfil: PerfilImpresora) {
    const texto = lineas
      .join('\n')
      .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    // El avance y el corte los hace el driver al terminar cada documento.
    await this.imprimirDocumento(`<pre>${texto}</pre>`, perfil);
  }

  async imprimirImagen(canvas: HTMLCanvasElement, perfil: PerfilImpresora) {
    await this.imprimirDocumento(
      `<img src="${canvas.toDataURL('image/png')}" alt="">`,
      perfil
    );
  }

  /**
   * El ticket se imprime desde un iframe oculto para no tocar la pantalla de
   * venta: si se imprimiera la ventana, el cajero vería desaparecer la caja
   * mientras sale el papel.
   */
  private imprimirDocumento(cuerpo: string, perfil: PerfilImpresora) {
    return new Promise<void>((resolver, rechazar) => {
      if (typeof document === 'undefined') {
        rechazar(new ImpresoraNoDisponible('No hay ventana para imprimir.'));
        return;
      }

      const marco = document.createElement('iframe');
      marco.setAttribute('aria-hidden', 'true');
      marco.style.cssText =
        'position:fixed;width:0;height:0;border:0;left:-9999px;top:0';
      document.body.appendChild(marco);

      let terminado = false;
      const limpiar = () => {
        if (terminado) return;
        terminado = true;
        marco.remove();
        resolver();
      };

      const doc = marco.contentDocument;
      const ventana = marco.contentWindow;
      if (!doc || !ventana) {
        marco.remove();
        rechazar(new ImpresoraNoDisponible('No se pudo preparar el ticket.'));
        return;
      }

      const { util, cuerpo: tamano } = medidas(perfil);

      doc.open();
      doc.write(
        `<!doctype html><html><head><meta charset="utf-8"><style>
          @page { size: ${perfil.papelMm}mm auto; margin: 0 }
          html, body { margin: 0; padding: 0 }
          body { width: ${util}mm; margin: 0 auto }
          pre, img { margin: 0 }
          pre {
            font-family: "Consolas", "Courier New", monospace;
            font-size: ${tamano.toFixed(3)}mm;
            line-height: 1.25;
            white-space: pre-wrap;
            word-break: break-all;
          }
          img { width: 100%; image-rendering: pixelated }
        </style></head><body>${cuerpo}</body></html>`
      );
      doc.close();

      ventana.addEventListener('afterprint', limpiar);

      // Si el navegador no dispara afterprint (pasa con algunos diálogos), el
      // iframe igual se saca: quedarse colgado frenaría la cola de impresión y
      // con ella los tickets siguientes.
      setTimeout(limpiar, 60_000);

      // Un tick para que el iframe termine de maquetar antes de imprimir; sin
      // esto, Chrome a veces manda la hoja en blanco.
      setTimeout(() => {
        try {
          ventana.focus();
          ventana.print();
        } catch (e) {
          marco.remove();
          terminado = true;
          rechazar(
            new ImpresoraNoDisponible(
              e instanceof Error ? e.message : 'No se pudo abrir la impresión.'
            )
          );
        }
      }, 100);
    });
  }
}
