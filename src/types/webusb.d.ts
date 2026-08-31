/**
 * WebUSB no entra en la librería DOM de TypeScript y sus tipos viven en el
 * paquete `@types/w3c-web-usb`. Para no sumar otra dependencia se declara acá
 * sólo lo que usa el driver de la impresora.
 */
interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
}

interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  endpoints: USBEndpoint[];
}

interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: USBAlternateInterface[];
  claimed: boolean;
}

interface USBConfiguration {
  configurationValue: number;
  interfaces: USBInterface[];
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall' | 'babble';
}

interface USBDevice {
  readonly opened: boolean;
  readonly configuration: USBConfiguration | null;
  readonly configurations: USBConfiguration[];
  readonly productName?: string;
  readonly manufacturerName?: string;
  readonly vendorId: number;
  readonly productId: number;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  // Sin parametrizar el ArrayBuffer: así acepta el Uint8Array que arma el
  // driver, sin pelear con la distinción de TS entre ArrayBuffer y
  // SharedArrayBuffer.
  transferOut(
    endpointNumber: number,
    data: ArrayBufferView
  ): Promise<USBOutTransferResult>;
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  addEventListener(
    type: 'connect' | 'disconnect',
    listener: (event: Event) => void
  ): void;
  removeEventListener(
    type: 'connect' | 'disconnect',
    listener: (event: Event) => void
  ): void;
}

interface Navigator {
  readonly usb: USB;
}
