import os
import json
import re

files_replacements = {
    "_tester/_base/.silnik/src/components/chat/chat-window/components/skill-test-card.tsx": {
        "ns": "SkillTestCard",
        "texts": {
            "Twoja wartość:": "yourValue",
            "\"wynik 47\"": "exampleResult",
            "Wynik zapisany": "resultSaved",
            "Rzuć kością": "rollDice"
        }
    },
    "_tester/_base/.silnik/src/components/chat/chat-window/components/tts-hard-loading-screen.tsx": {
        "ns": "TtsHardLoadingScreen",
        "texts": {
            "Mistrz Gry przygotowuje sesję...": "preparingSession",
            "Trwa generowanie mrocznej opowieści i głosu narratora. Proszę czekać.": "generatingStory"
        }
    },
    "_tester/_base/.silnik/src/components/dialogs/ApiKeysModal.tsx": {
        "ns": "ApiKeysModal",
        "texts": {
            "\"Create API key\"": "createApiKey",
            "\"Sprawdź klucz\"": "checkKeyBtn",
            "Anuluj": "cancel",
            "Zapisano!": "saved",
            "Zapisz klucze": "saveKeys",
            "Konfiguracja kluczy API": "title",
            "Wklej swój klucz Google Gemini, aby grać. Klucz jest przechowywany": "desc1",
            "wyłącznie lokalnie w Twojej przeglądarce - nikt poza Tobą go nie": "desc2",
            "widzi.": "desc3",
            "Bezpieczeństwo:": "security",
            "Klucze są przechowywane w": "secDesc1",
            "Twojej przeglądarce (localStorage). Nie udostępniaj ich": "secDesc2",
            "nikomu. Każdy serwis ma własne limity i opłaty.": "secDesc3",
            "Wymagany": "required",
            "Opcjonalny": "optional",
            "Sprawdzam…": "checking",
            "Sprawdź klucz": "checkKey",
            "Klucz działa": "keyWorks",
            "Klucz nieprawidłowy": "keyInvalid",
            "lub limit przekroczony": "limitExceeded",
            "Jak uzyskać klucz Google Gemini?": "howToGet",
            "Wejdź na": "step1a",
            "i zaloguj się": "step1b",
            "kontem Google": "step1c",
            "Kliknij": "step2a",
            "Skopiuj klucz, wklej powyżej i kliknij": "step3a",
            "\"Get API key\"": "getApiKey"
        }
    },
    "_tester/_base/.silnik/src/components/dialogs/CharacterDialog.tsx": {
        "ns": "CharacterDialog",
        "texts": {
            "Aktywna postać:": "activeCharacter",
            "Aktywna": "active",
            "Wybierz": "select",
            "Nie masz jeszcze żadnych postaci": "noCharacters",
            "➕ Stwórz pierwszą postać": "createFirst",
            "Zamknij": "close",
            "➕ Nowa postać": "newCharacter",
            "Zarządzaj": "manage",
            "← Powrót do listy": "backToList",
            "Wiek:": "age",
            "PW:": "hp",
            "Poczytalność:": "sanity",
            "Charakterystyki": "characteristics",
            "Szczęście": "luck",
            "Magia": "magic"
        }
    },
    "_tester/_base/.silnik/src/components/dialogs/DevelopmentPhaseModal.tsx": {
        "ns": "DevelopmentPhaseModal",
        "texts": {
            "Koniec sesji · Faza Rozwoju": "title1",
            "Faza Rozwoju Badacza": "title2",
            "Rozwijaj umiejętności zgodnie z zasadami CoC 7e": "desc",
            "Jeszcze nie masz czego rozwijać": "nothingToDevelop",
            "zostały oznaczone w trakcie gry": "markedDuringGame",
            ". Na razie żadna nie jest oznaczona, więc nie ma jeszcze nic": "noneMarked1",
            "do rzucenia.": "noneMarked2",
            "Jak postać rozwija umiejętności?": "howToDevelop",
            "udany test": "successfulTest",
            "automatycznie oznacza": "automaticallyMarks",
            "rzucasz": "youRoll",
            "na ich": "forTheir",
            "poprawę (1D100 - im niższa umiejętność, tym łatwiej ją": "improvement1",
            "podnieść).": "improvement2",
            "Liczba oznaczonych umiejętności pojawi się jako odznaka przy": "badgeInfo1",
            "przycisku \"Faza Rozwoju\" w panelu bocznym.": "badgeInfo2",
            "Rozumiem, wracam do gry": "understood",
            "Zasady:": "rules",
            "wyższy": "higher",
            "niż": "than",
            "aktualna wartość, umiejętność wzrośnie o 1D10 punktów.": "willIncrease",
            "Im niższa umiejętność, tym łatwiej ją rozwinąć!": "lowerEasier",
            "Osiągnięcie 90%+ = bonus +2K6 Poczytalności!": "masteryBonus",
            "odzyskanie Szczęścia": "luckRecovery",
            "Rozpocznij Fazę Rozwoju": "startPhase",
            "Rzut za niski - brak zmiany": "rollTooLow",
            "Odzyskiwanie Szczęścia...": "recoveringLuck",
            "Szczęście": "luck",
            "Podsumowanie Fazy Rozwoju": "summary",
            "Udanych rzutów": "successfulRolls",
            "Punktów rozwoju": "devPoints",
            "Bonus za mistrzostwo (90%+)": "masteryReward",
            "Odzyskane po sesji": "recoveredAfterSession",
            "Samopomoc": "selfHelp",
            "- odzyskiwanie Poczytalności": "sanityRecovery",
            "Opisz, jak Badacz poświęcił czas aspektowi swojej historii": "describeSelfHelp1",
            "(np. Kluczowej Więzi). Rzut 1K10 Poczytalności. Mechanika": "describeSelfHelp2",
            "uznaniowa (str. 185) - Strażnik może zmienić wynik.": "describeSelfHelp3",
            "Odzyskaj Poczytalność (1K10)": "recoverSanity",
            "Zamknij": "close"
        }
    },
    "_tester/_base/.silnik/src/components/dialogs/DiceDialog.tsx": {
        "ns": "DiceDialog",
        "texts": {
            "Niech zadecyduje los": "letFateDecide",
            "Tacka na Kości": "diceTray",
            "Rzucaj kośćmi wirtualnie lub wpisuj wyniki z prawdziwych kości": "desc",
            "Test Umiejętności (opcjonalny)": "skillTestOptional",
            "Kości premii / kary": "bonusPenaltyDice",
            "Kość premii: rzucasz dwiema dziesiątkami dziesiątek, bierzesz": "bonusDiceDesc1",
            "niższy wynik.": "bonusDiceDesc2",
            "Rzut": "roll",
            "k100": "d100",
            "Ostatnie rzuty": "latestRolls",
            "Historia": "history",
            "Wyczyść": "clear",
            "Brak rzutów w tej sesji": "noRolls",
            "Rzuć kośćmi lub wpisz wynik": "rollOrEnter",
            "Pełna historia": "fullHistory",
            "Wyczyść wszystko": "clearAll",
            "Brak zapisanej historii": "noHistorySaved",
            "Zamknij": "close"
        }
    },
    "_tester/_base/.silnik/src/components/dialogs/JournalDialog.tsx": {
        "ns": "JournalDialog",
        "texts": {
            "Kronika śledztwa": "investigationChronicle",
            "Dziennik Przygody": "adventureJournal",
            "Zapisz swoje obserwacje, odkrycia i przemyślenia": "desc",
            "Nowy wpis": "newEntry",
            "👥 Wszyscy gracze": "allPlayers",
            "Zapisz": "save",
            "Anuluj": "cancel",
            "Wybierz wpis z kroniki": "selectEntry",
            "Kliknij na wpis po lewej stronie, aby go przeczytać": "clickToRead",
            "Zamknij": "close"
        }
    },
    "_tester/_base/.silnik/src/app/[locale]/prototypes/cutscene/page.tsx": {
        "ns": "Cutscene",
        "texts": {
            "Spacja": "space",
            "lub": "or",
            "Enter": "enter",
            "Esc": "esc"
        }
    },
    "_tester/_base/.silnik/src/app/[locale]/prototypes/page.tsx": {
        "ns": "Prototypes",
        "texts": {
            "Prototypes Lab": "title",
            "/prototypes/": "path"
        }
    }
}

