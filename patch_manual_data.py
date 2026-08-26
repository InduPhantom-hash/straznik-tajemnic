import json

pl = {
    "backToMode": "Wróć do wyboru trybu",
    "subtitle": "Dostosuj tryb gry, wybierz scenariusz i powołaj Badaczy Tajemnic.",
    "duetDesc": "Dwóch badaczy przy jednym ekranie",
    "soloDesc": "Pojedynczy badacz stawiający czoła Mitom",
    "changeMode": "Zmień tryb",
    "advDescFallback": "Wybierz gotowy moduł lub wgraj własne akta sprawy",
    "changeAdv": "Zmień przygodę",
    "selectAdv": "Wybierz przygodę",
    "unknownOcc": "Zawód nieznany",
    "changeChar": "Zmień postać",
    "createNew": "Stwórz nową",
    "noCharDesc": "Brak wybranego Badacza. Wybierz gotową postać lub stwórz własną kartę.",
    "createNewChar": "Stwórz nową postać",
    "selectPremade": "Wybierz gotową postać",
    "selectPremadeShort": "Wybierz gotową",
    "repeatS0": "Powtórz Sesję Zero",
    "runS0": "Uruchom Sesję Zero",
    "startGame": "Rozpocznij Grę",
    "needBoth": "Wybierz przygodę i postać, aby rozpocząć grę",
    "needAdv": "Wybierz przygodę, aby rozpocząć grę",
    "needChar": "Wybierz lub stwórz postać, aby rozpocząć grę"
}

en = {
    "backToMode": "Back to mode selection",
    "subtitle": "Customize game mode, select scenario and summon Investigators.",
    "duetDesc": "Two investigators at one screen",
    "soloDesc": "A single investigator facing the Mythos",
    "changeMode": "Change mode",
    "advDescFallback": "Select a ready module or upload your own case files",
    "changeAdv": "Change adventure",
    "selectAdv": "Select adventure",
    "unknownOcc": "Unknown occupation",
    "changeChar": "Change character",
    "createNew": "Create new",
    "noCharDesc": "No Investigator selected. Choose a ready character or create your own sheet.",
    "createNewChar": "Create new character",
    "selectPremade": "Select ready character",
    "selectPremadeShort": "Select ready",
    "repeatS0": "Repeat Session Zero",
    "runS0": "Run Session Zero",
    "startGame": "Start Game",
    "needBoth": "Select adventure and character to start game",
    "needAdv": "Select adventure to start game",
    "needChar": "Select or create character to start game"
}

def update_file(path, data_dict):
    with open(path, 'r') as f:
        data = json.load(f)
    
    data['ManualSetupPanel'] = data_dict
        
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', pl)
update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', en)

