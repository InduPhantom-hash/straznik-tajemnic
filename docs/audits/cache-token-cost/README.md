# Audyt Wszystkich Funkcji Cache w Aplikacji i Możliwości Obniżenia Kosztów Tokenów API

> **Status audytu:** Zrealizowany (Architektura & Koszty API)  
> **Data:** Październik 2026  
> **Projekt:** Strażnik Tajemnic AI (Call of Cthulhu 7e RAW / d100 Weird Fiction)  
> **Wersja bazowa:** v0.9.5  
> **Cel audytu:** Inwentaryzacja wszystkich mechanizmów cache w aplikacji pod kątem drastycznego obniżenia kosztów tokenów API (Gemini API, Imagen, Google TTS, RAG/Embeddings) oraz eliminacji powielania promptów.

---

## 1. Executive Summary (Wnioski dla Product Ownera)

Aplikacja posiada rozbudowaną architekturę cache'owania na wielu poziomach (Gemini Context Caching, in-memory cache obrazów i audio, lokalny RAG ONNX oraz IndexedDB po stronie przeglądarki). 

Jednak przeprowadzony audyt wykazał **4 kluczowe luki kosztowe i redundancje**:
1. **Redundancja Promptu Epoki (Podwójne przesyłanie `eraRules`):** `eraRules` są wstrzykiwane zarówno do `stableInstructions` w chmurowym Gemini Context Cache, jak i w każdej turze dynamicznie w `timePromptSection` (`additionalContext`). W rezultacie gracz płaci za te same tokeny podwójnie w każdej pojedynczej odpowiedzi MG.
2. **Niewykorzystany potencjał Gemini Context Caching przy historii czatu:** Domyślny cache (OPT-26) obejmuje wyłącznie `systemPrompt` + `eraRules` + `gmProtocol`. Dynamicznie rosnąca historia gry (`messages`) przesyłana jest w całości w `userParts` bez bufora przesuwnego, co sprawia, że w 20.+ turze wejście promptu osiąga 40 000 - 60 000 nie-zcache'owanych tokenów.
3. **Zbyt wysoki próg kompresji kontekstu w `context-engine.ts`:** Próg `COMPRESSION_THRESHOLD_RATIO = 0.5` przy oknie Gemini (1 048 576 tokenów) sprawia, że automatyczne podsumowywanie historii aktywuje się dopiero przy >500 000 tokenów. W normalnej grze mechanizm ten jest faktycznie uśpiony.
4. **Brak trwałego (persistent) cache dla `/api/imagen` i `/api/ai/google-tts` po stronie serwera:** Zastosowano `Map<string, ...>` w pamięci procesu Node.js. Przy restartach procesu deweloperskiego lub w architekturze desktopowej te same zapytania generują ponowne koszty w Google Cloud.

---

## 2. Inwentaryzacja Funkcji Cache w Aplikacji

