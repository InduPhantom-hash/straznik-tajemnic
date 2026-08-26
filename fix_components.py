import re

def fix_file(path, hook, mapping, component_sig_start):
    with open(path, 'r') as f:
        content = f.read()

    # Add import
    if "useTranslations" not in content:
        content = content.replace("import { useState", "import { useTranslations } from 'next-intl';\nimport { useState")
        if "useTranslations" not in content:
            content = "import { useTranslations } from 'next-intl';\n" + content
    
    # Inject hook (simple string replace of the signature end)
    # We will find the component signature start, and right after `{` we inject the hook.
    # To do this safely:
    parts = content.split(component_sig_start)
    if len(parts) == 2:
        content = parts[0] + component_sig_start + f"\n  const t = useTranslations('{hook}');\n" + parts[1]

    # Replace strings
    for k, v in mapping.items():
        content = content.replace(k, v)

    with open(path, 'w') as f:
        f.write(content)


fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'QuickSetup', {
    ">SZYBKA PRZYGODA<": ">{t('title')}<",
    ">STREFA 11<": ">{t('strefa11')}<",
    ">Skonfiguruj sesję z programu Strefa 11. Wybierz tryb, scenariusz oraz gotowych badaczy z zespołu telewizyjnego.<": ">{t('subtitle')}<",
    ">1. WYBIERZ TRYB GRY<": ">{t('step1')}<",
    ">TRYB SOLO<": ">{t('modeSolo')}<",
    ">Jeden gracz, jedna postać<": ">{t('modeSoloDesc')}<",
    ">HOT SEAT (DUET)<": ">{t('modeDuet')}<",
    ">Dwóch graczy na jednym urządzeniu<": ">{t('modeDuetDesc')}<",
    ">2. WYBIERZ SCENARIUSZ ZE STREFY 11<": ">{t('step2')}<",
    ">3. WYBIERZ POSTACIE<": ">{t('step3')}<",
    "Gracz 1 (Główna Postać):": "{t('player1Label', { text: t('player1') })}",
    "Gracz 2 (Druga Postać):": "{t('player2Label', { text: t('player2') })}",
    "> Biografia": "> {t('biography')}",
    "{adv.title}": "{t(`adventures.${adv.id}.title`) || adv.title}",
    "{adv.description}": "{t(`adventures.${adv.id}.description`) || adv.description}",
    "{adv.eraLabel}": "{t(`adventures.${adv.id}.eraLabel`) || adv.eraLabel}",
    "{c.occupation}": "{t(`characters.${c.id}.occupation`) || c.occupation}",
    ">Rozpocznij przygodę<": ">{t('start')}<",
    "Rozpocznij przygodę\n": "{t('start')}\n"
}, "}: QuickSetupModalProps) {")

fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.tsx', 'ManualSetupPanel', {
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
}, "}) => {") # this is risky, let's specify more. Wait, I'll pass a safer split string.

