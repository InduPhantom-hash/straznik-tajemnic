import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const inputDir = path.join(projectRoot, "assets", "sounds", "sfx_raw");
const outputDir = path.join(projectRoot, "public", "sounds", "sfx");

fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".mp3"));
console.log(`=== Rozpoczynam transkodowanie ${files.length} plików MP3 -> WebM/Opus ===\n`);

let totalOriginalBytes = 0;
let totalCompressedBytes = 0;

for (const file of files) {
  const baseName = path.basename(file, ".mp3");
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, `${baseName}.webm`);

  const originalSize = fs.statSync(inputPath).size;
  totalOriginalBytes += originalSize;

  // Transkodowanie ffmpeg: Opus audio, 48kbps, czysty WebM
  try {
    execFileSync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-c:a", "libopus",
      "-b:a", "48k",
      "-vbr", "on",
      "-application", "audio",
      outputPath
    ], { stdio: ["ignore", "ignore", "ignore"] });

    const compressedSize = fs.statSync(outputPath).size;
    totalCompressedBytes += compressedSize;
    const ratio = ((compressedSize / originalSize) * 100).toFixed(0);

    console.log(`[OK] ${baseName}.webm: ${(originalSize / 1024).toFixed(1)} KB -> ${(compressedSize / 1024).toFixed(1)} KB (${ratio}%)`);
  } catch (err) {
    console.error(`[BLAD] Transkodowanie ${file} nie powiodło się:`, err.message);
  }
}

console.log(`\n=== Podsumowanie Kompresji ===`);
console.log(`Oryginalna waga MP3: ${(totalOriginalBytes / 1024).toFixed(1)} KB`);
console.log(`Skompresowana waga WebM: ${(totalCompressedBytes / 1024).toFixed(1)} KB`);
console.log(`Oszczędność: ${(((1 - totalCompressedBytes / totalOriginalBytes)) * 100).toFixed(1)}%`);
console.log(`Zapisano w: ${outputDir}`);
