'use client';

import type { Transporte } from './tipos';

export type PerfilId = 'xp80' | 'goojprt58';

export interface PerfilImpresora {
  id: PerfilId;
  label: string;
  /** Ancho de render en px para imprimir imágenes: 576 en 80 mm, 384 en 58 mm. */
  anchoPx: number;
  /** Ancho físico del papel. Lo usa la impresión por driver del sistema. */
  papelMm: number;
  /** Columnas en fuente A. Es lo que decide cómo se arman los tickets. */
  columnas: number;
  /** Formas de conectarse que tienen sentido para esta impresora, en orden. */
  transportes: Transporte[];
  /** La portátil no tiene guillotina: se avanza papel y se corta a mano. */
  guillotina: boolean;
  /** Líneas de avance al final del ticket. */
  lineasAvance: number;
  /** Bytes por escritura BLE. Si manda basura o se corta, bajalo a 100. */
  bleChunk: number;
  /** Pausa entre chunks (ms). El buffer de estas impresoras es chico. */
  bleEsperaMs: number;
  /** Sólo para el transporte `red`. */
  host?: string;
  puerto?: number;
}

export const PERFILES: Record<PerfilId, PerfilImpresora> = {
  xp80: {
    id: 'xp80',
    label: 'XP-80 (mostrador, 80 mm)',
    anchoPx: 576,
    papelMm: 80,
    columnas: 48,
    // Primero las que imprimen sin diálogo; el driver del sistema queda último
    // porque es el único que lo abre.
    transportes: ['usb', 'serie', 'red', 'sistema'],
    guillotina: true,
    lineasAvance: 3,
    bleChunk: 0,
    bleEsperaMs: 0,
    host: '192.168.0.100',
    puerto: 9100,
  },
  goojprt58: {
    id: 'goojprt58',
    label: 'GOOJPRT portátil (58 mm)',
    anchoPx: 384,
    papelMm: 58,
    columnas: 32,
    transportes: ['bluetooth', 'usb', 'sistema'],
    guillotina: false,
    lineasAvance: 5, // más avance porque se corta a mano
    bleChunk: 180,
    bleEsperaMs: 20,
  },
};

const CLAVE = 'adeo.impresora.perfil';

export function getPerfil(): PerfilImpresora {
  if (typeof localStorage === 'undefined') return PERFILES.xp80;
  const guardado = localStorage.getItem(CLAVE) as PerfilId | null;
  return (guardado && PERFILES[guardado]) || PERFILES.xp80;
}

export function setPerfil(id: PerfilId) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CLAVE, id);
}

export function listarPerfiles(): PerfilImpresora[] {
  return Object.values(PERFILES);
}

/**
 * Columnas del perfil activo. Es el ancho con el que se arman los tickets, y
 * por eso se lee acá y no se pasa desde cada pantalla: cambiar de impresora
 * tiene que reformatear todo solo.
 */
export function columnasActivas() {
  return getPerfil().columnas;
}
