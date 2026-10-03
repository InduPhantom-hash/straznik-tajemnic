# Specyfikacja Techniczna: Moduł EventResolution & Adjudykacja Intencji (Concordia Pattern)

> **Status:** Wdrożone (Issue #311)  
> **Powiązane:** #246, #253, #315  
> **Inspiracja architektoniczna:** Google DeepMind Concordia (`concordia/components/game_master/event_resolution.py`)  
> **Zgodność regułowa:** Zew Cthulhu 7e RAW (Księga Strażnika s. 94, 119-123, 218)

---

## 1. Cel i Motywacja

Tradycyjny, „płaski” czat z modelem LLM cierpi na problem **autosukcesu (self-proclaimed success)**. Gdy gracz wysyła wiadomość w stylu:
> *„Wyważam z buta żelazne drzwi skarbca, wbiegam do środka, zabijam kultystę jednym strzałem i zabieram złoto, nikt mnie nie widzi”*

Płaski model narracyjny bez filtra adjudykacji ma tendencję do bezpośredniego zaakceptowania opisu gracza, generując scenę pełnego sukcesu bez rzutów kośćmi, weryfikacji ekwipunku ani oporu świata.

Moduł **EventResolution** rozwiązuje ten problem, wprowadzając dwuetapowy przepływ decyzji Mistrza Gry inspirowany architekturą Google DeepMind Concordia.

---

## 2. Architektura Dwuetapowa

```
[ Wypowiedź gracza w oknie czatu ]
                │
                ▼
   ┌───────────────────────────┐
   │ 1. Putative Event         │  Deklaracja intencji / Zamiar (action attempt)
   │    (extractPutativeEvent) │  Izolacja direct quote, oczyszczenie z autosukcesu
   └─────────────┬─────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │ 2. Intent Adjudicator     │  Ocena fizycznej i sytuacyjnej możliwości
   │    (<400 ms fast-path)    │  Gating ekwipunku (broń, narzędzia), stan postaci
   │                           │  Wymóg testu CoC 7e RAW (trudność, rzut sporny)
   └─────────────┬─────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │ 3. Real Event             │  Ugruntowany, obiektywny fakt w świecie gry
   │    (resolveToRealEvent)   │  - established (rutynowe)
   │                           │  - check_required (wymaga rzutu [TEST:])
   │                           │  - blocked (Twarde Weto Sędziego RAW)
   └─────────────┬─────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │ 4. Keeper Storyteller     │  Model narracyjny pisze immersyjną prozę
   │    (Gemini Flash + Prompt)│  WOKÓŁ Real Event z zakazem autosukcesu
   └───────────────────────────┘
```

---

## 3. Kluczowe Interfejsy TypeScript (`event-resolution.ts`)

```typescript
export type AdjudicationPlausibility = 'plausible' | 'implausible' | 'impossible';

export type ActionCategory =
  | 'physical'
  | 'social'
  | 'investigative'
  | 'combat'
  | 'stealth'
  | 'occult'
  | 'mundane'
  | 'dialogue';

export interface CheckRequirement {
  requiresCheck: boolean;
  skillOrAttribute?: string;
  difficulty?: 'regular' | 'hard' | 'extreme';
  opposed?: boolean;
  opposedTarget?: string;
  opposedSkill?: string;
  reason?: string;
}

export interface PutativeEvent {
  id: string;
  actorName: string;
  rawText: string;
  actionAttempt: string;
  directQuote?: string;
  target?: string;
  location?: string;
  timestamp: number;
}

export interface AdjudicationResult {
  eventId: string;
  plausibility: AdjudicationPlausibility;
  plausibilityReason?: string;
  category: ActionCategory;
  requiresCheck: boolean;
  checkRequirement?: CheckRequirement;
  missingRequirements?: string[];
  isAutosuccessAllowed: boolean;
  suggestedOutcome:
    | 'pending_check'
    | 'blocked_impossible'
    | 'auto_success'
    | 'refused_by_referee';
  confidence: number;
}

export interface RealEvent {
  id: string;
  putativeEventId: string;
  actorName: string;
  groundedFact: string;
  directQuote?: string;
  status: 'established' | 'blocked' | 'check_required';
  mechanicalDirective: string;
  checkRequirement?: CheckRequirement;
  timestamp: number;
}
```

---

## 4. Punkty Integracji w Silniku

1. **Moduł rdzenny (`_tester/_base/.silnik/src/lib/concordia/event-resolution.ts`):**
   - `extractPutativeEvent(text, actorName, location)`: oczyszcza intencję, ekstrahuje mowę dosłowną, usuwa deklaracje autosukcesu.
   - `adjudicatePutativeEvent(event, context)`: deterministyczny analizator reguł CoC 7e RAW wykonujący ocenę w < 1 ms.
   - `resolveToRealEvent(event, adjudication, locale)`: tworzy obiektywny `RealEvent` i dyrektywę mechaniczną dla MG.
   - `buildConcordiaEventResolutionDirective(realEvent, locale)`: generuje sekcję promptu w języku polskim lub angielskim.
   - `adjudicateEventPipeline(message, context)`: zunifikowany punkt wejścia zwracający komplet danych.

2. **Kontekst zapytania (`build-context.ts`):**
   - Dodano opcjonalne pola `playerMessage` oraz `eventResolutionDirective` do `BuildAdditionalContextOpts`.
   - Wstrzykiwanie sekcji `## ADJUDYKACJA ZDARZEŃ I INTENCJI GRACZA (CONCORDIA EVENT RESOLUTION)` bezpośrednio do `additionalContext`.

3. **Orchestrator pipeline'u (`run-chat-pipeline.ts`):**
   - Przekazanie `playerMessage: message` do `buildAdditionalContext`.

4. **Protokół MG (`gm-protocol.ts`):**
   - Dodano dyrektywę `#### 3-TER. ADJUDYKACJA ZDARZEŃ I ANTY-AUTOSUKCES (CONCORDIA PATTERN)`.
   - Zaktualizowano kompaktowy protokół o wymóg traktowania wypowiedzi gracza jako `Putative Event`.

5. **Lokalizacja i18n (`messages/pl.json` i `messages/en.json`):**
   - 100% symetryczny blok `EventResolution` (`putativeEvent`, `realEvent`, `impossibleAction`, `checkRequired`, `autoSuccess`).

---

## 5. Zgodność z Call of Cthulhu 7e RAW

- **Gating Ekwipunku:** Strzał z broni palnej bez posiadania uzbrojenia w ekwipunku zostaje zablokowany jako `blocked_impossible`. Obsługuje pełny katalog broni II RP i 1920s (`weapon-context.ts`, w tym Vis, Luger, Nagant, dubeltówki).
- **Ślusarstwo i Narzędzia:** Otwieranie zamków bez wytrychów automatycznie podnosi trudność testu do `hard` (Trudny sukces RAW).
- **Rzuty Przeciwstawne (Opposed Rolls):** Walka wręcz oraz skradanie się przy obecności wrogich NPC wymuszają rzut sporny (`opposed: true`).
- **Social Pushback:** Próby zastraszenia lub przekonania NPC są chronione przed darmowym sukcesem i wymagają oficjalnego testu `[TEST: Zastraszanie | Perswazja | Gadanina]`.
- **Okultyzm i Mity Cthulhu:** Rytuały, rzucanie czarów i badanie plugawych tomów wymagają testów z trudnością `hard`.
- **Sprawność Fizyczna:** Wspinaczka, Skakanie przez rozpadliny i Pływanie podlegają testom odpowiednich cech i umiejętności.
- **Twarde Weto Sędziego (RAW s. 94, 218):** Nadludzkie deklaracje (latanie, laser z oczu, podnoszenie 10-tonowych obiektów) spotykają się z natychmiastowym vetem bez rzutu kością i bez upływu czasu w grze.
- **Fail-Forward & Zawieszenie Wyniku:** Porażka ani podjęcie akcji nie są orzekane samowolnie w prozie; model opisuje napięcie i emituje tag testu, czekając na wynik rzutu z Tacki.
- **Inwariant Domknięcia Rzutu (Anti-Loop):** Wiadomości z wynikiem rzutu z Tacki (`[🎲 Test: ...]`, `[DICE_ROLL]`) są natychmiast rozpoznawane jako rozstrzygnięcie akcji (`Real Event Resolution`), blokując zapętlanie żądań testów.
- **Ochrona Startu Gry:** Parametr `isGameStart` wyłącza adjudykację intencji dla tekstu wprowadzającego MG.
