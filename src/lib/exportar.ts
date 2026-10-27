import type { GrupoConPersonas } from '@/lib/types';
import { contarTalles } from '@/lib/talles';

/** Arma el texto del pedido listo para pegar en WhatsApp. */
export function armarTextoPedido(grupos: GrupoConPersonas[]) {
  const numericos = grupos.filter((g) => g.tipo === 'talle_numerico');
  const letras = grupos.filter((g) => g.tipo === 'talle_letra_doble');

  const camisetas = contarTalles(
    numericos.flatMap((g) => g.personas.map((p) => p.talle))
  );
  const pantalones = contarTalles(
    letras.flatMap((g) => g.personas.map((p) => p.talle_pantalon))
  );
  const chombas = contarTalles(
    letras.flatMap((g) => g.personas.map((p) => p.talle_chomba))
  );

  const lineas: string[] = ['*PEDIDO ADEO - FÚTBOL MAYOR*'];

  if (camisetas.length) {
    const total = camisetas.reduce((acc, t) => acc + t.cantidad, 0);
    lineas.push('', `*CAMISETAS* (${total})`);
    camisetas.forEach((t) => lineas.push(`Talle ${t.talle}: ${t.cantidad}`));
  }

  if (pantalones.length) {
    const total = pantalones.reduce((acc, t) => acc + t.cantidad, 0);
    lineas.push('', `*PANTALONES* (${total})`);
    pantalones.forEach((t) => lineas.push(`${t.talle}: ${t.cantidad}`));
  }

  if (chombas.length) {
    const total = chombas.reduce((acc, t) => acc + t.cantidad, 0);
    lineas.push('', `*CHOMBAS* (${total})`);
    chombas.forEach((t) => lineas.push(`${t.talle}: ${t.cantidad}`));
  }

  const sinTalle = grupos.flatMap((g) =>
    g.personas
      .filter((p) =>
        g.tipo === 'talle_numerico'
          ? !p.talle
          : !p.talle_pantalon || !p.talle_chomba
      )
      .map((p) => `${p.nombre} (${g.nombre})`)
  );

  if (sinTalle.length) {
    lineas.push('', `*FALTA TALLE* (${sinTalle.length})`);
    sinTalle.forEach((n) => lineas.push(`- ${n}`));
  }

  return lineas.join('\n');
}

/** Copia al portapapeles con fallback para navegadores sin permiso. */
export async function copiarAlPortapapeles(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}

// --------------------------------------------------------------- planilla
/** Encabezados de la planilla, en el orden en que salen las columnas. */
export const COLUMNAS_PLANILLA = [
  'Grupo',
  'Nombre',
  'Talle camiseta',
  'Talle pantalón',
  'Talle chomba',
  'Pagó seña',
  'Monto seña',
] as const;

/**
 * Una fila por persona, con todo lo que se carga en la pantalla.
 *
 * El monto va como número pelado —sin "$" ni separador de miles— porque si no
 * la planilla lo toma como texto y no se puede sumar. Los talles vacíos van
 * vacíos y no como "-": una celda vacía se filtra, un guión hay que limpiarlo.
 */
export function armarFilasPlanilla(grupos: GrupoConPersonas[]): string[][] {
  return grupos.flatMap((g) =>
    g.personas.map((p) => [
      g.nombre,
      p.nombre,
      p.talle ?? '',
      p.talle_pantalon ?? '',
      p.talle_chomba ?? '',
      p.pago_sena ? 'Sí' : 'No',
      String(p.monto_sena ?? 0),
    ])
  );
}

/**
 * Separado por tabulaciones, que es lo que entiende Google Sheets al pegar:
 * reparte solo en columnas. Con comas habría que usar "Dividir texto en
 * columnas" a mano.
 */
export function armarTsv(grupos: GrupoConPersonas[]) {
  // El TSV no tiene forma de escapar: un tabulador o un salto de línea dentro
  // de un nombre —que entra fácil pegando de otro lado— correría todas las
  // columnas de ahí en adelante. Se cambian por un espacio.
  const plano = (valor: string) => valor.replace(/[\t\r\n]+/g, ' ');

  return [[...COLUMNAS_PLANILLA], ...armarFilasPlanilla(grupos)]
    .map((fila) => fila.map(plano).join('\t'))
    .join('\n');
}

/** Comillas dobles si el valor trae coma, comilla o salto de línea. */
function celdaCsv(valor: string) {
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function armarCsv(grupos: GrupoConPersonas[]) {
  return [[...COLUMNAS_PLANILLA], ...armarFilasPlanilla(grupos)]
    .map((fila) => fila.map(celdaCsv).join(','))
    .join('\r\n');
}

/**
 * Baja el CSV. Lleva BOM a propósito: sin él, Excel abre el archivo en su
 * página de códigos local y los nombres con acento salen rotos.
 */
export function descargarCsv(grupos: GrupoConPersonas[], nombreArchivo: string) {
  const archivo = new Blob(['\uFEFF' + armarCsv(grupos)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** "camisetas-adeo-2026-10-27.csv" */
export function nombreArchivoCsv(hoy = new Date()) {
  return `camisetas-adeo-${hoy.toISOString().slice(0, 10)}.csv`;
}
