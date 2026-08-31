import type { Cajero, MedioPago, Turno, Venta } from '@/db/buffet';

export type LineaProducto = { nombre: string; cantidad: number; total: number };
export type LineaMedio = { medio: MedioPago; cantidad: number; total: number };

export type ResumenTurno = {
  cajero: string;
  abiertoEn: string;
  cerradoEn: string | null;
  fondoInicial: number;
  /** Ordenado por total facturado, de mayor a menor. */
  porProducto: LineaProducto[];
  porMedio: LineaMedio[];
  anuladas: { cantidad: number; total: number };
  ventasValidas: number;
  totalGeneral: number;
  efectivoVendido: number;
  /** Lo que tiene que haber en la caja: fondo inicial + lo cobrado en efectivo. */
  efectivoEsperado: number;
};

/**
 * Arma el arqueo del turno. Las ventas anuladas no suman a ningún total: se
 * informan aparte, que es justamente para lo que sirve no borrarlas.
 */
export function resumirTurno(
  turno: Turno,
  ventas: Venta[],
  cajero: Cajero | null
): ResumenTurno {
  const validas = ventas.filter((v) => !v.anulada);
  const anuladas = ventas.filter((v) => v.anulada);

  const productos = new Map<string, LineaProducto>();
  for (const venta of validas) {
    for (const item of venta.items) {
      const previo = productos.get(item.nombre) ?? {
        nombre: item.nombre,
        cantidad: 0,
        total: 0,
      };
      previo.cantidad += item.cantidad;
      previo.total += item.precio * item.cantidad;
      productos.set(item.nombre, previo);
    }
  }

  const medios = new Map<MedioPago, LineaMedio>();
  for (const venta of validas) {
    const previo = medios.get(venta.medioPago) ?? {
      medio: venta.medioPago,
      cantidad: 0,
      total: 0,
    };
    previo.cantidad += 1;
    previo.total += venta.total;
    medios.set(venta.medioPago, previo);
  }

  const totalGeneral = validas.reduce((acc, v) => acc + v.total, 0);
  const efectivoVendido = medios.get('efectivo')?.total ?? 0;

  return {
    cajero: cajero?.nombre ?? 'Sin identificar',
    abiertoEn: turno.abiertoEn,
    cerradoEn: turno.cerradoEn ?? null,
    fondoInicial: turno.fondoInicial,
    porProducto: [...productos.values()].sort((a, b) => b.total - a.total),
    porMedio: [...medios.values()].sort((a, b) => b.total - a.total),
    anuladas: {
      cantidad: anuladas.length,
      total: anuladas.reduce((acc, v) => acc + v.total, 0),
    },
    ventasValidas: validas.length,
    totalGeneral,
    efectivoVendido,
    efectivoEsperado: turno.fondoInicial + efectivoVendido,
  };
}
