# Specyfikacja Audytu: Renderowanie Obrazów i Spójność Epokowa (Visual Era Consistency Audit)

## 1. Cel audytu
Identyfikacja wszystkich miejsc w kodzie, promptach systemowych, katalogach ekwipunku, generatorach postaci i komponentach UI odpowiedzialnych za generowanie oraz wyświetlanie obrazów, ze szczególnym uwzględnieniem anomalii anachronistycznych (np. iPhone i powerbank w 1983 r., Ford T w 1970 r.).

---

## 2. Mapa wszystkich elementów aplikacji korzystających z obrazów

| Komponent / Moduł | Rola i generowane obrazy | Pliki źródłowe |
|---|---|---|
| **Intro scenariusza** | Establishing shot lokacji startowej przy starcie przygody (format 16:9) | `src/hooks/useGameStart.ts` |
| **Ilustracje czatu** | Dynamiczne sceny `[SCENA:]` i portrety `[PORTRET:]` emitowane przez MG | `src/hooks/useChat.ts`, `src/lib/prompts/image-instructions.ts`, `src/lib/parsers/media-parser.ts` |
| **Ekwipunek i przedmioty** | Miniatury w modalu ekwipunku, podgląd przedmiotu, auto-generacja w tle, przedmioty zdobyte | `src/lib/equipment-prompt-builder.ts`, `src/lib/equipment-catalog.ts`, `src/hooks/useEquipmentThumbnails.ts`, `src/components/ui/equipment-modal.tsx`, `src/app/api/equipment/generate-starting/route.ts`, `src/app/api/equipment/enrich/route.ts` |
| **Kreator badacza** | Portret badacza tworzonego w kreatorze (szybki portret, warianty) | `src/components/ui/character-wizard.tsx`, `src/lib/character-portrait-generator.ts`, `src/components/ui/portrait-generator.tsx` |
| **Menedżer NPC** | Portrety bohaterów niezależnych | `src/components/ui/npc-manager.tsx`, `src/app/api/npc/generate-rich/route.ts` |
| **Menedżer Lokacji** | Rzuty i mapy lokacji | `src/components/ui/location-manager.tsx` |
| **Dziennik sesji i Tablica** | Ilustracje wpisów w Dzienniku Sesji oraz węzłów na Tablicy Badacza | `src/app/api/summarize-scene/route.ts`, `src/components/ui/session-journal.tsx`, `src/components/ui/journal/discoveries-view.tsx` |
| **Orkiestrator API obrazów** | Główny endpoint generujący obrazy przez Gemini Flash Image (`gemini-2.5-flash-image`) | `src/app/api/imagen/route.ts` |

---

## 3. Zdiagnozowane źródła błędów i anomalii anachronistycznych

### Błąd 1: Hardcoded "1920s" w intro przygody (`useGameStart.ts:205`)
- **Objaw:** W przygodzie z lat 70. (np. *Cień nad Prabutami 1973*) generowany jest Ford Model T na ulicy.
- **Przyczyna:** `useGameStart.ts` w linii 205 ma zahardkodowany prompt:
  ```ts
  const imagePrompt = `Atmospheric establishing shot, ${locationContext}, 1920s period-accurate, realistic, cinematic, moody natural lighting.`;
  ```
  Zamiast dynamicznej epoki z `adventureContext`, każda przygoda dostaje na starcie wymuszenie lat 20. XX wieku.

### Błąd 2: Hardcoded "1920s" w Menedżerze NPC i Menedżerze Lokacji (`npc-manager.tsx:169`, `location-manager.tsx:112`)
- **Objaw:** Portrety NPC i mapy lokacji tworzone z panelu zawsze wyglądają jak z lat 20.
- **Przyczyna:**
  - `npc-manager.tsx:169`: `prompt = Portrait of ${npc.name}, ..., 1920s period-accurate...`
  - `location-manager.tsx:112`: `prompt = Map or layout of ${location.name}, ..., 1920s period-accurate...`

### Błąd 3: Błędne mapowanie epok w `build-time-context.ts` (wstrzykiwanie realiów lat 20. do przygód 70./80./90.)
- **Objaw:** Mistrz Gry w narracji opisuje Forda T, dorożki i telegrafy w latach 1970-1999.
- **Przyczyna:** `eraMap` w `build-time-context.ts` zna tylko `gaslight, classic, noir, prl, modern`. Dla epoki `'custom'` (używanej w scenariuszach 80./90.) domyślnie zwraca `'1920s'`, wstrzykując do promptu MG:
  `Zasady Świata (1920s): Automobil: Ford Model T jest powszechny... Pociągi ekspresowe Orient Express...`.

