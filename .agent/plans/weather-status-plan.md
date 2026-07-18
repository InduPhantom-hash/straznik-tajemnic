# Plan: Wprowadzenie informacji o pogodzie na górny pasek statusu

Data: 2026-07-18
Złożoność: Prosta

### Problem
Użytkownik chce, aby na górnym pasku statusu (gdzie znajduje się data, godzina oraz faza księżyca) pojawiała się również informacja o pogodzie. API do pogody już istnieje i wstrzykuje informacje o klimacie i pogodzie do opisu przygody, jednak pasek statusu w aktywnej aplikacji nie renderuje tej informacji.

### Rozwiązanie
Z analizy kodu wynika, że w katalogu `_tester/_base/.silnik/src/components/ui/campaign-clock.tsx` komponent `CampaignClock` posiada już obsługę właściwości `weatherInfo` i potrafi ją poprawnie formatować wraz z ikonami (deszcz, śnieg, słońce, chmura). 
Również w `_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx` parser poprawnie wyciąga pogodę z `adventureDescription` za pomocą regexa `\[KLIMAT\s*&\s*POGODA\]:\s*([^]*?)(?=\n\n|\[|$)` i przekazuje ją do `CampaignClock`.

Musimy upewnić się, że:
1. `adventureDescription` jest poprawnie przekazywany do `ChatHeader` w głównym oknie czatu.
2. Pogoda pobrana przez API historyczne `/api/adventure/analyze` i zapisana w `adventureContext.description` jest poprawnie przekazywana z `page.tsx` przez `ChatWindow` do `ChatHeader`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx` | Upewnienie się, że `adventureDescription` jest przekazywany do `ChatHeader` (w nowej strukturze po splicie). | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx` | Sprawdzenie regexa i ewentualne poprawki dopasowania tagu pogodowego z analizatora przygody. | Niskie |

### Fazy implementacji

**Faza 1: Weryfikacja przepływu danych**
- [ ] Sprawdzenie przekazywania propa `adventureDescription` w `src/components/chat/chat-window/index.tsx` (oraz w silniku bazowym `_tester/_base/.silnik`).
- [ ] Zweryfikowanie czy regex poprawnie parsuje format dodawany w `/api/adventure/analyze` (`[KLIMAT & POGODA]: Średnia temperatura...`).
- Weryfikacja: Kod kompiluje się bez błędów.

### Weryfikacja końcowa
- `npm run build` w silniku w celu upewnienia się, że typy i komponenty Next.js budują się prawidłowo.
- Uruchomienie testów: `npm test` w celu weryfikacji testów jednostkowych `chat-header.test.tsx`.

### Co może się zepsuć
- Niepoprawne parsowanie regexem jeśli format opisu uległ zmianie (ryzyko: niskie - regex obsłuży standardowe tagi).
