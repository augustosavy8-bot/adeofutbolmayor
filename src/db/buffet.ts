import Dexie, { type Table } from 'dexie';

export type MedioPago = 'efectivo' | 'transferencia' | 'qr';

/**
 * Los dos puestos de venta del club. Comparten base, impresora y cierre, pero
 * cada uno tiene sus propios productos y su propio turno, así el arqueo del
 * buffet no se mezcla con el de la boletería.
 */
export type Puesto = 'buffet' | 'entrada';

export const PUESTOS: Record<Puesto, { label: string; base: string }> = {
  buffet: { label: 'Buffet', base: '/buffet' },
  entrada: { label: 'Entrada', base: '/entrada' },
};

export const MEDIOS_PAGO: { valor: MedioPago; label: string }[] = [
  { valor: 'efectivo', label: 'Efectivo' },
  { valor: 'transferencia', label: 'Transferencia' },
  { valor: 'qr', label: 'QR' },
];

export type Producto = {
  id: string;
  puesto: Puesto;
  nombre: string;
  precio: number;
  categoria: string;
  activo: boolean;
  orden: number;
  /** ISO. Lo usa el sync para no pisar un cambio local más nuevo. */
  updatedAt: string;
};

export type Cajero = {
  id: string;
  nombre: string;
  /** sha-256 en hexa del PIN. No se guarda el PIN en claro. */
  pin: string;
  activo: boolean;
};

export type Turno = {
  id: string;
  puesto: Puesto;
  cajeroId: string;
  abiertoEn: string;
  cerradoEn?: string;
  fondoInicial: number;
  cerrado: boolean;
  synced: boolean;
};

export type ItemVenta = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

export type Venta = {
  id: string;
  turnoId: string;
  items: ItemVenta[];
  total: number;
  medioPago: MedioPago;
  creadoEn: string;
  anulada: boolean;
  synced: boolean;
};

export type Ajuste = {
  clave: string;
  valor: string;
};

/**
 * IndexedDB no acepta booleanos como clave de índice: un registro con
 * `synced: false` simplemente no entra en el índice y las consultas lo
 * saltean. Por eso `activo`, `cerrado`, `anulada` y `synced` quedan sin
 * indexar y se filtran en memoria — los volúmenes de un turno son chicos y
 * no se nota.
 */
export class BuffetDB extends Dexie {
  productos!: Table<Producto, string>;
  cajeros!: Table<Cajero, string>;
  turnos!: Table<Turno, string>;
  ventas!: Table<Venta, string>;
  ajustes!: Table<Ajuste, string>;

  constructor() {
    super('adeo-buffet');
    this.version(1).stores({
      productos: 'id, categoria, orden, nombre',
      cajeros: 'id, nombre',
      turnos: 'id, cajeroId, abiertoEn',
      ventas: 'id, turnoId, creadoEn',
      ajustes: 'clave',
    });

    // v2 suma el puesto. Lo que ya estaba cargado era del buffet, que era el
    // único que existía.
    this.version(2)
      .stores({
        productos: 'id, puesto, categoria, orden, nombre',
        cajeros: 'id, nombre',
        turnos: 'id, puesto, cajeroId, abiertoEn',
        ventas: 'id, turnoId, creadoEn',
        ajustes: 'clave',
      })
      .upgrade(async (tx) => {
        await tx
          .table('productos')
          .toCollection()
          .modify((p) => {
            p.puesto ??= 'buffet';
          });
        await tx
          .table('turnos')
          .toCollection()
          .modify((t) => {
            t.puesto ??= 'buffet';
          });
      });
  }
}

/**
 * La base se instancia perezosamente: importar este módulo desde el servidor
 * (aunque sea por el árbol de imports) no debe tocar IndexedDB.
 */
let instancia: BuffetDB | null = null;

export function db(): BuffetDB {
  if (!instancia) instancia = new BuffetDB();
  return instancia;
}

/** Los ids se generan en la tablet para que el upsert por id sea idempotente. */
export function uuid() {
  return crypto.randomUUID();
}

// ------------------------------------------------------------------ ajustes
// Almacén genérico de preferencias de la tablet. Hoy no hay ninguna: el
// ticket por venta dejó de ser opcional.

