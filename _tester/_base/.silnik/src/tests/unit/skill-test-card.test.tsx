import React from 'react';
import { render, screen } from '@testing-library/react';
import { SkillTestCard } from '@/components/chat/chat-window/components/skill-test-card';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      rollNormal: 'Rzuć 1d100 (normalny rzut)',
      difficultyRegular: 'ZWYKŁY',
      yourValue: 'Twoja wartość:',
      threshold: `Próg: ≤${params?.threshold ?? 50}`,
      rollDiceButton: 'Rzuć kością',
      orTypeInChat: 'lub wpisz wynik w czacie:',
      resultExample: '"wynik 47"',
    };
    return messages[key] || key;
  },
  useLocale: () => 'pl',
}));

describe('SkillTestCard (Issue #753)', () => {
  const baseProps = {
    id: 'test-1',
    skillName: 'Pierwsza Pomoc',
    skillValue: 60,
    difficulty: 'zwykly' as const,
    modifiers: [],
    justification: 'Opatrzenie poparzenia',
    characterName: 'Andrzej "Aura" Zalewski',
  };

  it('renderuje nazwę umiejętności, próg i instrukcję rzutu kością', () => {
    render(<SkillTestCard {...baseProps} />);

    expect(screen.getByText(/Pierwsza Pomoc/i)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText(/Próg: ≤60/)).toBeInTheDocument();
    expect(screen.getByText(/Rzuć 1d100 \(normalny rzut\)/i)).toBeInTheDocument();
  });

  it('NIE wyświetla fragmentu o wpisywaniu wyniku w czacie dla fizycznych kości', () => {
    render(<SkillTestCard {...baseProps} />);

    expect(screen.queryByText(/lub wpisz wynik w czacie/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wynik 47/i)).not.toBeInTheDocument();
  });
});
