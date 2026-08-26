import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.tsx', 'r') as f:
    content = f.read()

# Add useTranslations hook
if "useTranslations" not in content:
    content = content.replace("import { FC, useState } from 'react';", "import { FC, useState } from 'react';\nimport { useTranslations } from 'next-intl';")
    content = re.sub(
        r'(export const ManualSetupPanel: FC<ManualSetupPanelProps> = \(\{.*?\}\) => \{)',
        r'\1\n  const t = useTranslations(\'ManualSetupPanel\');',
        content,
        flags=re.DOTALL
    )

replacements = {
    "Wróć do wyboru trybu": "{t('backToMode')}",
    "Dostosuj tryb gry, wybierz scenariusz i powołaj Badaczy Tajemnic.": "{t('subtitle')}",
    "'Dwóch badaczy przy jednym ekranie'": "t('duetDesc')",
    "'Pojedynczy badacz stawiający czoła Mitom'": "t('soloDesc')",
    ">Zmień tryb<": ">{t('changeMode')}<",
    "'Wybierz gotowy moduł lub wgraj własne akta sprawy'": "t('advDescFallback')",
    "hasAdventure ? 'Zmień przygodę' : 'Wybierz przygodę'": "hasAdventure ? t('changeAdv') : t('selectAdv')",
    "'Zawód nieznany'": "t('unknownOcc')",
    ">Zmień postać<": ">{t('changeChar')}<",
    ">Stwórz nową<": ">{t('createNew')}<",
    ">Brak wybranego Badacza. Wybierz gotową postać lub stwórz własną kartę.<": ">{t('noCharDesc')}<",
    ">Stwórz nową postać<": ">{t('createNewChar')}<",
    ">Wybierz gotową postać<": ">{t('selectPremade')}<",
    ">Wybierz gotową<": ">{t('selectPremadeShort')}<",
    "hasSessionZero ? 'Powtórz Sesję Zero' : 'Uruchom Sesję Zero'": "hasSessionZero ? t('repeatS0') : t('runS0')",
    ">Rozpocznij Grę<": ">{t('startGame')}<",
    "'Wybierz przygodę i postać, aby rozpocząć grę'": "t('needBoth')",
    "'Wybierz przygodę, aby rozpocząć grę'": "t('needAdv')",
    "'Wybierz lub stwórz postać, aby rozpocząć grę'": "t('needChar')"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.tsx', 'w') as f:
    f.write(content)

