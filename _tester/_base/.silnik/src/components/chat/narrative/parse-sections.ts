/**
 * NarrativeFormatter parser - IND-144 micro 3/8 (extract z NarrativeFormatter.tsx)
 *
 * State machine parser dla 7 typów sekcji: handout (multi-line ASCII art / 📰📜...),
 * dialogue (cudzysłowy + speaker), roll ([RZUT/TEST/WYNIK]), whisper (meta [text]),
 * perspective (@ImięPostaci: text), narrative (catch-all).
 *
 * Helpers (isHandoutStart/isHandoutEnd/detectHandoutType) prywatne dla modułu.
 */

import type { Section, HandoutType } from './types';

export function parseIntoSections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;
  let handoutBuffer: string[] = [];
  let inHandout = false;
  let handoutType: HandoutType = 'note';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Wykryj początek handoutu (ASCII art borders, nagłówki prasowe, etc.)
    if (isHandoutStart(trimmedLine)) {
      // Zapisz poprzednią sekcję
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      inHandout = true;
      handoutType = detectHandoutType(trimmedLine);
      handoutBuffer = [line];
      currentSection = null;
      continue;
    }

    // Wykryj koniec handoutu
    if (inHandout && isHandoutEnd(trimmedLine)) {
      handoutBuffer.push(line);
      const joined = handoutBuffer.join('\n');
      const audioMatch = joined.match(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*([^\]]+)\]/i);
      const cleanedContent = audioMatch ? joined.replace(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*[^\]]+\]/gi, '').trim() : joined;
      sections.push({
        type: 'handout',
        content: cleanedContent,
        handoutType: handoutType,
        audioUrl: audioMatch ? audioMatch[1].trim() : undefined,
      });
      inHandout = false;
      handoutBuffer = [];
      continue;
    }

    // Kontynuuj handout
    if (inHandout) {
      handoutBuffer.push(line);
      continue;
    }

    // Wykryj dialog NPC ("Mówi:", cytaty). Boolean test - speaker/text extraction
    // wykonuje speakerMatch poniżej (lin ~85), captures z tych 3 regexów nie używane.
    const isDialogue =
      /^[\u201E\u201C\u201D\u0022].+?[\u201E\u201C\u201D\u0022](?:\s*[\u2014\u2013-]\s*.+)?$/.test(
        trimmedLine
      ) ||
      /^.+?:\s*[\u201E\u201C\u201D\u0022].+?[\u201E\u201C\u201D\u0022]$/.test(
        trimmedLine
      ) ||
      /^[\u2014\u2013-]\s*.+$/.test(trimmedLine);

    if (isDialogue || /^[\u201E\u201C\u201D\u0022]/.test(trimmedLine)) {
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }

      // Wyodrębnij mówcę jeśli możliwe
      let speaker = '';
      let dialogueText = trimmedLine;

      const speakerMatch = trimmedLine.match(
        /^(.+?):\s*[\u201E\u201C\u201D\u0022](.+)[\u201E\u201C\u201D\u0022]$/
      );
      if (speakerMatch) {
        speaker = speakerMatch[1];
        dialogueText = speakerMatch[2];
      }

      sections.push({
        type: 'dialogue',
        content: dialogueText,
        speaker: speaker,
      });
      currentSection = null;
      continue;
    }

    // Wykryj sekcję mechaniczną [RZUT], [TEST], etc.
    if (
      trimmedLine.match(/^\[RZUT[:\s]/i) ||
      trimmedLine.match(/^\[TEST[:\s]/i) ||
      trimmedLine.match(/^\[WYNIK[:\s]/i)
    ) {
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      sections.push({
        type: 'roll',
        content: trimmedLine,
      });
      currentSection = null;
      continue;
    }

    // Wykryj szept/informację meta (w nawiasach kwadratowych)
    if (
      trimmedLine.startsWith('[') &&
      trimmedLine.endsWith(']') &&
      !trimmedLine.match(/^\[(RZUT|TEST|WYNIK)/i)
    ) {
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      sections.push({
        type: 'whisper',
        content: trimmedLine.slice(1, -1),
      });
      currentSection = null;
      continue;
    }

    // Wykryj perspektywę postaci @ImięPostaci: tekst
    const perspectiveMatch = trimmedLine.match(/^@([^:]+):\s*(.*)$/);
    if (perspectiveMatch) {
      // Zapisz poprzednią sekcję
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      // Rozpocznij nową sekcję perspektywy
      currentSection = {
        type: 'perspective',
        content: perspectiveMatch[2] || '',
        characterName: perspectiveMatch[1].trim(),
      };
      continue;
    }

    // Normalna narracja
    if (!currentSection) {
      currentSection = { type: 'narrative', content: '' };
    }
    // Jeśli jesteśmy w sekcji perspective, kontynuuj dodawanie treści
    currentSection.content += (currentSection.content ? '\n' : '') + line;
  }

  // Dodaj ostatnią sekcję
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }

  // Jeśli zostały linie w handoutBuffer
  if (handoutBuffer.length > 0) {
    const joined = handoutBuffer.join('\n');
    const audioMatch = joined.match(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*([^\]]+)\]/i);
    const cleanedContent = audioMatch ? joined.replace(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*[^\]]+\]/gi, '').trim() : joined;
    sections.push({
      type: 'handout',
      content: cleanedContent,
      handoutType: handoutType,
      audioUrl: audioMatch ? audioMatch[1].trim() : undefined,
    });
  }

  return sections;
}

