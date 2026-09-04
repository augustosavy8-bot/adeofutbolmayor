'use client';

import {
  AREA_MM,
  CLUB,
  COLA_MM,
  COMUN,
  DISENO_PX,
  ESTILOS,
  type TipoTicket,
} from './diseno';

export type OpcionesFicha = {
  /** El encabezado es lo único configurable del diseño. */
  mostrarSubtitulo?: boolean;
};

const FUENTE_TITULO = "'Archivo Narrow', 'Arial Narrow', sans-serif";
const FUENTE_MONO = "'Courier Prime', 'Courier New', monospace";

/** Negro puro: la térmica mancha los grises, así que no hay medias tintas. */
const TINTA = '#000000';

/**
 * Alto del ticket en px del diseño, sumando bloque por bloque. Se calcula en
 * vez de medirse porque el canvas necesita saber cuánto alto pedir antes de
 * dibujar nada.
 */
export function altoDiseno(tipo: TipoTicket, opciones: OpcionesFicha = {}) {
  const estilo = ESTILOS[tipo.estilo];
  const conSub = opciones.mostrarSubtitulo !== false;

  return (
    COMUN.padArriba +
    estilo.club * COMUN.club.lh +
    (conSub ? COMUN.sub.mt + COMUN.sub.tam : 0) +
    COMUN.regla.my +
    COMUN.regla.alto +
    COMUN.regla.my +
    tipo.lineas.length * estilo.tipo * COMUN.tipo.lh +
    COMUN.padAbajo
  );
}

// ---------------------------------------------------------------- HTML
/**
 * El ticket para la impresión por driver del sistema, que es la única vía con
 * tipografía de verdad. Todo en mm para que no dependa del dpi del navegador.
 */
export function htmlFicha(
  tipo: TipoTicket,
  opciones: OpcionesFicha = {},
  anchoMm = AREA_MM
) {
  const estilo = ESTILOS[tipo.estilo];
  const conSub = opciones.mostrarSubtitulo !== false;
  // Un px del diseño, en mm del papel de esta impresora.
  const u = anchoMm / DISENO_PX;
  const mm = (px: number) => `${(px * u).toFixed(3)}mm`;

  const escapar = (t: string) =>
    t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

  return `<div class="ficha">
  <div class="club">${escapar(CLUB)}</div>
  ${conSub ? `<div class="sub">${escapar(tipo.subtitulo)}</div>` : ''}
  <div class="regla"></div>
  <div class="tipo">${tipo.lineas.map(escapar).join('<br>')}</div>
</div>
<style>
  .ficha {
    width: ${mm(DISENO_PX)};
    box-sizing: border-box;
    padding: ${mm(COMUN.padArriba)} ${mm(COMUN.padLado)} ${mm(COMUN.padAbajo)};
    text-align: center;
    color: ${TINTA};
    background: #fff;
  }
  .ficha .club {
    font-family: ${FUENTE_TITULO};
    font-size: ${mm(estilo.club)};
    font-weight: ${COMUN.club.peso};
    letter-spacing: ${estilo.clubLs}em;
    line-height: ${COMUN.club.lh};
  }
  .ficha .sub {
    font-family: ${FUENTE_MONO};
    font-size: ${mm(COMUN.sub.tam)};
    letter-spacing: ${COMUN.sub.ls}em;
    margin-top: ${mm(COMUN.sub.mt)};
    line-height: 1;
  }
  .ficha .regla {
    height: ${mm(COMUN.regla.alto)};
    background: ${TINTA};
    margin: ${mm(COMUN.regla.my)} 0;
  }
  .ficha .tipo {
    font-family: ${FUENTE_TITULO};
    font-size: ${mm(estilo.tipo)};
    font-weight: ${COMUN.tipo.peso};
    letter-spacing: ${estilo.tipoLs}em;
    line-height: ${COMUN.tipo.lh};
    text-transform: uppercase;
  }
</style>`;
}

