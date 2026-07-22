# Research: Obrazy z mitami Cthulhu + brak osobnych głosów NPC

Data: 2026-07-22
Stack: Next.js (App Router) + React + TypeScript, Gemini API (@google/genai SDK), Gemini TTS (gemini-2.5-flash-preview-tts), Gemini image (gemini-2.5-flash-image). Playwright e2e.

## Ważne: struktura repo

Faktyczna aplikacja to `_tester/_base/.silnik/` - root `package.json` ma tylko `build`/`start` z `cd _tester/_base/.silnik`. Root `src/` to martwy snapshot, NIE edytować. Wszystkie ścieżki poniżej są relatywne do `_tester/_base/.silnik/`.

## Problem 1: Obrazy nadal pokazują sceny z mitologii Cthulhu

### Obszar problemu

| Plik | Rola |
|---|---|
| `src/hooks/useGameStart.ts:207` | HARDCODED prompt obrazu intro: `Atmospheric establishing shot, ${locationContext}, Call of Cthulhu style, moody lighting, vintage horror, cinematic.` - leci przy każdym starcie gry. To źródło obrazka ze screena (Cthulhu nad Bostonem). |
| `src/components/ui/character-wizard.tsx:890` | HARDCODED portret w kreatorze: `... ${eraStyle} Call of Cthulhu style, dramatic lighting, vintage photograph aesthetic` |
| `src/components/ui/npc-manager.tsx:168` | HARDCODED portret NPC: `..., Call of Cthulhu style, 1920s, detailed, atmospheric` |
| `src/components/ui/location-manager.tsx:111` | HARDCODED mapa lokacji: `..., Call of Cthulhu style, detailed, atmospheric` |
| `src/lib/prompts/image-instructions.ts:57-70` | Instrukcja dla LLM: tag `[ILUSTRACJA: opis EN]`, reguła 5 zakazuje macek w zwykłych scenach, nadprzyrodzone TYLKO w snach/wizjach/starciach - ale brak mechanizmu oznaczenia takiej sceny w tagu. |
| `src/lib/parsers/media-parser.ts:9,14` | Regex tagu: capture = cała reszta jako prompt; `style` zawsze hardcoded `'horror'`. Brak obsługi flag `| key=value` (regex `[^\]]+` połknie je do promptu). |
| `src/app/api/imagen/route.ts` | Model `gemini-2.5-flash-image` (linia 131). Suffixy stylu już neutralne/realistyczne (linie 138-144). BRAK jakiejkolwiek sanityzacji promptu - filtr to nowy kod. Walidacja tylko długości (linia 54). |
| `src/hooks/useChat.ts:463-480` | `generateImages()` forwarduje prompt LLM + `style: img.style || 'horror'`. |

### Dlaczego poprzednia naprawa nie zadziałała

Commit `20e1353` zmienił tylko instrukcję dla LLM i suffix serwerowy. Prompt ze słowem "Call of Cthulhu style" (najsilniejszy trigger na macki) siedzi na sztywno w 4 plikach, których commit nie objął. Dodatkowo prompty scen pisze LLM z narracji pełnej mitów - instrukcja tekstowa jest ignorowalna.

## Problem 2: NPC nie mają osobnych głosów

### Obszar problemu

