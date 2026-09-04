'use client';

import type { TipoTicket } from '@/lib/tickets/diseno';
import { htmlFicha, type OpcionesFicha } from '@/lib/tickets/render';
import { anchoImprimibleMm, type PerfilImpresora } from './perfiles';
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

/** Píxeles CSS por milímetro. */
const PX_POR_MM = 96 / 25.4;

const CLAVE_ALTO = 'adeo.impresora.altoJusto';

/**
 * Cuánto tardó la última impresión en volver, y si eso parece un diálogo.
 *
 * No hay forma de preguntarle al navegador si está en modo `--kiosk-printing`.
 * Pero sí se puede medir: en modo directo `afterprint` vuelve enseguida, y con
 * el diálogo abierto vuelve recién cuando la persona toca Imprimir. Un ticket
 * que tardó varios segundos es, casi seguro, un diálogo esperando.
 *
 * Es una pista, no un veredicto: sólo sirve para ofrecer ayuda, nunca para
 * frenar una impresión.
 */
const UMBRAL_DIALOGO_MS = 1500;
let ultimaDemoraMs: number | null = null;

export function pareceDialogo() {
  return ultimaDemoraMs !== null && ultimaDemoraMs > UMBRAL_DIALOGO_MS;
}

export function demoraUltimaImpresion() {
  return ultimaDemoraMs;
}

/**
 * Si la hoja se recorta al alto exacto del ticket.
 *
 * Apagado por defecto, y no por gusto: con un ticket corto la hoja queda más
 * ancha que alta, y hay drivers que en ese caso la sacan acostada. El piso
 * evita eso a cambio de unos centímetros de papel. Cuando en una impresora se
 * comprueba que sale derecha igual, se prende y se deja de gastar.
 */
export function getAltoJusto() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(CLAVE_ALTO) === '1';
}

export function setAltoJusto(justo: boolean) {
  if (typeof localStorage === 'undefined') return;
  if (justo) localStorage.setItem(CLAVE_ALTO, '1');
  else localStorage.removeItem(CLAVE_ALTO);
}

/**
 * Fija el tamaño de la hoja al alto real del ticket.
 *
 * Con `size: 80mm auto`, Chrome no sabe qué alto darle y termina usando el
 * papel por defecto del driver: de ahí el espacio que sobraba. Y hay una
 * trampa peor: si la caja queda **más ancha que alta** —un ticket corto en
 * papel de 80 mm— Chrome la toma como apaisada y saca el ticket acostado. Por
 * eso el alto nunca baja del ancho: es lo que garantiza que salga vertical.
 */
function medirYFijarPagina(doc: Document, perfil: PerfilImpresora) {
  const estilo = doc.getElementById('pagina');
  if (!estilo) return;

  const contenido = doc.body.scrollHeight / PX_POR_MM;
  // Un poco de cola para que el driver no corte pegado a la última línea.
  const pedido = contenido + 4;
  const alto = getAltoJusto() ? pedido : Math.max(pedido, perfil.papelMm * 1.02);

  estilo.textContent = `@page { size: ${perfil.papelMm}mm ${alto.toFixed(1)}mm; margin: 0 }`;
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

  /**
   * Por esta vía la ficha va como HTML y no como imagen: es la única con
   * tipografías de verdad, así que el diseño sale con su letra en lugar de
   * rasterizado.
   */
  async imprimirFicha(
    tipo: TipoTicket,
    opciones: OpcionesFicha,
    perfil: PerfilImpresora
  ) {
    const ancho = anchoImprimibleMm(perfil);
    await this.imprimirDocumento(htmlFicha(tipo, opciones, ancho), perfil, ancho);
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
  private imprimirDocumento(
    cuerpo: string,
    perfil: PerfilImpresora,
    anchoMm?: number
  ) {
    return new Promise<void>((resolver, rechazar) => {
      if (typeof document === 'undefined') {
        rechazar(new ImpresoraNoDisponible('No hay ventana para imprimir.'));
        return;
      }

      // Fuera de pantalla pero con tamaño real: con ancho 0 el ticket no
      // maqueta y no se puede medir cuánto papel va a ocupar.
      const marco = document.createElement('iframe');
      marco.setAttribute('aria-hidden', 'true');
      marco.style.cssText =
        `position:fixed;left:-9999px;top:0;border:0;width:${perfil.papelMm}mm;height:400mm`;
      document.body.appendChild(marco);

      let terminado = false;
      let mandadoEn = 0;
      const limpiar = () => {
        if (terminado) return;
        terminado = true;
        if (mandadoEn) ultimaDemoraMs = performance.now() - mandadoEn;
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
      const ancho = anchoMm ?? util;

      doc.open();
      doc.write(
        `<!doctype html><html><head><meta charset="utf-8"><style id="pagina"></style><style>
          html, body { margin: 0; padding: 0 }
          body { width: ${ancho}mm; margin: 0 auto }
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

      medirYFijarPagina(doc, perfil);

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
          mandadoEn = performance.now();
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
