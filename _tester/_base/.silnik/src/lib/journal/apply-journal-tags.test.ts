import {
  appendJournalFromText,
  appendSceneChronicleSummaryToParty,
  buildSceneChronicleTranscript,
} from './apply-journal-tags';
import type { Character } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('buildSceneChronicleTranscript', () => {
  it('odtwarza początek sceny ze starej karty po wczytaniu zapisu', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
      activeScene: { sceneNumber: 1, location: 'Archiwum', startedAt: '2026-01-01', people: [], findings: [], notes: [] },
    };
    const first = appendJournalFromText(character, 'Wychodzicie. [ZMIANA_SCENY: Dok]', 'old-message');
    const legacy = { ...first, activeScene: first.activeScene ? { ...first.activeScene, startMessageId: undefined } : undefined,
      sceneCards: first.sceneCards?.map((scene) => ({ ...scene, startMessageId: undefined, endMessageId: undefined })) };
    const next = appendJournalFromText(legacy, 'Wracacie. [ZMIANA_SCENY: Dom]', 'new-message');
    expect(next.sceneCards?.[1].startMessageId).toBe('old-message');
    expect(next.sceneCards?.[1].endMessageId).toBe('new-message');
  });
  const messages = [
    { id: 'intro', role: 'assistant', content: 'Stanisław pokazał telegram.' },
    { id: 'question', role: 'user', content: 'Pytam o nadawcę.' },
    { id: 'transition', role: 'assistant', content: 'Stanisław twierdził, że to Jan. [ZMIANA_SCENY: Dok] Na doku znaleźliście linę.' },
    { id: 'end', role: 'assistant', content: 'Zabraliście linę. [ZMIANA_SCENY: Dom] W domu pali się światło.' },
  ];
  it.each(['ZMIANA_SCENY', 'SCENE_CHANGE'])('oddziela fakty sąsiednich scen ze znacznikiem %s', (tag) => {
    const localizedMessages = messages.map((message) => ({ ...message, content: message.content.replaceAll('ZMIANA_SCENY', tag) }));
    expect(buildSceneChronicleTranscript(localizedMessages, { endMessageId: 'transition' })).toEqual([
      { role: 'assistant', content: 'Stanisław pokazał telegram.' },
      { role: 'user', content: 'Pytam o nadawcę.' },
      { role: 'assistant', content: 'Stanisław twierdził, że to Jan.' },
    ]);
    expect(buildSceneChronicleTranscript(localizedMessages, { startMessageId: 'transition', endMessageId: 'end' })).toEqual([
      { role: 'assistant', content: 'Na doku znaleźliście linę.' },
      { role: 'assistant', content: 'Zabraliście linę.' },
    ]);
  });
  it('po odtworzeniu zapisu ponownie buduje ten sam niezapisany wpis', () => {
    const scene = JSON.parse(JSON.stringify({ startMessageId: 'transition', endMessageId: 'end' }));
    expect(buildSceneChronicleTranscript(messages, scene).map((message) => message.content)).toEqual(['Na doku znaleźliście linę.', 'Zabraliście linę.']);
    expect(buildSceneChronicleTranscript(messages, { startMessageId: 'missing', endMessageId: 'end' })).toEqual([]);
  });
});

describe('appendSceneChronicleSummaryToParty', () => {
  it('zapisuje podsumowanie dla drużyny i aktualizuje wpis sceny', () => {
    const scene = {
      id: 'scene-card-1',
      sceneNumber: 1,
      location: 'Archiwum',
      title: 'Wizyta w archiwum',
      timestamp: '2026-10-10T10:00:00.000Z',
      people: ['Stanisław'],
      findings: ['Telegram'],
      keyTakeaways: ['Stanisław wspomniał o dokach.'],
      isSealed: true,
    };
    const createCharacter = (id: string): Character => ({
      ...PREDEFINED_CHARACTERS[0],
      id,
      sceneCards: [scene],
      journal: [
        {
          id: 'journal-scene-1',
          timestamp: new Date('2026-10-10T10:00:00.000Z'),
          type: 'scene',
          title: scene.title,
          content: scene.keyTakeaways.join('\n'),
          tags: ['scena'],
          isBookmarked: false,
          sceneData: scene,
        },
      ],
    });
    const characters = [createCharacter('char-1'), createCharacter('char-2')];

    const result = appendSceneChronicleSummaryToParty(
      characters,
      characters[0],
      scene.id,
      {
        pl: 'Stanisław twierdził, że telegram wysłano z doków.',
        en: 'Stanisław claimed the telegram had been sent from the docks.',
      }
    );

    expect(result.changed).toBe(true);
    expect(result.characters).toHaveLength(2);
    for (const character of result.characters) {
      expect(character.sceneCards?.[0].chronicleSummaryByLocale).toEqual({
        pl: 'Stanisław twierdził, że telegram wysłano z doków.',
        en: 'Stanisław claimed the telegram had been sent from the docks.',
      });
      expect(character.journal?.[0].sceneData?.chronicleSummaryByLocale).toEqual(
        character.sceneCards?.[0].chronicleSummaryByLocale
      );
    }
  });

  it('nie nadpisuje raz zapisanego podsumowania i nie tworzy duplikatu', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      id: 'char-1',
      sceneCards: [
        {
          id: 'scene-card-1',
          sceneNumber: 1,
          location: 'Archiwum',
          title: 'Wizyta w archiwum',
          timestamp: '2026-10-10T10:00:00.000Z',
          people: [],
          findings: [],
          keyTakeaways: [],
          chronicleSummaryByLocale: {
            pl: 'Stanisław przekazał plotkę.',
            en: 'Stanisław passed along the rumor.',
          },
          isSealed: true,
        },
      ],
      journal: [],
    };

    const result = appendSceneChronicleSummaryToParty(
      [character],
      character,
      'scene-card-1',
      { pl: 'Inna wersja', en: 'Another version' }
    );

    expect(result.changed).toBe(false);
    expect(result.characters[0].sceneCards?.[0].chronicleSummaryByLocale).toEqual(
      {
        pl: 'Stanisław przekazał plotkę.',
        en: 'Stanisław passed along the rumor.',
      }
    );
    expect(result.characters[0].journal).toHaveLength(0);
  });
});

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
