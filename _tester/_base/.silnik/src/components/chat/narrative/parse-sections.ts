/**
 * NarrativeFormatter parser - IND-144 micro 3/8 (extract z NarrativeFormatter.tsx)
 *
 * State machine parser dla 7 typów sekcji: handout (multi-line ASCII art / 📰📜...),
 * dialogue (cudzysłowy + speaker), roll ([RZUT/TEST/WYNIK]), whisper (meta [text]),
 * perspective (@ImięPostaci: text), narrative (catch-all).
 *
 * Helpers (isHandoutStart/isHandoutEnd/detectHandoutType) prywatne dla modułu.
 */

import type { Section, HandoutType, StickyNote } from './types';

export function parseStickyNote(raw: string): { stickyNote?: StickyNote; cleaned: string } {
  const match = raw.match(/\[(?:NOTATKA_BADACZA|STICKY_NOTE|INVESTIGATOR_NOTE):\s*([\s\S]*?)\]/i);
  if (!match) {
    return { cleaned: raw };
  }

  const body = match[1].trim();
  const delimiter = body.includes('|') ? '|' : '\n';
  const parts = body.split(delimiter);
  let who = '';
  let about = '';
  let clue = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const ktoMatch = trimmed.match(/^(?:Kto|Nadawca|Autor|Who|Author|Sender):\s*(.+)$/i);
    const dotyczyMatch = trimmed.match(/^(?:Dotyczy|Temat|Czego dotyczy|About|Subject|Topic):\s*(.+)$/i);
    const tropMatch = trimmed.match(/^(?:Trop|Zagrożenie|Zagrozenie|Wskazówka|Wskazowka|Klucz|Clue|Threat|Lead):\s*(.+)$/i);

    if (ktoMatch) who = ktoMatch[1].trim();
    else if (dotyczyMatch) about = dotyczyMatch[1].trim();
    else if (tropMatch) clue = tropMatch[1].trim();
    else {
      if (!who) who = trimmed;
      else if (!about) about = trimmed;
      else if (!clue) clue = trimmed;
    }
  }

  const cleaned = raw.replace(/\[(?:NOTATKA_BADACZA|STICKY_NOTE|INVESTIGATOR_NOTE):\s*[\s\S]*?\]/gi, '').trim();
  return {
    stickyNote: { who, about, clue },
    cleaned,
  };
}

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

    // Wykryj koniec lub kontynuację aktywnego handoutu
    if (inHandout) {
      const isInitialStickyOnly =
        handoutBuffer.length === 1 &&
        /^\[?(?:NOTATKA_BADACZA|STICKY_NOTE|INVESTIGATOR_NOTE)/i.test(handoutBuffer[0].trim());

      if (!isInitialStickyOnly && (isHandoutEnd(trimmedLine) || isHandoutTerminator(trimmedLine))) {
        if (isHandoutEnd(trimmedLine)) {
          handoutBuffer.push(line);
        }
        const joined = handoutBuffer.join('\n');
        const audioMatch = joined.match(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*([^\]]+)\]/i);
        const imageMatch = joined.match(/\[(?:IMAGE|OBRAZ|SKAN|FOTO|GRAFIKA):\s*([^\]]+)\]/i);
        let cleanedContent = joined;
        if (audioMatch) {
          cleanedContent = cleanedContent.replace(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*[^\]]+\]/gi, '');
        }
        if (imageMatch) {
          cleanedContent = cleanedContent.replace(/\[(?:IMAGE|OBRAZ|SKAN|FOTO|GRAFIKA):\s*[^\]]+\]/gi, '');
        }
        const { stickyNote, cleaned } = parseStickyNote(cleanedContent);
        cleanedContent = cleaned.trim();
        sections.push({
          type: 'handout',
          content: cleanedContent,
          handoutType: handoutType,
          stickyNote,
          audioUrl: audioMatch ? audioMatch[1].trim() : undefined,
          imageUrl: imageMatch ? imageMatch[1].trim() : undefined,
        });
        inHandout = false;
        handoutBuffer = [];
        if (!isHandoutEnd(trimmedLine)) {
          i--; // ponów parsowanie linii jako start nowej sekcji
        }
        continue;
      }

      // Jeśli początkowy typ to 'note' (np. od ramki ASCII), spróbuj doprecyzować z nagłówka
      if (handoutType === 'note') {
        const detected = detectHandoutType(trimmedLine);
        if (detected !== 'note') {
          handoutType = detected;
        }
      }

      handoutBuffer.push(line);
      continue;
    }

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
    const imageMatch = joined.match(/\[(?:IMAGE|OBRAZ|SKAN|FOTO|GRAFIKA):\s*([^\]]+)\]/i);
    let cleanedContent = joined;
    if (audioMatch) {
      cleanedContent = cleanedContent.replace(/\[(?:AUDIO|NAGRANIE|DŹWIĘK|DZWIEK):\s*[^\]]+\]/gi, '');
    }
    if (imageMatch) {
      cleanedContent = cleanedContent.replace(/\[(?:IMAGE|OBRAZ|SKAN|FOTO|GRAFIKA):\s*[^\]]+\]/gi, '');
    }
    const { stickyNote, cleaned } = parseStickyNote(cleanedContent);
    cleanedContent = cleaned.trim();
    sections.push({
      type: 'handout',
      content: cleanedContent,
      handoutType: handoutType,
      stickyNote,
      audioUrl: audioMatch ? audioMatch[1].trim() : undefined,
      imageUrl: imageMatch ? imageMatch[1].trim() : undefined,
    });
  }

  return sections;
}

