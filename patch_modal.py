import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'r') as f:
    content = f.read()

# Add import if missing
if "useTranslations" not in content:
    content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslations } from 'next-intl';")

# Add hook inside component
if "const t = useTranslations('QuickSetup');" not in content:
    content = content.replace("export function QuickSetupModal({", "export function QuickSetupModal({\n  open,\n  onOpenChange,\n  onQuickStart,\n}: QuickSetupModalProps) {\n  const t = useTranslations('QuickSetup');\n\n  // Dostępne scenariusze i postacie", 1)
    # Remove the duplicated arguments if they were replaced incorrectly. Wait, I should be careful. Let's just do a standard regex.
    
    # Actually, a better approach:
    content = re.sub(
        r'(export function QuickSetupModal\(\{.*?\}\: QuickSetupModalProps\) \{)',
        r'\1\n  const t = useTranslations(\'QuickSetup\');',
        content,
        flags=re.DOTALL
    )

# Replacements
content = content.replace(">SZYBKA PRZYGODA<", ">{t('title')}<")
content = content.replace(">STREFA 11<", ">{t('strefa11')}<")
content = content.replace(">Skonfiguruj sesję z programu Strefa 11. Wybierz tryb, scenariusz oraz gotowych badaczy z zespołu telewizyjnego.<", ">{t('subtitle')}<")

content = content.replace(">1. WYBIERZ TRYB GRY<", ">{t('step1')}<")
content = content.replace(">TRYB SOLO<", ">{t('modeSolo')}<")
content = content.replace(">Jeden gracz, jedna postać<", ">{t('modeSoloDesc')}<")
content = content.replace(">HOT SEAT (DUET)<", ">{t('modeDuet')}<")
content = content.replace(">Dwóch graczy na jednym urządzeniu<", ">{t('modeDuetDesc')}<")

content = content.replace(">2. WYBIERZ SCENARIUSZ ZE STREFY 11<", ">{t('step2')}<")

content = content.replace(">3. WYBIERZ POSTACIE<", ">{t('step3')}<")
content = content.replace(">Twoja Postać:<", ">{t('player1')}:<")

# Be careful with variables in translation:
content = content.replace("Gracz 1 (Twoja Postać):", "{t('player1Label', { text: t('player1') })}")
content = content.replace("Gracz 2 (Druga Postać):", "{t('player2Label', { text: t('player2') })}")

content = content.replace("> Biografia", "> {t('biography')}")
content = content.replace(">Rozpocznij przygodę<", ">{t('start')}<")
content = content.replace("Rozpocznij przygodę", "{t('start')}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'w') as f:
    f.write(content)

