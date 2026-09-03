/**
 * Web Bluetooth tampoco entra en la librería DOM de TypeScript y sus tipos
 * viven en `@types/web-bluetooth`. Igual que con WebUSB y Web Serial, se
 * declara acá sólo lo que usa el driver de la impresora.
 */
interface BluetoothCharacteristicProperties {
  read: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
  notify: boolean;
}

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string;
  readonly properties: BluetoothCharacteristicProperties;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  readonly uuid: string;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
}

interface Bluetooth {
  getAvailability(): Promise<boolean>;
  getDevices?(): Promise<BluetoothDevice[]>;
  requestDevice(options: {
    filters?: { name?: string; namePrefix?: string; services?: string[] }[];
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth: Bluetooth;
}