function isHandoutStart(line: string): boolean {
  // IND-224: tagi protokołu (DZIENNIK:typ:..., MYŚLI_MG:, NASTRÓJ:, CEL_NARRACYJNY:)
  // to NIE handouty. "DZIENNIK" jest aliasem gazety (H9), więc bare/niedomknięty tag
  // mylił parser → fałszywy "WYCINEK PRASOWY" + surowe tagi w środku. Protokół ma ':'
  // tuż po słowie-kluczu; tytuł gazety ("Dziennik Polski") ma spację, więc nietknięty.
  if (
    /^\[?(?:DZIENNIK|JOURNAL|MYŚLI_MG|NASTRÓJ|CEL_NARRACYJNY|MASKA_NPC|RETRO_ZIARNO|KORELACJA|ECHO_AKCJI)\s*:/i.test(
      line
    )
  )
    return false;
  // Sticky Note / Notatka badacza przed rekwizytem (Mechanika 6)
  if (/^\[?(?:NOTATKA_BADACZA|STICKY_NOTE|INVESTIGATOR_NOTE)\s*:/i.test(line)) {
    return true;
  }
  // ASCII art borders
  if (line.match(/^[━═─╔╗╚╝┌┐└┘│║╠╣╦╩╬+=\-_*~]{5,}$/)) return true;
  // Nagłówki prasowe i multimedialne
  if (
    line.match(
      /^📰|^📜|^✉️|^📋|^📧|^TELEGRAM|^KURIER|^DZIENNIK|^ARKHAM ADVERTISER|^🎙️|^📼|^📻|^🗺️/i
    )
  )
    return true;
  // Bloki kodu markdown
  if (line.startsWith('```')) return true;
  return false;
}

function isHandoutTerminator(line: string): boolean {
  return /^\[(Co robi(?:sz|cie)\?|RZUT|TEST|WYNIK|Zaktualizowano dziennik|Journal updated|Lokacja zbadana wyczerpująco|Location thoroughly searched)/i.test(line);
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
  if (line.match(/📋|RAPORT|REPORT|POLICE|POLICJA|PROTOKÓŁ|🎙️|📼|📻|NAGRANIE|TAŚMA|TASMA|RECORDING|AUDIO|MAGNETOFON|🗺️|MAPA|PLAN|MAP/i)) return 'report';
  if (line.match(/📜|KSIĘGA|NECRONOMICON|TOME|MANUSCR/i)) return 'book';
  return 'note';
}
