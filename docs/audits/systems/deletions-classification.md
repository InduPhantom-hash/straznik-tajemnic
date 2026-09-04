# Klasyfikacja 120 staged deletions

Stan na 2026-09-01. Ten dokument klasyfikuje dokładnie 120 plików oznaczonych w indeksie Git jako usunięte.
Audyt nie zmienia stagingu i nie zatwierdza żadnego usunięcia. Każda decyzja wymaga osobnej, ograniczonej karty naprawczej.

## Podsumowanie

| Klasa | Liczba | Decyzja |
|---|---:|---|
| `owner-review` | 3 | Nie usuwać bez potwierdzenia właściciela konfiguracji. |
| `remove-duplicate-candidate` | 32 | Kandydat do usunięcia po potwierdzeniu, że żaden aktywny agent ani CI nie ładuje lokalnej kopii. |
| `migrate-or-archive` | 34 | Najpierw przenieść trwałą wiedzę do root `docs/` albo archiwum poza runtime. |
| `remove-oneoff-candidate` | 51 | Kandydat do usunięcia po wyszukaniu callerów i potwierdzeniu, że wynik skryptu jest już w kodzie. |
| Razem | 120 | Liczba zgodna z indeksem Git w chwili audytu. |

## `owner-review` - 3

- `.claude/settings.json`
- `.ignore`
- `.mcp.json`

## `remove-duplicate-candidate` - 32

- `.claude/skills/monolynx-create-graph-ci-script/SKILL.md`
- `.claude/skills/monolynx-graph-sync/SKILL.md`
- `.claude/skills/monolynx-help/SKILL.md`
- `.claude/skills/monolynx-project-toolchain/SKILL.md`
- `.claude/skills/monolynx-search/SKILL.md`
- `.claude/skills/monolynx-sprint-end/SKILL.md`
- `.claude/skills/monolynx-ticket-create/SKILL.md`
- `.claude/skills/monolynx-ticket-review/SKILL.md`
- `.claude/skills/monolynx-wiki-ingest/SKILL.md`
- `.claude/skills/monolynx-wiki-init/SKILL.md`
- `.claude/skills/monolynx-wiki-lint/SKILL.md`
- `.claude/skills/monolynx-wiki-sync-merge/SKILL.md`
- `.claude/skills/monolynx-work-simple/SKILL.md`
- `.claude/skills/monolynx-work/SKILL.md`
- `.claude/skills/monolynx-work/pipeline.md`
- `.claude/skills/monolynx-work/review-rubric.md`
- `.codex/skills/monolynx-create-graph-ci-script/SKILL.md`
- `.codex/skills/monolynx-graph-sync/SKILL.md`
- `.codex/skills/monolynx-help/SKILL.md`
- `.codex/skills/monolynx-project-toolchain/SKILL.md`
- `.codex/skills/monolynx-search/SKILL.md`
- `.codex/skills/monolynx-sprint-end/SKILL.md`
- `.codex/skills/monolynx-ticket-create/SKILL.md`
- `.codex/skills/monolynx-ticket-review/SKILL.md`
- `.codex/skills/monolynx-wiki-ingest/SKILL.md`
- `.codex/skills/monolynx-wiki-init/SKILL.md`
- `.codex/skills/monolynx-wiki-lint/SKILL.md`
- `.codex/skills/monolynx-wiki-sync-merge/SKILL.md`
- `.codex/skills/monolynx-work-simple/SKILL.md`
- `.codex/skills/monolynx-work/SKILL.md`
- `.codex/skills/monolynx-work/pipeline.md`
- `.codex/skills/monolynx-work/review-rubric.md`

## `migrate-or-archive` - 34