import re

for filename, data in files_replacements.items():
    if not os.path.exists(filename):
        continue
        
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        
    ns = data['ns']
    texts = data['texts']
    
    pl_dict = {}
    en_dict = {}
    
    for text, key in texts.items():
        # find the exact string inside the file and replace it with {t('key')}
        # handle quotes or brackets if needed
        # We will use simple string replacement, but only if it's not already inside a t('') call
        # Since these are text nodes, we can just replace the exact text
        # If it's a quote like "wynik 47", we can replace the text literal or text node
        
        # let's be safe and replace the text only if it's found
        # to avoid replacing inside imports etc, we can assume these texts are unique
        content = content.replace(text, f"{{t('{key}')}}")
        
        pl_dict[key] = text.replace("&bdquo;", '"').replace("&rdquo;", '"')
        en_dict[key] = text.replace("&bdquo;", '"').replace("&rdquo;", '"') + " (EN)"

    if 'useTranslations' not in content:
        content = f"import {{ useTranslations }} from 'next-intl';\n" + content
    
    # inject the hook
    content = re.sub(r'(return \()', f"const t = useTranslations('{ns}');\n  \\1", content, count=1)
    
    # fix the text nodes that might have `{t('key')}` inside string literals if it replaced an attribute
    # e.g. placeholder="{t('key')}" -> should be placeholder={t('key')}
    content = content.replace('placeholder="{t(', 'placeholder={t(').replace(')}"', ')}')
    content = content.replace('title="{t(', 'title={t(').replace(')}"', ')}')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
        
    def update_json(lang, new_data):
        msg_path = f"/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/{lang}.json"
        with open(msg_path, 'r') as f:
            msgs = json.load(f)
        if ns not in msgs: msgs[ns] = {}
        msgs[ns].update(new_data)
        with open(msg_path, 'w') as f:
            json.dump(msgs, f, ensure_ascii=False, indent=2)
            
    update_json('pl', pl_dict)
    update_json('en', en_dict)
    print(f"Patched {filename}")

