# Mapa nawigacji PL/EN

Źródło: `_tester/_base/.silnik/navigation/navigation-registry.json`. Nie edytuj
ręcznie grafu. Po zmianie rejestru uruchom `npm run navigation:generate` w
`_tester/_base/.silnik`.

`PL / EN` w każdym węźle i na każdej krawędzi oznacza etykiety dwóch wersji
językowych tego samego działania.

```mermaid
graph TD
    home["Strona główna / Home<br/>`/`"]
    welcome["Wybór języka / Language selection<br/>`/welcome`"]
    settings["Ustawienia / Settings<br/>`/settings`"]
    campaigns["Kampanie / Campaigns<br/>`/campaigns`"]
    campaign_new["Nowa kampania / New campaign<br/>`/campaigns/new`"]
    characters["Postacie / Characters<br/>`/characters`"]
    character_new["Nowa postać / New character<br/>`/characters/new`"]
    dice_route["Kości / Dice<br/>`/dice`"]
    prototypes["Prototypy / Prototypes<br/>`/prototypes`"]
    cutscene["Prototyp cutsceny / Cutscene prototype<br/>`/prototypes/cutscene`"]
    sanity_prototype["Prototyp testu poczytalności / Sanity check prototype<br/>`/prototypes/sanity-check`"]
    quick_setup["Szybka przygoda / Quick adventure"]
    manual_setup["Ręczne ustawianie gry / Manual game setup"]
    adventure_selector["Wybór przygody / Adventure selector"]
    predefined_characters["Gotowe postacie / Predefined characters"]
    character_wizard["Kreator postaci / Character wizard"]
    hot_seat["Wybór trybu gry / Play mode"]
    session_zero["Sesja Zero / Session Zero"]
    game["Aktywna sesja / Active session"]
    api_keys["Klucze API / API keys"]
    character_sheet["Karta badacza / Investigator sheet"]
    equipment["Ekwipunek / Equipment"]
    equipment_detail["Szczegóły przedmiotu / Equipment detail"]
    journal["Dziennik sesji / Session journal"]
    dice["Rzuty kośćmi / Dice rolls"]
    gm_tools["Narzędzia MG / GM tools"]
    development["Faza rozwoju / Development phase"]
    save_game["Zapis gry / Save game"]
    load_game["Wczytanie gry / Load game"]
    help["Pomoc i zasady / Help and rules"]
    new_adventure_confirm["Potwierdzenie nowej przygody / New adventure confirmation"]
    full_reset["Pełny reset / Full reset"]

    welcome -->|Polski / Polish| home
    welcome -->|English / English| home
    home -->|Szybka przygoda / Quick adventure| quick_setup
    home -->|Ustaw ręcznie / Set up manually| manual_setup
    home -->|Wczytaj zapis / Load save| load_game
    home -->|Klucze API / API keys| api_keys
    quick_setup -->|Wybierz przygodę / Choose adventure| adventure_selector
    adventure_selector -->|Wybierz postać / Choose character| predefined_characters
    manual_setup -->|Wybierz tryb gry / Choose play mode| hot_seat
    manual_setup -->|Wybierz przygodę / Choose adventure| adventure_selector
    manual_setup -->|Gotowa postać / Predefined character| predefined_characters
    manual_setup -->|Stwórz postać / Create character| character_wizard
    predefined_characters -->|Wybierz badacza / Choose investigator| session_zero
    character_wizard -->|Zakończ i zapisz / Finish and save| manual_setup
    hot_seat -->|Rozpocznij tryb / Start mode| session_zero
    session_zero -->|Rozpocznij grę / Start game| game
    game -->|Karta postaci / Character sheet| character_sheet
    game -->|Ekwipunek / Equipment| equipment
    equipment -->|Szczegóły przedmiotu / Equipment details| equipment_detail
    game -->|Dziennik / Journal| journal
    game -->|Rzuć kośćmi / Roll dice| dice
    game -->|Narzędzia MG / GM tools| gm_tools
    game -->|Faza rozwoju (po sesji) / Development phase (after session)| development
    game -->|Zapisz grę / Save game| save_game
    game -->|Wczytaj grę / Load game| load_game
    game -->|Pomoc / Help| help
    game -->|Ustawienia / Settings| settings
    game -->|Nowa przygoda / New adventure| new_adventure_confirm
    settings -->|Pełny reset / Full reset| full_reset
    campaigns -->|Nowa kampania / New campaign| campaign_new
    characters -->|Nowa postać / New character| character_new
```

## Routy

