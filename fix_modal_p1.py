import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "{playMode === 'hot-seat' ? '{t('player1Label', { text: t('player1') })}' : 'Twoja Postać:'}",
    "{playMode === 'hot-seat' ? t('player1Label', { text: t('player1') }) : t('player1')}"
)

# And check for Gracz 2
# "{t('player2Label', { text: t('player2') })}"
content = content.replace(
    ">\"{t('player2Label', { text: t('player2') })}\"<",
    ">{t('player2Label', { text: t('player2') })}<"
)
content = content.replace(
    "\"{t('player2Label', { text: t('player2') })}\"",
    "t('player2Label', { text: t('player2') })"
)

# Also fix the "Twoja postać:" string if there are any remaining.
content = content.replace(">Twoja Postać:<", ">{t('player1')}:<")
content = content.replace("Gracz 2 (Druga Postać):", "{t('player2Label', { text: t('player2') })}") # might be left over?

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'w') as f:
    f.write(content)

