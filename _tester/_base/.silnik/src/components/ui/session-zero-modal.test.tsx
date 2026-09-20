import { fireEvent, render, screen } from '@testing-library/react';
import { SessionZeroModal } from './session-zero-modal';
import type { Character } from '@/lib/types';
import type { AdventureContext } from '@/lib/adventures-data';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { collectSSEText } from '@/lib/sse-parser';

jest.mock('@/lib/api-keys-service', () => ({ fetchWithApiKeys: jest.fn() }));
jest.mock('@/lib/sse-parser', () => ({ collectSSEText: jest.fn() }));
jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({ sessionZero: null })),
  saveAISettings: jest.fn(),
}));

describe('SessionZeroModal', () => {
  const onClose = jest.fn();
  const onComplete = jest.fn();
  const onCharacterUpdate = jest.fn();
  const character: Character = {
    id: 'char-1', name: 'Edward Carnby', occupation: 'Prywatny Detektyw', age: 38,
    background: 'Weteran wojenny, obecnie detektyw', characterConcept: 'Długi karciane',
    significantPerson: 'Siostra Clara w Bostonie', meaningfulLocation: 'Gabinet w Arkham',
    treasuredPossession: 'Złoty zegarek po ojcu', playerName: 'Jakub', isActive: true,
    lastUsed: new Date(), notes: '', str: 60, dex: 50, con: 70, app: 45, pow: 65,
    edu: 75, siz: 65, int: 80, luck: 55, hp: 13, san: 65, mp: 13, skills: {},
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
  };
  const adventure: AdventureContext = {
    id: 'adv-1', title: 'Cienie nad Innsmouth', era: 'classic', eraLabel: 'Lata 20.',
    yearRange: '1920-1928', location: 'Innsmouth, Massachusetts', country: 'USA',
    tone: 'purist', themes: ['Sekta', 'Hybrydy'], suggestedOccupations: ['Detektyw'],
    suggestedArchetypes: ['Śledczy'], hook: 'Zlecenie od rządu: zbadać doniesienia.',
    description: 'Mroczne miasteczko rybackie.', estimatedSessions: '2-3', playerCount: '1-4',
    difficulty: 'normal',
  };

  beforeEach(() => jest.clearAllMocks());

  function renderModal() {
    return render(
      <SessionZeroModal
        open
        onClose={onClose}
        onComplete={onComplete}
        onCharacterUpdate={onCharacterUpdate}
        adventureContext={adventure}
        activeCharacter={character}
      />
    );
  }

  it('renders single-screen view without multi-step wizard or summary', () => {
    renderModal();
    expect(screen.getByText('Sesja Zero')).toBeInTheDocument();
    expect(screen.queryByText(/Krok 1 z 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Krok 2 z 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sesja Zero ukończona/i)).not.toBeInTheDocument();

    expect(screen.getByText('🚫 Granice narracyjne i realia historyczne')).toBeInTheDocument();
    expect(screen.getByText('Realia Historyczne')).toBeInTheDocument();
    expect(screen.getByText('Realia epoki')).toBeInTheDocument();
    expect(screen.getByText('Współczesna wrażliwość')).toBeInTheDocument();
  });

  it('starts with empty lines and veils and offers formerly default topics as suggestions', () => {
    renderModal();

    // Suggested lines should have former defaults at the beginning
    expect(screen.getByText('+ Przemoc wobec dzieci')).toBeInTheDocument();
    expect(screen.getByText('+ Przemoc seksualna')).toBeInTheDocument();

    // Suggested veils should have former defaults at the beginning
    expect(screen.getByText('+ Tortury (fade to black)')).toBeInTheDocument();
    expect(screen.getByText('+ Szczegółowe obrażenia ciała')).toBeInTheDocument();

    // Adding topic by clicking suggestion
    fireEvent.click(screen.getByText('+ Przemoc wobec dzieci'));
    expect(screen.getByText('✓ Przemoc wobec dzieci')).toBeInTheDocument();

    // Now it is in the active lines pills
    const removeButtons = screen.getAllByRole('button', { name: '×' });
    expect(removeButtons.length).toBe(1);

    // Clicking remove removes it
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
  });

  it('completes session zero and forwards configured settings', () => {
    renderModal();

    // Switch era filter
    fireEvent.click(screen.getByText('Współczesna wrażliwość'));

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Zapisz ustalenia/i }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        eraFilter: 'modern_sensibilities',
        lines: [],
        veils: [],
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels session zero when clicking cancel', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Anuluj/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
