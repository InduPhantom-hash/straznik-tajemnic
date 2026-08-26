import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # Move 'use client' to the top if it exists
    if "'use client';" in content and not content.startswith("'use client';"):
        content = content.replace("'use client';\n", "")
        content = "'use client';\n" + content
    elif '"use client";' in content and not content.startswith('"use client";'):
        content = content.replace('"use client";\n', "")
        content = '"use client";\n' + content

    with open(path, 'w') as f:
        f.write(content)

fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/index.tsx')
fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.tsx')
fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx')
fix_file('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/welcome/components/start-mode-cards.tsx')

