import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'r') as f:
    content = f.read()

# Zamiany w przygodach:
content = content.replace("{adv.title}", "{t(`adventures.${adv.id}.title`) || adv.title}")
content = content.replace("{adv.description}", "{t(`adventures.${adv.id}.description`) || adv.description}")
content = content.replace("{adv.eraLabel}", "{t(`adventures.${adv.id}.eraLabel`) || adv.eraLabel}")

# Zamiany w zawodach postaci:
content = content.replace("{c.occupation}", "{t(`characters.${c.id}.occupation`) || c.occupation}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'w') as f:
    f.write(content)

