/**
 * @file smart-dice-bridge.ts
 * Mostek Bluetooth LE (BLE) do fizycznych kości elektronicznych (Pixels Dice, GoDice).
 * Zgodny z CoC 7e RAW i kontraktem DiceRollTrace (Issue #377, Epic #369).
 */

import type {
  SmartDiceDevice,
  SmartDiceRollEvent,
  SmartDiceRollState,
  SmartDiceProtocol,
  SmartDiceListener,
  SmartDiceConnectionListener,
} from './types';
import {
  type DiceRollTrace,
  type PhysicalDieType,
  traceForDice,
  traceForD100,
} from '@/lib/dice-roll-trace';

export const BLE_SERVICES = {
  NORDIC_UART: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  PIXELS_NOTIFY_CHAR: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  PIXELS_WRITE_CHAR: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL_CHAR: '00002a19-0000-1000-8000-00805f9b34fb',
} as const;

export interface GattCharacteristicLike {
  startNotifications(): Promise<unknown>;
  addEventListener(type: string, listener: (ev: Event) => void): void;
}

export interface GattServiceLike {
  getCharacteristic(characteristic: string): Promise<GattCharacteristicLike>;
}

export interface GattServerLike {
  connected?: boolean;
  disconnect(): void;
  getPrimaryService(service: string): Promise<GattServiceLike>;
}

export interface BluetoothDeviceLike {
  id?: string;
  name?: string;
  gatt?: {
    connect(): Promise<GattServerLike>;
  };
  addEventListener(type: string, listener: () => void): void;
}

export interface BluetoothNavigator {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ namePrefix?: string; services?: string[] }>;
      optionalServices?: string[];
      acceptAllDevices?: boolean;
    }): Promise<BluetoothDeviceLike>;
  };
}

export class SmartDiceBridge {
  private devices: Map<string, SmartDiceDevice> = new Map();
  private gattServers: Map<string, GattServerLike> = new Map();
  private rollListeners: Set<SmartDiceListener> = new Set();
  private connectionListeners: Set<SmartDiceConnectionListener> = new Set();

