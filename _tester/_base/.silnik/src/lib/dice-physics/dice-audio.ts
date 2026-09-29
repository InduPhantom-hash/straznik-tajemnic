import { getSharedAudioContext } from '@/lib/audio/audio-context';

/**
 * Realistic die rattle & clatter sound generator via Web Audio API.
 * Synthesizes the authentic sound of polyhedral dice colliding with
 * felt-lined wood and each other. Zero external MP3 asset dependency.
 */
export function playDiceClatter(diceCount: number = 2): void {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const duration = Math.min(1.2, 0.5 + diceCount * 0.15);
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate random impacts (clack/clatter clicks) decaying over time
    const numImpacts = 5 + Math.min(12, diceCount * 3);
    const impactTimes: number[] = [];
    for (let i = 0; i < numImpacts; i++) {
      // Clustered more heavily at the beginning (throw & first bounce)
      const progress = Math.pow(Math.random(), 1.6);
      impactTimes.push(progress * (duration * 0.75));
    }
    impactTimes.sort((a, b) => a - b);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Noise floor (tumble on felt)
      const envelope = Math.exp(-t * 4.2);
      sample += (Math.random() * 2 - 1) * 0.04 * envelope;

      // Sharp resonant clicks for dice collisions
      for (let j = 0; j < impactTimes.length; j++) {
        const dt = t - impactTimes[j];
        if (dt >= 0 && dt < 0.04) {
          const impactDecay = Math.exp(-dt * 180);
          // Resonant frequencies of plastic/resin dice (approx 1200Hz - 2800Hz)
          const tone = Math.sin(2 * Math.PI * (1600 + (j % 4) * 350) * dt);
          sample += (tone * 0.4 + (Math.random() * 2 - 1) * 0.6) * impactDecay * 0.45;
        }
      }

      data[i] = sample;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Lowpass filter to emulate deep wooden tray resonance
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;

    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch {
    // Audio failure must never disrupt UI
  }
}

export type RevealOutcomeType =
  | 'critical'
  | 'extreme'
  | 'hard'
  | 'regular'
  | 'fail'
  | 'fumble'
  | string;

/**
 * Kinowy, dwufazowy proceduralny dźwięk ujawnienia wyniku rzutu (Reveal Sound).
 * W 100% syntetyzowany przez Web Audio API (zero zależności MP3).
 *
 * Profile akustyczne:
 * 1. Sukces Krytyczny ('critical' / 01):
 *    Triumfalna 4-tonowa kaskada harmoniczna w stroju naturalnym (Just Intonation:
 *    300Hz, 375Hz, 450Hz, 600Hz) z dzwonkowym rezonansem i łagodnym wybrzmieniem.
 * 2. Pech ('fumble' / 96-100):
 *    Złowrogie, sub-basowe tąpnięcie (74Hz -> 36Hz z dysonantem 88Hz) i wytłumiony
 *    rezonans w niskich częstotliwościach.
 * 3. Sukces zwykły / trudny / ekstremalny ('regular' | 'hard' | 'extreme'):
 *    Subtelny, ciepły stuk hebanu/kości o mosiądz (wood-clack click) na 1500Hz.
 * 4. Porażka ('fail'):
 *    Suchy, matowy, stłumiony stukot na 650Hz.
 */
export function playDiceRevealSound(outcome?: RevealOutcomeType | null): void {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t0 = ctx.currentTime;
    const normalized = (outcome || 'regular').toLowerCase();

    if (normalized === 'critical') {
      // 1. Sukces Krytyczny: Triumfalny 4-tonowy akord dzwonkowy (Just Intonation: 1, 5/4, 3/2, 2)
      const freqs = [300, 375, 450, 600];
      const offsets = [0, 0.055, 0.115, 0.18];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.28, t0);
      masterGain.connect(ctx.destination);

      freqs.forEach((freq, idx) => {
        const toneTime = t0 + offsets[idx];
        const osc = ctx.createOscillator();
        const toneGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, toneTime);

        // Subtelny filtr peaking dla mosiężnego charakteru dzwonków
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(freq * 1.5, toneTime);
        filter.Q.setValueAtTime(2.0, toneTime);
        filter.gain.setValueAtTime(4.0, toneTime);

        // Obwiednia ADSR dzwonka
        toneGain.gain.setValueAtTime(0.0001, toneTime);
        toneGain.gain.exponentialRampToValueAtTime(0.22, toneTime + 0.012);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, toneTime + 0.85);

        osc.connect(filter);
        filter.connect(toneGain);
        toneGain.connect(masterGain);

        osc.start(toneTime);
        osc.stop(toneTime + 0.9);

        osc.onended = () => {
          try {
            osc.disconnect();
            filter.disconnect();
            toneGain.disconnect();
          } catch {
            // ignore
          }
        };
      });
      return;
    }

    if (normalized === 'fumble') {
      // 2. Pech / Fumble: Złowrogie, sub-basowe tąpnięcie z dysonantem i opadaniem częstotliwości
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, t0);
      masterGain.connect(ctx.destination);

      const oscPrimary = ctx.createOscillator();
      const oscDissonance = ctx.createOscillator();
      const bassGain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();

      oscPrimary.type = 'sine';
      oscPrimary.frequency.setValueAtTime(74, t0);
      oscPrimary.frequency.exponentialRampToValueAtTime(36, t0 + 0.45);

      oscDissonance.type = 'triangle';
      oscDissonance.frequency.setValueAtTime(88, t0);
      oscDissonance.frequency.exponentialRampToValueAtTime(42, t0 + 0.45);

      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(180, t0);
      lowpass.frequency.exponentialRampToValueAtTime(90, t0 + 0.5);

      bassGain.gain.setValueAtTime(0.001, t0);
      bassGain.gain.exponentialRampToValueAtTime(0.45, t0 + 0.015);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);

      oscPrimary.connect(lowpass);
      oscDissonance.connect(lowpass);
      lowpass.connect(bassGain);
      bassGain.connect(masterGain);

      oscPrimary.start(t0);
      oscPrimary.stop(t0 + 0.65);
      oscDissonance.start(t0);
      oscDissonance.stop(t0 + 0.65);

      // Szumowy uderzeniowy impuls lądowania wieka skrzyni
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-progress * 8.0);
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(260, t0);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSrc.start(t0);

      oscPrimary.onended = () => {
        try {
          oscPrimary.disconnect();
          oscDissonance.disconnect();
          lowpass.disconnect();
          bassGain.disconnect();
          masterGain.disconnect();
        } catch {
          // ignore
        }
      };
      return;
    }

    if (normalized === 'fail') {
      // 3. Porażka: Krótki, suchy, matowy stukot (dull dry thud)
      const duration = 0.09;
      const sampleRate = ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 65);
        const tone = Math.sin(2 * Math.PI * 620 * t);
        data[i] = (tone * 0.35 + (Math.random() * 2 - 1) * 0.65) * decay;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, t0);
      filter.Q.setValueAtTime(1.8, t0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, t0);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(t0);
      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      };
      return;
    }

    // 4. Sukces zwykły / trudny / ekstremalny / default:
    // Subtelny, ciepły stuk drewna / hebanu o mosiądz (wood-clack click)
    const duration = 0.11;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 55);
      const tone = Math.sin(2 * Math.PI * 1450 * t);
      data[i] = (tone * 0.45 + (Math.random() * 2 - 1) * 0.55) * decay;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t0);
    filter.Q.setValueAtTime(2.2, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t0);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(t0);
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
    };
  } catch {
    // Audio failure must never disrupt UI
  }
}
