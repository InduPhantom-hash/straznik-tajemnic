## Plan: Naprawa obrazów (mitologia Cthulhu) i głosów NPC

Data: 2026-07-22
Złożoność: Średnia

### Problem
Zmieniono instrukcje dla LLM i suffix serwerowy, ale obrazy nadal pokazują Cthulhu (hardcoded "Call of Cthulhu style" w 4 miejscach + LLM pisze prompty z narracji mitów). NPC mają głos lektora zamiast osobnych głosów (parser szuka `@Imię:`, a LLM pisze `Imię: „...”`; multi-voice tylko na ULTRA).

### Rozwiązanie
Trzy fazy: (1) naprawa parsowania dialogów + multi-voice na HIGH, (2) usunięcie hardcoded "Call of Cthulhu style", (3) serwerowy filtr słów mitów z wyjątkiem dla oznaczonych scen sen/wizja/starcie.

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|---|---|---|
| `src/hooks/useTTS.ts` | Warunek multi-voice z ULTRA na HIGH+ULTRA; regex markera akceptujący `Imię: „...”`; fallback po imieniu; czyszczenie lastNpcNameRef | Średnie |
| `src/lib/ai-presets/definitions.ts` | HIGH preset: `narratorOnly: false` + aktualizacja komentarza | Niskie |
| `src/lib/ai-settings/defaults.ts` | Aktualizacja komentarza przy `narratorOnly` (HIGH już nie narrator-only) | Niskie |
| `src/hooks/useGameStart.ts` | Prompt intro: usunąć "Call of Cthulhu style, vintage horror" | Niskie |
| `src/components/ui/character-wizard.tsx` | Prompt portretu: usunąć "Call of Cthulhu style" | Niskie |
| `src/components/ui/npc-manager.tsx` | Prompt portretu NPC: usunąć "Call of Cthulhu style" | Niskie |
| `src/components/ui/location-manager.tsx` | Prompt mapy lokacji: usunąć "Call of Cthulhu style" | Niskie |
| `src/app/api/imagen/route.ts` | Nowa funkcja sanitizePrompt() + filtr słów mitów + warunek `skipMythosFilter` | Średnie |
| `src/lib/parsers/media-parser.ts` | Rozszerzenie regexa o `isMythos` flag; nowe pole w ImageRequest | Średnie |
| `src/lib/parsers/types.ts` | Nowe pole `isMythos?: boolean` w `ImageRequest` | Niskie |
| `src/hooks/useChat.ts` | Propagacja `isMythos` do `/api/imagen` + zaktualizowanie `ImageToGenerate` | Średnie |
| `src/lib/prompts/image-instructions.ts` | Instrukcja dla LLM: dodanie znacznika `| mythos` w tagu dla scen nadprzyrodzonych | Niskie |

### Fazy implementacji

---

**Faza 1: Głosy NPC – naprawa parsowania i multi-voice na HIGH**

- [ ] 1.1 `useTTS.ts:475-476` - zmienić warunek: `const isUltraOrHigh = settingsForQueue.qualityPreset === 'ultra' || settingsForQueue.qualityPreset === 'high';`
- [ ] 1.2 `useTTS.ts:480` - zmienić `if (isUltra)` na `if (isUltraOrHigh)`
- [ ] 1.3 `useTTS.ts:538-540` - nowy regex markera akceptujący oba formaty:
  ```
  Old: /^@([A-ZŁŻŚĆŃÓĄĘ][\\wŁżśćńóąęŻŚĆŃÓĄĘłż ]+?):\\s*([\\s\\S]*)$/
  New: /^(@)?([A-Z\\u0141\\u017B\\u015A\\u0106\\u0143\\u00D3\\u0104\\u0118][\\w\\u0142\\u017C\\u015B\\u0107\\u0144\\u00F3\\u0105\\u0119\\u0179\\u015A\\u0106\\u0143\\u00D3\\u0104\\u0118\\u0142\\u017C ]+?):\\s*\u201E?([\\s\\S]*?)\\s*\u201D?$/
  ```
  Grupy: 1=`@` (opc), 2=imię, 3=tekst dialogu (bez cudzysłowów)