| Plik | Rola |
|---|---|
| `src/hooks/useTTS.ts:475-476` | Multi-voice TYLKO dla `qualityPreset === 'ultra'`. Domyślny preset to `high` (defaults.ts:194) -> wszystko jednym głosem narratora, by design. |
| `src/hooks/useTTS.ts:534-553` | Parser markera: `/^@([A-ZŁŻŚĆŃÓĄĘ][\w...]+?):\s*/` - wymaga prefiksu `@`. |
| `src/lib/prompts/gm-protocol.ts:48` | LLM pisze dialogi jako `Imię: „treść”` BEZ `@`. Marker nigdy nie matchuje -> fallback na głos narratora. GŁÓWNY BUG. |
| `src/lib/npc-voice-mapping.ts:291-310` | Mapa kluczowana pełną nazwą NPC lowercase z localStorage `gm_npcs`. gm-protocol uczy LLM używać samego imienia po pierwszym przedstawieniu -> `map.get('stephen')` nie trafia w `'stephen knott'`. |
| `src/hooks/useTTS.ts:550-553` | `lastNpcNameRef` nigdy nie czyszczony przy powrocie narracji - narracja po dialogu czytana głosem NPC. |
| `src/lib/ai-presets/definitions.ts:178-181` | ULTRA: narrator `Gacrux`, `narratorOnly: false`. HIGH ma `narratorOnly: true` (defaults.ts:58-64). |
| `src/lib/gemini-voices.ts` | 30 prebuilds z rolami narrator/male/female/monster/young/old; default `Kore`. |
| `src/app/api/tts/gemini/route.ts:233-246` | Gemini TTS, `prebuiltVoiceConfig`, `languageCode: 'pl-PL'`. |

### Zależności / przepływ

Odpowiedź MG -> segmentacja na zdania (useTTS) -> na ULTRA regex markera -> lookup w `npcVoiceMap` (localStorage `gm_npcs`) -> POST `/api/tts/gemini` z voiceName. NPC wymyślony ad hoc (niezapisany tagiem `[NPC: ...]`) nie ma wpisu w mapie -> narrator.

## Istniejące testy

- `tests/e2e/feature-9-npc-voices.spec.ts` i `feature-12-tts.spec.ts` (identyczne w root i .silnik) - czyste smoke testy z mockiem `page.route('**/api/**')`. NIE testują markera ani formatu dialogów. Planowane zmiany ich NIE złamią.
- Brak unit testów dla: media-parser, imagen route, npc-voice-mapping, useTTS.
- Pokrycie obszaru zmian: znikome - warto rozważyć test jednostkowy parsera mówcy przy implementacji.

## Ryzyka i uwagi

1. **Zmiana regexa mówcy musi nie kolidować z UI** - format `Imię: „treść”` napędza też żółtą ramkę dialogu (parse-sections.ts). Regex TTS powinien wymagać cudzysłowu po dwukropku, żeby nie łapać linii typu `Boston: 14 stycznia`.
2. **Marker sceny nadprzyrodzonej** - trzeba rozszerzyć regex w media-parser (np. `[ILUSTRACJA: prompt | mythos]`) + propagować flagę przez useChat do /api/imagen. Czyszczenie tagów w utils.ts:42 / text-cleaner.ts:43 / cleanup.ts:36 używa `[^\]]*`, więc rozszerzony tag nadal będzie poprawnie usuwany z tekstu.
3. **Filtr serwerowy** nie może wycinać słów zbyt agresywnie (np. "creature" w "creature comforts") - lista słów-kluczy + word boundaries, działanie tylko gdy brak flagi mythos.
4. Multi-voice na HIGH = więcej wywołań TTS per akapit (koszt/latencja) - zdecydowane z userem: HIGH + ULTRA.
5. NPC ad hoc bez wpisu w `gm_npcs` - poza zakresem tej naprawy (opcjonalnie fallback heurystyki płci z imienia).

## Rekomendowany następny krok

Problem w pełni zdiagnozowany, zmiany lokalne i mało inwazyjne. Idziemy do `/dev-2-plan` (plan implementacji), potem implementacja fazami:

- Faza 1 (głosy): regex mówcy na format `Imię: „...”` + fallback po imieniu + czyszczenie lastNpcNameRef + multi-voice na HIGH.
- Faza 2 (obrazy): 4 hardcoded prompty bez "Call of Cthulhu style".
- Faza 3 (obrazy): filtr mitów w /api/imagen + marker mythos w tagu ILUSTRACJA (media-parser + image-instructions + useChat).
