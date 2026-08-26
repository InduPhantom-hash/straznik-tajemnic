import re

file_path = "_tester/_base/.silnik/src/components/chat/welcome/components/manual-setup-panel.test.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Zastąp poszukiwania
content = content.replace("/Zmień przygodę/i", "/changeAdv/i")
content = content.replace("expect(screen.getByText('Nie wybrano przygody')).toBeInTheDocument();", "expect(screen.getByText('Nie wybrano przygody')).toBeInTheDocument();")
# Actually, wait, let's just use "changeAdv" literally if it's a regex.

# We also need to fix "Rozpocznij Grę" in the mock? Wait, startGame is mocked in jest.setup.ts.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
