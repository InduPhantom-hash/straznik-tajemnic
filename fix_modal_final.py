import re

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'r') as f:
    content = f.read()

reps = [
    (r'>\s*Szybka Przygoda\s*<', '>{t(\'title\')}<'),
    (r'>\s*Strefa 11\s*<', '>{t(\'strefa11\')}<'),
    (r'>\s*Skonfiguruj sesję z programu Strefa 11\.\s+Wybierz tryb, scenariusz\s+oraz gotowych badaczy z zespołu telewizyjnego\.\s*<', '>{t(\'subtitle\')}<'),
    (r'>\s*1\. Wybierz tryb gry\s*<', '>{t(\'step1\')}<'),
    (r'>\s*Tryb Solo\s*<', '>{t(\'modeSolo\')}<'),
    (r'>\s*Hot Seat \(Duet\)\s*<', '>{t(\'modeDuet\')}<'),
    (r'>\s*2\. Wybierz scenariusz ze Strefy 11\s*<', '>{t(\'step2\')}<'),
    (r'>\s*3\. Wybierz postacie\s*<', '>{t(\'step3\')}<'),
    (r'>\s*Jeden gracz, jedna postać\s*<', '>{t(\'modeSoloDesc\')}<'),
    (r'>\s*Dwóch graczy na jednym urządzeniu\s*<', '>{t(\'modeDuetDesc\')}<'),
    (r'>\s*Biografia\s*<', '>{t(\'biography\')}<'),
]

for p, repl in reps:
    content = re.sub(p, repl, content, flags=re.IGNORECASE)

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx', 'w') as f:
    f.write(content)

