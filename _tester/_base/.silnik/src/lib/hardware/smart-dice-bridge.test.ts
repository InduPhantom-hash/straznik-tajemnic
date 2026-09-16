import { SmartDiceBridge } from './smart-dice-bridge';
import type { SmartDiceRollEvent, SmartDiceDevice } from './types';

describe('SmartDiceBridge (Hardware Bridge BLE CoC 7e RAW)', () => {
  let bridge: SmartDiceBridge;

  beforeEach(() => {
    bridge = new SmartDiceBridge();
  });

  describe('isSupported & shouldFallbackToVirtual', () => {
    it('returns false for isSupported when navigator.bluetooth is absent', () => {
      expect(bridge.isSupported()).toBe(false);
      expect(bridge.shouldFallbackToVirtual()).toBe(true);
    });

    it('returns true for isSupported when navigator.bluetooth is mocked', () => {
      const originalNav = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {
          bluetooth: {
            requestDevice: jest.fn(),
          },
        },
        writable: true,
        configurable: true,
      });

      expect(bridge.isSupported()).toBe(true);
      // Still true because no devices connected yet
      expect(bridge.shouldFallbackToVirtual()).toBe(true);

      Object.defineProperty(global, 'navigator', {
        value: originalNav,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('validateFaceValue (Authoritative RAW)', () => {
    it('clamps values correctly for d6', () => {
      expect(bridge.validateFaceValue('d6', 0)).toBe(1);
      expect(bridge.validateFaceValue('d6', 4)).toBe(4);
      expect(bridge.validateFaceValue('d6', 6)).toBe(6);
      expect(bridge.validateFaceValue('d6', 8)).toBe(6);
      expect(bridge.validateFaceValue('d6', NaN)).toBe(1);
    });

    it('clamps values correctly for d20 and d10', () => {
      expect(bridge.validateFaceValue('d20', 20)).toBe(20);
      expect(bridge.validateFaceValue('d20', 25)).toBe(20);
      expect(bridge.validateFaceValue('d10', 10)).toBe(10);
      expect(bridge.validateFaceValue('d10', 12)).toBe(10);
    });
  });

  describe('parsePacket (Pixels & GoDice BLE Protocols)', () => {
    it('parses Pixels RollState packet onFace', () => {
      // 0x03 = rollState, 0x03 = onFace, 0x05 = face index 5 (value 6 on d6)
      const buffer = new Uint8Array([0x03, 0x03, 0x05]).buffer;
      const dataView = new DataView(buffer);

      const parsed = bridge.parsePacket('pixels', 'd6', dataView);
      expect(parsed.state).toBe('onFace');
      expect(parsed.faceValue).toBe(6);
    });

    it('parses Pixels RollState packet rolling', () => {
      // 0x03 = rollState, 0x02 = rolling, 0x00 = index
      const buffer = new Uint8Array([0x03, 0x02, 0x00]).buffer;
      const dataView = new DataView(buffer);

      const parsed = bridge.parsePacket('pixels', 'd6', dataView);
      expect(parsed.state).toBe('rolling');
      expect(parsed.faceValue).toBeUndefined();
    });

    it('parses Pixels legacy roll packet', () => {
      // 0x02 = IAmARoll, 0x02 = face index 2 (value 3 on d6)
      const buffer = new Uint8Array([0x02, 0x02]).buffer;
      const dataView = new DataView(buffer);

      const parsed = bridge.parsePacket('pixels', 'd6', dataView);
      expect(parsed.state).toBe('onFace');
      expect(parsed.faceValue).toBe(3);
    });

    it('parses GoDice rolling and stable packets', () => {
      // 'R' = 0x52
      const rollBuf = new Uint8Array([0x52]).buffer;
      expect(bridge.parsePacket('godice', 'd6', new DataView(rollBuf))).toEqual({
        state: 'rolling',
      });

      // 'S' = 0x53, 0x04 = value 4
      const stableBuf = new Uint8Array([0x53, 0x04]).buffer;
      expect(bridge.parsePacket('godice', 'd6', new DataView(stableBuf))).toEqual({
        state: 'onFace',
        faceValue: 4,
      });
    });

    it('handles empty or malformed packets gracefully', () => {
      const emptyBuf = new ArrayBuffer(0);
      expect(bridge.parsePacket('pixels', 'd6', new DataView(emptyBuf))).toEqual({
        state: 'unknown',
      });
    });
  });

  describe('toDiceRollTrace', () => {
    it('converts d6 roll event to DiceRollTrace preserving contracts', () => {
      const event: SmartDiceRollEvent = {
        deviceId: 'ble-123',
        dieType: 'd6',
        state: 'onFace',
        faceValue: 5,
        timestamp: 1000,
      };

      const trace = bridge.toDiceRollTrace(event);
      expect(trace.total).toBe(5);
      expect(trace.dice).toHaveLength(1);
      expect(trace.dice[0]).toEqual({
        id: 'd6-0',
        type: 'd6',
        value: 5,
        role: 'die',
        selected: true,
      });
    });

    it('preserves d10 face 10 as value 10 in standard roll', () => {
      const event: SmartDiceRollEvent = {
        deviceId: 'ble-123',
        dieType: 'd10',
        state: 'onFace',
        faceValue: 10,
        timestamp: 2000,
      };

      const trace = bridge.toDiceRollTrace(event);
      expect(trace.total).toBe(10);
      expect(trace.dice).toHaveLength(1);
      expect(trace.dice[0]).toEqual({
        id: 'd10-0',
        type: 'd10',
        value: 10,
        role: 'die',
        selected: true,
      });
    });

    it('combines tens and units d10 dice into an authoritative CoC 7e d100 roll', () => {
      const tensEvent: SmartDiceRollEvent = {
        deviceId: 'ble-tens',
        dieType: 'd10',
        state: 'onFace',
        faceValue: 3, // 30
        timestamp: 2001,
      };
      const unitsEvent: SmartDiceRollEvent = {
        deviceId: 'ble-units',
        dieType: 'd10',
        state: 'onFace',
        faceValue: 7, // 7
        timestamp: 2002,
      };

      const trace = bridge.toD100Trace(tensEvent, unitsEvent);
      expect(trace.total).toBe(37);
      expect(trace.dice).toHaveLength(2);
      expect(trace.dice[0].value).toBe(30);
      expect(trace.dice[1].value).toBe(7);

      // Edge case CoC 7e RAW: 00 and 0 = 100
      const tensZero: SmartDiceRollEvent = { ...tensEvent, faceValue: 10 };
      const unitsZero: SmartDiceRollEvent = { ...unitsEvent, faceValue: 10 };
      const trace100 = bridge.toD100Trace(tensZero, unitsZero);
      expect(trace100.total).toBe(100);
      expect(trace100.dice[0].value).toBe(0);
      expect(trace100.dice[1].value).toBe(0);
    });
  });

  describe('listeners & notifications', () => {
    it('notifies roll listeners when handleGattNotification is called', () => {
      const rollListener = jest.fn();
      const unsubscribe = bridge.onRoll(rollListener);

      // Symulacja rejestracji urządzenia
      (bridge as unknown as { devices: Map<string, SmartDiceDevice> }).devices.set('test-die', {
        id: 'test-die',
        name: 'Pixel d20',
        protocol: 'pixels',
        dieType: 'd20',
        connectionState: 'connected',
      });

      const buffer = new Uint8Array([0x03, 0x03, 0x13]).buffer; // face index 19 -> value 20
      bridge.handleGattNotification('test-die', 'pixels', new DataView(buffer));

      expect(rollListener).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'test-die',
          dieType: 'd20',
          state: 'onFace',
          faceValue: 20,
        })
      );

      unsubscribe();
      bridge.handleGattNotification('test-die', 'pixels', new DataView(buffer));
      expect(rollListener).toHaveBeenCalledTimes(1);
    });
  });
});
