import json

pl_archetypes = {
  "investigator": {
    "name": "Śledczy",
    "description": "Szukasz prawdy za wszelką cenę. Dociekliwość jest Twoją bronią, a każda zagadka wzywa do rozwiązania."
  },
  "scholar": {
    "name": "Uczony",
    "description": "Wiedza jest Twoją bronią. Książki i dokumenty mówią więcej niż ludzie. Rozumiesz, że niektóre prawdy lepiej pozostawić nieodkryte."
  },
  "action": {
    "name": "Człowiek czynu",
    "description": "Działasz zanim inni pomyślą. W sytuacjach kryzysowych polegasz na sile, refleksie i instynkcie przetrwania."
  },
  "trickster": {
    "name": "Oszust",
    "description": "Urok osobisty i kłamstwo to Twoje narzędzia. Potrafisz przekonać każdego do wszystkiego, jeśli tylko masz na to czas."
  },
  "mystic": {
    "name": "Mistyk",
    "description": "Czujesz coś więcej niż inni. Granica między światem materialnym a tym, co za nim, zawsze była dla Ciebie cienka."
  },
  "healer": {
    "name": "Uzdrowiciel",
    "description": "Twoim powołaniem jest pomaganie innym. W obliczu koszmaru starasz się zachować życie i zmysły swoich towarzyszy."
  },
  "custom": {
    "name": "Własna koncepcja",
    "description": "Stwórz bohatera od zera, dobierając zawód, umiejętności i historię według własnego pomysłu."
  }
}

en_archetypes = {
  "investigator": {
    "name": "Investigator",
    "description": "You seek the truth at any cost. Inquisitiveness is your weapon, and every mystery calls to be solved."
  },
  "scholar": {
    "name": "Scholar",
    "description": "Knowledge is your weapon. Books and documents speak louder than people. You understand that some truths are better left undiscovered."
  },
  "action": {
    "name": "Action Hero",
    "description": "You act before others think. In crisis situations, you rely on strength, reflexes, and survival instinct."
  },
  "trickster": {
    "name": "Trickster",
    "description": "Charm and deceit are your tools. You can convince anyone of anything, given enough time."
  },
  "mystic": {
    "name": "Mystic",
    "description": "You feel more than others. The boundary between the material world and what lies beyond has always been thin for you."
  },
  "healer": {
    "name": "Healer",
    "description": "Your calling is helping others. In the face of nightmares, you strive to preserve the lives and sanity of your companions."
  },
  "custom": {
    "name": "Custom Concept",
    "description": "Create a character from scratch, choosing an occupation, skills, and backstory according to your own idea."
  }
}

for lang, arch_data in [('pl', pl_archetypes), ('en', en_archetypes)]:
    with open(f'messages/{lang}.json', 'r', encoding='utf-8') as f:
        d = json.load(f)
    if 'CharacterWizard' not in d:
        d['CharacterWizard'] = {}
    d['CharacterWizard']['archetypes'] = arch_data
    with open(f'messages/{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
