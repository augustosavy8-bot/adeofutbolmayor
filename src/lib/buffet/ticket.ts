import type { ItemVenta, MedioPago, Venta } from '@/db/buffet';
import type { ResumenTurno } from './cierre';
import { centrar, enLinea, separador } from '@/lib/printer/escpos';
import { columnasActivas } from '@/lib/printer/perfiles';

export const CLUB = 'ADEO FUTBOL MAYOR';
export const SUBTITULO = 'Buffet del club';

const MEDIO_LABEL: Record<MedioPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
};

/** "$ 1.500". Sin centavos: en el buffet no se cobran. */
export function pesos(monto: number) {
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
    Math.round(monto)
  )}`;
}

function fechaHora(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

function hora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

/**
 * Los tres helpers ya atados al ancho del ticket. Existen porque el ancho
 * cambia con la impresora — 48 columnas en la XP-80 de 80 mm, 32 en la
 * portátil de 58 — y pasarlo en cada llamada era imposible de leer.
 */
function formato(ancho: number) {
  return {
    linea: (izq: string, der: string) => enLinea(izq, der, ancho),
    sep: (caracter = '-') => separador(caracter, ancho),
    centro: (texto: string) => centrar(texto, ancho),
    item: (item: ItemVenta) =>
      enLinea(
        `${item.cantidad} x ${item.nombre}`,
        pesos(item.precio * item.cantidad),
        ancho
      ),
  };
}

/**
 * Ticket de prueba. La regla numerada sirve para ver de un vistazo si el papel
 * y la fuente dan las columnas del perfil: si se corta o se parte en dos
 * renglones, la impresora elegida no es la que hay enchufada.
 */
export function ticketPrueba(ancho = columnasActivas()): string[] {
  const f = formato(ancho);
  const regla = Array.from({ length: ancho }, (_, i) => String((i + 1) % 10)).join('');

  return [
    f.centro(CLUB),
    f.centro('PRUEBA DE IMPRESION'),
    f.sep(),
    fechaHora(new Date().toISOString()),
    `${ancho} columnas`,
    '',
    regla,
    f.sep('='),
    f.linea('Izquierda', 'Derecha'),
    f.centro('Centrado'),
    f.sep(),
    f.centro('Si se lee esto, esta lista.'),
    '',
  ];
}

/** Ticket de una venta. Sale solo apenas se cobra. */
export function ticketVenta(
  venta: Venta,
  cajero: string,
  ancho = columnasActivas()
): string[] {
  const f = formato(ancho);

  return [
    f.centro(CLUB),
    f.centro(SUBTITULO),
    f.sep('='),
    f.linea('Fecha', fechaHora(venta.creadoEn)),
    f.linea('Cajero', cajero),
    f.sep(),
    ...venta.items.map(f.item),
    f.sep(),
    f.linea('TOTAL', pesos(venta.total)),
    f.linea('Pago', MEDIO_LABEL[venta.medioPago]),
    '',
    f.centro('Gracias por acompanar al club'),
    f.centro(venta.id.slice(0, 8)),
  ];
}

/**
 * Ticket de entrada: es lo que la persona muestra para pasar, así que va
 * grande y con lo mínimo. El de menor de 12 se imprime igual aunque no pague:
 * sirve para contarlo y para que tenga su comprobante.
 */
export function ticketEntrada(
  venta: Venta,
  cajero: string,
  ancho = columnasActivas()
): string[] {
  const f = formato(ancho);
  const item = venta.items[0];

  return [
    f.centro(CLUB),
    f.centro('ENTRADA'),
    f.sep('='),
    '',
    f.centro((item?.nombre ?? '').toUpperCase()),
    f.centro(venta.total > 0 ? pesos(venta.total) : 'SIN CARGO'),
    '',
    f.sep(),
    f.linea('Fecha', fechaHora(venta.creadoEn)),
    f.linea('Cajero', cajero),
    f.linea('Nro', venta.id.slice(0, 8).toUpperCase()),
    '',
    f.centro('Valido para el ingreso de hoy'),
    f.centro('No reembolsable'),
  ];
}

/**
 * Cierre de caja, en texto plano ESC/POS. Todo lo que hace falta para arquear
 * sin abrir la tablet: qué se vendió, cómo se cobró y cuánta plata tiene que
 * haber en la caja.
 */
export function ticketCierre(
  resumen: ResumenTurno,
  ancho = columnasActivas()
): string[] {
  const f = formato(ancho);

  const lineas: string[] = [
    f.centro(CLUB),
    f.centro('CIERRE DE CAJA'),
    f.sep('='),
    f.linea('Cajero', resumen.cajero),
    f.linea('Apertura', fechaHora(resumen.abiertoEn)),
    f.linea(
      'Cierre',
      resumen.cerradoEn ? fechaHora(resumen.cerradoEn) : hora(new Date().toISOString())
    ),
    f.sep('='),
    'VENTAS POR PRODUCTO',
    f.sep(),
  ];

  if (resumen.porProducto.length === 0) {
    lineas.push('  (sin ventas en el turno)');
  } else {
    for (const p of resumen.porProducto) {
      lineas.push(f.linea(`${p.cantidad} x ${p.nombre}`, pesos(p.total)));
    }
  }

  lineas.push(
    f.sep(),
    f.linea(
      `TOTAL (${resumen.ventasValidas} ${resumen.ventasValidas === 1 ? 'venta' : 'ventas'})`,
      pesos(resumen.totalGeneral)
    ),
    '',
    'POR MEDIO DE PAGO',
    f.sep()
  );

  if (resumen.porMedio.length === 0) {
    lineas.push('  (sin cobros)');
  } else {
    for (const m of resumen.porMedio) {
      lineas.push(f.linea(`${MEDIO_LABEL[m.medio]} (${m.cantidad})`, pesos(m.total)));
    }
  }

  lineas.push(
    '',
    'ANULADAS',
    f.sep(),
    f.linea(
      `${resumen.anuladas.cantidad} ${resumen.anuladas.cantidad === 1 ? 'venta' : 'ventas'}`,
      pesos(resumen.anuladas.total)
    ),
    '',
    'CAJA',
    f.sep(),
    f.linea('Fondo inicial', pesos(resumen.fondoInicial)),
    f.linea('Cobrado efectivo', pesos(resumen.efectivoVendido)),
    f.linea('EFECTIVO ESPERADO', pesos(resumen.efectivoEsperado)),
    f.sep('='),
    f.linea('TOTAL GENERAL', pesos(resumen.totalGeneral)),
    '',
    f.centro('Firma: ________________'),
    ''
  );

  return lineas;
}

/** Un turno ya resumido, para el reporte consolidado. */
export type TurnoDelReporte = {
  resumen: ResumenTurno;
  synced: boolean;
};

/**
 * Reporte de varios turnos en papel. Es la alternativa al export JSON para un
 * club sin conexión: se imprime y se archiva, sin depender de mandar un
 * archivo a ningún lado.
 */
export function ticketReporte(
  puesto: string,
  turnos: TurnoDelReporte[],
  ancho = columnasActivas()
): string[] {
  const f = formato(ancho);

  const lineas: string[] = [
    f.centro(CLUB),
    f.centro('REPORTE DE TURNOS'),
    f.sep('='),
    f.linea('Puesto', puesto),
    f.linea('Emitido', fechaHora(new Date().toISOString())),
    f.linea('Turnos', String(turnos.length)),
    f.sep('='),
  ];

  if (turnos.length === 0) {
    lineas.push('  (no hay turnos cerrados)', '');
  }

  for (const { resumen, synced } of turnos) {
    lineas.push(
      `${fechaHora(resumen.abiertoEn)} - ${
        resumen.cerradoEn ? hora(resumen.cerradoEn) : 'abierto'
      }`,
      f.linea(
        `  ${resumen.cajero}`,
        `${resumen.ventasValidas} ${resumen.ventasValidas === 1 ? 'venta' : 'ventas'}`
      ),
      f.linea('  Efectivo', pesos(resumen.efectivoVendido)),
      f.linea('  Total', pesos(resumen.totalGeneral))
    );

    if (resumen.anuladas.cantidad > 0) {
      lineas.push(
        f.linea(`  Anuladas (${resumen.anuladas.cantidad})`, pesos(resumen.anuladas.total))
      );
    }
    // Marca lo que todavía no llegó al servidor: sin conexión es el único
    // lugar donde queda registrado que falta subirlo.
    if (!synced) lineas.push('  * sin sincronizar');

    lineas.push(f.sep());
  }

  const total = turnos.reduce((a, t) => a + t.resumen.totalGeneral, 0);
  const efectivo = turnos.reduce((a, t) => a + t.resumen.efectivoVendido, 0);
  const ventas = turnos.reduce((a, t) => a + t.resumen.ventasValidas, 0);
  const pendientes = turnos.filter((t) => !t.synced).length;

  lineas.push(
    f.linea(`TOTAL (${ventas} ventas)`, pesos(total)),
    f.linea('Efectivo', pesos(efectivo)),
    f.sep('=')
  );

  if (pendientes > 0) {
    lineas.push(
      f.centro(`${pendientes} turno(s) sin sincronizar`),
      f.centro('subir cuando haya conexion')
    );
  }

  lineas.push('', f.centro('Firma: ________________'), '');
  return lineas;
}