// -------------------------------------------------------------- canvas
/**
 * Las fuentes tienen que estar cargadas antes de dibujar: el canvas no espera
 * y, si no están, saca el ticket con la tipografía de reemplazo.
 *
 * Un fallo no puede frenar la impresión. Si el archivo no llega, el ticket
 * sale con la condensada y la monoespaciada del sistema —que es lo que el
 * propio diseño indica como reemplazo— en vez de no salir.
 */
export async function cargarFuentes() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    [`700 32px ${FUENTE_TITULO}`, `400 10px ${FUENTE_MONO}`].map((f) =>
      document.fonts.load(f).catch((e) => {
        console.warn('No se pudo cargar la tipografía del ticket', f, e);
      })
    )
  );
}

/**
 * Chrome suma el espaciado también después del último carácter, así que el
 * ancho medido viene de más y el texto quedaría corrido a la izquierda.
 */
function dibujarCentrado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  y: number,
  ancho: number,
  espaciado: number
) {
  const medido = ctx.measureText(texto).width - espaciado;
  ctx.fillText(texto, (ancho - medido) / 2, y);
}

/**
 * El mismo ticket para las impresoras ESC/POS, que no entienden tipografías:
 * se dibuja y se manda como imagen. Sale idéntico al del driver.
 */
export function dibujarFicha(
  tipo: TipoTicket,
  anchoPx: number,
  opciones: OpcionesFicha = {}
): HTMLCanvasElement {
  const estilo = ESTILOS[tipo.estilo];
  const conSub = opciones.mostrarSubtitulo !== false;

  // Píxeles de la impresora por px del diseño.
  const k = anchoPx / DISENO_PX;
  const alto = Math.ceil((altoDiseno(tipo, opciones) + colaEnDiseno()) * k);

  const canvas = document.createElement('canvas');
  canvas.width = anchoPx;
  canvas.height = alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El canvas no tiene contexto 2d');

  // Papel blanco: el raster convierte lo oscuro en tinta, así que el fondo
  // tiene que ser explícitamente blanco y no transparente.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = TINTA;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const puedeEspaciar = 'letterSpacing' in ctx;
  const espaciar = (em: number, tam: number) => {
    const px = em * tam * k;
    if (puedeEspaciar) ctx.letterSpacing = `${px}px`;
    return puedeEspaciar ? px : 0;
  };

  let y = COMUN.padArriba * k;

  ctx.font = `${COMUN.club.peso} ${estilo.club * k}px ${FUENTE_TITULO}`;
  dibujarCentrado(ctx, CLUB, y, anchoPx, espaciar(estilo.clubLs, estilo.club));
  y += estilo.club * COMUN.club.lh * k;

  if (conSub) {
    y += COMUN.sub.mt * k;
    ctx.font = `400 ${COMUN.sub.tam * k}px ${FUENTE_MONO}`;
    dibujarCentrado(
      ctx,
      tipo.subtitulo,
      y,
      anchoPx,
      espaciar(COMUN.sub.ls, COMUN.sub.tam)
    );
    y += COMUN.sub.tam * k;
  }

  y += COMUN.regla.my * k;
  if (puedeEspaciar) ctx.letterSpacing = '0px';
  ctx.fillRect(
    COMUN.padLado * k,
    y,
    anchoPx - 2 * COMUN.padLado * k,
    COMUN.regla.alto * k
  );
  y += (COMUN.regla.alto + COMUN.regla.my) * k;

  ctx.font = `${COMUN.tipo.peso} ${estilo.tipo * k}px ${FUENTE_TITULO}`;
  const esp = espaciar(estilo.tipoLs, estilo.tipo);
  for (const linea of tipo.lineas) {
    dibujarCentrado(ctx, linea.toUpperCase(), y, anchoPx, esp);
    y += estilo.tipo * COMUN.tipo.lh * k;
  }

  return canvas;
}

/** Los 8 mm de cola, en px del diseño. */
function colaEnDiseno() {
  return (COLA_MM / AREA_MM) * DISENO_PX;
}
