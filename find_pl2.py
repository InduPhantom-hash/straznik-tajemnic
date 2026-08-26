import re
import sys
import glob

def check_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.finditer(r'>\s*([^<{}]+?)\s*<', content)
    for m in matches:
        text = m.group(1).strip()
        if len(text) > 2 and not text.startswith('t(') and not text.startswith('const'):
            if re.search(r'[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]', text):
                print(f"{filename}: {text}")

for file in glob.glob('_tester/_base/.silnik/src/components/chat/welcome/**/*.tsx', recursive=True):
    check_file(file)
