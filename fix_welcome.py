with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'r') as f:
    content = f.read()

if "useTranslations" not in content:
    content = "import { useTranslations } from 'next-intl';\n" + content

parts = content.split("}) => {\n  const [quote]")
if len(parts) == 2:
    content = parts[0] + "}) => {\n  const t = useTranslations('WelcomeScreen');\n  const [quote]" + parts[1]

content = content.replace("Wirtualny Mistrz Gry", "{t('subtitle')}")
content = content.replace("Strażnik\n          <br />\n          Tajemnic", "{t('titlePart1')}\n          <br />\n          {t('titlePart2')}")

# For ResumeCard
parts = content.split("}) => (\n  <div")
if len(parts) == 2:
    content = parts[0] + "}) => {\n  const t = useTranslations('WelcomeScreen');\n  return (\n  <div" + parts[1].replace("</div>\n);", "</div>\n);\n}")

content = content.replace(">Wznów grę<", ">{t('resume')}<")
content = content.replace(" wpisów<", " {t('messages')}<")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx', 'w') as f:
    f.write(content)

