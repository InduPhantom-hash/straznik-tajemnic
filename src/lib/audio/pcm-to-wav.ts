/**
 * PCM → WAV converter (IND-49)
 *
 * Gemini TTS zwraca raw PCM s16le (signed 16-bit little-endian) jako base64.
 * Browser <audio> nie odtwarza raw PCM — wymagany WAV header (44 bajty RIFF/WAVE/fmt /data).
 *
 * Pure function bez external deps. Reuse-friendly dla innych providerów PCM.
 */

const WAV_HEADER_SIZE = 44;
const PCM_FORMAT = 1; // Linear PCM

/**
 * Konwertuje base64-encoded PCM audio na data URI WAV gotowe do `<audio src>`.
 *
 * @param pcmBase64 - PCM data zakodowany w base64 (output z Gemini TTS `inlineData.data`)
 * @param sampleRate - sample rate w Hz (Gemini TTS: 24000)
 * @param channels - liczba kanałów audio (Gemini TTS: 1 = mono)
 * @param bitsPerSample - bit depth (Gemini TTS: 16 dla s16le)
 * @returns data URI w formacie `data:audio/wav;base64,<...>`
 */
export function pcmToWav(
  pcmBase64: string,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16
): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const dataSize = pcmBuffer.length;

  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const header = Buffer.alloc(WAV_HEADER_SIZE);

  // "RIFF" chunk descriptor
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4); // ChunkSize = 36 + Subchunk2Size
  header.write('WAVE', 8, 'ascii');

  // "fmt " sub-chunk
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(PCM_FORMAT, 20); // AudioFormat = 1 (PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  const wav = Buffer.concat([header, pcmBuffer]);
  return `data:audio/wav;base64,${wav.toString('base64')}`;
}