export async function leerAjuste(clave: string) {
  return (await db().ajustes.get(clave))?.valor ?? null;
}

export async function guardarAjuste(clave: string, valor: string) {
  await db().ajustes.put({ clave, valor });
}

// ------------------------------------------------------------------- turnos
export async function turnoAbierto(puesto: Puesto): Promise<Turno | undefined> {
  return (await db().turnos.toArray()).find(
    (t) => !t.cerrado && t.puesto === puesto
  );
}

export async function abrirTurno(
  cajeroId: string,
  fondoInicial: number,
  puesto: Puesto
) {
  const turno: Turno = {
    id: uuid(),
    puesto,
    cajeroId,
    abiertoEn: new Date().toISOString(),
    fondoInicial,
    cerrado: false,
    synced: false,
  };
  await db().turnos.add(turno);
  return turno;
}

export async function cerrarTurno(turnoId: string) {
  await db().turnos.update(turnoId, {
    cerrado: true,
    cerradoEn: new Date().toISOString(),
    synced: false,
  });
}

// ------------------------------------------------------------------- ventas
export async function registrarVenta(
  turnoId: string,
  items: ItemVenta[],
  medioPago: MedioPago
) {
  const venta: Venta = {
    id: uuid(),
    turnoId,
    items,
    total: items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    medioPago,
    creadoEn: new Date().toISOString(),
    anulada: false,
    synced: false,
  };
  await db().ventas.add(venta);
  return venta;
}

/** Anular no borra: la venta queda para el arqueo y para el sync. */
export async function anularVenta(ventaId: string) {
  await db().ventas.update(ventaId, { anulada: true, synced: false });
}

export async function ventasDelTurno(turnoId: string) {
  return db().ventas.where('turnoId').equals(turnoId).sortBy('creadoEn');
}

// ------------------------------------------------------------------ cajeros
/** sha-256 en hexa. Alcanza para que el PIN no quede en claro en la tablet. */
export async function hashPin(pin: string) {
  const datos = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verificarPin(cajero: Cajero, pin: string) {
  return cajero.pin === (await hashPin(pin));
}

export async function crearCajero(nombre: string, pin: string) {
  const cajero: Cajero = {
    id: uuid(),
    nombre: nombre.trim(),
    pin: await hashPin(pin),
    activo: true,
  };
  await db().cajeros.add(cajero);
  return cajero;
}

export async function cajerosActivos() {
  return (await db().cajeros.orderBy('nombre').toArray()).filter((c) => c.activo);
}

// ---------------------------------------------------------------- productos
export async function productosActivos(puesto: Puesto) {
  const todos = await db().productos.orderBy('orden').toArray();
  return todos.filter((p) => p.activo && p.puesto === puesto);
}

export async function productosDelPuesto(puesto: Puesto) {
  const todos = await db().productos.orderBy('orden').toArray();
  return todos.filter((p) => p.puesto === puesto);
}

/**
 * Precios de boletería del clásico, tal como los pasó el club. Se siembran la
 * primera vez que se abre la entrada en una tablet; después se editan desde
 * Config como cualquier producto.
 *
 * "Menor de 12" va en 0: no paga, pero se carga igual para contarlo como
 * ingresado y darle su ticket.
 */
export const ENTRADAS_CLASICO = [
  { nombre: 'General', precio: 12000 },
  { nombre: 'Deportista', precio: 5000 },
  { nombre: 'Menor de 12', precio: 0 },
];

/** Idempotente: si el puesto ya tiene algo cargado, no toca nada. */
export async function sembrarEntradas() {
  if ((await productosDelPuesto('entrada')).length > 0) return;

  const ahora = new Date().toISOString();
  await db().productos.bulkAdd(
    ENTRADAS_CLASICO.map((e, i) => ({
      id: uuid(),
      puesto: 'entrada' as const,
      nombre: e.nombre,
      precio: e.precio,
      categoria: 'Clásico',
      activo: true,
      orden: i + 1,
      updatedAt: ahora,
    }))
  );
}

export async function guardarProducto(
  producto: Omit<Producto, 'updatedAt'> & { updatedAt?: string }
) {
  await db().productos.put({ ...producto, updatedAt: new Date().toISOString() });
}
