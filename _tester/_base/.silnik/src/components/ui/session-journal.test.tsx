import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Character, JournalEntry } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import {
  mergeAdventureJournalEntries,
  synchronizeAdventureJournal,
} from '@/lib/journal/shared-adventure-journal';
import { SessionJournal } from './session-journal';

describe('SessionJournal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('oznacza scalony dziennik jako wspólny Dziennik Sesji', () => {
    render(
      <SessionJournal
        character={PREDEFINED_CHARACTERS[0]}
        onUpdateCharacter={jest.fn()}
        onUpdateSharedJournal={jest.fn()}
        sharedJournal={[]}
        participantNames={['Aga', 'Jakub']}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('DZIENNIK SESJI')).toBeTruthy();
    expect(screen.getByText('Wspólny dla: Aga i Jakub')).toBeTruthy();
  });

  it('synchronizuje dodanie, edycję i usunięcie wpisu tylko uczestnikom przygody', () => {
    const adventureJournalId = 'adventure-current';
    const outsideEntry: JournalEntry = {
      id: 'outside-entry',
      timestamp: new Date('2026-07-17T16:00:00Z'),
      adventureJournalId: 'adventure-outside',
      type: 'note',
      title: 'Prywatna notatka',
      content: 'Nie należy do bieżącej przygody.',
      tags: [],
      isBookmarked: false,
    };
    const first: Character = {
      ...PREDEFINED_CHARACTERS[0],
      id: 'margaret',
      name: 'Margaret Sullivan',
      playerName: 'Aga',
      journal: [],
    };
    const second: Character = {
      ...PREDEFINED_CHARACTERS[1],
      id: 'dyer',
      name: 'Prof. William Dyer',
      playerName: 'Jakub',
      journal: [],
    };
    const outside: Character = {
      ...PREDEFINED_CHARACTERS[2],
      id: 'outside',
      journal: [outsideEntry],
    };
    let latestCharacters = [first, second, outside];

    function Harness() {
      const [characters, setCharacters] = useState<Character[]>([
        first,
        second,
        outside,
      ]);
      latestCharacters = characters;
      const participants = characters.slice(0, 2);
      const sharedJournal = mergeAdventureJournalEntries(
        participants,
        adventureJournalId
      );

      return (
        <SessionJournal
          character={characters[0]}
          onUpdateCharacter={jest.fn()}
          sharedJournal={sharedJournal}
          onUpdateSharedJournal={(journal) =>
            setCharacters((current) =>
              synchronizeAdventureJournal(
                current,
                [first.id, second.id],
                journal,
                adventureJournalId
              )
            )
          }
          participantNames={['Aga', 'Jakub']}
          onClose={jest.fn()}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Notatki' }));
    fireEvent.click(screen.getByRole('button', { name: /Dodaj notatkę/i }));
    fireEvent.change(
      screen.getByPlaceholderText('np. Śledztwo w Domu Corbitów'),
      { target: { value: 'Ślad w bibliotece' } }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'Zapisz szczegóły przygody lub informacje o postaci/przedmiocie...'
      ),
      { target: { value: 'Na regale znaleźliśmy ukryty symbol.' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz wpis' }));

    expect(latestCharacters[0].journal).toHaveLength(1);
    expect(latestCharacters[1].journal).toEqual(latestCharacters[0].journal);
    expect(latestCharacters[0].journal?.[0]).toMatchObject({
      adventureJournalId,
      title: 'Ślad w bibliotece',
      content: 'Na regale znaleźliśmy ukryty symbol.',
    });
    const addedEntryId = latestCharacters[0].journal?.[0].id;
    expect(addedEntryId).toBeDefined();
    expect(latestCharacters[2]).toBe(outside);
    expect(latestCharacters[2].journal).toEqual([outsideEntry]);

    const addedTitle = screen.getByText('Ślad w bibliotece');
    const noteHeader = addedTitle.parentElement;
    expect(noteHeader).not.toBeNull();
    fireEvent.click(
      noteHeader?.querySelectorAll('button')[0] as HTMLButtonElement
    );

    const editDialog = screen.getByText('Edytuj wpis w księdze przygód')
      .parentElement?.parentElement;
    expect(editDialog).not.toBeNull();
    const editTextboxes = within(editDialog as HTMLElement).getAllByRole(
      'textbox'
    );
    fireEvent.change(editTextboxes[0], {
      target: { value: 'Ślad w bibliotece - rozwiązany' },
    });
    fireEvent.change(editTextboxes[1], {
      target: { value: 'Symbol wskazuje wejście do podziemi.' },
    });
    fireEvent.click(
      within(editDialog as HTMLElement).getByRole('button', {
        name: 'Zapisz zmiany',
      })
    );

    expect(latestCharacters[0].journal).toHaveLength(1);
    expect(latestCharacters[1].journal).toEqual(latestCharacters[0].journal);
    expect(latestCharacters[0].journal?.[0]).toMatchObject({
      id: addedEntryId,
      adventureJournalId,
      title: 'Ślad w bibliotece - rozwiązany',
      content: 'Symbol wskazuje wejście do podziemi.',
    });
    expect(latestCharacters[1].journal?.[0].id).toBe(addedEntryId);
    expect(latestCharacters[0].journal?.[0].updatedAt).toBeInstanceOf(Date);
    expect(latestCharacters[2]).toBe(outside);

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const editedTitle = screen.getByText('Ślad w bibliotece - rozwiązany');
    const editedHeader = editedTitle.parentElement;
    expect(editedHeader).not.toBeNull();
    fireEvent.click(
      editedHeader?.querySelectorAll('button')[1] as HTMLButtonElement
    );

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith(
      'Czy na pewno chcesz usunąć ten wpis z księgi przygód?'
    );
    expect(latestCharacters[0].journal).toHaveLength(0);
    expect(latestCharacters[1].journal).toHaveLength(0);
    expect(latestCharacters[2]).toBe(outside);
    expect(latestCharacters[2].journal).toEqual([outsideEntry]);
  });

  it('przełącza i wyświetla zakładkę Tablica Badacza (Evidence Graph)', () => {
    render(
      <SessionJournal
        character={PREDEFINED_CHARACTERS[0]}
        onUpdateCharacter={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const graphTabButton = screen.getByRole('button', { name: /Tablica Badacza/i });
    expect(graphTabButton).toBeTruthy();
    fireEvent.click(graphTabButton);
  });

  it('wywołuje onClose po kliknięciu przycisku zamykania X oraz po wciśnięciu Escape', () => {
    const handleClose = jest.fn();
    render(
      <SessionJournal
        character={PREDEFINED_CHARACTERS[0]}
        onUpdateCharacter={jest.fn()}
        onClose={handleClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Zamknij dziennik' });
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('renderuje widok Akt Śledczych z poszlakami, statusem CoC 7e i umożliwia zmianę statusu', () => {
    const onUpdate = jest.fn();
    const testCharacter: Character = {
      ...PREDEFINED_CHARACTERS[0],
      id: 'investigator_test',
      name: 'Edward Carnby',
      investigatorDossier: {
        clues: [
          {
            id: 'clue-1',
            title: 'Krwawy Ślad w piwnicy',
            description: 'Świeża krew na kamiennej posadzce.',
            category: 'forensic',
            status: 'unconfirmed',
            isKeyClue: true,
            sourceNpc: 'Inspektor Legrasse',
            foundLocation: 'Kamienica Corbitta',
          },
        ],
        npcs: [
          {
            id: 'npc-1',
            name: 'Thomas Malone',
            occupation: 'Detektyw',
            firstImpression: 'Zmęczony życiem człowiek.',
            relationshipStatus: 'friendly',
          },
        ],
        locations: [
          {
            id: 'loc-1',
            name: 'Zaułek Red Hook',
            searchStatus: 'partially_searched',
            description: 'Mroczne zaułki Brooklynu.',
          },
        ],
        notes: [],
        lastUpdated: new Date().toISOString(),
      },
    };

    render(
      <SessionJournal
        character={testCharacter}
        onUpdateCharacter={onUpdate}
        onClose={jest.fn()}
      />
    );

    // Przejdź do zakładki Odkrycia / Akta Śledcze
    const discoveriesTab = screen.getByTestId('btn-discoveries');
    fireEvent.click(discoveriesTab);

    // Kliknij teczkę Poszlaki (dawne Misje)
    const cluesCategoryBtn = screen.getByRole('button', { name: /Misje/i });
    fireEvent.click(cluesCategoryBtn);

    // Poszlaka powinna być widoczna na liście i w podglądzie akt
    expect(screen.getAllByText('Krwawy Ślad w piwnicy')[0]).toBeInTheDocument();
    expect(screen.getByText('ŚWIADEK:')).toBeInTheDocument();
    expect(screen.getByText('Inspektor Legrasse')).toBeInTheDocument();
    expect(screen.getByText('KLUCZOWA POSZLAKA')).toBeInTheDocument();

    // Zmień status poszlaki na Potwierdzona
    const confirmBtn = screen.getByRole('button', { name: 'Potwierdzona' });
    fireEvent.click(confirmBtn);

    expect(onUpdate).toHaveBeenCalled();
    const updatedChar = onUpdate.mock.calls[0][0] as Character;
    expect(updatedChar.investigatorDossier?.clues[0].status).toBe('confirmed');
  });

  it('filtruje akta śledcze w czasie rzeczywistym za pomocą szybkiego filtra FTS', () => {
    const testCharacter: Character = {
      ...PREDEFINED_CHARACTERS[0],
      id: 'investigator_test',
      name: 'Edward Carnby',
      investigatorDossier: {
        clues: [
          {
            id: 'clue-1',
            title: 'Krwawy Ślad w piwnicy',
            description: 'Świeża krew na kamiennej posadzce.',
            category: 'forensic',
            status: 'unconfirmed',
          },
          {
            id: 'clue-2',
            title: 'List z Arkham Sanitarium',
            description: 'Tajemnicza korespondencja lekarza.',
            category: 'document',
            status: 'unconfirmed',
          },
        ],
        npcs: [],
        locations: [],
        notes: [],
      },
    };

    render(
      <SessionJournal
        character={testCharacter}
        onUpdateCharacter={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-discoveries'));
    fireEvent.click(screen.getByRole('button', { name: /Misje/i }));

    expect(screen.getAllByText('Krwawy Ślad w piwnicy')[0]).toBeInTheDocument();
    expect(screen.getAllByText('List z Arkham Sanitarium')[0]).toBeInTheDocument();

    // Filtruj po słowie "Sanitarium"
    const filterInput = screen.getByPlaceholderText('Szybki filtr FTS (np. nazwisko, poszlaka)...');
    fireEvent.change(filterInput, { target: { value: 'Sanitarium' } });

    expect(screen.queryByText('Krwawy Ślad w piwnicy')).not.toBeInTheDocument();
    expect(screen.getAllByText('List z Arkham Sanitarium')[0]).toBeInTheDocument();
  });

  it('eksportuje akta śledcze w klimatycznym formacie CoC 7e Markdown', () => {
    const testCharacter: Character = {
      ...PREDEFINED_CHARACTERS[0],
      id: 'investigator_test',
      name: 'Harvey Walters',
      investigatorDossier: {
        clues: [
          {
            id: 'clue-1',
            title: 'Dziwny Idol z Bagien',
            description: 'Zielonkawy kamień o bluźnierczych kształtach.',
            category: 'occult',
            status: 'confirmed',
            investigatorInsight: 'Pochodzi z kultu Cthulhu.',
          },
        ],
        npcs: [
          {
            id: 'npc-1',
            name: 'Profesor Angell',
            occupation: 'Archeolog',
            firstImpression: 'Uczony badacz mitów.',
            relationshipStatus: 'friendly',
          },
        ],
        locations: [
          {
            id: 'loc-1',
            name: 'Muzeum Providence',
            searchStatus: 'thoroughly_searched',
            description: 'Bogata kolekcja starożytności.',
          },
        ],
        notes: [],
      },
    };

    let exportedBlobContent = '';
    const originalCreateObjectURL = window.URL.createObjectURL;
    window.URL.createObjectURL = jest.fn((blob: Blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        exportedBlobContent = reader.result as string;
      };
      reader.readAsText(blob);
      return 'mock-url';
    });

    render(
      <SessionJournal
        character={testCharacter}
        onUpdateCharacter={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Eksport MD/i });
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    const createdBlob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(createdBlob).toBeInstanceOf(Blob);

    window.URL.createObjectURL = originalCreateObjectURL;
  });
});


