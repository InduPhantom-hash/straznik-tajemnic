import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'r') as f:
    content = f.read()

content = content.replace("Gracz 1 (Główna Postać):", "{t('player1Label', { text: t('player1') })}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'w') as f:
    f.write(content)

