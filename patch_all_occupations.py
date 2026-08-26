import json

pl = {
    "strefa11_tomasz_nowicki": "Dziennikarz Śledczy / Prowadzący",
    "strefa11_helena_krawczyk": "Producentka Telewizyjna",
    "strefa11_barbara_zawadzka": "Etnograf / Parapsycholog",
    "strefa11_ryszard_klucznik": "B. Oficer SB / Technik Ochrony",
    "pednik_inzynier": "Inżynier Mechanik",
    "pednik_kierowca": "Kierowca Testowy",
    "pednik_dziennikarka": "Dziennikarka Śledcza",
    "pednik_fizyk": "Fizyk Teoretyk",
    "traszyn_egzorcysta": "Ksiądz Egzorcysta",
    "traszyn_terapeuta": "Bioenergoterapeuta",
    "traszyn_psycholog": "Psycholog Dziecięcy",
    "traszyn_etnografka": "Lokalna Etnografka / Bibliotekarka",
    "glogow_detektyw": "Prywatny Detektyw",
    "glogow_haker": "Programista / Haker",
    "glogow_psychiatra": "Psychiatra",
    "glogow_ufolog": "UFOlog / Badaczka Anomalii"
}

en = {
    "strefa11_tomasz_nowicki": "Investigative Journalist / Host",
    "strefa11_helena_krawczyk": "TV Producer",
    "strefa11_barbara_zawadzka": "Ethnographer / Parapsychologist",
    "strefa11_ryszard_klucznik": "Ex-SB Officer / Security Tech",
    "pednik_inzynier": "Mechanical Engineer",
    "pednik_kierowca": "Test Driver",
    "pednik_dziennikarka": "Investigative Journalist",
    "pednik_fizyk": "Theoretical Physicist",
    "traszyn_egzorcysta": "Priest Exorcist",
    "traszyn_terapeuta": "Bioenergotherapist",
    "traszyn_psycholog": "Child Psychologist",
    "traszyn_etnografka": "Local Ethnographer / Librarian",
    "glogow_detektyw": "Private Detective",
    "glogow_haker": "Programmer / Hacker",
    "glogow_psychiatra": "Psychiatrist",
    "glogow_ufolog": "Ufologist / Anomaly Researcher"
}

def update_file(path, data_dict):
    with open(path, 'r') as f:
        data = json.load(f)
    
    if 'QuickSetup' not in data:
        data['QuickSetup'] = {}
    if 'characters' not in data['QuickSetup']:
        data['QuickSetup']['characters'] = {}
        
    for k, v in data_dict.items():
        if k not in data['QuickSetup']['characters']:
            data['QuickSetup']['characters'][k] = {}
        data['QuickSetup']['characters'][k]['occupation'] = v
        
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', pl)
update_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', en)

