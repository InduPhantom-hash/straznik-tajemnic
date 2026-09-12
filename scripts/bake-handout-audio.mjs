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
  },
  // === STREFA 11 (Autorskie Polskie Scenariusze) ===
  {
    id: 'strefa11_prabuty_wiretap',
    title: 'Taśma szpulowa ZK-140: Podsłuch celi w Elblągu (1973)',
    scenario: 'cien-nad-prabutami',
    mediaType: 'reel_tape',
    voiceType: 'sb_officer',
    elevenVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam / głęboki, chłodny głos oficera SB
    text: 'Meldunek z podsłuchu celi ojca Czesława Klimuszki w Elblągu, 12 października 1973. Godzina dwudziesta trzecia zero zero. W celi słychać jednostajną modlitwę, a potem... gwałtowny pisk aparatury pomiarowej. Rejestrujemy nagły skok pola elektromagnetycznego. Szyby w oknach zaczynają drżeć. On rozmawia z kimś, kogo tam nie ma...',
    outputFilename: 'cien-nad-prabutami/tasma-sb-elblag.mp3',
  },
  {
    id: 'strefa11_kowary_crash',
    title: 'Nagranie magnetofonowe: Próba zderzeniowa Kowary (1996)',
    scenario: 'tajemnica-pendnika-lagiewki',
    mediaType: 'cassette_log',
    voiceType: 'excited_engineer',
    elevenVoiceId: 'VR6AewLTigWG4xSOukaG', // Arnold / nerwowy inżynier
    text: 'Uwaga, próba zderzeniowa numer cztery. Kowary, Zakład Doświadczalny, 18 maja 1996. Fiat 126p rozpędzony do pięćdziesięciu kilometrów na godzinę uderza czołowo w betonowy blok z zamontowanym zderzakiem Łągiewki. Trzy, dwa, jeden... Jezus Maria! Widzicie to?! Żadnego odrzutu! Samochód stoi jak wryty! Wirnik pochłonął sto procent energii kinetycznej... ale te wskaźniki... skąd wzięła się ta anomalia grawitacyjna?!',
    outputFilename: 'tajemnica-pendnika-lagiewki/proba-zderzeniowa-kowary.mp3',
  },
  {
    id: 'strefa11_traszyn_interview',
    title: 'Kaseta Stilon C-60: Wywiad z przerażonym dzieckiem (1983)',
    scenario: 'tajemnica-dzieci-z-traszyna',
    mediaType: 'audio_interview',
    voiceType: 'terrified_child',
    elevenVoiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh / młody, drżący głos
    text: 'Proszę pana... myśmy tylko włożyli ten stary klucz w książeczkę do nabożeństwa... Tak jak babcia mówiła. Trzymaliśmy go we dwójkę na palcach. I wtedy ten klucz zaczął się sam obracać. Zrobiło się strasznie zimno, a z desek stodoły zaczęła kapać ta czarna maź... I wtedy ten cień spod dachu zawołał nas po imieniu...',
    outputFilename: 'tajemnica-dzieci-z-traszyna/wywiad-dziecko-1983.mp3',
  },
  {
    id: 'strefa11_glogow_broadcast',
    title: 'Taśma VHS: Przechwycona audycja z przyszłości (2001)',
    scenario: 'przybysz-z-matriksa-glogow',
    mediaType: 'vhs_signal',
    voiceType: 'synthetic_prophet',
    elevenVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni / chłodny, zniekształcony głos
    text: 'Do wszystkich węzłów podsieci Dolnego Śląska. Jeśli odbieracie tę transmisję na kanale trzydziestym siódmym, oznacza to, że anomalia w Twierdzy Głogów została naruszona. Rok 2001 nie jest początkiem nowego wieku. To pętla. Odłączcie kable zasilające zanim serwery w kazamatach zaczną retransmitować sygnał zza horyzontu...',
    outputFilename: 'przybysz-z-matriksa-glogow/sygnal-vhs-glogow.mp3',
  }
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isFallback = process.argv.includes('--generate-fallbacks');
  const apiKey = process.env.ELEVENLABS_API_KEY;

  console.log('🎙️ [Handout Audio Baker] Inicjalizacja generowania nagrań handoutów...');
  console.log(`📁 Katalog wyjściowy: ${OUTPUT_DIR}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Utworzono katalog: ${OUTPUT_DIR}`);
  }

  // Zawsze zaktualizuj manifest
  const manifestPath = path.join(OUTPUT_DIR, 'handouts-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(PREDEFINED_HANDOUTS, null, 2), 'utf-8');
  console.log(`📄 Zapisano manifest: ${manifestPath}`);

  if (isDryRun) {
    console.log('🔍 [DRY-RUN] Tryb symulacji. Lista przygotowanych handoutów:');
    PREDEFINED_HANDOUTS.forEach((h, idx) => {
      console.log(`  ${idx + 1}. [${h.id}] "${h.title}" -> ${h.outputFilename}`);
    });
    console.log('✨ Zakończono symulację pomyślnie.');
    return;
  }

  if (!apiKey && !isFallback) {
    console.warn('⚠️ Brak zmiennej ELEVENLABS_API_KEY w środowisku.');
    console.warn('ℹ️ Skrypt zapisał strukturę katalogu i rejestr manifestu.');
    console.warn('   Aby upiec pliki przez API ElevenLabs: ELEVENLABS_API_KEY="klucz" node scripts/bake-handout-audio.mjs');
    console.warn('   Aby wygenerować klimatyczne lokalne wersje audio z filtrem vintage: node scripts/bake-handout-audio.mjs --generate-fallbacks');
    return;
  }

  for (const handout of PREDEFINED_HANDOUTS) {
    const targetFile = path.join(OUTPUT_DIR, handout.outputFilename);
    if (fs.existsSync(targetFile)) {
      console.log(`⏭️ Pominięto (istnieje): ${handout.outputFilename}`);
      continue;
    }

    // Upewnij się, że podkatalog (np. cien-nad-prabutami/) istnieje
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });

    if (apiKey) {
      console.log(`⏳ Generowanie audio ElevenLabs [${handout.id}] (${handout.title})...`);
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
        console.log(`✅ Zapisano ElevenLabs: ${handout.outputFilename} (${buffer.length} bajtów)`);
        continue;
      } catch (e) {
        console.error(`❌ Błąd przy ElevenLabs dla ${handout.id}:`, e.message);
        if (!isFallback) continue;
      }
    }

    if (isFallback) {
      console.log(`🎙️ Generowanie audio fallback z filtrem vintage [${handout.id}]...`);
      try {
        const { execSync } = await import('child_process');
        const tempAiff = path.join(OUTPUT_DIR, `temp_${Date.now()}_${handout.id}.aiff`);
        
        // Synteza przez macOS say z polskim głosem Zosia
        execSync(`say -v Zosia -o "${tempAiff}" "${handout.text.replace(/"/g, '\\"')}"`);
        
        // Przepuszczenie przez ffmpeg z filtrem pasmowym (charakterystyka taśmy magnetofonowej / radia)
        execSync(`ffmpeg -y -i "${tempAiff}" -af "highpass=f=200,lowpass=f=3200,volume=1.3" -codec:a libmp3lame -b:a 128k "${targetFile}" 2>/dev/null`);
        
        if (fs.existsSync(tempAiff)) {
          fs.unlinkSync(tempAiff);
        }
        console.log(`✅ Zapisano fallback vintage audio: ${handout.outputFilename}`);
      } catch (e) {
        console.error(`❌ Błąd przy generowaniu fallback dla ${handout.id}:`, e.message);
      }
    }
  }

  console.log('🎉 Generowanie zakończone.');
}

main().catch(console.error);

