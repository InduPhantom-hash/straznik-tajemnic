import { appendJournalFromText } from './apply-journal-tags';
import type { Character } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('Issue #565 - likwidacja samowolnego dodawania przedmiotów i dokumentów do ekwipunku', () => {
  const createMockCharacter = (): Character => ({
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-1',
    name: 'Edward Carnby',
    occupation: 'Detektyw',
    equipment: [],
    journal: [],
    investigatorDossier: {
      clues: [],
      npcs: [],
      locations: [],
      notes: [],
    },
  });

  it('nie dodaje automatycznie dokumentów ani przedmiotów z otoczenia do ekwipunku postaci (Czerwona Pętla Repro)', () => {
    const character = createMockCharacter();
    const narrationText = `
      Na biurku leży mosiężny klucz oraz pożółkły telegram.
      [PRZEDMIOT: Mosiężny klucz | Stary klucz do archiwum | tool | used]
      [DZIENNIK:trop:Telegram z Bostonu]Spotkanie o północy w dokach | źródło:handout[/DZIENNIK]
    `;

    const updatedChar = appendJournalFromText(
      character,
      narrationText,
      'msg-101'
    );

    // Poszlaka ma trafić do Dossier (Dziennik Śledztwa)
    expect(updatedChar.investigatorDossier?.clues.length).toBeGreaterThan(0);
    const clueTitles = updatedChar.investigatorDossier?.clues.map((c) => c.title);
    expect(clueTitles).toContain('Telegram z Bostonu');

    // Wpis o przedmiocie w otoczeniu ma trafić do Dziennika/historii sceny
    expect(updatedChar.journal?.some((j) => j.title === 'Mosiężny klucz')).toBe(true);

    // Ekwipunek postaci MA POZOSTAĆ PUSTY (brak samowolnego auto-lootu)
    expect(updatedChar.equipment).toEqual([]);
    expect(updatedChar.equipment?.length).toBe(0);
  });
});
