## Plan Review: Naprawa obrazów (mitologia Cthulhu) i głosów NPC

Data: 2026-07-22
Reviewer: dev-3-plan-review

### Ocena ogólna
🟡 Żółty - 2 krytyczne błędy w logice + 1 ostrzeżenie. Naprawa planu wymagana przed implementacją, ale research solidny, kierunek dobry.

### Znalezione problemy

**Krytyczne** (blokuje implementację):

1. **[Kompletność + Rabbit hole] Faza 1, krok 1.4: blok kontynuacji (`else if lastNpcNameRef`) NIE naprawia wycieku głosu NPC na narrację.**

Obecny kod planu czyści `lastNpcNameRef` TYLKO gdy `voiceId` nie znaleziony w mapie. Dla NPC, który MA wpis w `npcVoiceMap` (np. "Stephen Knott"), `voiceId` JEST znaleziony → ref NIE jest czyszczony → zdania narracji bez markera wchodzą w `else if lastNpcNameRef.current` → czytane głosem Stephena.

Przykład fail case:
```
Stephen: „I've been the sheriff for twenty years. Seen strange things.”   ← marker, voice=Stephen
Deszcz bębnił o parapet. Zapach wilgoci unosił się w powietrzu.          ← NARACJA, ale lastNpcNameRef='Stephen Knott' ≠ null → czytane głosem Stephena!
Stephen: „The symbols are... unsettling.”                                 ← marker, voice=Stephen (OK)
```

**Sugerowana naprawa**: zamiast sprawdzać czy `voiceId` istnieje w mapie (prawie zawsze istnieje dla NPC z dialogiem), sprawdzać czy bieżące zdanie to kontynuacja dialogu czy narracja. Najprostsze: zdanie narracji NIE ma cudzysłowu `„` ani `”`. Blok kontynuacji powinien wchodzić tylko, gdy zdanie zawiera cudzysłów zamykający:
```ts
} else if (lastNpcNameRef.current && /[„\u201E\u201C]/.test(sentence) || /\u201D|\u201D/.test(sentence)) {
    voiceId = npcVoiceMap.get(lastNpcNameRef.current.toLowerCase());
    // ... fallback
} else {
    lastNpcNameRef.current = null;  // narracja - wracamy do głosu narratora
}
```
Alternatywnie (prościej): całkowicie usunąć blok kontynuacji. Gm-protocol już nakazuje `Imię: „...”` w OSOBNEJ linii. Jeśli drugie zdanie monologu NPC nie ma własnego markera - to błąd LLM, a kosztem jest tylko to że drugie zdanie przeczyta narrator zamiast NPC (niski impact).

2. **[Kompletność] Faza 3, krok 3.2: rozszerzenie regexa w media-parser wyklucza `|` z capture group promptu.**

Planowany regex: `([^\\]\\|]+?)` wyklucza zarówno `]` jak i `|` z grupy przechwytującej prompt. Jeśli prompt zawiera `|` (np. `candlelit chandelier | floor lamp, dim lighting`), regex wytnie `|` z promptu i uszkodzi opis.

**Sugerowana naprawa**: zachować stary regex `([^\]]+)` i wykrywać `| mythos` w przechwyconym tekście (string suffix match):
```ts
let prompt = match[1].trim();
let isMythos = false;
const mythosSuffix = /\s*\|\s*mythos\s*$/i;
if (mythosSuffix.test(prompt)) {
    isMythos = true;
    prompt = prompt.replace(mythosSuffix, '').trim();
}
```
To jest bezpieczniejsze - `|` w środku promptu nie przeszkadza, tylko suffix z flagą jest wycinany.

**Ostrzeżenia** (warto adresować):

3. **[Kompletność] Faza 3, krok 3.7: słowo `iblie` w MYTHOS_KEYWORDS to śmieć.**

W liście słów kluczowych jest `'\\\\biblie\\\\b'`. To nie jest angielskie słowo związane z mitologią Cthulhu (może być całkiem losowym artefaktem z innego fragmentu promptu). Usunąć z listy - wprowadza niepotrzebne ryzyko false-positive match na "nibble" lub podobne słowa.

4. **[Strategia testowania] Weryfikacja każdej fazy to "ręczny smoke" bez konkretnych kroków.**

Smoke testy są poprawne, ale nieodtwarzalne dla kogoś kto nie zna aplikacji. Doprecyzować:
- Faza 1: "Ustaw preset HIGH w Settings → TTS → zapisz. Rozpocznij nową przygodę. Gdy pojawi się dialog NPC, sprawdź uchem czy głos różni się od narratora."
- Faza 2: "Rozpocznij nową przygodę → sprawdź obraz intro (brak macek/sylwetki Cthulhu). Użyj kreatora postaci → wygeneruj portret (brak okultyzmu)."
- Faza 3: "Zwykła scena chat → obraz realistyczny. Przełącz na sen/wizję (np. `[TEST: Poczytalność | ...]` wywoła SAN loss → scena wizji) → obraz MOŻE mieć elementy nadprzyrodzone jeśli LLM użyje `| mythos`."

**Obserwacje** (do rozważenia):

5. `ImageRequest` → `ImageToGenerate` w useChat.ts:743 jest rzutowane przez `as unknown as ImageToGenerate[]`. Oba interfejsy są strukturalnie kompatybilne po dodaniu `isMythos?: boolean` do obu. TypeScript sprawdzi to na etapie kompilacji. OK.

6. Faza 1 zmienia ścieżkę HIGH z per-akapit na per-zdanie. Istniejąca logika wczesnego odtwarzania (E0-E1, useTTS.ts:585-617) dla non-ULTRA staje się dead code dla HIGH. Nie szkodzi - po prostu nie jest wywoływana. Ale jeśli później zmienimy LOW/MID na multi-voice, ten kod będzie potrzebował refactora, żeby uniknąć duplikacji z ULTRA path. Na teraz - zostawiamy bez zmian.

7. Plan nie definiuje `NEGATIVE_SUFFIX` w `/api/imagen`. NEGATIVE_SUFFIX z Fazy 3 (krok 3.7) dodaje suffix `no monsters, no tentacles, no supernatural creatures...` do promptu, a POTEM suffixy stylistyczne (krok 3.8) z `eraKeyword` są aplikowane na wierzchu. To daje podwójny suffix: najpierw negatyw, potem styl. Czy to problem? Nie - po prostu prompt będzie długi, ale to działa.

### Rekomendacja
🔴 Popraw dwie krytyczne usterki w planie (kontynuacja głosu w narracji + regex media-parser), usuń słowo `iblie`, po czym plan jest gotowy do implementacji.
