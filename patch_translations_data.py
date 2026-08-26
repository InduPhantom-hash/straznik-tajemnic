import json
import os

files = {
    'pl': '/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json',
    'en': '/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json'
}

data_to_add = {
    'pl': {
        "adventures": {
            "cien-nad-prabutami": {
                "title": "CIEŃ NAD PRABUTAMI: WIDZENIE OJCA KLIMUSZKI",
                "description": "Badacze zostają zaangażowani przez redaktorkę Helenę Krawczyk z programu \"Sygnały Nieznanego\" po Międzynarodowym Kongresie Psychotronicznym w Pradze. Ich zadaniem jest weryfikacja niezwykłych fenomenów ojca Klimuszki – franciszkanina z Elbląga.",
                "eraLabel": "PRL - LATA 70. | WARSZAWA - ELBLĄG - PRABUTY"
            },
            "tajemnica-pednika": {
                "title": "TAJEMNICA PĘDNIKA: GENIALNY WYNALAZCA Z KOWAR",
                "description": "Badacze trafiają na ślad odkryć Lucjana Łągiewki z Kowar, którego zderzaki kinetyczne eliminują przeciążenia. Kiedy twórczy silnik bezwładnościowy działający w próżni, w warsztacie zjawiają się agenci AOR.",
                "eraLabel": "LATA 90. | KOWARY - KARKONOSZE"
            },
            "dzieci-z-traszyna": {
                "title": "TAJEMNICA DZIECI Z TRASZYNA: KLUCZ I ODWRÓCONY KRZYŻ",
                "description": "Badacze zostają wezwani przez egzorcystę i bioenergoterapeutę Tomasza Nowickiego do Traszyna. Po 16 latach od młodzieńczego seansu z książką i kluczem byt powraca, wywołując nocne paraliże.",
                "eraLabel": "LATA 90. CIEŃ | TRASZYN K. LUBLINA"
            },
            "przybysz-z-matriksa": {
                "title": "PRZYBYSZ Z MATRIKSA: PRZEPOWIEDNIE I ZJAWISKO Z GŁOGOWA",
                "description": "Badacze trafiają do Głogowa po serii zjawisk rejestrowanych na kasetach VHS. Świadkowie zgłaszają nocne błyski, zaniki pamięci i audycje z przyszłości, a śledztwo prowadzi do podziemi Twierdzy Głogów.",
                "eraLabel": "PRZEŁOM TYSIĄCLECI | GŁOGÓW - LEGNICA"
            }
        },
        "characters": {
            "helena-krawczyk": { "occupation": "Dziennikarka Śledcza" },
            "tomasz-nowicki": { "occupation": "Egzorcysta / Bioenergoterapeuta" },
            "lucjan-lagiewka": { "occupation": "Genialny Wynalazca" },
            "mariusz-zawadzki": { "occupation": "Technik Zespołu TV / Operator" }
        }
    },
    'en': {
        "adventures": {
            "cien-nad-prabutami": {
                "title": "SHADOW OVER PRABUTY: THE VISION OF FATHER KLIMUSZKO",
                "description": "Investigators are hired by editor Helena Krawczyk from the \"Signals of the Unknown\" program after the International Psychotronic Congress in Prague. Their task is to verify the extraordinary phenomena of Father Klimuszko.",
                "eraLabel": "PRL - 1970s | WARSAW - ELBLAG - PRABUTY"
            },
            "tajemnica-pednika": {
                "title": "MYSTERY OF THE DRIVE: THE GENIUS INVENTOR FROM KOWARY",
                "description": "Investigators discover the inventions of Lucjan Lagiewka from Kowary, whose kinetic bumpers eliminate G-forces. When he builds an inertialless engine, mysterious agents appear.",
                "eraLabel": "1990s | KOWARY - KARKONOSZE"
            },
            "dzieci-z-traszyna": {
                "title": "MYSTERY OF THE TRASZYN CHILDREN: THE KEY AND THE INVERTED CROSS",
                "description": "Investigators are summoned by exorcist Tomasz Nowicki to Traszyn. 16 years after a youthful seance with a book and a key, an entity returns causing night terrors.",
                "eraLabel": "LATE 1990s | TRASZYN NEAR LUBLIN"
            },
            "przybysz-z-matriksa": {
                "title": "VISITOR FROM THE MATRIX: PROPHECIES AND THE GLOGOW PHENOMENON",
                "description": "Investigators travel to Glogow after a series of phenomena recorded on VHS tapes. Witnesses report night flashes and memory lapses.",
                "eraLabel": "MILLENNIUM | GLOGOW - LEGNICA"
            }
        },
        "characters": {
            "helena-krawczyk": { "occupation": "Investigative Journalist" },
            "tomasz-nowicki": { "occupation": "Exorcist / Bioenergotherapist" },
            "lucjan-lagiewka": { "occupation": "Genius Inventor" },
            "mariusz-zawadzki": { "occupation": "TV Crew Technician / Operator" }
        }
    }
}

for lang, path in files.items():
    if os.path.exists(path):
        with open(path, 'r') as f:
            data = json.load(f)
        
        if 'QuickSetup' not in data:
            data['QuickSetup'] = {}
            
        data['QuickSetup']['adventures'] = data_to_add[lang]['adventures']
        data['QuickSetup']['characters'] = data_to_add[lang]['characters']
        
        with open(path, 'w') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

