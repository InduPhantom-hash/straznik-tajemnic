import {
  playDiceClatter,
  playDiceRevealSound,
} from '@/lib/dice-physics/dice-audio';
import * as audioContextModule from '@/lib/audio/audio-context';

describe('dice-audio (Web Audio API procedural sound engine)', () => {
  let mockAudioContext: any;
  let createdNodes: {
    oscillators: any[];
    gains: any[];
    filters: any[];
    bufferSources: any[];
  };

  beforeEach(() => {
    createdNodes = {
      oscillators: [],
      gains: [],
      filters: [],
      bufferSources: [],
    };

    const createParam = (defaultValue = 0) => ({
      value: defaultValue,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    });

    mockAudioContext = {
      currentTime: 0.5,
      sampleRate: 44100,
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
      destination: { connect: jest.fn() },
      createBuffer: jest.fn().mockImplementation((channels: number, length: number, rate: number) => ({
        sampleRate: rate,
        length,
        duration: length / rate,
        numberOfChannels: channels,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(length)),
      })),
      createBufferSource: jest.fn().mockImplementation(() => {
        const node = {
          buffer: null,
          connect: jest.fn(),
          disconnect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null as any,
        };
        createdNodes.bufferSources.push(node);
        return node;
      }),
      createGain: jest.fn().mockImplementation(() => {
        const node = {
          gain: createParam(1),
          connect: jest.fn(),
          disconnect: jest.fn(),
        };
        createdNodes.gains.push(node);
        return node;
      }),
      createBiquadFilter: jest.fn().mockImplementation(() => {
        const node = {
          type: 'lowpass',
          frequency: createParam(350),
          Q: createParam(1),
          gain: createParam(0),
          connect: jest.fn(),
          disconnect: jest.fn(),
        };
        createdNodes.filters.push(node);
        return node;
      }),
      createOscillator: jest.fn().mockImplementation(() => {
        const node = {
          type: 'sine',
          frequency: createParam(440),
          connect: jest.fn(),
          disconnect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          onended: null as any,
        };
        createdNodes.oscillators.push(node);
        return node;
      }),
    };

    jest.spyOn(audioContextModule, 'getSharedAudioContext').mockReturnValue(mockAudioContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('playDiceClatter', () => {
    it('synthesizes multi-impact clatter without error', () => {
      expect(() => playDiceClatter(2)).not.toThrow();
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();

      const source = createdNodes.bufferSources[0];
      expect(source.start).toHaveBeenCalled();
    });

    it('resumes suspended audio context', () => {
      mockAudioContext.state = 'suspended';
      playDiceClatter(1);
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('gracefully handles absence of audio context', () => {
      jest.spyOn(audioContextModule, 'getSharedAudioContext').mockReturnValue(null);
      expect(() => playDiceClatter(2)).not.toThrow();
    });
  });

  describe('playDiceRevealSound', () => {
    it('synthesizes 4-tone bell chime cascade for critical success', () => {
      expect(() => playDiceRevealSound('critical')).not.toThrow();

      // 4 chime tones should be created
      expect(createdNodes.oscillators.length).toBe(4);
      expect(createdNodes.filters.length).toBe(4);

      // Verify frequencies: 300, 375, 450, 600 Hz (Just Intonation)
      const freqs = createdNodes.oscillators.map((osc) => osc.frequency.setValueAtTime.mock.calls[0][0]);
      expect(freqs).toEqual([300, 375, 450, 600]);

      // All oscillators should start
      createdNodes.oscillators.forEach((osc) => {
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
      });
    });

    it('synthesizes ominous sub-bass drop and thud for fumble', () => {
      expect(() => playDiceRevealSound('fumble')).not.toThrow();

      // Primary downward oscillator and dissonance oscillator
      expect(createdNodes.oscillators.length).toBe(2);
      const primaryOsc = createdNodes.oscillators[0];
      const dissOsc = createdNodes.oscillators[1];

      expect(primaryOsc.frequency.setValueAtTime).toHaveBeenCalledWith(74, 0.5);
      expect(primaryOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(36, 0.95);

      expect(dissOsc.frequency.setValueAtTime).toHaveBeenCalledWith(88, 0.5);
      expect(dissOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(42, 0.95);

      // Noise impact buffer should also be generated
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(createdNodes.bufferSources.length).toBe(1);
    });

    it('synthesizes dry dull thud on fail outcome', () => {
      expect(() => playDiceRevealSound('fail')).not.toThrow();

      expect(createdNodes.bufferSources.length).toBe(1);
      expect(createdNodes.filters.length).toBe(1);
      expect(createdNodes.filters[0].frequency.setValueAtTime).toHaveBeenCalledWith(650, 0.5);
    });

    it('synthesizes warm wood clack on regular success and default', () => {
      expect(() => playDiceRevealSound('regular')).not.toThrow();

      expect(createdNodes.bufferSources.length).toBe(1);
      expect(createdNodes.filters.length).toBe(1);
      expect(createdNodes.filters[0].frequency.setValueAtTime).toHaveBeenCalledWith(1500, 0.5);
    });

    it('supports hard and extreme success using subtle wood clack profile', () => {
      expect(() => playDiceRevealSound('hard')).not.toThrow();
      expect(() => playDiceRevealSound('extreme')).not.toThrow();
      expect(() => playDiceRevealSound(null)).not.toThrow();
    });

    it('gracefully handles missing AudioContext or thrown errors without breaking UI', () => {
      jest.spyOn(audioContextModule, 'getSharedAudioContext').mockReturnValue(null);
      expect(() => playDiceRevealSound('critical')).not.toThrow();
      expect(() => playDiceRevealSound('fumble')).not.toThrow();
    });
  });
});
