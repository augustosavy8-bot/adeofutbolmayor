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
