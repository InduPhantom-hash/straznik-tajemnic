import json

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', 'r') as f:
    data = json.load(f)

data['QuickSetup'] = {
    "title": "SZYBKA PRZYGODA",
    "strefa11": "STREFA 11",
    "subtitle": "Skonfiguruj sesję z programu Strefa 11. Wybierz tryb, scenariusz oraz gotowych badaczy z zespołu telewizyjnego.",
    "step1": "1. WYBIERZ TRYB GRY",
    "modeSolo": "TRYB SOLO",
    "modeSoloDesc": "Jeden gracz, jedna postać",
    "modeDuet": "HOT SEAT (DUET)",
    "modeDuetDesc": "Dwóch graczy na jednym urządzeniu",
    "step2": "2. WYBIERZ SCENARIUSZ ZE STREFY 11",
    "step3": "3. WYBIERZ POSTACIE",
    "player1": "Twoja Postać",
    "player2": "Druga Postać",
    "player1Label": "Gracz 1 ({text}):",
    "player2Label": "Gracz 2 ({text}):",
    "biography": "Biografia",
    "start": "Rozpocznij przygodę"
}

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

