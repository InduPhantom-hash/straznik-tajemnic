/**
 * Session Export - Character section formatter
 */

import { Character, getSkillValue } from '../types';

export function formatCharacterSection(char: Character): string {
  let md = `## 👤 Karta Postaci\n\n`;

  // Podstawowe info
  md += `### ${char.name}\n`;
  md += `**Zawód:** ${char.occupation || 'Badacz'}\n`;
  if (char.age) md += `**Wiek:** ${char.age} lat\n`;
  if (char.gender)
    md += `**Płeć:** ${char.gender === 'male' ? 'Mężczyzna' : 'Kobieta'}\n`;
  if (char.residence) md += `**Miejsce zamieszkania:** ${char.residence}\n`;
  if (char.birthplace) md += `**Miejsce urodzenia:** ${char.birthplace}\n`;
  md += `\n`;

  // Portret
  if (char.portraitUrl) {
    md += `![Portret postaci](${char.portraitUrl})\n\n`;
  }

  // Atrybuty
  md += `### Atrybuty\n\n`;
  md += `| Atrybut | Wartość | Atrybut | Wartość |\n`;
  md += `|---------|---------|---------|----------|\n`;
  md += `| SIŁ | ${char.str} | INT | ${char.int} |\n`;
  md += `| KON | ${char.con} | MOC | ${char.pow} |\n`;
  md += `| BC | ${char.siz} | ZRE | ${char.dex} |\n`;
  md += `| WYG | ${char.app} | WYK | ${char.edu} |\n`;
  md += `| **Szczęście** | ${char.luck} | | |\n\n`;

  // Punkty
  md += `### Stan\n\n`;
  md += `| Typ | Aktualne | Maksymalne |\n`;
  md += `|-----|----------|------------|\n`;
  md += `| ❤️ Punkty Życia | ${char.hp} | ${char.maxHp || '?'} |\n`;
  md += `| 🧠 Poczytalność | ${char.san} | ${char.maxSan || '?'} |\n`;
  md += `| ✨ Punkty Magii | ${char.mp} | ${char.maxMp || '?'} |\n\n`;

  if (char.move) md += `**Ruch:** ${char.move}\n`;
  if (char.damageBonus) md += `**Modyfikator obrażeń:** ${char.damageBonus}\n`;
  if (char.build !== undefined) md += `**Krzepa:** ${char.build}\n`;
  md += `\n`;

  // Umiejętności
  if (char.skills && Object.keys(char.skills).length > 0) {
    md += `### Umiejętności\n\n`;
    const sortedSkills = Object.entries(char.skills)
      .filter(([_, skillVal]) => getSkillValue(skillVal) > 0)
      .sort((a, b) => getSkillValue(b[1]) - getSkillValue(a[1]));

    md += `| Umiejętność | Wartość | Umiejętność | Wartość |\n`;
    md += `|-------------|---------|-------------|----------|\n`;

    for (let i = 0; i < sortedSkills.length; i += 2) {
      const skill1 = sortedSkills[i];
      const skill2 = sortedSkills[i + 1];
      const value1 = getSkillValue(skill1[1]);
      md += `| ${skill1[0]} | ${value1}% `;
      if (skill2) {
        const value2 = getSkillValue(skill2[1]);
        md += `| ${skill2[0]} | ${value2}% |\n`;
      } else {
        md += `| | |\n`;
      }
    }
    md += `\n`;
  }

  // Biografia
  if (char.backstory) {
    md += `### Biografia\n\n`;
    md += `${char.backstory}\n\n`;
  }

  // Cechy charakteru
  if (char.characterTraits) {
    md += `### Cechy charakteru\n\n`;
    const traits = char.characterTraits;
    if (traits.phobias?.length)
      md += `**Fobie:** ${traits.phobias.join(', ')}\n`;
    if (traits.manias?.length) md += `**Manie:** ${traits.manias.join(', ')}\n`;
    if (traits.beliefs?.length)
      md += `**Przekonania:** ${traits.beliefs.join(', ')}\n`;
    if (traits.habits?.length)
      md += `**Nawyki:** ${traits.habits.join(', ')}\n`;
    if (traits.quirks?.length)
      md += `**Dziwactwa:** ${traits.quirks.join(', ')}\n`;
    md += `\n`;
  }

  // Ważne informacje z backstory
  if (
    char.ideology ||
    char.significantPerson ||
    char.meaningfulLocation ||
    char.treasuredPossession
  ) {
    md += `### Powiązania\n\n`;
    if (char.ideology) md += `**Ideologia:** ${char.ideology}\n`;
    if (char.significantPerson)
      md += `**Ważna osoba:** ${char.significantPerson}\n`;
    if (char.meaningfulLocation)
      md += `**Znaczące miejsce:** ${char.meaningfulLocation}\n`;
    if (char.treasuredPossession)
      md += `**Cenny przedmiot:** ${char.treasuredPossession}\n`;
    md += `\n`;
  }

  md += `---\n\n`;
  return md;
}
