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
