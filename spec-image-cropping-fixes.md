# Specyfikacja: Naprawa Wyświetlania i Kadrowania Obrazów (dev-loop)

## 1. Kontekst i Problem
Użytkownik zgłosił błędy związane z ucinaniem obrazów (zwłaszcza portretów postaci, NPC oraz dowodów rzeczowych).
- Na **Tablicy Badacza** (`corkboard-investigation-board.tsx` oraz `investigator-board.tsx`) kontener ilustracji na kartach miał sztywną wysokość `h-24` (96px) przy szerokości 240px (proporcja 2.5:1), a obraz miał domyślny `object-cover` (kadrowanie do środka `50% 50%`). W efekcie portrety miały ucięte czubki głów, oczy i czoła (np. Walter Corbitt, Prof. Henry Armitage, Seraphina Marsh).
- W **Aktach Sprawy / Odkryciach** (`discoveries-view.tsx`) i **Dzienniku Sesji** (`session-journal.tsx`) portrety postaci i ilustracje również wymagały wyrównania `object-top` dla uniknięcia obcinania głów.
- W **Inspection Lightbox Modal** (`inspection-lightbox-modal.tsx`) kontener podglądu wymagał `min-h-0 min-w-0` dla niezawodnego zachowania flexboxa przy różnych proporcjach ekranu i zoomie.

## 2. Zakres Zmian

### 2.1. Tablica Badacza (`corkboard-investigation-board.tsx` & `investigator-board.tsx`)
- Zwiększenie wysokości kontenera obrazu na kartach z `h-24` (96px) do `h-32` (128px) dla uzyskania naturalnych proporcji fotograficznych (~16:9 / 3:2).
- Zastosowanie `object-cover object-top` (lub inteligentnego pozycjonowania z zachowaniem górnej krawędzi portretu), dzięki czemu głowy i twarze postaci są zawsze w pełni widoczne.
- Zachowanie interaktywności (kliknięcie otwiera Inspection Lightbox).

### 2.2. Inspection Lightbox Modal (`inspection-lightbox-modal.tsx`)
- Dodanie `min-h-0 min-w-0` do elastycznych kontenerów flex lewej kolumny podglądu grafiki.
- Zapewnienie, że obraz w pełnym widoku skaluje się bez ucinania krawędzi (`object-contain max-h-full max-w-full`).

### 2.3. Akta Sprawy / Odkrycia (`discoveries-view.tsx`)
- Dodanie `object-top` do polaroida/załącznika graficznego (`w-full h-44 object-cover object-top`), aby portrety dossier nie były ucinane od góry.

### 2.4. Dziennik Sesji (`session-journal.tsx`)
- W widoku Kroniki i Notatek dostosowanie stylów obrazów na `object-cover object-top`.

### 2.5. Karty NPC (`npc-manager.tsx`)
- Zastosowanie `object-cover object-top` dla portretów NPC.

## 3. Kryteria Akceptacji i Weryfikacja
1. `npm test` - wszystkie testy jednostkowe przechodzą na zielono.
2. `npx tsc --noEmit` - zero błędów typowania TypeScript.
3. Karty na Tablicy Badacza prezentują pełne głowy, twarze i detale bez ucinania w wąski pasek.
