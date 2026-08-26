import re

file_path = "_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.test.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("/changeAdv/i", "/Zmień przygodę/i")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
