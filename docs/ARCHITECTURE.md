# Architektura

Dokument dla osób, które chcą zrozumieć kod albo współtworzyć. Opisuje stan
aplikacji **lokalnej / offline** (wersja publiczna).

## Z lotu ptaka

Monolityczna aplikacja **Next.js 14 (App Router)**. Frontend (React 18 + TypeScript
strict + Tailwind + shadcn/ui) i backend (Route Handlers w `src/app/api/**`) żyją w
jednym repo. Brak bazy relacyjnej: stan gry trzymany jest w `localStorage` + zapisy na
dysk, a wiedza o zasadach w **lokalnym indeksie wektorowym** na dysku.

```
Przeglądarka (React)  ──►  /api/* (Route Handlers)  ──►  Gemini API (Google)
        │                          │
   localStorage              data/rag/*.bin  (lokalny RAG)
   data/saves/ (dysk)        data/saves/     (zapisy sesji)
```

Model użytkowania: **1 sesja przeglądarki = 1 gra = 1 grupa do 2 graczy** (Hot Seat).
To celowo aplikacja jednoinstancyjna - stąd dopuszczalne singletony modułowe i
`localStorage` jako główny magazyn.

## Kluczowe ścieżki

| Obszar                          | Plik                                                      |
| ------------------------------- | --------------------------------------------------------- |
| Główny ekran gry                | `src/app/page.tsx`                                        |
| AI Mistrz Gry (endpoint)        | `src/app/api/chat/route.ts` (+ `_helpers/`)               |
| Generowanie obrazów             | `src/app/api/imagen/route.ts`                             |
| Lektor (TTS)                    | `src/app/api/tts/gemini/route.ts`, `src/hooks/useTTS.ts`  |
| Lokalny import PDF              | `src/app/api/pdf/ingest-local/route.ts`                   |
| Kreator pierwszego uruchomienia | `src/components/onboarding/` + `src/hooks/useFirstRun.ts` |
| Typy domenowe                   | `src/lib/types.ts`                                        |
| Ustawienia AI / presety         | `src/lib/ai-settings/`                                    |
| Lokalny magazyn wektorowy       | `src/lib/vector-db/local-vector-store.ts`                 |
| Prompty MG / styl Lovecrafta    | `src/lib/prompts/`, `src/lib/lovecraft-style-guide.ts`    |
| Mechanika kości / testów        | `src/lib/dice-utils.ts`, `skill-test-resolver.ts`         |
| Mapa powiązań instrukcja ↔ kod  | [`docs/MAPA-POWIAZAN.md`](./MAPA-POWIAZAN.md)             |

## Warstwa AI

Wszystko opiera się o **rodzinę Gemini API** (jeden klucz):

- **Czat** (Mistrz Gry) - domyślnie `gemini-3.6-flash` (lub wg presetu Flash / Pro), przez provider
  `src/lib/ai-providers/gemini-provider.ts`, streaming SSE.
- **Embeddingi** - `gemini-embedding-001` (3072 dim) do RAG.
- **Lektor** - Gemini TTS (`/api/tts/gemini`); opcjonalnie Google Cloud TTS.
- **Obrazy** - `gemini-2.5-flash-image` (`/api/imagen`); opcjonalnie Vertex Imagen 4 / Replicate Flux.

## RAG (lokalny - docelowa architektura)

Zasady z wgranego przez gracza PDF trafiają do **lokalnego indeksu** (`data/rag/`):

- PDF → tekst → chunki → embeddingi Gemini → zapis jako binarne `Float32` (`*.bin` +
  `*.meta.json`) dla małego zużycia RAM i szybkiego ładowania.
- Wyszukiwanie: cosine similarity w `local-vector-store.ts` oraz lokalny BM25, bez zewnętrznej bazy wektorowej.
- Namespace'y: `rules` (zasady), `adventures` (przygody), `mythos` (lore PD).
- **Anty-halucynacja**: gdy brak trafień, AI jawnie przyznaje brak zamiast zmyślać zasadę.

> Pinecone nie jest elementem docelowej architektury. Pozostałe importy, typy, ustawienia i usługi o tej nazwie są reliktem wcześniejszej wersji i powinny zostać usunięte po audycie zależności.

## Granica sieci

Aplikacja może wykonywać połączenia wychodzące wyłącznie do jawnie skonfigurowanych usług:

- Google AI - czat MG, embeddingi, obrazy i opcjonalnie TTS;
- API danych świata - Daylight, Prices i Historical News, zawsze z timeoutem, cache'em i fallbackiem;
- opcjonalne usługi dodatkowe tylko wtedy, gdy użytkownik świadomie je włączy.

Nie używamy zewnętrznej bazy stanu gry, zewnętrznego indeksu RAG ani logowania jako warunku działania. Save'y, dziennik, assety, postacie i indeks RAG pozostają na dysku użytkownika.

## Aktualizacje aplikacji

System aktualizacji jest osobną ścieżką sieciową i korzysta z repozytorium wydań, docelowo GitHub Releases. Sprawdza jedynie manifest wersji i pobiera artefakt aplikacji po świadomej akcji użytkownika.

Aktualizowany jest kod, nie dane. Dane użytkownika muszą znajdować się poza katalogiem wersji aplikacji albo być automatycznie przenoszone podczas migracji. Dotyczy to `data/saves/`, `data/rag/`, profilu launchera Chrome, `localStorage`, IndexedDB, ustawień, postaci i dziennika.

Bezpieczny przepływ aktualizacji:

1. sprawdzenie manifestu z timeoutem;
2. komunikat o nowej wersji;
3. pobranie do katalogu tymczasowego po kliknięciu;
4. weryfikacja checksumy i platformy;
5. backup danych użytkownika;
6. atomowa podmiana katalogu wersji przez launcher;
7. migracja danych i test startowy;
8. rollback, jeśli nowa wersja nie uruchomi się poprawnie.

Sprawdzenie dostępności nowej wersji nie może blokować uruchomienia gry ani rozgrywki offline.

## Mechanika (deterministyczna)

Rzuty i progi trudności liczy aplikacja (`dice-utils.ts` jako jedno źródło prawdy):
Tacka egzekwuje progi (½ / ⅕), krytyki, fumble wg CoC 7e (RAW). AI dostaje **wynik**
i tylko opisuje skutek. Utrata SAN/PŻ zapisuje się na karcie tagami w narracji
(`[SANITY:]`, `[HP:]`), Faza Rozwoju z tagów `[WYNIK:]`.

## Storage

- **Postacie / ustawienia** - `localStorage`.
- **Zapisy sesji** - na dysk (`data/saves/`).
- **Obrazy postaci** - IndexedDB (duże dane base64 poza localStorage).
- Brak chmury, kont, logowania. Telemetria (PostHog/Sentry) jest opcjonalna i bez
  kluczy całkowicie nieaktywna.

## Build / launcher

- Dev: `npm run dev`. Prod: `npm run build && npm start`.
- macOS: `desktop/build-app.sh` składa lekki launcher `.app` (Chrome `--app` + `next
start`), `desktop/make-icon.sh` generuje ikonę (`oko` / `wir`).
