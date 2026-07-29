import glob
import re

files = glob.glob("/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/**/*.tsx", recursive=True)

import_stmt = "import { SafeImage } from '@/components/ui/safe-image';\n"

for file_path in files:
    if "safe-image.tsx" in file_path:
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if import_stmt in content:
        content = content.replace(import_stmt, '')
        
        if "'use client'" in content or '"use client"' in content:
            content = re.sub(r'([\'"]use client[\'"];?\s*\n)', r'\1' + import_stmt, content, count=1)
        else:
            content = import_stmt + content
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")
