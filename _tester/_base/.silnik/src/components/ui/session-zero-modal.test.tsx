import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  const fetchMock = fetchWithApiKeys as jest.Mock;
  const collectMock = collectSSEText as jest.Mock;
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
      <SessionZeroModal open onClose={onClose} onComplete={onComplete}
        onCharacterUpdate={onCharacterUpdate} adventureContext={adventure}
        activeCharacter={character} />
    );
  }

  it('renders three steps and displays the diegetic briefing document in step 2', () => {
    renderModal();
    expect(screen.getByText('Krok 1 z 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Briefing śledczy/i }));
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();
    expect(screen.getByText('WESTERN UNION TELEGRAPH CO.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));
    expect(screen.getByText('Krok 3 z 3')).toBeInTheDocument();
    expect(screen.getByText('Realia Historyczne')).toBeInTheDocument();
  });

  it('allows switching between telegram, letter and dossier in step 2', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Briefing śledczy/i }));
    expect(screen.getByText('WESTERN UNION TELEGRAPH CO.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List Zlecający Śledztwo' }));
    expect(screen.getByText(/Do rąk własnych Badacza/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Teczka Akt Śledczych' }));
    expect(screen.getByText(/AKTA ŚLEDCZE N°/i)).toBeInTheDocument();
  });

  it('uses the selected adventure realia and preserves modern sensitivity', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Granice i realia/i }));
    expect(screen.getByText('Realia Historyczne')).toBeInTheDocument();
    expect(screen.getAllByText('Realia epoki').length).toBeGreaterThan(0);
    expect(screen.getByText('Współczesna wrażliwość')).toBeInTheDocument();
  });

  it('updates investigator hook in step 2 via suggested hook buttons and completes session zero', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Briefing śledczy/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+ Spłata dawnego długu wdzięczności/i }));

    const hookInput = screen.getByPlaceholderText('Dlaczego badacz podejmuje sprawę...');
    expect(hookInput).toHaveValue('Spłata dawnego długu wdzięczności');

    fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));
    expect(screen.getByText('Krok 3 z 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zakończ i zapisz/i }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        investigatorHook: 'Spłata dawnego długu wdzięczności',
      })
    );
  });
});
