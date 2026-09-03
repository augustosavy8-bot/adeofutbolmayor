import { NextResponse } from 'next/server';
import net from 'node:net';

/** Abre un socket TCP, así que no puede correr en el runtime edge. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUERTOS_PERMITIDOS = [9100, 9101, 9102, 9103];
const LIMITE_BYTES = 2 * 1024 * 1024;
const ESPERA_MS = 5000;

/**
 * Sólo direcciones de red local.
 *
 * Sin esto el endpoint sería un proxy TCP abierto: cualquiera que llegue a la
 * app podría hacerle abrir conexiones a donde quiera. Como del otro lado sólo
 * hay una impresora en la red del club, se limita a los rangos privados.
 */
function esRedLocal(host: string) {
  const partes = host.split('.');
  if (partes.length !== 4) return false;

  const n = partes.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;

  const [a, b] = n;
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function enviarATcp(host: string, puerto: number, datos: Buffer) {
  return new Promise<void>((resolver, rechazar) => {
    const socket = net.createConnection({ host, port: puerto });
    socket.setTimeout(ESPERA_MS);

    const fallar = (motivo: string) => {
      socket.destroy();
      rechazar(new Error(motivo));
    };

    socket.on('connect', () => {
      // Una sonda sin cuerpo sólo verifica que la impresora conteste.
      if (datos.length === 0) {
        socket.end();
        return;
      }
      socket.end(datos);
    });
    socket.on('error', (e) => fallar(e.message));
    socket.on('timeout', () => fallar(`La impresora ${host}:${puerto} no responde.`));
    socket.on('close', () => resolver());
  });
}

/**
 * Puente al puerto 9100 de una impresora de red. El navegador no abre sockets
 * TCP, así que el ticket pasa por acá.
 *
 * Ojo: esto corre en el servidor. Si la app está publicada en Vercel, el
 * servidor está en internet y no llega a la red del club, así que el puente
 * tiene que correr en una máquina de esa red (ver el README del buffet).
 */
export async function POST(request: Request) {
  const host = request.headers.get('X-Printer-Host') ?? '';
  const puerto = Number(request.headers.get('X-Printer-Port') ?? 9100);

  if (!esRedLocal(host)) {
    return NextResponse.json(
      { error: 'La dirección de la impresora tiene que ser de la red local.' },
      { status: 400 }
    );
  }
  if (!PUERTOS_PERMITIDOS.includes(puerto)) {
    return NextResponse.json(
      { error: `Puerto no permitido. Usá ${PUERTOS_PERMITIDOS.join(', ')}.` },
      { status: 400 }
    );
  }

  const datos = Buffer.from(await request.arrayBuffer());
  if (datos.length > LIMITE_BYTES) {
    return NextResponse.json({ error: 'El ticket es demasiado grande.' }, { status: 413 });
  }

  try {
    await enviarATcp(host, puerto, datos);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'No se pudo imprimir.' },
      { status: 502 }
    );
  }
}
