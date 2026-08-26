import json

pl = {
    "titlePart1": "Strażnik",
    "titlePart2": "Tajemnic",
    "title": "Strażnik Tajemnic",
    "subtitle": "Wirtualny Mistrz Gry",
    "resume": "Wznów grę",
    "unknown": "NIEZNANY",
    "messages": "Wiadomości",
    "images": "Obrazy"
}

en = {
    "titlePart1": "Keeper",
    "titlePart2": "Of Secrets",
    "title": "Keeper of Secrets",
    "subtitle": "Virtual Game Master",
    "resume": "Resume Game",
    "unknown": "UNKNOWN",
    "messages": "Messages",
    "images": "Images"
}

def update_file(path, data_dict):
    with open(path, 'r') as f:
        data = json.load(f)
    
    data['WelcomeScreen'] = data_dict
        
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', pl)
update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', en)

