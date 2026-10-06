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
    text: 'Meldunek operacyjny z podsłuchu obiektu KLIN w Elblągu... Dwanaście października, tysiąc dziewięćset siedemdziesiąty trzeci rok. Godzina dwudziesta trzecia zero zero. W celi klasztornej przez dwie godziny słychać było wyłącznie jednostajny szept modlitewny... A potem... nagły, gwałtowny pisk aparatury pomiarowej. Rejestrujemy natychmiastowy skok natężenia pola elektromagnetycznego. Wskaźniki w wozie transmisyjnym dosłownie powariowały... Szyby w oknach zaczynają drżeć. To nie jest rezonans akustyczny. On... on rozmawia z kimś, kogo tam fizycznie nie ma. Słyszę drugi głos, ale mikrofon dynamiczny nie rejestruje fali dźwiękowej... Sprawdzić to natychmiast.',
    outputFilename: 'cien-nad-prabutami/tasma-sb-elblag.mp3',
  },
  {
    id: 'strefa11_kowary_crash',
    title: 'Nagranie magnetofonowe: Próba zderzeniowa Kowary (1996)',
    scenario: 'tajemnica-pendnika-lagiewki',
    mediaType: 'cassette_log',
    voiceType: 'excited_engineer',
    elevenVoiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie / energiczny, zszokowany inżynier
    text: 'Uwaga wszyscy, rejestrujemy! Próba zderzeniowa numer cztery... Kowary, Zakład Doświadczalny, osiemnasty maja tysiąc dziewięćset dziewięćdziesiątego szóstego roku. Fiat 126p na rampie najazdowej, prędkość wyliczona: pięćdziesiąt kilometrów na godzinę. Cel: czołowe uderzenie w lity blok betonowy. Na przedzie zamontowany prototypowy wirnik Łągiewki. Za trzy... dwa... jeden... poszedł! Jezus Maria! Widzieliście to?! Żadnego odrzutu! Samochód stanął w miejscu jak wryty! Ani centymetra odbicia! Wirnik pochłonął sto procent wektora pędu... Czekajcie... spójrzcie na mierniki grawimetryczne! Wskazówka leci poza skalę! Skąd w punkcie uderzenia ujemna masa bezwładna?! Wyłączcie zasilanie! Wyłączcie to natychmiast!',
    outputFilename: 'tajemnica-pendnika-lagiewki/proba-zderzeniowa-kowary.mp3',
  },
  {
    id: 'strefa11_traszyn_interview',
    title: 'Kaseta Stilon C-60: Wywiad z przerażonym dzieckiem (1983)',
    scenario: 'tajemnica-dzieci-z-traszyna',
    mediaType: 'audio_interview',
    voiceType: 'terrified_child',
    elevenVoiceId: '1tDEBGOo8EqEPApM49eJ', // Leo / dziecięcy głos ze strachem
    text: 'Proszę pana... przysięgam, myśmy nie chcieli nic złego... Myśmy tylko włożyli ten stary, mosiężny klucz w książeczkę do nabożeństwa... tak jak babcia kiedyś opowiadała. Trzymaliśmy go we dwójkę na końcach palców. I wtedy... ten klucz zaczął się sam obracać. Z każdą sekundą szybciej i szybciej... Zrobiło się tak strasznie zimno, że z ust leciała nam para. A potem z belek pod powałą stodoły zaczęła skapywać ta czarna, gęsta maź... I wtedy ten cień... ten cień spod dachu... zawołał nas po imieniu. Nie głosem człowieka. To brzmiało, jakby mówiła sama ziemia pod podłogą...',
    outputFilename: 'tajemnica-dzieci-z-traszyna/wywiad-dziecko-1983.mp3',
  },
  {
    id: 'strefa11_glogow_broadcast',
    title: 'Taśma VHS: Przechwycona audycja z przyszłości (2001)',
    scenario: 'przybysz-z-matriksa-glogow',
    mediaType: 'vhs_signal',
    voiceType: 'synthetic_prophet',
    elevenVoiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum / chłodny, hipnotyzujący głos
    text: 'Komunikat priorytetowy do wszystkich węzłów podsieci Dolnego Śląska... Jeżeli odbieracie tę transmisję na kanale trzydziestym siódmym, oznacza to, że pieczęć w kazamatach Twierdzy Głogów została naruszona. Rok dwa tysiące pierwszy nie jest początkiem nowego stulecia. To jest zamknięta pętla czasowa. Każdy odebrany impuls skraca interwał powrotu bytu z podziemi Odry. Odłączcie zasilanie magistrali... Odłączcie kable koncentryczne zanim przekaźniki w zalanym sektorze X-11 zaczną retransmitować sygnał zza horyzontu zdarzeń. Czas nie płynie w przód. Czas zapada się do środka...',
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

