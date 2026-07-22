# Research: Pipeline Generowania, Opisów i Ilustracji Przedmiotów w Ekwipunku
Data: 2026-07-22
Stack: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Gemini 3.6 Flash / Flux Imagen API, Call of Cthulhu 7e RAW

## 1. Obszar Problemu i Diagnoza "Dramatycznego" Wyglądu Przedmiotów

Wygląd przedmiotów nie-predefiniowanych (dynamicznie powstałych podczas rozgrywki lub szybkiego generowania ekwipunku) cierpi na 4 kluczowe luki w obecnym kodzie:

### A. Brak Dedykowanej Ilustracji AI i Upadek do Zwykłego SVG/Ikony
* **Symptom:** Przedmioty nie-predefiniowane mają ikonkę płaskiego klucza (`Wrench` z Lucide) lub generyczny kwadrat.
* **Przyczyna:** Komponent `ItemThumbnail` (w `equipment-modal.tsx`) w przypadku braku `imageUrl` renderuje ikonę kategorii `CategoryIcon`. Wszystkie przedmioty kategorii `'tool'` (domyślna kategoria przypisywana przez AI dla większości znalezisk) renderują ikony klucza płaskiego `Wrench`.
* **Proces Auto-generowania:** Generowanie ilustracji wymagało dotąd ręcznego kliknięcia "Generuj" lub polegało na hooku `useEquipmentThumbnails`, który przy zbyt wielu równoległych requestach do Gemini API napotykał limit 429 (Rate Limit) lub wyścig stanów (`closure vs functional update`), w wyniku czego `imageUrl` nie zapisywał się w obiekcie `Character`.

### B. Błędny Fallback SVG Blokujący Przycisk "Generuj"
* **Symptom:** Część przedmiotów otrzymywała ścieżki do SVG np. `/equipment/predefined/tool.svg`.
* **Przyczyna:** Funkcja `withLocalImage` w `predefined-equipment.ts` ustawiała `imageUrl` na SVG. Kod `isDedicatedCatalogAsset` sprawdzający, czy można wygenerować obrazek (`canGenerate = !isDedicatedCatalogAsset`), uznawał obecność `imageUrl` za fakt posiadania grafiki docelowej, co ukrywało przycisk "Generuj" i uniemożliwiało wygenerowanie realistycznego obrazu AI dla danego przedmiotu.

### C. Ubogie lub Generyczne Opisy i Brak Parametrów Mechanicznych CoC 7e
* **Symptom:** Opis przedmiotu brzmi np. *"UŻYWANY"* lub jest puste/jednozdzaniowe bez lore i bez statystyk bojowych (np. brak obrażeń `1d6`, zasięgu `15 yards`, trudności rzutu).
* **Przyczyna:** Gdy MG lub generator startowy dodaje przedmiot przez tag `[ZDOBYTY_PRZEDMIOT: @Gracz | Nazwa | Opis]`, opis jest bezpośrednio ciągiem znaków wpisanym z palca przez LLM bez dedykowanej fazy wzbogacania (enrichment pipeline). LLM w trakcie narracji nie wylicza wag, wartości w dolarach 1920s, właściwości bojowych ani sensorycznego lovecraftowskiego opisu.

### D. Brak Polskich Aliasów i Dopasowania do Katalogu Predefiniowanego
* **Symptom:** Przedmiot taki jak *"Latarka kieszonkowa"* lub *"Pistolet Colt M1911"* stworzony dynamicznie nie dopasowuje się do istniejącego katalogu 39+ gotowych grafik WebP w `/public/equipment/catalog/`.
* **Przyczyna:** Funkcja `findEquipmentTemplate` w `equipment-catalog.ts` używała ograniczonej listy sztywnych nazw angielskich bez elastycznego fuzzy-matchingu/synonimów polskich dla przedmiotów epoki.

---

## 2. Mapa Kodowa i Zależności Systemu Ekwipunku

