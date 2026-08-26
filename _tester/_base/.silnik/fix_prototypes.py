import sys
for file in ["src/app/[locale]/prototypes/cutscene/page.tsx", "src/app/[locale]/prototypes/page.tsx"]:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("  const t = useTranslations('Page');\n  return (\n", "", 1)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
