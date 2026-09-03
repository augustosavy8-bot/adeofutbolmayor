'use client';

import { ImpresoraEscPos } from './base';
import { getPerfil } from './perfiles';
import { ImpresoraNoDisponible, type EstadoImpresora } from './tipos';

/**
 * A dónde mandarle los bytes. Por defecto la propia app (`/api/print`), que
 * sirve cuando el POS corre en una máquina de la red del club.
 *
 * Si la app está publicada en Vercel, ese servidor está en internet y no llega
 * a la impresora: hay que levantar el puente en una máquina de la red y
 * apuntarle acá. Tiene que ser `localhost` o HTTPS — el navegador bloquea los
 * pedidos a http:// desde una página https://, salvo a la propia máquina.
 */
const CLAVE_PUENTE = 'adeo.impresora.puente';
const PUENTE_POR_DEFECTO = '/api/print';

export function getPuente() {
  if (typeof localStorage === 'undefined') return PUENTE_POR_DEFECTO;
  return localStorage.getItem(CLAVE_PUENTE) || PUENTE_POR_DEFECTO;
}

export function setPuente(url: string) {
  if (typeof localStorage === 'undefined') return;
  const limpio = url.trim();
  if (limpio) localStorage.setItem(CLAVE_PUENTE, limpio);
  else localStorage.removeItem(CLAVE_PUENTE);
}

/** ESC/POS al puerto 9100 de una impresora de red, a través del puente. */
export class ImpresoraRed extends ImpresoraEscPos {
  readonly nombre = 'Red (puerto 9100)';
  private lista = false;

  get estado(): EstadoImpresora {
    if (typeof fetch === 'undefined') return 'sin-soporte';
    return this.lista ? 'conectada' : 'desconectada';
  }

  async connect() {
    const alcanzable = await this.probar();
    if (!alcanzable) {
      const { host, puerto } = getPerfil();
      throw new ImpresoraNoDisponible(
        `No se llega a la impresora en ${host}:${puerto}. Fijate que esté ` +
          'encendida, en la misma red, y que el puente corra en una máquina de ' +
          'esa red.'
      );
    }
  }

  /** Se prueba de verdad: un socket vacío contra la impresora. */
  async reconnect() {
    this.lista = await this.probar();
    return this.lista;
  }

  private async probar() {
    try {
      // Sin cuerpo el puente sólo abre y cierra la conexión: alcanza para
      // saber si la impresora está, sin gastar papel.
      await this.mandar(new Uint8Array(0), 3000);
      this.lista = true;
      return true;
    } catch {
      this.lista = false;
      return false;
    }
  }

  protected async enviar(datos: Uint8Array) {
    await this.mandar(datos, 10000);
    this.lista = true;
  }

  private async mandar(datos: Uint8Array, esperaMs: number) {
    const perfil = getPerfil();
    if (!perfil.host) {
      throw new ImpresoraNoDisponible(
        'Este perfil no tiene dirección de impresora de red.'
      );
    }

    // Sin corte, un puente caído deja la venta esperando para siempre.
    const corte = AbortSignal.timeout(esperaMs);

    let respuesta: Response;
    try {
      respuesta = await fetch(getPuente(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Printer-Host': perfil.host,
          'X-Printer-Port': String(perfil.puerto ?? 9100),
        },
        // Se copia a un ArrayBuffer propio: el Uint8Array podría venir de un
        // SharedArrayBuffer, que fetch no acepta.
        body: datos.slice().buffer as ArrayBuffer,
        signal: corte,
      });
    } catch (e) {
      this.lista = false;
      const crudo = e instanceof Error ? e.message : String(e);
      throw new ImpresoraNoDisponible(
        /abort|timeout/i.test(crudo)
          ? 'El puente de impresión no contestó a tiempo.'
          : `No se pudo llegar al puente de impresión: ${crudo}`
      );
    }

    if (!respuesta.ok) {
      this.lista = false;
      const detalle = await respuesta
        .json()
        .then((j: { error?: string }) => j.error)
        .catch(() => null);
      throw new ImpresoraNoDisponible(
        detalle ?? `El puente de impresión respondió ${respuesta.status}.`
      );
    }
  }
}
