import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx', 'r') as f:
    content = f.read()

# Add hook import
if "useTranslations" not in content:
    content = content.replace("import { CampaignClock }", "import { useTranslations } from 'next-intl';\nimport { CampaignClock }")

# Change DEFAULT_TITLE variable context to hook
content = content.replace("const DEFAULT_TITLE = 'Tajemnica Biblioteki Miskatonic';", "")

content = re.sub(
    r'(export function ChatHeader\(\{.*?\}\s*:\s*ChatHeaderProps\)\s*\{)',
    r'\1\n  const t = useTranslations(\'ChatHeader\');\n  const DEFAULT_TITLE = t(\'defaultTitle\');',
    content,
    flags=re.DOTALL
)

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx', 'w') as f:
    f.write(content)

