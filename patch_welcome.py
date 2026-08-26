import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'r') as f:
    content = f.read()

# Make sure imports exist
if "useTranslations" not in content:
    content = "import { useTranslations } from 'next-intl';\n" + content

# Insert the hook inside WelcomeScreen
content = re.sub(
    r'(export const WelcomeScreen: FC<WelcomeScreenProps> = \(\{.*?\}\) => \{)',
    r'\1\n  const t = useTranslations(\'WelcomeScreen\');',
    content,
    flags=re.DOTALL
)

# Text replacements
content = content.replace("Wirtualny Mistrz Gry", "{t('subtitle')}")
content = content.replace("Strażnik\n          <br />\n          Tajemnic", "{t('titlePart1')}\n          <br />\n          {t('titlePart2')}")
# Wznów grę in ResumeCard
content = re.sub(
    r'(export const ResumeCard: FC<ResumeCardProps> = \(\{.*?\}\) => \{)',
    r'\1\n  const t = useTranslations(\'WelcomeScreen\');',
    content,
    flags=re.DOTALL
)
content = content.replace("Wznów grę", "{t('resume')}")
content = content.replace("wpisów", "{t('messages')}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'w') as f:
    f.write(content)

