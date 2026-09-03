'use client';

import { SERVICIOS } from './bluetooth';
import { getPerfil } from './perfiles';
import { getPreferencia } from './index';

/**
 * Qué ve el navegador, en texto para copiar y pegar.
 *
 * Existe porque "no conecta" puede ser cinco cosas distintas —el navegador no
 * soporta la API, el aparato es de Bluetooth clásico, el servicio no está en
 * la lista, no hay característica de escritura, el sistema tiene tomada la
 * impresora— y desde afuera no hay forma de saber cuál es sin preguntar.
 */
export function diagnosticoBase(): string[] {
  const perfil = getPerfil();
  const nav = typeof navigator === 'undefined' ? null : navigator;

  return [
    '--- IMPRESORA: DIAGNOSTICO ---',
    `Impresora elegida: ${perfil.label}`,
    `Conexion elegida: ${getPreferencia()}`,
    '',
    `Bluetooth (BLE):  ${nav && 'bluetooth' in nav ? 'disponible' : 'NO disponible'}`,
    `USB (WebUSB):     ${nav && 'usb' in nav ? 'disponible' : 'NO disponible'}`,
    `Puerto COM:       ${nav && 'serial' in nav ? 'disponible' : 'NO disponible'}`,
    // Sin contexto seguro no existe ninguna de las tres, y es un motivo que se
    // arregla solo con abrir la app por HTTPS.
    `Contexto seguro:  ${typeof isSecureContext === 'undefined' || isSecureContext ? 'si' : 'NO (hace falta HTTPS)'}`,
    `Navegador:        ${nav?.userAgent ?? 'desconocido'}`,
  ];
}

/**
 * Se conecta y lista todo lo que la impresora expone. Es lo que hace falta
 * para saber si el problema es el UUID del servicio, la falta de una
 * característica de escritura, o que el aparato no sea BLE.
 */
export async function diagnosticoBluetooth(): Promise<string[]> {
  const lineas = [...diagnosticoBase(), '', '--- BLUETOOTH ---'];

  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    lineas.push(
      'Este navegador no tiene Web Bluetooth.',
      'En iPhone y iPad no existe en ningun navegador.',
      'En Android hace falta Chrome; en la compu, Chrome o Edge.'
    );
    return lineas;
  }

  try {
    const disponible = await navigator.bluetooth.getAvailability();
    lineas.push(`Adaptador Bluetooth: ${disponible ? 'encendido' : 'APAGADO o inexistente'}`);
  } catch {
    lineas.push('Adaptador Bluetooth: no se pudo consultar');
  }

  let dispositivo: BluetoothDevice;
  try {
    dispositivo = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICIOS,
    });
  } catch (e) {
    lineas.push(`No se eligio ningun aparato: ${e instanceof Error ? e.message : String(e)}`);
    return lineas;
  }

  lineas.push(`Aparato: ${dispositivo.name ?? '(sin nombre)'}`, `Id: ${dispositivo.id}`);

  if (!dispositivo.gatt) {
    lineas.push(
      'El aparato NO expone GATT: es Bluetooth clasico (SPP), no BLE.',
      'Ninguna pagina web puede usarlo. Por eso anda en la app del',
      'fabricante, que es nativa, y no aca. Salida: conectarla por USB.'
    );
    return lineas;
  }

  let servidor;
  try {
    servidor = await dispositivo.gatt.connect();
  } catch (e) {
    lineas.push(`No se pudo conectar al GATT: ${e instanceof Error ? e.message : String(e)}`);
    return lineas;
  }

  let servicios;
  try {
    servicios = await servidor.getPrimaryServices();
  } catch (e) {
    lineas.push(`No se pudieron leer los servicios: ${e instanceof Error ? e.message : String(e)}`);
    return lineas;
  }

  lineas.push('', `Servicios visibles: ${servicios.length}`);

  if (servicios.length === 0) {
    lineas.push(
      'Cero servicios conocidos. El navegador solo deja ver los que la app',
      'pide de antemano, asi que lo mas probable es que esta impresora use',
      'un UUID que no esta en la lista. Con el UUID se agrega y anda.'
    );
    return lineas;
  }

  let escribibles = 0;
  for (const servicio of servicios) {
    lineas.push('', `Servicio ${servicio.uuid}`);
    try {
      const caracteristicas = await servicio.getCharacteristics();
      if (caracteristicas.length === 0) lineas.push('  (sin caracteristicas)');
      for (const c of caracteristicas) {
        const props = [
          c.properties.write && 'write',
          c.properties.writeWithoutResponse && 'writeWithoutResponse',
          c.properties.read && 'read',
          c.properties.notify && 'notify',
        ].filter(Boolean);
        if (c.properties.write || c.properties.writeWithoutResponse) escribibles++;
        lineas.push(`  ${c.uuid}  [${props.join(', ') || 'sin permisos'}]`);
      }
    } catch (e) {
      lineas.push(`  no se pudieron leer: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  lineas.push(
    '',
    escribibles > 0
      ? `Hay ${escribibles} caracteristica(s) de escritura: deberia imprimir.`
      : 'Ninguna caracteristica acepta escritura: no hay por donde mandar el ticket.'
  );

  return lineas;
}

/** Lo mismo para USB, que en Windows falla por el driver del sistema. */
export async function diagnosticoUsb(): Promise<string[]> {
  const lineas = [...diagnosticoBase(), '', '--- USB ---'];

  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    lineas.push('Este navegador no tiene WebUSB. Hace falta Chrome o Edge.');
    return lineas;
  }

  const ya = await navigator.usb.getDevices();
  lineas.push(`Aparatos con permiso ya dado: ${ya.length}`);

  let dispositivo: USBDevice;
  try {
    dispositivo = await navigator.usb.requestDevice({ filters: [] });
  } catch (e) {
    lineas.push(`No se eligio ningun aparato: ${e instanceof Error ? e.message : String(e)}`);
    return lineas;
  }

  lineas.push(
    `Aparato: ${dispositivo.productName ?? '(sin nombre)'}`,
    `Fabricante: ${dispositivo.manufacturerName ?? '(sin dato)'}`,
    `vendorId 0x${dispositivo.vendorId.toString(16)} productId 0x${dispositivo.productId.toString(16)}`
  );

  try {
    if (!dispositivo.opened) await dispositivo.open();
    lineas.push('Se pudo abrir el aparato.');
  } catch (e) {
    const crudo = e instanceof Error ? e.message : String(e);
    lineas.push(
      `NO se pudo abrir: ${crudo}`,
      /access denied/i.test(crudo)
        ? 'El sistema operativo tiene tomada la impresora con su propio driver. ' +
          'Pasa siempre en Windows y Mac. Usa el puerto COM o el driver del sistema.'
        : ''
    );
    return lineas.filter(Boolean);
  }

  for (const config of dispositivo.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const salida = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
        lineas.push(
          `Interfaz ${iface.interfaceNumber} clase 0x${alt.interfaceClass.toString(16)}` +
            (salida ? ` - salida en endpoint ${salida.endpointNumber}` : ' - sin salida')
        );
      }
    }
  }

  return lineas;
}