| URL | PL | EN | E2E |
| --- | --- | --- | --- |
| `/{locale}` | Strona główna | Home | tak |
| `/{locale}/welcome` | Wybór języka | Language selection | tak |
| `/{locale}/settings` | Ustawienia | Settings | tak |
| `/{locale}/campaigns` | Kampanie | Campaigns | tak |
| `/{locale}/campaigns/new` | Nowa kampania | New campaign | tak |
| `/{locale}/characters` | Postacie | Characters | tak |
| `/{locale}/characters/new` | Nowa postać | New character | tak |
| `/{locale}/dice` | Kości | Dice | tak |
| `/{locale}/prototypes` | Prototypy | Prototypes | tak |
| `/{locale}/prototypes/cutscene` | Prototyp cutsceny | Cutscene prototype | tak |
| `/{locale}/prototypes/sanity-check` | Prototyp testu poczytalności | Sanity check prototype | tak |

## Kluczowe akcje

| Z widoku | Akcja PL / EN | Otwiera lub wykonuje | Źródło |
| --- | --- | --- | --- |
| Wybór języka | Polski / Polish | Strona główna | `src/app/welcome/page.tsx` |
| Wybór języka | English / English | Strona główna | `src/app/welcome/page.tsx` |
| Strona główna | Szybka przygoda / Quick adventure | Szybka przygoda | `src/components/chat/welcome/components/start-mode-cards.tsx` |
| Strona główna | Ustaw ręcznie / Set up manually | Ręczne ustawianie gry | `src/components/chat/welcome/components/start-mode-cards.tsx` |
| Strona główna | Wczytaj zapis / Load save | Wczytanie gry | `src/components/chat/welcome/components/bottom-links.tsx` |
| Strona główna | Klucze API / API keys | Klucze API | `src/components/chat/welcome/index.tsx` |
| Szybka przygoda | Wybierz przygodę / Choose adventure | Wybór przygody | `src/components/ui/quick-setup-modal.tsx` |
| Wybór przygody | Wybierz postać / Choose character | Gotowe postacie | `src/components/ui/adventure-selector.tsx` |
| Ręczne ustawianie gry | Wybierz tryb gry / Choose play mode | Wybór trybu gry | `src/components/chat/welcome/components/manual-setup-panel.tsx` |
| Ręczne ustawianie gry | Wybierz przygodę / Choose adventure | Wybór przygody | `src/components/chat/welcome/components/manual-setup-panel.tsx` |
| Ręczne ustawianie gry | Gotowa postać / Predefined character | Gotowe postacie | `src/components/chat/welcome/components/manual-setup-panel.tsx` |
| Ręczne ustawianie gry | Stwórz postać / Create character | Kreator postaci | `src/components/chat/welcome/components/manual-setup-panel.tsx` |
| Gotowe postacie | Wybierz badacza / Choose investigator | Sesja Zero | `src/components/ui/predefined-characters-selector.tsx` |
| Kreator postaci | Zakończ i zapisz / Finish and save | Ręczne ustawianie gry | `src/components/ui/character-wizard.tsx` |
| Wybór trybu gry | Rozpocznij tryb / Start mode | Sesja Zero | `src/components/ui/hot-seat-setup.tsx` |
| Sesja Zero | Rozpocznij grę / Start game | Aktywna sesja | `src/app/[locale]/page.tsx` |
| Aktywna sesja | Karta postaci / Character sheet | Karta badacza | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Ekwipunek / Equipment | Ekwipunek | `src/components/sidebar/CthulhuSidebar.tsx` |
| Ekwipunek | Szczegóły przedmiotu / Equipment details | Szczegóły przedmiotu | `src/components/ui/equipment-detail-dialog.tsx` |
| Aktywna sesja | Dziennik / Journal | Dziennik sesji | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Rzuć kośćmi / Roll dice | Rzuty kośćmi | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Narzędzia MG / GM tools | Narzędzia MG | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Faza rozwoju (po sesji) / Development phase (after session) | Faza rozwoju | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Zapisz grę / Save game | Zapis gry | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Wczytaj grę / Load game | Wczytanie gry | `src/components/desk/DeskTools.tsx` |
| Aktywna sesja | Pomoc / Help | Pomoc i zasady | `src/components/help-modal/HelpModal.tsx` |
| Aktywna sesja | Ustawienia / Settings | Ustawienia | `src/components/sidebar/CthulhuSidebar.tsx` |
| Aktywna sesja | Nowa przygoda / New adventure | Potwierdzenie nowej przygody | `src/components/sidebar/CthulhuSidebar.tsx` |
| Ustawienia | Pełny reset / Full reset | Pełny reset | `src/components/ui/settings-modal.tsx` |
| Kampanie | Nowa kampania / New campaign | Nowa kampania | `src/app/[locale]/campaigns/page.tsx` |
| Postacie | Nowa postać / New character | Nowa postać | `src/app/[locale]/characters/page.tsx` |

## Zasady aktualizacji

- Każda zmiana routingu, modala lub przycisku prowadzącego do innego widoku
  aktualizuje rejestr, ten dokument i właściwy test E2E.
- `npm run navigation:check` sprawdza strukturę rejestru i zgodność
  wygenerowanego dokumentu.
- CI odrzuca zmianę `src/app` lub `src/components`, gdy pull request nie
  zmienia rejestru nawigacji.