function isHandoutStart(line: string): boolean {
  // IND-224: tagi protokołu (DZIENNIK:typ:..., MYŚLI_MG:, NASTRÓJ:, CEL_NARRACYJNY:)
  // to NIE handouty. "DZIENNIK" jest aliasem gazety (H9), więc bare/niedomknięty tag
  // mylił parser → fałszywy "WYCINEK PRASOWY" + surowe tagi w środku. Protokół ma ':'
  // tuż po słowie-kluczu; tytuł gazety ("Dziennik Polski") ma spację, więc nietknięty.
  if (/^\[?(?:DZIENNIK|MYŚLI_MG|NASTRÓJ|CEL_NARRACYJNY)\s*:/i.test(line))
    return false;
  // ASCII art borders
  if (line.match(/^[━═─╔╗╚╝┌┐└┘│║╠╣╦╩╬+=\-_*~]{5,}$/)) return true;
  // Nagłówki prasowe
  if (
    line.match(
      /^📰|^📜|^✉️|^📋|^📧|^TELEGRAM|^KURIER|^DZIENNIK|^ARKHAM ADVERTISER/i
    )
  )
    return true;
  // Bloki kodu markdown
  if (line.startsWith('```')) return true;
  return false;
}

function isHandoutEnd(line: string): boolean {
  if (line.match(/^[━═─╔╗╚╝┌┐└┘│║╠╣╦╩╬+=\-_*~]{5,}$/)) return true;
  if (line.startsWith('```') && line.length <= 5) return true;
  return false;
}

export function detectHandoutType(line: string): HandoutType {
  // diary PRZED newspaper - "DZIENNIK" matchuje newspaper (PL alias gazety jak "Dziennik Polski"),
  // diary używa innych słów (emoji 📓, EN: DIARY/JOURNAL, PL: PAMIĘTNIK/NOTATNIK).
  if (line.match(/📓|DIARY|JOURNAL|PAMIĘTNIK|NOTATNIK/i)) return 'diary';
  if (line.match(/📰|KURIER|DZIENNIK|ADVERTISER|NEWSPAPER|TIMES|GAZETTE/i))
    return 'newspaper';
  if (line.match(/✉️|LIST|LETTER|DEAR|DROGI|SZANOWN/i)) return 'letter';
  if (line.match(/📧|TELEGRAM|WESTERN UNION|STOP\s|URG/i)) return 'telegram';
  if (line.match(/📋|RAPORT|REPORT|POLICE|POLICJA|PROTOKÓŁ/i)) return 'report';
  if (line.match(/📜|KSIĘGA|NECRONOMICON|TOME|MANUSCR/i)) return 'book';
  return 'note';
}