  /**
   * Sprawdza dostępność Web Bluetooth API w bieżącym środowisku.
   */
  public isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as BluetoothNavigator;
    return typeof nav.bluetooth !== 'undefined' && typeof nav.bluetooth.requestDevice === 'function';
  }

  /**
   * Zwraca listę aktualnie połączonych kości fizycznych.
   */
  public getConnectedDevices(): SmartDiceDevice[] {
    return Array.from(this.devices.values()).filter(
      (d) => d.connectionState === 'connected'
    );
  }

  /**
   * Zwraca informację, czy należy zastosować fallback na wirtualną tackę 3D.
   * True, gdy Web Bluetooth nie jest wspierany lub żadna kość nie jest połączona.
   */
  public shouldFallbackToVirtual(): boolean {
    return !this.isSupported() || this.getConnectedDevices().length === 0;
  }

  /**
   * Subskrypcja zdarzeń rzutów fizyczną kością.
   */
  public onRoll(listener: SmartDiceListener): () => void {
    this.rollListeners.add(listener);
    return () => this.rollListeners.delete(listener);
  }

  /**
   * Subskrypcja zmian stanu połączenia urządzeń BLE.
   */
  public onConnectionChange(listener: SmartDiceConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Rozpoczyna proces parowania i łączenia kości przez Web Bluetooth.
   */
  public async connect(preferredProtocol: SmartDiceProtocol = 'pixels'): Promise<SmartDiceDevice | null> {
    if (!this.isSupported()) {
      console.warn('⚠️ Web Bluetooth API nie jest obsługiwane w tym środowisku.');
      return null;
    }

    const nav = navigator as BluetoothNavigator;
    try {
      const filters =
        preferredProtocol === 'pixels'
          ? [{ namePrefix: 'Pixel' }, { namePrefix: 'Pixels' }]
          : [{ namePrefix: 'GoDice' }, { namePrefix: 'Dice' }];

      const device = await nav.bluetooth!.requestDevice({
        filters,
        optionalServices: [BLE_SERVICES.NORDIC_UART, BLE_SERVICES.BATTERY_SERVICE],
      });

      if (!device || !device.gatt) return null;

      const deviceId = device.id || `ble-${Date.now()}`;
      const name = device.name || 'Smart Die';
      const dieType = this.inferDieTypeFromName(name);

      const smartDevice: SmartDiceDevice = {
        id: deviceId,
        name,
        protocol: preferredProtocol,
        dieType,
        connectionState: 'connecting',
      };
      this.devices.set(deviceId, smartDevice);
      this.notifyConnection(smartDevice);

      const server = await device.gatt.connect();
      this.gattServers.set(deviceId, server);

      smartDevice.connectionState = 'connected';
      this.devices.set(deviceId, smartDevice);
      this.notifyConnection(smartDevice);

      // Subskrypcja charakterystyki notify
      try {
        const service = await server.getPrimaryService(BLE_SERVICES.NORDIC_UART);
        const notifyChar = await service.getCharacteristic(BLE_SERVICES.PIXELS_NOTIFY_CHAR);
        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', (ev: Event) => {
          const target = ev.target as unknown as { value?: DataView };
          if (target?.value) {
            this.handleGattNotification(deviceId, preferredProtocol, target.value);
          }
        });
      } catch (subErr) {
        console.warn(`⚠️ Błąd subskrypcji GATT kości ${deviceId}:`, subErr);
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect(deviceId);
      });

      return smartDevice;
    } catch (error) {
      console.error('❌ Błąd łączenia z kością Bluetooth:', error);
      return null;
    }
  }

  /**
   * Rozłącza kość fizyczną.
   */
  public async disconnect(deviceId: string): Promise<void> {
    const server = this.gattServers.get(deviceId);
    if (server && server.connected) {
      server.disconnect();
    }
    this.handleDisconnect(deviceId);
  }

  /**
   * Parser pakietów z charakterystyki GATT kości Pixels Dice i GoDice.
   */
  public parsePacket(
    protocol: SmartDiceProtocol,
    dieType: PhysicalDieType,
    dataView: DataView
  ): { state: SmartDiceRollState; faceValue?: number } {
    if (dataView.byteLength === 0) {
      return { state: 'unknown' };
    }

    if (protocol === 'pixels') {
      // Protokół Pixels Dice (Nordic UART):
      // Bajt 0: Typ wiadomości (np. 0x02 = IAmARoll, 0x03 = RollState)
      const msgType = dataView.getUint8(0);

      // 0x03: RollState packet
      // Bajt 1: RollState (0=unknown, 1=handling, 2=rolling, 3=onFace, 4=crooked)
      // Bajt 2: FaceIndex (0-indexed)
      if (msgType === 0x03 && dataView.byteLength >= 3) {
        const rawState = dataView.getUint8(1);
        const rawFace = dataView.getUint8(2);

        let state: SmartDiceRollState = 'unknown';
        if (rawState === 1) state = 'handling';
        else if (rawState === 2) state = 'rolling';
        else if (rawState === 3) state = 'onFace';
        else if (rawState === 4) state = 'crooked';

        const faceValue = state === 'onFace' ? this.mapFaceIndexToValue(dieType, rawFace) : undefined;
        return { state, faceValue };
      }

      // 0x02: IAmARoll (legacy / direct roll notification)
      if (msgType === 0x02 && dataView.byteLength >= 2) {
        const rawFace = dataView.getUint8(1);
        const faceValue = this.mapFaceIndexToValue(dieType, rawFace);
        return { state: 'onFace', faceValue };
      }

      return { state: 'rolling' };
    }

    if (protocol === 'godice') {
      // Protokół GoDice:
      // Bajt 0: 'R' (0x52) = Rolling, 'S' (0x53) = Stable
      const firstChar = String.fromCharCode(dataView.getUint8(0));
      if (firstChar === 'R') {
        return { state: 'rolling' };
      }
      if (firstChar === 'S' && dataView.byteLength >= 2) {
        const rawFace = dataView.getUint8(1);
        const faceValue = this.validateFaceValue(dieType, rawFace);
        return { state: 'onFace', faceValue };
      }
    }

    return { state: 'unknown' };
  }

  /**
   * Waliduje i autorytatywnie normalizuje wynik ścianki dla danego typu kości.
   */
  public validateFaceValue(dieType: PhysicalDieType, rawValue: number): number {
    const maxSides: Record<PhysicalDieType, number> = {
      d3: 3,
      d4: 4,
      d6: 6,
      d8: 8,
      d10: 10,
      d12: 12,
      d20: 20,
    };

    const max = maxSides[dieType] || 6;
    if (isNaN(rawValue) || rawValue < 1) {
      return 1;
    }
    if (rawValue > max) {
      return max;
    }
    return Math.floor(rawValue);
  }

  /**
   * Konwertuje zdarzenie rzutu fizyczną kością na deterministyczny kontrakt DiceRollTrace CoC 7e RAW.
   */
  public toDiceRollTrace(event: SmartDiceRollEvent, source = 'ble-smart-die'): DiceRollTrace {
    const safeFace = this.validateFaceValue(event.dieType, event.faceValue ?? 1);
    return traceForDice(event.dieType, [safeFace], safeFace, source);
  }

  /**
   * Łączy rzuty pary kości k10 (dziesiątki i jedności) w autorytatywny rzut d100 CoC 7e RAW.
   * Zgodnie z RAW CoC 7e:
   * - Kość dziesiątek: 00..90 (gdzie wartość 10 z sensora BLE oznacza 00/0)
   * - Kość jedności: 0..9 (gdzie wartość 10 oznacza 0)
   * - Wynik 00 + 0 = 100.
   */
  public toD100Trace(
    tensEvent: SmartDiceRollEvent,
    unitsEvent: SmartDiceRollEvent,
    source = 'ble-smart-die'
  ): DiceRollTrace {
    const rawTens = this.validateFaceValue('d10', tensEvent.faceValue ?? 1);
    const rawUnits = this.validateFaceValue('d10', unitsEvent.faceValue ?? 1);

    const tensVal = rawTens === 10 ? 0 : rawTens * 10;
    const unitsVal = rawUnits === 10 ? 0 : rawUnits;

    const total = tensVal + unitsVal === 0 ? 100 : tensVal + unitsVal;
    return traceForD100(total, source);
  }

  /**
   * Obsługa przychodzących danych GATT.
   */
  public handleGattNotification(
    deviceId: string,
    protocol: SmartDiceProtocol,
    dataView: DataView
  ): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const parsed = this.parsePacket(protocol, device.dieType, dataView);
    if (parsed.faceValue !== undefined) {
      device.lastFace = parsed.faceValue;
    }

    const rollEvent: SmartDiceRollEvent = {
      deviceId,
      dieType: device.dieType,
      state: parsed.state,
      faceValue: parsed.faceValue,
      timestamp: Date.now(),
    };

    for (const listener of this.rollListeners) {
      try {
        listener(rollEvent);
      } catch (err) {
        console.error('Błąd w listenerze SmartDiceRoll:', err);
      }
    }
  }

  private handleDisconnect(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.connectionState = 'disconnected';
      this.notifyConnection(device);
    }
    this.gattServers.delete(deviceId);
  }

  private notifyConnection(device: SmartDiceDevice): void {
    for (const listener of this.connectionListeners) {
      try {
        listener({ ...device });
      } catch (err) {
        console.error('Błąd w listenerze SmartDiceConnection:', err);
      }
    }
  }

  private inferDieTypeFromName(name: string): PhysicalDieType {
    const lower = name.toLowerCase();
    if (lower.includes('d20')) return 'd20';
    if (lower.includes('d12')) return 'd12';
    if (lower.includes('d10')) return 'd10';
    if (lower.includes('d8')) return 'd8';
    if (lower.includes('d4')) return 'd4';
    if (lower.includes('d3')) return 'd3';
    return 'd6';
  }

  private mapFaceIndexToValue(dieType: PhysicalDieType, faceIndex: number): number {
    // Pixels face indices są 0-indeksowane
    return this.validateFaceValue(dieType, faceIndex + 1);
  }
}

export const smartDiceBridge = new SmartDiceBridge();
