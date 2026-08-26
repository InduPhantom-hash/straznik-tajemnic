import sys

with open('src/components/chat/narrative/cleanup.ts', 'r') as f:
    content = f.read()

old_dziennik = """    // Dziennik - wieloliniowy tag [DZIENNIK:typ:tytuł]treść[/DZIENNIK]
    .replace(/\\[DZIENNIK:[^\\]]*\\][\\s\\S]*?\\[\\/DZIENNIK\\]/gi, '')
    .replace(/\\[DZIENNIK:[^\\]]*\\]/gi, '')
    .replace(/\\[\\/DZIENNIK\\]/gi, '')"""

new_dziennik = """    // Dziennik - wieloliniowy tag [DZIENNIK:typ:tytuł]treść[/DZIENNIK] (teraz stempel)
    .replace(/\\[DZIENNIK:(?:@[^:]+:)?(?:[^:]+):([^\\]:]+)(?::[^\\]]+)?\\][\\s\\S]*?\\[\\/DZIENNIK\\]/gi, '\\n[SYSTEM_STAMP: 📜 Zapisano w aktach sprawy: $1]\\n')
    .replace(/\\[DZIENNIK:(?:@[^:]+:)?(?:[^:]+):([^\\]:]+)(?::[^\\]]+)?\\]/gi, '\\n[SYSTEM_STAMP: 📜 Zapisano w aktach sprawy: $1]\\n')
    .replace(/\\[\\/DZIENNIK\\]/gi, '')"""

content = content.replace(old_dziennik, new_dziennik)

old_lokacja = "    .replace(/\\[LOKACJA:[^\\]]*\\]/gi, '')"
new_lokacja = "    .replace(/\\[LOKACJA:\\s*(?:[^:]+):\\s*([^\\]]+)\\]/gi, '\\n[SYSTEM_STAMP: 📍 Odkryto lokację: $1]\\n')"

content = content.replace(old_lokacja, new_lokacja)

with open('src/components/chat/narrative/cleanup.ts', 'w') as f:
    f.write(content)
