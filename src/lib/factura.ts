/**
 * Las mismas cuentas que hace la base en las columnas generadas, para que la
 * fila se actualice al instante mientras se escribe, antes de que vuelva el
 * eco de Supabase.
 *
 * El IVA se redondea a centavos por factura (es lo que sale en el
 * comprobante); `futbol` es la mitad exacta de ese IVA, sin redondear de
 * nuevo, asi el total del mes da justo la mitad del IVA del mes.
 */
export function calcularFactura(neto: number, alicuota: number) {
  const iva = Math.round(neto * alicuota * 100) / 100;
  return { iva, total: neto + iva, futbol: iva / 2 };
}
