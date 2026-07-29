import os
import re
import glob

files = glob.glob("/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/**/*.tsx", recursive=True)

for file_path in files:
    if "safe-image.tsx" in file_path:
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Remove eslint-disable comments for img
    content = re.sub(r'\{\s*/\*\s*eslint-disable-next-line @next/next/no-img-element.*?\*/\s*\}\n\s*', '', content)
    content = re.sub(r'//\s*eslint-disable-next-line @next/next/no-img-element.*?\n\s*', '', content)
    
    # Replace onError blocks
    content = re.sub(r'onError=\{\(e\) => \{\s*e\.currentTarget\.onerror = null;\s*\(e\.target as HTMLImageElement\)\.src = \'[^\']+\';\s*\}\}', '', content)
    
    # Replace <img with <SafeImage
    content = re.sub(r'<img([\s\n])', r'<SafeImage\1', content)
    
    if content != original_content:
        # Add import if missing
        if "SafeImage" not in original_content:
            import_stmt = "import { SafeImage } from '@/components/ui/safe-image';\n"
            # Insert after the last import
            last_import = content.rfind("import ")
            if last_import != -1:
                end_of_line = content.find("\n", last_import)
                content = content[:end_of_line+1] + import_stmt + content[end_of_line+1:]
            else:
                content = import_stmt + content

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified {file_path}")
