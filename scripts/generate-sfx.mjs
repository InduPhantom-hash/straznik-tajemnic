import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Wczytanie zmiennych z .env.local lub .env jeśli nie ma w process.env
function loadEnv() {
  const envPaths = [
    path.join(projectRoot, ".env.local"),
    path.join(projectRoot, ".env")
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...rest] = trimmed.split("=");
          const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Błąd: Brak ELEVENLABS_API_KEY w środowisku lub .env.local!");
  process.exit(1);
}

const manifestPath = path.join(__dirname, "sfx-manifest.json");
const outputDir = path.join(projectRoot, "public", "sounds", "sfx");

if (!fs.existsSync(manifestPath)) {
  console.error(`Błąd: Brak pliku manifestu: ${manifestPath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
console.log(`Znaleziono ${manifest.length} efektów w manifeście.`);

async function generateSFX(item) {
  const targetPath = path.join(outputDir, item.filename);

  if (fs.existsSync(targetPath)) {
    console.log(`[POMINIĘTO] ${item.id} (${item.filename}) - plik już istnieje.`);
    return;
  }

  console.log(`[GENEROWANIE] ${item.id}: "${item.prompt}" (${item.duration_seconds}s)...`);

  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: item.prompt,
      duration_seconds: item.duration_seconds || 2.5,
      prompt_influence: item.prompt_influence ?? 0.4
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Błąd API ElevenLabs dla ${item.id} [${response.status}]: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
  console.log(`[SUKCES] Zapisano: ${item.filename} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

async function run() {
  let successCount = 0;
  for (const item of manifest) {
    try {
      await generateSFX(item);
      successCount++;
      // Krótki odstęp rate-limit
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`[BŁĄD] Nie powiodło się dla ${item.id}:`, err.message);
    }
  }
  console.log(`\nZakończono pobieranie SFX. Gotowe pliki znajdują się w: ${outputDir}`);
}

run();
