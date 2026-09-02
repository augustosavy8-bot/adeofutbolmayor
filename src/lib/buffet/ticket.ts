import type { ItemVenta, MedioPago, Venta } from '@/db/buffet';
import type { ResumenTurno } from './cierre';
import { ANCHO_TICKET, centrar, enLinea, separador } from '@/lib/printer/escpos';

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

function lineaItem(item: ItemVenta) {
  const detalle = `${item.cantidad} x ${item.nombre}`;
  return enLinea(detalle, pesos(item.precio * item.cantidad));
}

/** Ticket de una venta. Opcional: se imprime según el toggle de configuración. */
export function ticketVenta(venta: Venta, cajero: string): string[] {
  return [
    centrar(CLUB),
    centrar(SUBTITULO),
    separador('='),
    enLinea('Fecha', fechaHora(venta.creadoEn)),
    enLinea('Cajero', cajero),
    separador(),
    ...venta.items.map(lineaItem),
    separador(),
    enLinea('TOTAL', pesos(venta.total)),
    enLinea('Pago', MEDIO_LABEL[venta.medioPago]),
    '',
    centrar('Gracias por acompanar al club'),
    centrar(venta.id.slice(0, 8)),
  ];
}

/**
 * Ticket de entrada: es lo que la persona muestra para pasar, así que va
 * grande y con lo mínimo. El de menor de 12 se imprime igual aunque no pague:
 * sirve para contarlo y para que tenga su comprobante.
 */
export function ticketEntrada(venta: Venta, cajero: string): string[] {
  const item = venta.items[0];

  return [
    centrar(CLUB),
    centrar('ENTRADA'),
    separador('='),
    '',
    centrar((item?.nombre ?? '').toUpperCase()),
    centrar(venta.total > 0 ? pesos(venta.total) : 'SIN CARGO'),
    '',
    separador(),
    enLinea('Fecha', fechaHora(venta.creadoEn)),
    enLinea('Cajero', cajero),
    enLinea('Nro', venta.id.slice(0, 8).toUpperCase()),
    '',
    centrar('Valido para el ingreso de hoy'),
    centrar('No reembolsable'),
  ];
}

/**
 * Cierre de caja, en texto plano ESC/POS. Todo lo que hace falta para arquear
 * sin abrir la tablet: qué se vendió, cómo se cobró y cuánta plata tiene que
 * haber en la caja.
 */
export function ticketCierre(resumen: ResumenTurno): string[] {
  const lineas: string[] = [
    centrar(CLUB),
    centrar('CIERRE DE CAJA'),
    separador('='),
    enLinea('Cajero', resumen.cajero),
    enLinea('Apertura', fechaHora(resumen.abiertoEn)),
    enLinea('Cierre', resumen.cerradoEn ? fechaHora(resumen.cerradoEn) : hora(new Date().toISOString())),
    separador('='),
    'VENTAS POR PRODUCTO',
    separador(),
  ];

  if (resumen.porProducto.length === 0) {
    lineas.push('  (sin ventas en el turno)');
  } else {
    for (const p of resumen.porProducto) {
      lineas.push(enLinea(`${p.cantidad} x ${p.nombre}`, pesos(p.total)));
    }
  }

  lineas.push(
    separador(),
    enLinea(
      `TOTAL (${resumen.ventasValidas} ${resumen.ventasValidas === 1 ? 'venta' : 'ventas'})`,
      pesos(resumen.totalGeneral)
    ),
    '',
    'POR MEDIO DE PAGO',
    separador()
  );

  if (resumen.porMedio.length === 0) {
    lineas.push('  (sin cobros)');
  } else {
    for (const m of resumen.porMedio) {
      lineas.push(
        enLinea(`${MEDIO_LABEL[m.medio]} (${m.cantidad})`, pesos(m.total))
      );
    }
  }

  lineas.push(
    '',
    'ANULADAS',
    separador(),
    enLinea(
      `${resumen.anuladas.cantidad} ${resumen.anuladas.cantidad === 1 ? 'venta' : 'ventas'}`,
      pesos(resumen.anuladas.total)
    ),
    '',
    'CAJA',
    separador(),
    enLinea('Fondo inicial', pesos(resumen.fondoInicial)),
    enLinea('Cobrado en efectivo', pesos(resumen.efectivoVendido)),
    enLinea('EFECTIVO ESPERADO', pesos(resumen.efectivoEsperado)),
    separador('='),
    enLinea('TOTAL GENERAL', pesos(resumen.totalGeneral)),
    '',
    centrar('Firma: ____________________'),
    '',
  );

  return lineas;
}

export { ANCHO_TICKET };
