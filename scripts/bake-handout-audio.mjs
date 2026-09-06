#!/usr/bin/env node
/**
 * scripts/bake-handout-audio.mjs
 *
 * Skrypt deweloperski do generowania pre-baked nagrań audio (ElevenLabs API)
 * dla klasycznych handoutów ze starterów i podręcznika Zew Cthulhu 7e.
 * 
 * Generuje pliki .mp3 bezpośrednio do:
 * _tester/_base/.silnik/public/audio/handouts/
 *
 * Użycie:
 *   node scripts/bake-handout-audio.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, '_tester/_base/.silnik/public/audio/handouts');

// Baza kluczowych handoutów ze starterów i podręcznika głównego CoC 7e
export const PREDEFINED_HANDOUTS = [
  {
    id: 'corbitt_journal_page',
    title: 'Dziennik Waltera Corbetta (Nawiedzony Dom)',
    mediaType: 'journal_page',
    voiceType: 'ominous_old_man',
    elevenVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam / deep narrator
    text: 'Piątek, 14 listopada. Czas płynie inaczej w tych murach. Czuję, jak w ziemi pod fundamentami coś pulsuje... Kościół Gwiezdnej Mądrości miał rację. Nie zaznam śmierci tak długo, jak długo znoszę im dar z krwi.',
    outputFilename: 'corbitt_journal.mp3',
  },
  {
    id: 'boston_globe_1919',
    title: 'Wycinek prasowy z Boston Globe (1919)',
    mediaType: 'radio_broadcast',
    voiceType: 'radio_announcer_1920s',
    elevenVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni
    text: 'Wydanie wieczorne Boston Globe. Makabryczne odkrycie w piwnicy starego domostwa przy French Hill. Policja hrabstwa Essex wstrzymuje się od komentarza. Sąsiedzi twierdzą, że z piwnicy dochodziły nieludzkie jęki.',
    outputFilename: 'boston_globe_radio.mp3',
  },
  {
    id: 'letter_from_friend_starter',
    title: 'List od przyjaciela (Wrota Mroku / Starter)',
    mediaType: 'letter',
    voiceType: 'panicked_scholar',
    elevenVoiceId: 'VR6AewLTigWG4xSOukaG', // Arnold
    text: 'Mój drogi przyjacielu. Jeśli czytasz ten list, obawiam się, że moje najgorsze przypuszczenia stały się prawdą. Nie ufaj nikomu w porcie. Klucz do skrytki schowałem za portretem pradziadka. Błagam, spal te papiery!',
    outputFilename: 'starter_friend_letter.mp3',
  },
  {
    id: 'arkham_sanitarium_phonograph',
    title: 'Cylinder fonografu: Zeznanie pacjenta Arkham Sanitarium',
    mediaType: 'phonograph_cylinder',
    voiceType: 'trembling_patient',
    elevenVoiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh
    text: 'Czy to nagrywa? Proszę... one nie mają twarzy, a mimo to na mnie patrzą. Zstępują ze wzgórz za każdym razem, gdy mgła opada nad rzekę Miskatonic... Doktórze, niech pan nie gasi lampy!',
    outputFilename: 'arkham_phonograph_record.mp3',
  }
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const apiKey = process.env.ELEVENLABS_API_KEY;

  console.log('🎙️ [Handout Audio Baker] Inicjalizacja generowania nagrań handoutów...');
  console.log(`📁 Katalog wyjściowy: ${OUTPUT_DIR}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Utworzono katalog: ${OUTPUT_DIR}`);
  }

  if (isDryRun) {
    console.log('🔍 [DRY-RUN] Tryb symulacji. Lista przygotowanych handoutów:');
    PREDEFINED_HANDOUTS.forEach((h, idx) => {
      console.log(`  ${idx + 1}. [${h.id}] "${h.title}" -> ${h.outputFilename}`);
    });
    console.log('✨ Zakończono symulację pomyślnie.');
    return;
  }

  if (!apiKey) {
    console.warn('⚠️ Brak zmiennej ELEVENLABS_API_KEY w środowisku.');
    console.warn('ℹ️ Skrypt zapisał strukturę katalogu i rejestr manifestu. Aby upiec pliki przez API, uruchom:');
    console.warn('   ELEVENLABS_API_KEY="twój-klucz" node scripts/bake-handout-audio.mjs');
    
    // Zapisz manifest informacyjny
    const manifestPath = path.join(OUTPUT_DIR, 'handouts-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(PREDEFINED_HANDOUTS, null, 2), 'utf-8');
    console.log(`📄 Zapisano manifest: ${manifestPath}`);
    return;
  }

  for (const handout of PREDEFINED_HANDOUTS) {
    const targetFile = path.join(OUTPUT_DIR, handout.outputFilename);
    if (fs.existsSync(targetFile)) {
      console.log(`⏭️ Pominięto (istnieje): ${handout.outputFilename}`);
      continue;
    }

    console.log(`⏳ Generowanie audio [${handout.id}] (${handout.title})...`);
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${handout.elevenVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: handout.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.15,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Błąd API ElevenLabs: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(targetFile, buffer);
      console.log(`✅ Zapisano pomyślnie: ${handout.outputFilename} (${buffer.length} bajtów)`);
    } catch (e) {
      console.error(`❌ Błąd przy generowaniu ${handout.id}:`, e.message);
    }
  }

  console.log('🎉 Generowanie zakończone.');
}

main().catch(console.error);
