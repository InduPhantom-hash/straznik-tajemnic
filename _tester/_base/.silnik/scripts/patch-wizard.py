with open('src/components/ui/character-wizard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "        `ARCHETYP: ${selectedArchetype.name} - ${selectedArchetype.description}`",
    "        `ARCHETYP: ${t(\"archetypes.\" + selectedArchetype.id + \".name\")} - ${t(\"archetypes.\" + selectedArchetype.id + \".description\")}`"
)

content = content.replace(
    "${archetypeSkills.length > 0 ? `KLUCZOWE UMIEJĘTNOŚCI ARCHETYPU \"${selectedArchetype?.name}\": ${archetypeSkills.join(', ')}` : ''}",
    "${archetypeSkills.length > 0 ? `KLUCZOWE UMIEJĘTNOŚCI ARCHETYPU \"${selectedArchetype ? t(\"archetypes.\" + selectedArchetype.id + \".name\") : ''}\": ${archetypeSkills.join(', ')}` : ''}"
)

content = content.replace(
    "        ? `${selectedArchetype.name}: ${selectedArchetype.description}`",
    "        ? `${t(\"archetypes.\" + selectedArchetype.id + \".name\")}: ${t(\"archetypes.\" + selectedArchetype.id + \".description\")}`"
)

content = content.replace(
    "              {selectedArchetype.icon} {selectedArchetype.name}",
    "              {selectedArchetype.icon} {t(\"archetypes.\" + selectedArchetype.id + \".name\")}"
)

content = content.replace(
    "              {selectedArchetype.description}",
    "              {t(\"archetypes.\" + selectedArchetype.id + \".description\")}"
)

with open('src/components/ui/character-wizard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
