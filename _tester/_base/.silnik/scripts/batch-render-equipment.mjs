/**
 * batch-render-equipment.mjs - Paced Background Daemon for Era Equipment Assets (Issue #503)
 *
 * Automatyczny proces w tle generujący brakujące grafiki wariantów epokowych.
 *
 * Kluczowe mechanizmy odpornościowe:
 * 1. Bezpieczny pacing: domyślnie 35 sekund przerwy po każdym udanym wygenerowaniu (maks. ~1.7 RPM).
 * 2. Inteligentny Circuit Breaker na 429: gdy pojawi się limit zapytań, proces ZATRZYMUJE całą kolejkę
 *    i czeka (najpierw 60s, potem 120s, a przy trwałym limicie 15 minut) zamiast bezmyślnie próbować kolejnych pozycji.
 * 3. Idempotentność: sprawdza fizyczną obecność pliku WebP na dysku oraz stan w progress.json.
 * 4. Kompresja WebP: bezpośrednia konwersja przez sharp do 512x512 z optymalizacją pod katalog gry.
 * 5. Czyste wyłączenie (graceful shutdown): zapisuje stan przy SIGINT/SIGTERM.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SILNIK_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SILNIK_DIR, '../../..');

// 1. Wczytanie klucza API z .env.local
function loadApiKey() {
  const envPaths = [
    path.join(SILNIK_DIR, '.env.local'),
    path.join(REPO_ROOT, '_tester/_base/.silnik/.env.local'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
  }
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  throw new Error('Nie znaleziono GEMINI_API_KEY w .env.local.');
}

// 2. Parsowanie argumentów CLI
const args = process.argv.slice(2);
const isDaemon = args.includes('--daemon');
const eraFilter = args.find(a => a.startsWith('--era='))?.split('=')[1];
const delayMs = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '35000', 10);
const maxItems = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '1000', 10);

// 3. Ścieżki docelowe
const CATALOG_DIR = path.join(SILNIK_DIR, 'public/equipment/catalog');
const PROGRESS_FILE = path.join(REPO_ROOT, 'docs/reports/equipment-render-progress.json');
const LOG_FILE = path.join(REPO_ROOT, 'docs/reports/equipment-render.log');

if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
const reportsDir = path.dirname(PROGRESS_FILE);
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {}
}

// 4. Załadowanie i zapis stanu
let progress = {
  totalTarget: 36,
  renderedCount: 0,
  rendered: {},
  failed: {},
  state: 'idle',
  lastRun: null,
};

if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = { ...progress, ...JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) };
  } catch {}
}

function updateProgressState(state, extra = {}) {
  progress.state = state;
  progress.lastRun = new Date().toISOString();
  Object.assign(progress, extra);
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// 5. Stylizacja promptów per epoka
const ERA_PROMPT_STYLES = {
  '1890s': {
    aesthetic: 'authentic late Victorian 1890s gaslight era',
    setting: 'resting on dark polished mahogany or green baize felt desk, soft gaslamp directional lighting with warm amber reflections',
    materials: 'patinated brass, dark varnished wood, aged leather, early industrial craftsmanship',
  },
  '1920s': {
    aesthetic: 'authentic 1920s interwar roaring twenties / II RP era',
    setting: 'resting on a dark stained oak desk or leather blotter, moody side lighting from a green banker lamp, dark art deco noir atmosphere',
    materials: 'blued steel, dark walnut wood, antique brass, period-correct worn textures',
  },
  '1930s': {
    aesthetic: 'authentic 1930s Great Depression and pre-war modernist era',
    setting: 'resting on a plain wooden workshop table or austere office surface, crisp industrial side illumination',
    materials: 'streamlined early bakelite, stamped sheet metal, utilitarian functionalist design',
  },
  '1940s': {
    aesthetic: 'authentic 1940s wartime and film noir era',
    setting: 'resting on a battered wooden field crate or desk, dramatic venetian blind shadow slashes, moody noir atmosphere',
    materials: 'matte olive-drab canvas, stamped steel, worn functional hardware',
  },
  '1980s': {
    aesthetic: 'authentic 1980s late Cold War and Polish People\'s Republic (PRL) era',
    setting: 'resting on a worn laminated desk or rough wooden surface, institutional desk lamp lighting',
    materials: 'utilitarian injection-molded textured plastic, pressed steel, stark domestic manufacture',
  },
  'modern': {
    aesthetic: 'contemporary 21st century everyday object',
    setting: 'resting on a dark matte tabletop or carbon-fiber textured surface, clean neutral studio lighting',
    materials: 'matte black polycarbonate, brushed aircraft aluminum, modern industrial ergonomics',
  },
};

// 6. Szablony 36 próbek priorytetowych
const SAMPLE_DEFINITIONS = [
  {
    baseId: 'weapon.flare-gun',
    slug: 'flare-gun',
    category: 'weapon',
    namePl: 'Pistolet sygnalizacyjny',
    subject: {
      '1890s': 'a heavy Victorian brass-barrel maritime flare gun with turned walnut grip and two paper-wrapped brass-base cartridges',
      '1920s': 'a heavy brass and blued steel nautical flare gun with aged walnut grip and two red flare cartridges',
      '1930s': 'a stamped steel and brass marine distress flare pistol with checkered wood grip',
      '1940s': 'a rugged military zinc-alloy and steel emergency flare pistol with dark composition grip',
      '1980s': 'an orange and dark steel maritime emergency flare gun with ribbed polymer grip',
      'modern': 'a high-visibility heavy-duty polymer maritime safety flare launcher with ribbed grip and sealed cartridges',
    },
  },
  {
    baseId: 'tool.magnifier',
    slug: 'magnifier',
    category: 'tool',
    namePl: 'Lupa',
    subject: {
      '1890s': 'an ornate heavy brass magnifying glass with carved bone handle and thick bevelled glass lens',
      '1920s': 'an authentic heavy brass magnifying glass with turned dark ebony wood handle and thick bevelled lens',
      '1930s': 'a sleek chrome-plated steel magnifying glass with black bakelite handle',
      '1940s': 'a functional nickel-plated field inspection magnifying glass with plain hardwood handle',
      '1980s': 'a vintage stainless steel pocket magnifying glass with dark molded plastic handle',
      'modern': 'a modern precision optical inspection magnifier with black anodized aluminum housing and ergonomic rubberized grip',
    },
  },
  {
    baseId: 'medical.first-aid',
    slug: 'first-aid',
    category: 'medical',
    namePl: 'Apteczka',
    subject: {
      '1890s': 'a dark mahogany doctor kit case with brass clasp, slightly open showing glass medicine phials with cork stoppers and rolled cotton',
      '1920s': 'a vintage metal first aid tin box painted chipped off-white enamel with weathered red cross emblem and rolled unbleached linen bandages',
      '1930s': 'a painted white metal emergency first aid box with stamped red cross and metal latches',
      '1940s': 'a military olive-drab canvas first aid pouch with blackened brass snap fasteners and sterile gauze packet',
      '1980s': 'an industrial orange plastic first aid kit case with white cross emblem and plastic latches',
      'modern': 'a modern red ripstop nylon tactical trauma first aid pouch with white cross patch, waterproof zipper, and compact sterile medical supplies',
    },
  },
  {
    baseId: 'personal.matches',
    slug: 'matches',
    category: 'personal',
    namePl: 'Pudełko zapałek',
    subject: {
      '1890s': 'an ornate engraved silver pocket vesta match case slightly open revealing sulphur-tipped safety matches',
      '1920s': 'an authentic vintage small wooden slide matchbox with worn printed art deco graphic label, slightly ajar showing red-tipped matches',
      '1930s': 'a pre-war cardboard matchbox with monochrome industrial graphic printing and strike strip',
      '1940s': 'a wartime cardboard box of safety matches with utilitarian typography and weathered edges',
      '1980s': 'a classic wooden Polish matchbox with iconic black and white graphic label and striking side',
      'modern': 'a pack of stormproof weatherproof survival matches in a compact waterproof sealed tube with strike pad',
    },
  },
  {
    baseId: 'occult.candles',
    slug: 'candles',
    category: 'occult',
    namePl: 'Świece',
    subject: {
      '1890s': 'three thick beeswax pillar candles of varying heights with natural melted wax drips, resting in an antique tarnished brass chamberstick',
      '1920s': 'two thick dark tallow candles with hardened dripping wax runs, resting on a heavy wrought-iron saucer',
      '1930s': 'a set of hand-dipped beeswax ritual candles with subtle wax runoff on a dark slate coaster',
      '1940s': 'wartime emergency tallow candles with scorched wicks in a simple pressed tin candle holder',
      '1980s': 'utilitarian unbleached paraffin church candles with wax pools on an enameled metal plate',
      'modern': 'hand-poured pure black soy pillar candles with rough organic texture and matte finish on a minimalist black ceramic dish',
    },
  },
  {
    baseId: 'armor.safety-helmet-industrial',
    slug: 'safety-helmet-industrial',
    category: 'armor',
    namePl: 'Przemysłowy kask ochronny',
    subject: {
      '1890s': 'a heavy boiled leather and brass reinforced mine inspector protective helmet with chin strap',
      '1920s': 'a heavy pressed vulcanized fiber industrial safety helmet with ribbed crown and leather suspension',
      '1930s': 'a pre-war stamped aluminum-alloy hard hat with weathered surface and leather liner',
      '1940s': 'a wartime pressed steel safety work helmet with khaki finish and adjustable canvas web cradle',
      '1980s': 'a yellow industrial hard hat made of textured fiberglass resin with dark head harness',
      'modern': 'a modern high-impact matte white ABS engineering hard hat with side accessory slots and ratchet suspension',
    },
  },
];

// 7. Konstrukcja kolejki do wygenerowania
const ERAS = ['1920s', '1890s', '1930s', '1940s', '1980s', 'modern'];

function buildQueue() {
  const queue = [];
  for (const era of ERAS) {
    if (eraFilter && era !== eraFilter) continue;
    for (const item of SAMPLE_DEFINITIONS) {
      const filename = `${item.slug}-${era}.webp`;
      const targetPath = path.join(CATALOG_DIR, filename);
      const id = `${era}.${item.category}.${item.slug}`;

      if (fs.existsSync(targetPath)) {
        progress.rendered[id] = { filename, path: targetPath, exists: true };
      } else {
        queue.push({ id, era, item, filename, targetPath });
      }
    }
  }
  progress.renderedCount = Object.keys(progress.rendered).length;
  return queue;
}

// 8. Komunikacja z Gemini API
async function generateImageWithRetry(apiKey, promptText) {
  const model = 'gemini-3.1-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Output a single generated image. Do NOT reply with any text, caption, refusal or description - return only the image. Image content: ${promptText}`,
            },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody?.error?.message || response.statusText;
    const error = new Error(`HTTP ${response.status}: ${message}`);
    error.status = response.status;
    error.details = errBody;
    throw error;
  }

  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
  if (!part) {
    throw new Error('Odpowiedź API nie zawierała danych obrazu inlineData.');
  }

  return Buffer.from(part.inlineData.data, 'base64');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Obsługa sygnałów zamknięcia
let running = true;
process.on('SIGINT', () => {
  log('Otrzymano SIGINT. Kończę bieżące zadanie i zamykam proces...');
  running = false;
});
process.on('SIGTERM', () => {
  log('Otrzymano SIGTERM. Zamykam proces...');
  running = false;
});

// 9. Pętla wykonawcza z bezpiecznikiem Circuit Breaker
async function runLoop() {
  const apiKey = loadApiKey();
  log(`=== Start demona renderującego (delay: ${delayMs / 1000}s, daemon: ${isDaemon}) ===`);

  while (running) {
    const queue = buildQueue();
    updateProgressState('running', { pendingCount: queue.length });

    if (queue.length === 0) {
      log(`Wszystkie pozycje z kolejki (${progress.renderedCount}/${progress.totalTarget}) są wyrenderowane!`);
      updateProgressState('completed');
      if (!isDaemon) break;
      log('Tryb daemon aktywny. Oczekiwanie 15 minut przed kolejnym sprawdzeniem...');
      await sleep(15 * 60 * 1000);
      continue;
    }

    log(`Pozostało do wyrenderowania: ${queue.length} pozycji.`);
    let sessionCount = 0;

    for (const job of queue) {
      if (!running || sessionCount >= maxItems) break;

      const { id, era, item, filename, targetPath } = job;
      const style = ERA_PROMPT_STYLES[era];
      const subject = item.subject[era];
      const promptText = `Photorealistic macro studio object study of ${subject}, ${style.aesthetic}, ${style.setting}, constructed with authentic ${style.materials}, square composition, 1:1 aspect ratio, sharp focus, atmospheric moody lighting, no people, no hands, no text, no modern artifacts`;

      log(`[${sessionCount + 1}/${queue.length}] Generuję: ${id} (${item.namePl})...`);
      updateProgressState('rendering', { currentJob: id });

      let done = false;
      let consecutive429 = 0;

      while (!done && running) {
        try {
          const imageBuffer = await generateImageWithRetry(apiKey, promptText);

          // Konwersja i zapis do WebP
          await sharp(imageBuffer)
            .resize(512, 512, { fit: 'cover' })
            .webp({ quality: 85, effort: 6 })
            .toFile(targetPath);

          log(`  ✓ Gotowe i zapisane: ${filename} (512x512 WebP)`);
          progress.rendered[id] = {
            filename,
            targetPath,
            timestamp: new Date().toISOString(),
          };
          delete progress.failed[id];
          progress.renderedCount = Object.keys(progress.rendered).length;
          updateProgressState('rendering');

          sessionCount++;
          done = true;

          // Bezpieczny pacing po udanym strzale
          log(`  ⏳ Bezpieczna pauza pacingu (${delayMs / 1000}s) przed kolejnym obiektem...`);
          await sleep(delayMs);
        } catch (err) {
          if (err.status === 429) {
            consecutive429++;
            // Circuit Breaker: jeśli limit 429, nie idziemy do kolejnego itemu, lecz wstrzymujemy kolejkę!
            let waitSec = 60;
            if (consecutive429 === 2) waitSec = 120;
            if (consecutive429 >= 3) waitSec = 15 * 60; // Dłuższa pauza na reset okna godzinnego

            log(`  ⚠️ Limit 429 (próba ${consecutive429}). Circuit Breaker aktywny: wstrzymuję kolejkę na ${waitSec}s...`);
            updateProgressState('paused_429', {
              waitRemainingSec: waitSec,
              pausedAt: new Date().toISOString(),
            });

            await sleep(waitSec * 1000);
          } else {
            log(`  ❌ Trwały błąd dla ${id}: ${err.message}`);
            progress.failed[id] = {
              error: err.message,
              timestamp: new Date().toISOString(),
            };
            updateProgressState('running');
            done = true; // Przejdź do kolejnego przy nietypowym błędzie
          }
        }
      }
    }

    if (!isDaemon) break;
  }

  log('Pętla renderująca zatrzymana.');
  updateProgressState(running ? 'idle' : 'stopped');
}

runLoop().catch(err => {
  log(`Krytyczny błąd pętli: ${err.message}`);
  updateProgressState('crashed', { error: err.message });
  process.exit(1);
});
