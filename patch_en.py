import json

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', 'r') as f:
    data = json.load(f)

data['QuickSetup'] = {
    "title": "QUICK ADVENTURE",
    "strefa11": "AREA 11",
    "subtitle": "Configure a session from the Area 11 program. Choose the mode, scenario, and ready-made investigators from the TV crew.",
    "step1": "1. CHOOSE GAME MODE",
    "modeSolo": "SOLO MODE",
    "modeSoloDesc": "One player, one character",
    "modeDuet": "HOT SEAT (DUET)",
    "modeDuetDesc": "Two players on one device",
    "step2": "2. CHOOSE AREA 11 SCENARIO",
    "step3": "3. CHOOSE CHARACTERS",
    "player1": "Your Character",
    "player2": "Second Character",
    "player1Label": "Player 1 ({text}):",
    "player2Label": "Player 2 ({text}):",
    "biography": "Biography",
    "start": "Start adventure"
}

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