### Pliki UI & Komponenty:
- **`src/components/sidebar/CthulhuSidebar.tsx`** – przycisk otwierający modal ekwipunku oraz wskaźnik liczby przedmiotów.
- **`_tester/_base/.silnik/src/components/ui/equipment-modal.tsx`** – główny modal z zakładkami `BROŃ`, `WYPOSAŻENIE`, `FINANSE`, wyszukiwarką i kafelkami `WeaponCard` / `GearCard` / `ItemThumbnail`.
- **`_tester/_base/.silnik/src/components/ui/equipment-detail-dialog.tsx`** – modal ze szczegółowym widokiem przedmiotu (obrazek w dużym formacie, dokładny opis, statystyki CoC 7e).
- **`_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx`** – panel ekwipunku na karcie postaci.

### Pliki Danych i Katalogów:
- **`_tester/_base/.silnik/src/lib/equipment-data.ts`** – baza słownikowa predefiniowanych broni (`WEAPONS`), narzędzi (`TOOLS`), dokumentów, artefaktów i rekwizytów.
- **`_tester/_base/.silnik/src/lib/equipment-catalog.ts`** – katalog szablonów (`EQUIPMENT_CATALOG`) z dedykowanymi grafikami WebP i fallbackami SVG.
- **`_tester/_base/.silnik/src/lib/immersion/predefined-equipment.ts`** – przydzielanie ekwipunku startowego dla archetypów i epok.

### Pliki AI & Generowania:
- **`_tester/_base/.silnik/src/lib/acquired-equipment.ts`** – parsowanie tagów `[ZDOBYTY_PRZEDMIOT]` z wypowiedzi MG oraz tworzenie zalążków przedmiotów (`createAcquiredEquipmentSeed`).
- **`_tester/_base/.silnik/src/lib/equipment-prompt-builder.ts`** – budowanie promptów do generatora obrazków Imagen/Flux (`buildEquipmentImagePrompt`), z podziałem na przedmioty zwykłe (`mundane`) i nadprzyrodzone (`supernatural`).
- **`_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts`** – hook odpowiadający za automatyczne generowanie miniaturek w tle po starcie gry.
- **`src/app/api/equipment/generate-starting/route.ts`** – endpoint backendowy generowania ekwipunku startowego przez Gemini Flash.

---

## 3. Rekomendowana Architektura Nowego Pipeline'u Przedmiotów (Item Generation & Enrichment Pipeline)

Aby przedmioty dynamiczne prezentowały jakość na poziomie predefiniowanych, należy wdrożyć 3-etapowy Pipeline Ekwipunku:

```
[ Wypowiedź MG / Tag ] 
        ↓
1. Parsowanie & Catalog Matching (Fuzzy Match / Synonimy PL)
        ↓ (Jeśli brak w katalogu)
2. Item Enrichment Pipeline (Gemini 3.6 Flash Low)
   - Wygenerowanie klimatycznego opisu lovecraftowskiego (opisy vintage, faktura, stan)
   - Przypisanie dokładnej kategorii & parametrów CoC 7e (obrażenia, zasięg, wartość $, waga)
   - Określenie promptu wizualnego (zgodnego z epoką 1920s/PRL)
        ↓
3. Thumbnail Generation & Caching Queue (Imagen / Flux)
   - Sekwencyjna kolejka generowania obrazów AI w tle bez przekraczania limitu 429
   - Zapis wygenerowanej miniaturki w obiekcie postaci i lokalnym storage
```

---

## 4. Rekomendowane Następne Kroki

Zalecane jest przejście do kroku **/dev-2-plan**, aby przygotować plan implementacji obejmujący:
1. Rozszerzenie parsera synonimów polskich w `equipment-catalog.ts`.
2. Stworzenie serwisu/endpointu `enrichItemWithAI` dla nowych i zdobytych przedmiotów.
3. Naprawę renderowania kafelków w `equipment-modal.tsx` (estetyczniejsze placeholdery kategorii zamiast ikony klucza płaskiego `Wrench`).
4. Ustabilizowanie sekwencyjnej kolejki generowania obrazków dla ekwipunku Badaczy.
