import sys

with open('src/components/chat/narrative/parse-sections.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == '// Wykryj szept/informację meta (w nawiasach kwadratowych)':
        new_lines.extend([
            "    // Wykryj stempel powiadomień\n",
            "    if (trimmedLine.match(/^\\[SYSTEM_STAMP:/i) && trimmedLine.endsWith(']')) {\n",
            "      if (currentSection && currentSection.content.trim()) {\n",
            "        sections.push(currentSection);\n",
            "      }\n",
            "      sections.push({\n",
            "        type: 'system_stamp',\n",
            "        content: trimmedLine.substring(14, trimmedLine.length - 1).trim(),\n",
            "      });\n",
            "      currentSection = null;\n",
            "      continue;\n",
            "    }\n\n",
            "    // Wykryj szept/informację meta (w nawiasach kwadratowych)\n"
        ])
    elif line.strip() == '!trimmedLine.match(/^\\[(RZUT|TEST|WYNIK)/i)':
        new_lines.append(line.replace('RZUT|TEST|WYNIK', 'RZUT|TEST|WYNIK|SYSTEM_STAMP'))
    else:
        new_lines.append(line)

with open('src/components/chat/narrative/parse-sections.ts', 'w') as f:
    f.writelines(new_lines)
