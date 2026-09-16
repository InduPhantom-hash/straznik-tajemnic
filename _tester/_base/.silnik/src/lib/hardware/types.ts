/**
 * @file types.ts
 * Typy i kontrakty integracji fizycznych kości elektronicznych Bluetooth (Smart Dice BLE Bridge)
 * dla Call of Cthulhu 7e RAW (Issue #377, Epic #369).
 */

import type { DiceRollTrace, PhysicalDieType } from '@/lib/dice-roll-trace';

export type SmartDiceProtocol = 'pixels' | 'godice';

export type SmartDiceRollState =
  | 'unknown'
  | 'handling'
  | 'rolling'
  | 'onFace'
  | 'crooked';

export type SmartDiceConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface SmartDiceDevice {
  id: string;
  name: string;
  protocol: SmartDiceProtocol;
  dieType: PhysicalDieType;
  connectionState: SmartDiceConnectionState;
  batteryLevel?: number;
  lastFace?: number;
}

export interface SmartDiceRollEvent {
  deviceId: string;
  dieType: PhysicalDieType;
  state: SmartDiceRollState;
  faceValue?: number;
  timestamp: number;
}

export interface SmartDiceTraceResult {
  trace: DiceRollTrace;
  device: SmartDiceDevice;
  rollEvent: SmartDiceRollEvent;
}

export type SmartDiceListener = (event: SmartDiceRollEvent) => void;
export type SmartDiceConnectionListener = (device: SmartDiceDevice) => void;
