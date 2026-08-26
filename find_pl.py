import re
import sys

def check_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find text inside tags or quotes
    # Just looking for Polish specific chars and checking if they are inside t('...')
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if re.search(r'[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]', line):
            if not 't(' in line and not '*' in line and not '//' in line:
                print(f"{filename}:{i+1}: {line.strip()}")

for arg in sys.argv[1:]:
    check_file(arg)