- [ ] 1.4 `useTTS.ts:544-553` - dostosować referencje do nowych grup matcha + dodać fallback po imieniu + USUNĄĆ blok kontynuacji. Gm-protocol nakazuje `Imię: „...”` w OSOBNEJ linii per kwestia, więc każde zdanie dialogu ma własny marker. Blok `else if (lastNpcNameRef.current)` generował wyciek głosu NPC na narrację (gdy voiceId znaleziony w mapie, ref nie był czyszczony → narracja czytała się głosem NPC). Cały blok od linii 545 do 560 (po nowym regexie) zastąpić kodem:
  ```ts
  if (markerMatch) {
    const npcName = markerMatch[2].trim();
    voiceId = npcVoiceMap.get(npcName.toLowerCase());
    if (!voiceId) {
      const firstName = npcName.split(/\s+/)[0];
      for (const [key, val] of npcVoiceMap) {
        if (key.startsWith(firstName.toLowerCase())) { voiceId = val; break; }
      }
    }
    textForQueue = markerMatch[3].trim() || sentence;
  }
  // Bez kontynuacji lastNpcNameRef - każde zdanie dialogu ma własny marker,
  // zdania bez markera = narrator. Unika wycieku głosu NPC na narrację.
  lastNpcNameRef.current = null;
  ```
- [ ] 1.5 `definitions.ts:122` - zmienić `narratorOnly: true` → `narratorOnly: false` + komentarz: `// HIGH + ULTRA = multi-voice NPC (2026-07-22)`
- [ ] 1.6 `defaults.ts:61` - zmienić komentarz: `narratorOnly: true, // LOW/MID: jeden głos narratora (HIGH/ULTRA = multi-voice od 2026-07-22)`
- [ ] 1.7 `useTTS.ts:8-9` - zmienić komentarz nagłówkowy (multi-voice "HIGH i ULTRA" zamiast "tylko ULTRA")

Weryfikacja: `npm run lint` + `npx tsc --noEmit` bez błędów. Ręczny smoke:
1. Ustaw preset HIGH w Settings → TTS → zapisz
2. Start nowej przygody (standardowej, nie custom)
3. Gdy pojawi się dialog NPC (Imię: „...”) - sprawdź uchem czy głos różni się od narratora
4. Wypowiedzi narratora bez markera muszą być głosem narratora, NIE ostatniego NPC

---

**Faza 2: Obrazy – usunięcie hardcoded "Call of Cthulhu style"**

- [ ] 2.1 `useGameStart.ts:207` - prompt intro:
  ```
  Old: `Atmospheric establishing shot, ${locationContext}, Call of Cthulhu style, moody lighting, vintage horror, cinematic.`
  New: `Atmospheric establishing shot, ${locationContext}, 1920s period-accurate, realistic, cinematic, moody natural lighting.`
  ```
- [ ] 2.2 `character-wizard.tsx:890` - prompt portretu:
  ```
  Old: `..., ${eraStyle} Call of Cthulhu style, dramatic lighting, vintage photograph aesthetic`
  New: `..., ${eraStyle} period-accurate portrait, realistic, dramatic lighting, vintage photograph aesthetic`
  ```
- [ ] 2.3 `npc-manager.tsx:168` - prompt portretu NPC:
  ```
  Old: `..., Call of Cthulhu style, 1920s, detailed, atmospheric`
  New: `..., 1920s period-accurate, realistic, detailed, atmospheric`
  ```
- [ ] 2.4 `location-manager.tsx:111` - prompt mapy lokacji:
  ```
  Old: `..., Call of Cthulhu style, detailed, atmospheric`
  New: `..., 1920s period-accurate, realistic layout, detailed, atmospheric`
  ```

