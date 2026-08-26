import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'r') as f:
    content = f.read()

# Add hook import
if "useTranslations" not in content:
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { useTranslations } from 'next-intl';")
    content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslations } from 'next-intl';")
    if "useTranslations" not in content:
        # Just put it at the very top
        content = "import { useTranslations } from 'next-intl';\n" + content

# Inject hook in ResumeCard if needed (it has 'Wznów grę', 'NIEZNANY', 'Wiadomości', 'Obrazy')
# But let's focus on WelcomeScreen for now.
content = re.sub(
    r'(export const WelcomeScreen: FC<WelcomeScreenProps> = \(\{.*?\}\) => \{)',
    r'\1\n  const t = useTranslations(\'WelcomeScreen\');',
    content,
    flags=re.DOTALL
)

# And let's replace "Wirtualny Mistrz Gry"
content = content.replace(">Wirtualny Mistrz Gry<", ">{t('subtitle')}<")
content = content.replace("Strażnik Tajemnic", "{t('title')}") # Wait, "Strażnik\n<br />\nTajemnic" is split!
content = content.replace("Strażnik\n          <br />\n          Tajemnic", "{t('titlePart1')}\n          <br />\n          {t('titlePart2')}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'w') as f:
    f.write(content)

