/**
 * Web Serial tampoco entra en la librería DOM de TypeScript y sus tipos viven
 * en `@types/w3c-web-serial`. Igual que con WebUSB, se declara acá sólo lo que
 * usa el driver para no sumar otra dependencia.
 */
interface SerialOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: {
    filters?: { usbVendorId?: number; usbProductId?: number }[];
  }): Promise<SerialPort>;
}

interface Navigator {
  readonly serial: Serial;
}