Weryfikacja: `npm run lint` + `npx tsc --noEmit` bez błędów. Ręczny smoke:
1. Start nowej przygody → obraz intro = realistyczny pejzaż epoki, bez sylwetki Cthulhu/macek
2. Otwórz kreator postaci → kliknij "Generuj portret" → portret powinien być realistyczną fotografią z epoki, bez okultyzmu
3. Otwórz menedżer NPC → wygeneruj portret istniejącego NPC → j.w.
4. Otwórz menedżer lokacji → kliknij "Generuj mapę" → mapa/layout realistyczny, bez okultyzmu

---

**Faza 3: Obrazy – serwerowy filtr mitów + znacznik mythos**

- [ ] 3.1 `types.ts:34-38` - dodać pole `isMythos?: boolean` do `ImageRequest`:
  ```ts
  export interface ImageRequest {
    prompt: string;
    style?: 'horror' | 'vintage' | 'realistic' | 'artistic';
    priority?: 'high' | 'normal';
    isMythos?: boolean; // scena nadprzyrodzona - pomija filtr mitów
  }
  ```
- [ ] 3.2 `media-parser.ts:9-17` - zachować istniejący regex `([^\]]+)` (bez zmiany), a flagę `| mythos` wykrywać na przechwyconym tekście:
  ```ts
  const tagPattern = /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJECIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT):\s*([^\]]+)\]/gi;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
      let prompt = match[1].trim();
      let isMythos = false;
      // Wykryj suffix | mythos na końcu przechwyconego promptu
      const mythosSuffix = /\s*\|\s*mythos\s*$/i;
      if (mythosSuffix.test(prompt)) {
          isMythos = true;
          prompt = prompt.replace(mythosSuffix, '').trim();
      }
      images.push({
          prompt,
          style: 'horror',
          priority: 'normal',
          isMythos,
      });
  }
  ```
  To podejście nie zmienia grupy przechwytującej - prompt może zawierać `|` w środku (np. "candlelit chandelier | floor lamp"), tylko suffix `| mythos` jest wycinany.
- [ ] 3.3 `useChat.ts:180-183` - dodać `isMythos?: boolean` do `ImageToGenerate`:
  ```ts
  export interface ImageToGenerate {
    prompt: string;
    style?: 'horror' | 'vintage' | 'realistic' | 'artistic';
    isMythos?: boolean;
  }
  ```
- [ ] 3.4 `useChat.ts:468-480` - propagować `isMythos` w body POST do `/api/imagen`:
  ```ts
  body: JSON.stringify({
    prompt: img.prompt,
    style: img.style || 'horror',
    isMythos: img.isMythos || false,
    aspectRatio: '16:9',
    ...
  }),
  ```
- [ ] 3.5 `image-instructions.ts:59-60` - zaktualizować instrukcję tagu dla LLM, dodając znacznik dla scen nadprzyrodzonych:
  ```ts
  Użyj tagu w tekście odpowiedzi: [ILUSTRACJA: szczegółowy opis w języku ANGIELSKIM]
  Dla scen snów/wizji/bezpośrednich starć z istotami Mythos dodaj | mythos: [ILUSTRACJA: opis | mythos]
  ```
- [ ] 3.6 `imagen/route.ts:51` - wyciągnąć `isMythos` z body:
  ```ts
  const { prompt, style = 'horror', seed, era, isMythos = false } = body;
  ```
