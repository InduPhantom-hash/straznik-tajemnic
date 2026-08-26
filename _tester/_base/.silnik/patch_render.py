import sys

with open('src/components/chat/narrative/render-sections.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "case 'perspective':":
        new_lines.extend([
            "    case 'system_stamp':\n",
            "      return (\n",
            "        <div key={key} className=\"my-4 flex items-center justify-center\">\n",
            "          <div className=\"bg-amber-900/40 border border-amber-600/50 shadow-sm rounded-full px-4 py-1.5 flex items-center gap-2\">\n",
            "            <span className=\"text-amber-500 font-serif italic text-sm\">\n",
            "              {section.content}\n",
            "            </span>\n",
            "          </div>\n",
            "        </div>\n",
            "      );\n\n"
        ])
        new_lines.append(line)
    else:
        new_lines.append(line)

with open('src/components/chat/narrative/render-sections.tsx', 'w') as f:
    f.writelines(new_lines)