### Błąd 4: "Telefon" i "Powerbank" w katalogu i zestawach epokowych (`equipment-catalog.ts`, `predefined-equipment.ts`)
- **Objaw:** W 1983 roku badacz dostaje iPhone'a z powerbankiem.
- **Przyczyna:**
  1. `equipment-catalog.ts`: Wpis `modern.phone` zawiera aliasy `['Smartfon', 'Telefon']`, a `modern.power-bank` aliasy `['Powerbank', 'Bateria zewnętrzna']`. Funkcja `findEquipmentTemplate('Telefon')` dopasowuje nowoczesny smartfon z plikiem `phone-modern.webp`, bez weryfikacji czy epoka przygody to `modern`.
  2. `predefined-equipment.ts`: W zestawach `1990s` i `2000s` na sztywno wpisano "Powerbank" oraz "Telefon z ładowarką", a epoki `1990s` i `2000s` zmapowano do profilu `modern`.
  3. Brak szablonów katalogowych dla telefonów z innych epok (np. telefon tarczowy/stacjonarny w 1920-1980, budka telefoniczna, cegła z anteną w latach 90.).

### Błąd 5: Zgubiony parametr `era` w wywołaniach `/api/imagen` (`useChat.ts:486`, `character-wizard.tsx:911`)
- **Objaw:** Sceny generowane w trakcie gry nie otrzymują informacji o epoce do API obrazów.
- **Przyczyna:** `useChat.ts` wywołuje `/api/imagen` bez przekazania pola `era`. W `/api/imagen/route.ts` zmienna `era` pozostaje `undefined`, więc modyfikator `eraKeyword` jest pusty.

### Błąd 6: Błędne style i brak ich obsługi w `/api/imagen/route.ts`
- **Objaw:** Portrety wysyłane ze stylem `vintage` lub `realistic` nie dostają wzbogacenia promptu.
- **Przyczyna:** `/api/imagen/route.ts` obsługuje wyłącznie `style === 'horror'` i `style === 'portrait'`. Style `vintage` czy `realistic` (używane przez `character-wizard.tsx`, `equipment-modal.tsx`, `useEquipmentThumbnails.ts`) omijają warunki i trafiają do Gemini bez filtrów i słów kluczowych epoki.

### Błąd 7: Sztywne lata 20. w generatorze podsumowań scen (`summarize-scene/route.ts:170`)
- **Objaw:** Wpisy w Dzienniku Sesji generują prompty obrazów narzucające lata 20.
- **Przyczyna:** Prompt Gemini w linii 170 instruuje: `"imagePrompt": "Krótki opis... (do wygenerowania ilustracji z lat 20.)"`.

### Błąd 8: Płaska i dziurawa logika w `era-visual-style.ts` oraz `equipment-prompt-builder.ts`
- **Objaw:** Lata 1900-1919 oraz 1950-1959 wpadają do `modern`, a rok 1983 wpada do `prl-1970s`.
- **Przyczyna:** Wyrażenia regularne w `resolveEraVisualProfile` i `resolveEraModifier` posiadają luki dekadowe i brak precyzyjnych słowników cech fizycznych przedmiotów dla poszczególnych dekad (1890s, 1920s, 1930s, 1940s, 1950s, 1970s, 1980s, 1990s, 2000s, modern).

---

## 4. Plan naprawczy (Rekomendowane Kroki)

1. **Uniwersalny Resolver Epoki (`era-resolver.ts` / `era-visual-style.ts`):**
   - Stworzenie centralnej, odpornej funkcji mapującej dowolny rok (np. 1895, 1912, 1925, 1944, 1973, 1983, 1995, 2004, 2026) lub etykietę na precyzyjną matrycę cech epoki (technologia, materiały, stylistyka, ograniczenia).
2. **Katalog Ekwipunku wrażliwy na epokę (`equipment-catalog.ts`):**
   - Rozbicie "Telefonu" na szablony epokowe (np. `phone.candlestick` dla lat 20., `phone.rotary-desk` dla lat 50.-80., `phone.cellular-brick` dla lat 90., `phone.smartphone` dla modern).
   - Blokada dopasowania przedmiotów współczesnych (powerbank, smartfon) do sesji osadzonych przed ich powstaniem.
3. **Usunięcie hardcode'ów w generatorach:**
   - Poprawienie `useGameStart.ts`, `npc-manager.tsx`, `location-manager.tsx`, `summarize-scene/route.ts` tak, aby pobierały i wstrzykiwały aktualną epokę z kontekstu przygody.
4. **Rozszerzenie `/api/imagen/route.ts`:**
   - Obsługa stylów `portrait`, `horror`, `vintage`, `item`, `location` oraz bezwzględne wstrzykiwanie strażników epokowych (Negative Guardrails przeciwko smartfonom, ekranom LCD i nowoczesnym autom w epokach historycznych).
5. **Wstrzykiwanie reguł epokowych do `image-instructions.ts` i `build-context.ts`:**
   - Dynamiczne instruowanie MG, by w tagach `[SCENA:]` i `[PORTRET:]` zawsze uwzględniał właściwy dla danej sesji rok i poziom rozwoju techniki.
