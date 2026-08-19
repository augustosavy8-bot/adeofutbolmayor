import type { Jugador } from '@/lib/types';

/** "Fernando Sánchez.JPG" -> "fernando sanchez" */
export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function apellidoDe(nombreNormalizado: string) {
  const partes = nombreNormalizado.split(' ');
  return partes[partes.length - 1] ?? '';
}

export type Emparejamiento = {
  file: File;
  jugadorId: string | null;
};

/**
 * Empareja archivos con jugadores por el nombre del archivo: primero por
 * nombre completo y, si no cierra, por apellido, siempre que sea de uno solo
 * (hay dos Germi, por ejemplo). Asi "Zacarias Acosta.JPG" cae en "Zaca
 * Acosta" aunque el nombre de pila no coincida.
 *
 * Lo que queda sin resolver vuelve con `jugadorId` en null, para elegirlo a
 * mano en vez de adivinar.
 */
export function emparejarFotos(
  files: File[],
  jugadores: Jugador[]
): Emparejamiento[] {
  const porNombre = new Map<string, string>();
  const porApellido = new Map<string, string[]>();

  for (const jugador of jugadores) {
    const nombre = normalizar(jugador.nombre);
    porNombre.set(nombre, jugador.id);

    const apellido = apellidoDe(nombre);
    if (apellido) {
      porApellido.set(apellido, [...(porApellido.get(apellido) ?? []), jugador.id]);
    }
  }

  return files.map((file) => {
    const nombre = normalizar(file.name);

    const exacto = porNombre.get(nombre);
    if (exacto) return { file, jugadorId: exacto };

    const candidatos = porApellido.get(apellidoDe(nombre)) ?? [];
    return { file, jugadorId: candidatos.length === 1 ? candidatos[0] : null };
  });
}
