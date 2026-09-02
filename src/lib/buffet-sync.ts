'use client';

import { createClient } from '@/lib/supabase/client';
import { db, type Producto, type Puesto, type Turno, type Venta } from '@/db/buffet';

export type ResultadoSync = {
  ok: boolean;
  turnosSubidos: number;
  ventasSubidas: number;
  productosBajados: number;
  motivo?: string;
};

/**
 * Filas tal cual viajan a Supabase. La base local usa camelCase y Postgres
 * snake_case, así que la traducción vive acá y en ningún otro lado.
 */
type FilaTurno = {
  id: string;
  puesto: Puesto;
  cajero_id: string;
  cajero_nombre: string | null;
  abierto_en: string;
  cerrado_en: string | null;
  fondo_inicial: number;
  cerrado: boolean;
};

type FilaVenta = {
  id: string;
  turno_id: string;
  items: Venta['items'];
  total: number;
  medio_pago: Venta['medioPago'];
  creado_en: string;
  anulada: boolean;
};

type FilaProducto = {
  id: string;
  puesto: Puesto;
  nombre: string;
  precio: number;
  categoria: string;
  activo: boolean;
  orden: number;
  updated_at: string;
};

async function aFilaTurno(turno: Turno): Promise<FilaTurno> {
  const cajero = await db().cajeros.get(turno.cajeroId);
  return {
    id: turno.id,
    puesto: turno.puesto,
    cajero_id: turno.cajeroId,
    // El cajero es local; sin el nombre, los turnos del servidor no dicen nada.
    cajero_nombre: cajero?.nombre ?? null,
    abierto_en: turno.abiertoEn,
    cerrado_en: turno.cerradoEn ?? null,
    fondo_inicial: turno.fondoInicial,
    cerrado: turno.cerrado,
  };
}

function aFilaVenta(venta: Venta): FilaVenta {
  return {
    id: venta.id,
    turno_id: venta.turnoId,
    items: venta.items,
    total: venta.total,
    medio_pago: venta.medioPago,
    creado_en: venta.creadoEn,
    anulada: venta.anulada,
  };
}

/**
 * Sube lo pendiente y baja el catálogo. Es idempotente: los id se generan en
 * la tablet, así que reintentar un upsert no duplica nada. `synced` se marca
 * sólo si el upsert respondió OK, para que un corte a mitad de camino se
 * reintente entero la próxima vez.
 */
export async function sincronizar(): Promise<ResultadoSync> {
  const vacio: ResultadoSync = {
    ok: false,
    turnosSubidos: 0,
    ventasSubidas: 0,
    productosBajados: 0,
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ...vacio, motivo: 'Sin conexión.' };
  }

  const supabase = createClient();
  const base = db();

  try {
    // ------------------------------------------------------------- subida
    const turnos = (await base.turnos.toArray()).filter((t) => !t.synced);
    let turnosSubidos = 0;

    if (turnos.length > 0) {
      const filas = await Promise.all(turnos.map(aFilaTurno));
      const { error } = await supabase
        .from('buffet_turnos')
        .upsert(filas, { onConflict: 'id' });
      if (error) throw error;

      await base.turnos.bulkPut(turnos.map((t) => ({ ...t, synced: true })));
      turnosSubidos = turnos.length;
    }

    const ventas = (await base.ventas.toArray()).filter((v) => !v.synced);
    let ventasSubidas = 0;

    if (ventas.length > 0) {
      const { error } = await supabase
        .from('buffet_ventas')
        .upsert(ventas.map(aFilaVenta), { onConflict: 'id' });
      if (error) throw error;

      await base.ventas.bulkPut(ventas.map((v) => ({ ...v, synced: true })));
      ventasSubidas = ventas.length;
    }

    // ------------------------------------------------------------- bajada
    let productosBajados = 0;
    const { data: remotos, error: errorProductos } = await supabase
      .from('buffet_productos')
      .select('*');

    // Si la tabla no existe todavía, la subida ya sirvió: no es un fallo.
    if (!errorProductos && remotos) {
      const locales = new Map(
        (await base.productos.toArray()).map((p) => [p.id, p])
      );

      const aGuardar: Producto[] = [];
      for (const fila of remotos as FilaProducto[]) {
        const local = locales.get(fila.id);
        // Un cambio hecho en la tablet y todavía sin subir gana: bajar no
        // puede pisar lo que el buffet acaba de corregir.
        if (local && local.updatedAt >= fila.updated_at) continue;

        aGuardar.push({
          id: fila.id,
          puesto: fila.puesto ?? 'buffet',
          nombre: fila.nombre,
          precio: Number(fila.precio),
          categoria: fila.categoria,
          activo: fila.activo,
          orden: fila.orden,
          updatedAt: fila.updated_at,
        });
      }

      if (aGuardar.length > 0) await base.productos.bulkPut(aGuardar);
      productosBajados = aGuardar.length;
    }

    return { ok: true, turnosSubidos, ventasSubidas, productosBajados };
  } catch (e) {
    const motivo =
      e instanceof Error ? e.message : 'Error desconocido al sincronizar.';
    console.error('Sincronización fallida', e);
    return { ...vacio, motivo };
  }
}

/**
 * Sincroniza al recuperar la conexión. Devuelve la función para desengancharse.
 */
export function arrancarSyncAutomatico() {
  if (typeof window === 'undefined') return () => undefined;

  const alVolver = () => void sincronizar();
  window.addEventListener('online', alVolver);

  // Si al abrir ya hay red, se aprovecha para vaciar lo que quedó pendiente.
  if (navigator.onLine) void sincronizar();

  return () => window.removeEventListener('online', alVolver);
}
