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

## Warstwa AI

Wszystko opiera się o **rodzinę Gemini API** (jeden klucz):

- **Czat** (Mistrz Gry) - model wg presetu (Flash / Pro), przez provider
  `src/lib/ai-providers/gemini-provider.ts`, streaming SSE.
- **Embeddingi** - `gemini-embedding-001` (3072 dim) do RAG.
- **Lektor** - Gemini TTS (`/api/tts/gemini`); opcjonalnie Google Cloud TTS.
- **Obrazy** - `gemini-2.5-flash-image` (`/api/imagen`); opcjonalnie Vertex Imagen 4 / Replicate Flux.

## RAG (lokalny)

Zasady z wgranego przez gracza PDF trafiają do **lokalnego indeksu** (`data/rag/`):

- PDF → tekst → chunki → embeddingi Gemini → zapis jako binarne `Float32` (`*.bin` +
  `*.meta.json`) dla małego zużycia RAM i szybkiego ładowania.
- Wyszukiwanie: cosine similarity w `local-vector-store.ts` (drop-in zamiennik dawnego
  klienta Pinecone - sieć nie jest potrzebna).
- Namespace'y: `rules` (zasady), `adventures` (przygody), `mythos` (lore PD).
- **Anty-halucynacja**: gdy brak trafień, AI jawnie przyznaje brak zamiast zmyślać zasadę.

> Stałe `PINECONE_*` w kodzie są reliktem - w runtime RAG jest w pełni lokalny.

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
