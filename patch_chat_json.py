import json

def patch_json(filepath, lang):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    if lang == 'pl':
        data['ChatHeader'] = { "defaultTitle": "Tajemnica Biblioteki Miskatonic" }
    else:
        data['ChatHeader'] = { "defaultTitle": "Mystery of the Miskatonic Library" }
        
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

patch_json('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', 'pl')
patch_json('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', 'en')

