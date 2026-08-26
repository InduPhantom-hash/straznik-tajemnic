import json

paths = [
    '/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json',
    '/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json'
]

for path in paths:
    with open(path, 'r') as f:
        data = json.load(f)
    
    adv = data['QuickSetup']['adventures']
    if 'tajemnica-pednika' in adv:
        adv['tajemnica-pendnika-lagiewki'] = adv.pop('tajemnica-pednika')
    if 'dzieci-z-traszyna' in adv:
        adv['tajemnica-dzieci-z-traszyna'] = adv.pop('dzieci-z-traszyna')
    if 'przybysz-z-matriksa' in adv:
        adv['przybysz-z-matriksa-glogow'] = adv.pop('przybysz-z-matriksa')
        
    with open(path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