| Moduł / Plik | Typ Cache | Co jest cache'owane? | Klucz cache / TTL | Status i efektywność |
|---|---|---|---|---|
| **Gemini Context Caching**<br>`src/lib/gemini-cache-service.ts`<br>`src/app/api/chat/_helpers/resolve-gemini-cache.ts` | Remote API Cache (Google AI Studio) | `systemPrompt` (prompt MG ~24k tokenów) + `eraRules` + `gmProtocol` | `md5(systemPrompt + stableInstructions + modelName)`<br>TTL: 7200s (2h) | **Zrealizowano (OPT-C04):** Domyślny TTL 2h, sliding window odnawiania przez `ai.caches.update`, pętla czyszczenia wygasłych wpisów w RAM. |
| **Pamięć Kampanii i Checkpointy**<br>`src/core/memory/context-engine.ts`<br>`src/core/memory/ledger-store.ts` | Baza SQLite WAL + Hashing SHA256 | Podsumowania partii wiadomości sesji (`CampaignCompressionCheckpoint`) | `sourceHash` (SHA256 z ID, ról i treści wiadomości)<br>Brak limitu czasu (trwały) | **Częściowo uśpione:** Działa bezbłędnie przy manualnym wywołaniu, ale automatyczny próg kompresji (50% okna = 524k tokenów) nigdy nie jest osiągany w sesji 50-100 tur. |
| **Orkiestrator Obrazów**<br>`src/app/api/imagen/route.ts` | In-memory `Map` (Server-side) | Wygenerowane grafiki (data URLs / formaty wyjściowe) | `md5(scenePrompt-style-seed)`<br>TTL: 3600s (1h) | **Średnia:** Chroni przed dublowaniem żądań w trakcie 1h tej samej instancji serwera. Traci stan po restarcie aplikacji desktopowej. |
| **Media Cache Klienta**<br>`src/lib/persistent-media-cache.ts`<br>`src/hooks/use-media-cache.ts` | Klient (IndexedDB / LocalStorage) | Zrzuty grafu, portrety NPC, miniatury ekwipunku | `key: type/id`<br>Trwały z kompresją gzip (Issue #419) | **Bardzo wysoka:** Chroni portfele gracza przed ponownym generowaniem obrazów pobranych już raz na dysk klienta. |
| **Google TTS Audio Cache**<br>`src/app/api/ai/google-tts/route.ts`<br>`src/app/api/tts/google/route.ts`<br>`src/lib/api-cache-service.ts`<br>`src/lib/tts-cache-service.ts` | Dwuwarstwowy: RAM (L1) + Dysk `data/cache/tts` (L2) | Wygenerowane pliki audio lektora (base64/mp3) | `sha256(stableStringify(key))`<br>TTL: 7 dni | **Zrealizowano (OPT-C03):** 100% eliminacji ponownych wywołań TTS dla tych samych kwestii między sesjami i po restarcie aplikacji. |
| **RAG / Wektory Embeddingów**<br>`src/lib/embedding-service.ts` | 100% Lokalny Model ONNX (`Xenova/bge-m3`) | Wektory RAG podręczników i notatek (1024 dim) | In-memory pipeline singleton + pliki binarne | **Koszt 0 USD:** Domyślny embedding RAG nie generuje żadnych zapytań do Gemini API ani kosztów tokenów. |

---

## 3. Szczegółowa Analiza Luk Kosztowych i Potencjału Optymalizacji

### 3.1. Wykryty Błąd Redundancji: Podwójne przesyłanie reguł epoki (`eraRules`)

W pliku `src/app/api/chat/_helpers/resolve-gemini-cache.ts`:
```typescript
const stableInstructions = [opts.eraRules, opts.gmProtocol].join('\n\n');
```
Reguły epoki (`eraRules`) są przesyłane do Google Cloud i zamrażane w obiekcie `CachedContent` jako część stabilnych instrukcji.

Jednakże w `src/app/api/chat/_helpers/build-time-context.ts`:
```typescript
export function buildTimeContext(opts: BuildTimeContextOpts): BuildTimeContextResult {
  const timeContext = timeManager.formatForPrompt();
  const eraRules = buildEraNarrativeRules(opts.eraContext);
  ...
  const timePromptSection = `
## KONTEKST CZASOWY
${timeContext}

${eraRules}
...
`;
  return { timePromptSection, eraRules };
}
```
Następnie `timePromptSection` (zawierający pełne `eraRules`) jest bezwarunkowo dodawany do `additionalContext` w `run-chat-pipeline.ts`:
```typescript
additionalContext.push(timePromptSection);
```
**Skutek kosztowy:**
Podczas gdy `gmProtocol` posiada poprawny warunek `if (!resolvedCachedContent) additionalContext.push(gmProtocol);`, `eraRules` trafiają do modelu podwójnie: raz w cache, a raz w świeżych tokenach wejściowych (pełnopłatnych).
- Objętość `eraRules`: ok. 800 - 1500 tokenów na turę.
- Przy sesji trwającej 50 tur, gracz płaci niepotrzebnie za ~50 000 - 75 000 pełnopłatnych tokenów wejścia.

### 3.2. Płaska Historia Rozgrywki (Brak Context Pruning dla wiadomości pośrednich)

W `src/lib/ai-providers/gemini-provider.ts`:
```typescript
const historyText = request.messages
  .map((msg) => `${msg.role === 'user' ? 'G' : 'MG'}: ${msg.content}`)
  .join('\n');
const secureMessage = `\n<user_input>\n${request.userMessage}\n</user_input>`;
userParts.push({
  text: `\nHISTORIA:\n${historyText}\n\nAKTUALNA WIADOMOŚĆ:${secureMessage}\n\nODPOWIEDŹ:`,
});
```
- Wszystkie wiadomości z bieżącej sesji są wklejane jako jeden rosnący ciąg znaków w `userParts`.
- Gemini Context Caching nie cache'uje `userParts`, ponieważ zmieniają się one co turę (dopisanie nowej akcji gracza unieważniałoby hash).
- **Potencjał optymalizacji:** Zastosowanie strategii "Prefix Context Caching" lub "Sliding History Window + Rolling Ledger Summary". Starsze tury powinny być zwijane do zwięzłego podsumowania po przekroczeniu 15-20 tur, zamiast przesyłania setek tysięcy tokenów czystej prozy w każdej kolejnej turze.

### 3.3. Uśpiony mechanizm kompresji w `context-engine.ts`

W `src/core/memory/context-engine.ts`:
```typescript
export const COMPRESSION_THRESHOLD_RATIO = 0.5;
```
Dla modeli Gemini limit okna wynosi 1 048 576 tokenów (`MODEL_CONTEXT_LIMITS`). 
- Próg kompresji uruchamia się dopiero przy `1 048 576 * 0.5 = 524 288` tokenach.
- Średnia sesja gry w Strażniku Tajemnic generuje od 15 000 do 60 000 tokenów. Oznacza to, że funkcja `fitContext` i automatyczne zwijanie starych tur nigdy nie wkraczają do akcji w realnym scenariuszu rozgrywki.

---

## 4. Macierz Działań Optymalizacyjnych (Możliwości Oszczędności)

| ID | Zadanie Optymalizacyjne | Szacowana Oszczędność Tokenów / Kosztów | Złożoność | Wpływ na immersję / jakość |
|---|---|---|---|---|
| **OPT-C01** | **Deduplikacja `eraRules` w `build-time-context.ts`**<br>Pominięcie bloku `${eraRules}` w `timePromptSection`, gdy aktywny jest `resolvedCachedContent` (analogicznie do `gmProtocol`). | **~1 000 - 1 500 tokenów na każdą turę** (100% eliminacja duplikacji epoki) | Bardzo niska (1 warunek logiczny) | **Zero ryzyka:** Reguły są już w 100% obecne w kontekście modelu dzięki cache. |
| **OPT-C02** | **Obniżenie progu kompresji historii tur (Adaptive Context Window)**<br>Wprowadzenie progu opartego na liczbie tur (np. kompresja tur > 15) lub progu tokenowego (np. 15 000 tokenów zamiast 500 000 tokenów). | **30% - 60% redukcji tokenów wejściowych** w późniejszych etapach sesji (tury 20+) | Niska / Średnia | Pozytywny: Model skupia się na bieżącej scenie, a dawne fakty pamięta z podsumowania ledgerowego. |
| **OPT-C03** | **Persystentny dyskowy cache dla audio TTS (`data/cache/tts`)**<br>Zapis wygenerowanych plików MP3/WAV w folderze lokalnym aplikacji zamiast ulotnej mapy `apiCacheService` w RAM. | **100% eliminacji ponownych wywołań TTS** dla tych samych kwestii (np. intro, powtarzane frazy) | Niska | **Zrealizowano:** Poprawa responsywności offline, brak powtórnych wywołań po restarcie. |
| **OPT-C04** | **Pętla czyszczenia i synchronizacja TTL Gemini Cache**<br>Wydłużenie domyślnego TTL cache sesji z 1h do 2h (7200s / 7200000ms), dynamiczne odnawianie w trakcie gry (sliding window / `touchGeminiCache` przez `ai.caches.update`) oraz pętla czyszczenia wygasłych wpisów RAM. | **Uniknięcie ponownego kosztu inicjalizacji cache** (~24k tokenów) po 60 minutach gry | Niska | **Zrealizowano (OPT-C04):** Domyślny TTL 2h, sliding window i automatyczna pętla czyszczenia. |

---

## 5. Rekomendacja Inżynieryjna dla Product Ownera

⭐ **Rekomendowany pierwszy krok (Zadanie OPT-C01):**
Wdrożenie natychmiastowej poprawki deduplikacji `eraRules` w `src/app/api/chat/_helpers/build-time-context.ts` oraz `run-chat-pipeline.ts`.
- Jest to czysty zysk: oszczędza od 1000 do 1500 pełnopłatnych tokenów wejścia przy każdym pojedynczym kliknięciu gracza bez jakiejkolwiek zmiany w fabule czy mechanice CoC 7e.
- Weryfikacja testami jednostkowymi `build-time-context.test.ts` i `run-chat-pipeline.ts`.