- [ ] 3.7 `imagen/route.ts` - NOWA funkcja `sanitizePrompt(prompt: string): string` (przed endpointem):
  ```ts
  const MYTHOS_KEYWORDS = [
    '\\bcthulhu\\b', '\\blovecraft\\b', '\\btentacles?\\b', '\\beldritch\\b',
    '\\bcosmic horror\\b', '\\bmonster\\b', '\\bcreature\\b', '\\bmythos\\b',
    '\\bnecronomicon\\b', '\\bgargoyle\\b', '\\bsupernatural\\b', '\\boccult\\b',
    '\\britual\\b', '\\bcult\\b', '\\bhorror\\b', '\\bgrotesque\\b',
    '\\beldritch horror\\b', '\\bforbidden knowledge\\b',
    '\\babomination\\b', '\\bunspeakable\\b', '\\botherworldly\\b',
    '\\blovecraftian\\b',
  ];
  const NEGATIVE_SUFFIX = ', strictly realistic, no monsters, no tentacles, no supernatural creatures, no cosmic horror elements, no occult symbols';

  function sanitizePrompt(prompt: string): string {
    let cleaned = prompt;
    for (const kw of MYTHOS_KEYWORDS) {
      cleaned = cleaned.replace(new RegExp(kw, 'gi'), '');
    }
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim();
    if (cleaned.endsWith(',')) cleaned = cleaned.slice(0, -1).trim();
    return cleaned + NEGATIVE_SUFFIX;
  }
  ```
- [ ] 3.8 `imagen/route.ts:138` - zastosować filtr TYLKO gdy `!isMythos`:
  ```ts
  let enhancedPrompt = isMythos ? prompt : sanitizePrompt(prompt);
  ```
  Uwaga: suffixy stylistyczne (`eraKeyword + realistic...`) aplikują się zawsze, niezależnie od filtru.

Weryfikacja: `npm run lint` + `npx tsc --noEmit` bez błędów. Ręczny smoke:
1. Zwykła scena w czacie (rozmowa, eksploracja) → `[ILUSTRACJA: ...]` generuje realistyczny obraz bez potworów, macek ani okultyzmu
2. Scena snu/wizji po teście SAN gdzie LLM doda `| mythos` → `[ILUSTRACJA: ... | mythos]` MOŻE zawierać elementy nadprzyrodzone (filtr pominięty)
3. Sprawdź w Network panel czy body POST do `/api/imagen` zawiera `isMythos: true` dla oznaczonych scen

### Weryfikacja końcowa

```bash
cd _tester/_base/.silnik && npm run lint && npx tsc --noEmit
```

Testy e2e (powinny przejść bez zmian - nie dotykają parserów ani formatów testowanych scenariuszy):
```bash
cd _tester/_base/.silnik && npx playwright test tests/e2e/feature-9-npc-voices.spec.ts tests/e2e/feature-12-tts.spec.ts
```

### Co może się zepsuć

1. **Koniec dialogu według starego `@` - UI:** Format `@Imię: ...` w parse-sections.ts parsuje dialog dla żółtej ramki. Nowy regex dla TTS akceptuje też `Imię: „...”`, ale w UI ciągle może być potrzebny `@` dla duetu. Sprawdzić, czy format `@` działa też w TTS (grupa 1 = `@` jest opcjonalna, grupa 2 = imię) - NISKIE RYZYKO.
2. **Filtr koliduje z realistycznymi scenami** (np. "ritual" w "morning ritual of coffee") - regex używa `\b` word boundaries, więc nie przepuści "ritual" jako części większego słowa. Jednak "morning ritual" pasuje. Rozwiązanie: lista słów jest restrykcyjna, a negatywny suffix jest standardowy dla wszystkich nie-mythos promptów - bez negatywnego sufiksu też działa (prompt po prostu jest czysty). NISKIE RYZYKO.
3. **"Call of Cthulhu style" w 4 hardcoded promptach to trigger stylu, nie treści** - po usunięciu obrazy mogą stracić charakter noir. Rekompensujemy przez "1920s period-accurate, realistic, cinematic film-grain, moody natural lighting" (suffix serwerowy już to dokleja). NISKIE RYZYKO.
4. **Zbyt dużo wywołań TTS na HIGH** - per-zdanie zamiast per-akapit oznacza więcej żądań do Gemini TTS (~$0.001/znak, per-znak a nie per-żądanie, więc koszt zbliżony, tylko latencja wyższa). Zaakceptowane przez usera. NISKIE RYZYKO.
