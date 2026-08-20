# Plan Review v2: obrazy scen - pełny kadr, 1-3 obrazy i epoki

Data: 2026-08-18
Plan: `.agent/plans/obrazy-sceny-pelny-kadr-epoki-plan.md`
Poprzedni review: `.agent/reviews/obrazy-sceny-pelny-kadr-epoki-plan-review.md`

## Ocena ogólna

🟢 Zielony - krytyczne błędy pierwszej wersji zostały usunięte; implementację można rozpocząć wyłącznie od Fazy 1 z Frontiera.

## Weryfikacja ośmiu wymiarów

### 1. Definicja problemu

- Przyczyna przycinania jest zgodna z kodem: sztywny aspekt i `object-cover` w dwóch rendererach.
- Scheduler i aktualny rok odpowiadają zgłoszonemu problemowi niskiej częstotliwości i anachronizmów.

### 2. Kompletność

- Wszystkie ścieżki wskazują aktywny silnik `_tester/_base/.silnik/src`.
- Plan obejmuje parser, typy, prompt, scheduler, save/load, sanitizer, intro, epoki i testy.
- Wszystkie 22 wskazane ścieżki istnieją w repozytorium albo są jawnie oznaczonymi nowymi plikami testów.

### 3. Dopasowanie do architektury

- LLM nie tworzy technicznych ID; klient wylicza deterministyczne `entityKey` i `sceneKey`.
- `SceneImageState.version=1` pasuje do istniejącego pełnego save'a i defensywnego fallbacku.
- Provider i model Gemini pozostają bez zmian.

### 4. Rabbit holes

- Scheduler runtime, persistence, epoka oraz intro są rozdzielone na osobne fazy.
- Każda faza może być wdrażana jako oddzielna sesja i osobny diff.

### 5. Promise gaps

- Zdefiniowano kolejność wielu żądań i los pozostałej kolejki.
- Intro używa tego samego `sceneKey` i liczy się jako pierwszy obraz lokacji.
- Stary save bez stanu sceny ma jawny fallback.

### 6. Strategia testowania

- Fazy 1-6 mają konkretne komendy testowe.
- Testy obrazów mockują `/api/imagen` i nie ponoszą kosztów.
- Faza 7 jawnie blokuje ukończenie na brakującym harnessie Playwright zamiast deklarować fałszywie działającą komendę.

### 7. Guardrails projektu

- Plan nie modyfikuje kodu w fazie planowania.
- Wdrożenie zaczyna się tylko od Fazy 1, zgodnie z blokadami Frontiera.
- Nie ma pobocznego refaktoru providera, galerii ani pozostałych widoków obrazów.

### 8. Spec Quality Gate

SPEC CHECK: Feature Spec | 162 słowa / limit 200

1. Budget: 2/2 - 162 słowa
2. Boundaries: 2/2 - cztery jawne wykluczenia
3. Verification: 2/2 - cztery kryteria akceptacji i komendy faz
4. Examples: 2/2 - konkretny tag, rok 1983, wynik i deduplikacja
5. Focus: 2/2 - jeden feature obrazów scen, podzielony na mikrosesje

SCORE: 10/10 - READY

## Ostrzeżenia

- Playwright jest obecnie niesprawny jako repozytoryjny harness: root nie ma działającej konfiguracji/zależności, a runner silnika nie odkrywa testów z `tests/e2e`. Nie blokuje to Fazy 1, ale blokuje zamknięcie Fazy 7.
- Nowe pliki testów wymienione w planie powstaną razem z odpowiadającą im fazą; ich brak przed implementacją jest oczekiwany.

## Rekomendacja

Można uruchomić `/dev-4-implement` wyłącznie dla Fazy 1: kontrakt, deterministyczne klucze, parser i testy polityki. Po Fazie 1 należy zatrzymać się, zweryfikować testy i dopiero wtedy przejść do następnego odblokowanego zadania.
