import type { Citado, EventoPartido, Partido, TipoEvento } from '@/lib/types';

export type GrupoAccion = 'con_pelota' | 'sin_pelota';

export type Accion = {
  tipo: TipoEvento;
  label: string;
  /** Para encabezados de tabla, donde no entra la palabra entera. */
  corto: string;
  grupo: GrupoAccion;
  /** Lo que le suma al equipo (verde) o le resta (rojo). Neutro = sin color. */
  signo: 'positivo' | 'negativo' | 'neutro';
};

/** En el orden en que aparecen los botones: lo más tocado, primero. */
export const ACCIONES: readonly Accion[] = [
  { tipo: 'pase_dado', label: 'Pase bien', corto: 'PB', grupo: 'con_pelota', signo: 'positivo' },
  { tipo: 'pase_errado', label: 'Pase mal', corto: 'PM', grupo: 'con_pelota', signo: 'negativo' },
  { tipo: 'gol', label: 'Gol', corto: 'G', grupo: 'con_pelota', signo: 'positivo' },
  { tipo: 'asistencia', label: 'Asistencia', corto: 'A', grupo: 'con_pelota', signo: 'positivo' },
  { tipo: 'remate_arco', label: 'Remate al arco', corto: 'RA', grupo: 'con_pelota', signo: 'positivo' },
  { tipo: 'remate_afuera', label: 'Remate afuera', corto: 'RF', grupo: 'con_pelota', signo: 'neutro' },
  { tipo: 'perdida', label: 'Pérdida', corto: 'PE', grupo: 'con_pelota', signo: 'negativo' },
  { tipo: 'recuperacion', label: 'Recuperación', corto: 'RE', grupo: 'sin_pelota', signo: 'positivo' },
  { tipo: 'quite', label: 'Quite', corto: 'QU', grupo: 'sin_pelota', signo: 'positivo' },
  { tipo: 'despeje', label: 'Despeje', corto: 'DE', grupo: 'sin_pelota', signo: 'neutro' },
  { tipo: 'falta_cometida', label: 'Falta hecha', corto: 'FC', grupo: 'sin_pelota', signo: 'negativo' },
  { tipo: 'falta_recibida', label: 'Falta recibida', corto: 'FR', grupo: 'sin_pelota', signo: 'positivo' },
];

export const ACCION: Record<TipoEvento, Accion> = Object.fromEntries(
  ACCIONES.map((a) => [a.tipo, a])
) as Record<TipoEvento, Accion>;

export const ESTADO_LABEL: Record<Partido['estado'], string> = {
  previa: 'Sin arrancar',
  primer_tiempo: '1º tiempo',
  entretiempo: 'Entretiempo',
  segundo_tiempo: '2º tiempo',
  final: 'Final',
};

// ----------------------------------------------------------------- reloj

/**
 * Segundos de juego, calculados desde las marcas de inicio: si el teléfono se
 * bloquea o se recarga la página, el reloj sigue donde corresponde. El 2T
 * arranca en 45:00. Null cuando la pelota no está rodando.
 */
export function segundosDeJuego(
  partido: Pick<Partido, 'estado' | 'inicio_at' | 'inicio_st_at'>,
  ahora = Date.now()
) {
  if (partido.estado === 'primer_tiempo' && partido.inicio_at) {
    return Math.max(0, Math.floor((ahora - Date.parse(partido.inicio_at)) / 1000));
  }
  if (partido.estado === 'segundo_tiempo' && partido.inicio_st_at) {
    return 45 * 60 + Math.max(0, Math.floor((ahora - Date.parse(partido.inicio_st_at)) / 1000));
  }
  return null;
}

/** Minuto que se guarda en cada evento: 0:30 es el minuto 1, como en la tele. */
export function minutoDeJuego(segundos: number | null) {
  if (segundos == null) return null;
  return Math.min(130, Math.floor(segundos / 60) + 1);
}

export function formatoReloj(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- totales

export type Conteo = Record<TipoEvento, number>;

export function conteoVacio(): Conteo {
  return Object.fromEntries(ACCIONES.map((a) => [a.tipo, 0])) as Conteo;
}

/** Conteo por citado: { citadoId: { gol: 2, pase_dado: 14, ... } } */
export function contarPorCitado(eventos: Pick<EventoPartido, 'citado_id' | 'tipo'>[]) {
  const porCitado = new Map<string, Conteo>();
  for (const e of eventos) {
    const conteo = porCitado.get(e.citado_id) ?? conteoVacio();
    conteo[e.tipo] += 1;
    porCitado.set(e.citado_id, conteo);
  }
  return porCitado;
}

/** % de pases bien. Null si no dio ninguno: "0%" diría que los erró todos. */
export function precisionPases(conteo: Conteo) {
  const total = conteo.pase_dado + conteo.pase_errado;
  return total ? Math.round((conteo.pase_dado / total) * 100) : null;
}

export function totalAcciones(conteo: Conteo) {
  return ACCIONES.reduce((suma, a) => suma + conteo[a.tipo], 0);
}

export type FilaTemporada = {
  /** jugador_id si sigue en el plantel; si no, el nombre copiado. */
  clave: string;
  nombre: string;
  posicion: Citado['posicion'];
  partidos: number;
  conteo: Conteo;
};

/**
 * Suma de toda la temporada por jugador. Se agrupa por jugador_id y no por
 * citado: el mismo jugador tiene un citado distinto en cada partido.
 */
export function totalesTemporada(
  citados: Pick<Citado, 'id' | 'jugador_id' | 'nombre' | 'posicion'>[],
  eventos: Pick<EventoPartido, 'citado_id' | 'tipo'>[]
) {
  const porCitado = contarPorCitado(eventos);
  const filas = new Map<string, FilaTemporada>();

  for (const c of citados) {
    const clave = c.jugador_id ?? `nombre:${c.nombre.toLowerCase()}`;
    const fila =
      filas.get(clave) ??
      ({ clave, nombre: c.nombre, posicion: c.posicion, partidos: 0, conteo: conteoVacio() } as FilaTemporada);

    fila.partidos += 1;
    const delPartido = porCitado.get(c.id);
    if (delPartido) {
      for (const a of ACCIONES) fila.conteo[a.tipo] += delPartido[a.tipo];
    }
    filas.set(clave, fila);
  }

  return [...filas.values()];
}