- `.aios/auto_answer_faza1.sh`
- `.aios/etap-5-notatka-wdrozenia.md`
- `.aios/faza1-prompt.md`
- `.aios/i18n-master-plan.md`
- `.aios/kontrakt-03.md`
- `.aios/kontrakt-chunk-ab.md`
- `.aios/kontrakt-chunk-ac.md`
- `.aios/kontrakt-chunk-ad.md`
- `.aios/kontrakt-ekwipunek-mechanika.md`
- `.aios/kontrakt-ekwipunek-ostateczny.md`
- `.aios/kontrakt-ekwipunek.md`
- `.aios/kontrakt-etap-5-poprawka-ui.md`
- `.aios/kontrakt-etap-5-poprawka.md`
- `.aios/kontrakt-etap-5.md`
- `.aios/kontrakt-faza2-2.md`
- `.aios/kontrakt-portrety.md`
- `.aios/polish_map.txt`
- `.aios/translation_map_summary.txt`
- `_tester/_base/.silnik/.aios/diagnoza-wielojezycznosc.md`
- `_tester/_base/.silnik/.aios/kontrakt-01.md`
- `_tester/_base/.silnik/.aios/kontrakt-02.md`
- `_tester/_base/.silnik/.aios/kontrakt-04-i18n.md`
- `_tester/_base/.silnik/.aios/kontrakt-audyt-epok.md`
- `_tester/_base/.silnik/.aios/kontrakt-etap-6-grupa-1.md`
- `_tester/_base/.silnik/.aios/kontrakt-etap-6-grupa-2.md`
- `_tester/_base/.silnik/.aios/kontrakt-faza2.md`
- `_tester/_base/.silnik/.aios/kontrakt-faza3.md`
- `_tester/_base/.silnik/.aios/kontrakt-faza4.md`
- `_tester/_base/.silnik/.aios/kontrakt-faza5.md`
- `_tester/_base/.silnik/audytor_rejection.txt`
- `_tester/_base/.silnik/docs/EPOCH-CONSISTENCY-MANUAL.md`
- `_tester/_base/.silnik/docs/EPOCH-PHASE-2-GRAFT-REPORT.md`
- `etap-5.md`
- `zadania.md`

## `remove-oneoff-candidate` - 51

- `_tester/_base/.silnik/fix_prototypes.py`
- `_tester/_base/.silnik/patch_cleanup.py`
- `_tester/_base/.silnik/patch_parse.py`
- `_tester/_base/.silnik/patch_render.py`
- `_tester/_base/.silnik/scripts/add-grupa2-messages.py`
- `_tester/_base/.silnik/scripts/patch-archetypes.py`
- `_tester/_base/.silnik/scripts/patch-helpmodal-test.py`
- `_tester/_base/.silnik/scripts/patch-wizard.py`
- `auto_answer.sh`
- `auto_i18n.py`
- `auto_i18n_11.py`
- `auto_i18n_single.py`
- `chunk_aa`
- `chunk_ab`
- `chunk_ac`
- `chunk_ad`
- `files_to_translate.txt`
- `find_jsx_text.py`
- `find_pl.py`
- `find_pl2.py`
- `fix_chat_header.py`
- `fix_clock.py`
- `fix_components.py`
- `fix_ids.py`
- `fix_modal_final.py`
- `fix_modal_p1.py`
- `fix_modal_player.py`
- `fix_use_client.py`
- `fix_welcome.py`
- `patch_all_occupations.py`
- `patch_chat_json.py`
- `patch_components.py`
- `patch_en.py`
- `patch_herdr.py`
- `patch_jest_setup.py`
- `patch_manual.py`
- `patch_manual_data.py`
- `patch_manual_file.py`
- `patch_manual_final.py`
- `patch_manual_setup_test.py`
- `patch_manual_setup_test2.py`
- `patch_modal.py`
- `patch_modal_data.py`
- `patch_pl.py`
- `patch_safe.py`
- `patch_translations_data.py`
- `patch_welcome.py`
- `patch_welcome_data.py`
- `patch_welcome_index.py`
- `start_herdr_jobs.sh`
- `translate_one.py`

## Bramka przed usunięciem

- Sprawdzić callery przez `rg` i komendy w `package.json`.
- Potwierdzić, że skrypt nie jest potrzebny do odtworzenia wygenerowanych danych.
- Przenieść trwałe decyzje, kontrakty i instrukcje do root `docs/`.
- Wykonać usunięcie w osobnym commicie z testami odpowiedniego systemu.
- Nie łączyć czyszczenia z migracją storage, promptów ani mechaniki.
