import re

def safe_replace(filepath, mapping):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for k, v in mapping.items():
        content = content.replace(k, v)
        
    with open(filepath, 'w') as f:
        f.write(content)

# 1. start-mode-cards.tsx (already fixed earlier, but let's re-fix since it might have been reverted? wait, I didn't checkout start-mode-cards! Let me verify if it needs checkout. No, it wasn't in the git checkout command.)

# 2. quick-setup-modal.tsx
safe_replace('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', {
    "import { useState } from 'react';": "import { useState } from 'react';\nimport { useTranslations } from 'next-intl';",
    "export function QuickSetupModal({\n  open,\n  onOpenChange,\n  onQuickStart,\n}: QuickSetupModalProps) {": "export function QuickSetupModal({\n  open,\n  onOpenChange,\n  onQuickStart,\n}: QuickSetupModalProps) {\n  const t = useTranslations('QuickSetup');",
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
    "Gracz 1 (Twoja Postać):": "{t('player1Label', { text: t('player1') })}",
    "Gracz 1 (Główna Postać):": "{t('player1Label', { text: t('player1') })}",
    "Gracz 2 (Druga Postać):": "{t('player2Label', { text: t('player2') })}",
    "> Biografia": "> {t('biography')}",
    "{adv.title}": "{t(`adventures.${adv.id}.title`)}",
    "{adv.description}": "{t(`adventures.${adv.id}.description`)}",
    "{adv.eraLabel}": "{t(`adventures.${adv.id}.eraLabel`)}",
    "{c.occupation}": "{t(`characters.${c.id}.occupation`)}",
    ">Rozpocznij przygodę<": ">{t('start')}<",
    "Rozpocznij przygodę\n": "{t('start')}\n"
})

# 3. index.tsx (welcome)
safe_replace('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', {
    "import { useState, useEffect } from 'react';": "import { useState, useEffect } from 'react';\nimport { useTranslations } from 'next-intl';",
    "export const WelcomeScreen: FC<WelcomeScreenProps> = ({": "export const WelcomeScreen: FC<WelcomeScreenProps> = ({\n  onUploadRules,",
    "onUploadRules,": "  const t = useTranslations('WelcomeScreen');\n  // @ts-ignore\n  const temp = onUploadRules;", 
    # ^ wait, this is hacky. Let's do it better:
})

