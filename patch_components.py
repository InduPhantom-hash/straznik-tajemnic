import sys
import re
import os
import json

def patch_file(filename, ns, patches):
    if not os.path.exists(filename): return
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # ensure imports and hooks
    if 'useTranslations' not in content:
        content = "import { useTranslations } from 'next-intl';\n" + content
        content = re.sub(r'(return \()', f"const t = useTranslations('{ns}');\n  \\1", content, count=1)

    for old, new, key, is_attr in patches:
        if is_attr:
            content = content.replace(f'"{old}"', f"{{t('{key}')}}")
            content = content.replace(f"'{old}'", f"{{t('{key}')}}")
        else:
            content = content.replace(f">{old}<", f">{{t('{key}')}}<")
            content = content.replace(f"> {old} <", f"> {{t('{key}')}} <")
            content = content.replace(f">\\n{old}\\n<", f">\\n{{t('{key}')}}\\n<")

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

# We define the patches. is_attr means we replace "String" or 'String' with {t('key')}
patch_file("_tester/_base/.silnik/src/components/chat/chat-window/components/skill-test-card.tsx", "SkillTestCard", [
    ("Twoja wartość:", "Twoja wartość:", "yourValue", False),
    ("Wynik zapisany", "Wynik zapisany", "resultSaved", False),
    ("Rzuć kością", "Rzuć kością", "rollDice", False)
])
patch_file("_tester/_base/.silnik/src/components/chat/chat-window/components/tts-hard-loading-screen.tsx", "TtsHardLoadingScreen", [
    ("Mistrz Gry przygotowuje sesję...", "Mistrz Gry przygotowuje sesję...", "preparingSession", False),
    ("Trwa generowanie mrocznej opowieści i głosu narratora. Proszę czekać.", "Trwa generowanie mrocznej opowieści i głosu narratora. Proszę czekać.", "generatingStory", False)
])
patch_file("_tester/_base/.silnik/src/components/dialogs/ApiKeysModal.tsx", "ApiKeysModal", [
    ("Konfiguracja kluczy API", "Konfiguracja kluczy API", "title", False),
    ("Wymagany", "Wymagany", "required", False),
    ("Opcjonalny", "Opcjonalny", "optional", False),
    ("Sprawdzam…", "Sprawdzam…", "checking", False),
    ("Sprawdź klucz", "Sprawdź klucz", "checkKey", False),
    ("Klucz działa", "Klucz działa", "keyWorks", False),
    ("Klucz nieprawidłowy", "Klucz nieprawidłowy", "keyInvalid", False),
    ("Zapisz klucze", "Zapisz klucze", "saveKeys", False),
    ("Zapisano!", "Zapisano!", "saved", False),
    ("Anuluj", "Anuluj", "cancel", False)
])
patch_file("_tester/_base/.silnik/src/components/dialogs/CharacterDialog.tsx", "CharacterDialog", [
    ("Nie masz jeszcze żadnych postaci", "Nie masz jeszcze żadnych postaci", "noCharacters", False),
    ("➕ Stwórz pierwszą postać", "➕ Stwórz pierwszą postać", "createFirst", False),
    ("Zamknij", "Zamknij", "close", False),
    ("➕ Nowa postać", "➕ Nowa postać", "newCharacter", False),
    ("Zarządzaj", "Zarządzaj", "manage", False),
    ("Charakterystyki", "Charakterystyki", "characteristics", False),
    ("Wybierz postać z listy lub stwórz nową", "", "descList", True),
    ("Przeglądaj charakterystyki i umiejętności postaci", "", "descDetail", True),
    ("Aktywna postać:", "Aktywna postać:", "activeCharacter", False),
    ("Aktywna", "Aktywna", "active", False),
    ("Wybierz", "Wybierz", "select", False),
    ("← Powrót do listy", "← Powrót do listy", "backToList", False),
    ("Wiek:", "Wiek:", "age", False),
    ("PW:", "PW:", "hp", False),
    ("Poczytalność:", "Poczytalność:", "sanity", False),
    ("Szczęście", "", "luck", True),
    ("Magia", "", "magic", True)
])
patch_file("_tester/_base/.silnik/src/components/dialogs/DevelopmentPhaseModal.tsx", "DevelopmentPhaseModal", [
    ("Koniec sesji · Faza Rozwoju", "Koniec sesji · Faza Rozwoju", "title1", False),
    ("Faza Rozwoju Badacza", "Faza Rozwoju Badacza", "title2", False),
    ("Rozwijaj umiejętności zgodnie z zasadami CoC 7e", "Rozwijaj umiejętności zgodnie z zasadami CoC 7e", "desc", False),
    ("Jeszcze nie masz czego rozwijać", "Jeszcze nie masz czego rozwijać", "nothingToDevelop", False),
    ("Jak postać rozwija umiejętności?", "Jak postać rozwija umiejętności?", "howToDevelop", False),
    ("Rozumiem, wracam do gry", "Rozumiem, wracam do gry", "understood", False),
    ("Zasady:", "Zasady:", "rules", False),
    ("Im niższa umiejętność, tym łatwiej ją rozwinąć!", "Im niższa umiejętność, tym łatwiej ją rozwinąć!", "lowerEasier", False),
    ("Osiągnięcie 90%+ = bonus +2K6 Poczytalności!", "Osiągnięcie 90%+ = bonus +2K6 Poczytalności!", "masteryBonus", False),
    ("odzyskanie Szczęścia", "odzyskanie Szczęścia", "luckRecovery", False),
    ("Rozpocznij Fazę Rozwoju", "Rozpocznij Fazę Rozwoju", "startPhase", False),
    ("Rzut za niski - brak zmiany", "Rzut za niski - brak zmiany", "rollTooLow", False),
    ("Odzyskiwanie Szczęścia...", "Odzyskiwanie Szczęścia...", "recoveringLuck", False),
    ("Szczęście", "Szczęście", "luck", False),
    ("Podsumowanie Fazy Rozwoju", "Podsumowanie Fazy Rozwoju", "summary", False),
    ("Udanych rzutów", "Udanych rzutów", "successfulRolls", False),
    ("Punktów rozwoju", "Punktów rozwoju", "devPoints", False),
    ("Bonus za mistrzostwo (90%+)", "Bonus za mistrzostwo (90%+)", "masteryReward", False),
    ("Odzyskane po sesji", "Odzyskane po sesji", "recoveredAfterSession", False),
    ("Samopomoc", "Samopomoc", "selfHelp", False),
    ("- odzyskiwanie Poczytalności", "- odzyskiwanie Poczytalności", "sanityRecovery", False),
    ("Odzyskaj Poczytalność (1K10)", "Odzyskaj Poczytalność (1K10)", "recoverSanity", False),
    ("Zamknij", "Zamknij", "close", False)
])
patch_file("_tester/_base/.silnik/src/components/dialogs/DiceDialog.tsx", "DiceDialog", [
    ("Niech zadecyduje los", "Niech zadecyduje los", "letFateDecide", False),
    ("Tacka na Kości", "Tacka na Kości", "diceTray", False),
    ("Rzucaj kośćmi wirtualnie lub wpisuj wyniki z prawdziwych kości", "Rzucaj kośćmi wirtualnie lub wpisuj wyniki z prawdziwych kości", "desc", False),
    ("Test Umiejętności (opcjonalny)", "Test Umiejętności (opcjonalny)", "skillTestOptional", False),
    ("Kości premii / kary", "Kości premii / kary", "bonusPenaltyDice", False),
    ("Rzut", "Rzut", "roll", False),
    ("k100", "k100", "d100", False),
    ("Ostatnie rzuty", "Ostatnie rzuty", "latestRolls", False),
    ("Historia", "Historia", "history", False),
    ("Wyczyść", "Wyczyść", "clear", False),
    ("Brak rzutów w tej sesji", "Brak rzutów w tej sesji", "noRolls", False),
    ("Rzuć kośćmi lub wpisz wynik", "Rzuć kośćmi lub wpisz wynik", "rollOrEnter", False),
    ("Pełna historia", "Pełna historia", "fullHistory", False),
    ("Wyczyść wszystko", "Wyczyść wszystko", "clearAll", False),
    ("Brak zapisanej historii", "Brak zapisanej historii", "noHistorySaved", False),
    ("Zamknij", "Zamknij", "close", False)
])
patch_file("_tester/_base/.silnik/src/components/dialogs/JournalDialog.tsx", "JournalDialog", [
    ("Kronika śledztwa", "Kronika śledztwa", "investigationChronicle", False),
    ("Dziennik Przygody", "Dziennik Przygody", "adventureJournal", False),
    ("Zapisz swoje obserwacje, odkrycia i przemyślenia", "Zapisz swoje obserwacje, odkrycia i przemyślenia", "desc", False),
    ("Nowy wpis", "Nowy wpis", "newEntry", False),
    ("👥 Wszyscy gracze", "👥 Wszyscy gracze", "allPlayers", False),
    ("Zapisz", "Zapisz", "save", False),
    ("Anuluj", "Anuluj", "cancel", False),
    ("Wybierz wpis z kroniki", "Wybierz wpis z kroniki", "selectEntry", False),
    ("Kliknij na wpis po lewej stronie, aby go przeczytać", "Kliknij na wpis po lewej stronie, aby go przeczytać", "clickToRead", False),
    ("Zamknij", "Zamknij", "close", False)
])

print("Patched!")
