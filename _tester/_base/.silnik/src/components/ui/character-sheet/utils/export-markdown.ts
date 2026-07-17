/**
 * CharacterSheet - export markdown helper (IND-185 M2, sesja 132).
 *
 * Pure function generująca Markdown karty postaci + trigger download
 * przez Blob + URL.createObjectURL + a.click. Wycięte z character-sheet.tsx
 * (sekcja `handleExportMarkdown` lin 73-165).
 *
 * Side effects (DOM API): document.createElement('a'), a.click(),
 * URL.createObjectURL, URL.revokeObjectURL. To NIE jest pure - operuje
 * na DOM. Testowane przez polyfill jsdom URL.createObjectURL (CS5).
 */

import { getSkillValue, type Character } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import {
  isWeapon,
  inferWeaponSkill,
  isMeleeWeapon,
} from '@/lib/combat/weapon-context';

const FILENAME_SANITIZE_REGEX = /[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;

/**
 * Buduje string Markdown z całej karty postaci (cechy, stan, walka,
 * umiejętności, historia, cechy psychologiczne) i triggeruje download
 * pliku `<name>_karta.md` przez Blob.
 *
 * Side effects: tworzy `<a>` element, kliknięcie, revoke object URL.
 * Nie zwraca nic (void). Bezpieczne wywołanie 0/1 razów per akcja.
 */
export function exportCharacterToMarkdown(character: Character): void {
  const stats = {
    str: character.str || 50,
    con: character.con || 50,
    siz: character.siz || 50,
    dex: character.dex || 50,
    app: character.app || 50,
    int: character.int || 50,
    pow: character.pow || 50,
    edu: character.edu || 50,
  };
  const maxHp = character.maxHp || Math.floor((stats.con + stats.siz) / 10);
  const maxSan = character.maxSan || stats.pow;
  const maxMp = character.maxMp || Math.floor(stats.pow / 5);

  let md = `# ${character.name}\n\n`;
  md += `**Zawód:** ${character.occupation || '-'}  \n`;
  md += `**Wiek:** ${character.age || '-'}  \n`;
  md += `**Płeć:** ${character.gender === 'male' ? 'Mężczyzna' : character.gender === 'female' ? 'Kobieta' : '-'}  \n\n`;

  md += `## 📊 Cechy\n\n`;
  md += `| SIŁ | KON | BUD | ZRĘ | WYG | INT | MOC | WYK |\n`;
  md += `|-----|-----|-----|-----|-----|-----|-----|-----|\n`;
  md += `| ${stats.str} | ${stats.con} | ${stats.siz} | ${stats.dex} | ${stats.app} | ${stats.int} | ${stats.pow} | ${stats.edu} |\n\n`;

  md += `## 💓 Stan\n\n`;
  md += `- **PŻ:** ${character.hp || maxHp}/${maxHp}\n`;
  md += `- **PR:** ${character.san || maxSan}/${maxSan}\n`;
  md += `- **PM:** ${character.mp || maxMp}/${maxMp}\n`;
  md += `- **Szczęście:** ${character.luck || 50}\n\n`;

  md += `## ⚔️ Walka\n\n`;
  md += `- **Bonus DMG:** ${character.damageBonus || '+0'}\n`;
  md += `- **Krzepa:** ${character.build || 0}\n`;
  md += `- **Ruch:** ${character.move || 8}\n\n`;

  // Umiejętności
  if (character.skills && Object.keys(character.skills).length > 0) {
    md += `## 📚 Umiejętności\n\n`;
    Object.entries(character.skills)
      .sort(([a], [b]) => a.localeCompare(b, 'pl'))
      .forEach(([skill, value]) => {
        const isOcc = character.occupationalSkills?.includes(skill);
        // value bywa obiektem SkillData po Fazie Rozwoju - getSkillValue odpakowuje
        // (inaczej "[object Object]%" w eksporcie).
        md += `- ${isOcc ? '★ ' : ''}${skill}: **${getSkillValue(value)}%**\n`;
      });
    md += '\n';
  }

  // Ekwipunek (broń z pełną statystyką + wyposażenie)
  const equipment = character.equipment ?? [];
  if (equipment.length > 0) {
    const dmgBonus = character.damageBonus?.trim();
    const hasDb = Boolean(dmgBonus) && dmgBonus !== '0' && dmgBonus !== '-';
    const weapons = equipment.filter(isWeapon);
    const gear = equipment.filter((item) => !isWeapon(item));

    md += `## 🎒 Ekwipunek\n\n`;
    if (weapons.length > 0) {
      md += `### ⚔️ Broń\n\n`;
      md += `| Broń | Umiejętność | Obrażenia | Zasięg | Zacięcie |\n`;
      md += `|------|-------------|-----------|--------|----------|\n`;
      weapons.forEach((w) => {
        const skill = inferWeaponSkill(w);
        const skillVal = resolveTestValue(skill, character);
        const skillStr = `${skill} ${skillVal !== null ? `${skillVal}%` : 'baza'}`;
        const damage = w.modifiers?.damage ?? '-';
        const damageStr =
          isMeleeWeapon(w) && hasDb ? `${damage} ${dmgBonus}` : damage;
        md += `| ${w.name} | ${skillStr} | ${damageStr} | ${w.modifiers?.range || '-'} | ${w.modifiers?.malfunction || '-'} |\n`;
      });
      md += '\n';
    }
    if (gear.length > 0) {
      md += `### 🎒 Wyposażenie\n\n`;
      gear.forEach((item) => {
        md += `- ${item.name}${item.description ? ` - ${item.description}` : ''}\n`;
      });
      md += '\n';
    }
  }

  // Historia
  if (
    character.ideology ||
    character.significantPerson ||
    character.background
  ) {
    md += `## 📖 Historia i Tożsamość\n\n`;
    if (character.ideology) md += `**Ideologia:** ${character.ideology}\n\n`;
    if (character.significantPerson)
      md += `**Ważna osoba:** ${character.significantPerson}\n\n`;
    if (character.meaningfulLocation)
      md += `**Znaczące miejsce:** ${character.meaningfulLocation}\n\n`;
    if (character.treasuredPossession)
      md += `**Cenny przedmiot:** ${character.treasuredPossession}\n\n`;
    if (character.background) md += `**Tło:** ${character.background}\n\n`;
  }

  // Cechy psychologiczne
  if (character.characterTraits) {
    md += `## 🧠 Cechy Psychologiczne\n\n`;
    if (character.characterTraits.phobias?.length)
      md += `**Fobie:** ${character.characterTraits.phobias.join(', ')}\n`;
    if (character.characterTraits.manias?.length)
      md += `**Manie:** ${character.characterTraits.manias.join(', ')}\n`;
    if (character.characterTraits.beliefs?.length)
      md += `**Przekonania:** ${character.characterTraits.beliefs.join(', ')}\n`;
    md += '\n';
  }

  md += `---\n*Eksportowano z Zew Cthulhu App - ${new Date().toLocaleString('pl-PL')}*\n`;

  // Pobierz plik
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character.name.replace(FILENAME_SANITIZE_REGEX, '_')}_karta.md`;
  a.click();
  URL.revokeObjectURL(url);
}
