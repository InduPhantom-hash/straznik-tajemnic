import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  usePathname: () => '/',
  routing: {
    locales: ['pl', 'en'],
    defaultLocale: 'pl',
  },
}));

import { LanguageSelectionContent, LanguageSelectionModal } from './language-selection-modal';

describe('LanguageSelectionContent', () => {
  const mockOnSelectLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, descriptions, and 18+ content warning correctly', () => {
    render(<LanguageSelectionContent onSelectLanguage={mockOnSelectLanguage} />);

    // Titles and bilingual descriptions
    expect(screen.getByText(/ZANIM ROZPOCZNIE SIĘ ŚLEDZTWO/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/WYBIERZ JĘZYK/i);
    expect(screen.getByText(/Ten wybór ustawia język gry i narracji/i)).toBeInTheDocument();
    expect(screen.getByText(/This choice sets the game and narrative language/i)).toBeInTheDocument();

    // 18+ Mature Warning Frame
    const warningFrame = screen.getByRole('note', { name: /content warning 18\+/i });
    expect(warningFrame).toBeInTheDocument();
    expect(screen.getByText(/18\+ • MATURE AUDIENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/Ostrzeżenie o zawartości \/ Content Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Gra porusza tematy drażliwe, kontrowersyjne/i)).toBeInTheDocument();
    expect(screen.getByText(/This game contains sensitive themes/i)).toBeInTheDocument();
  });

  it('calls onSelectLanguage with "pl" and "metric" when clicking Polski button', () => {
    render(<LanguageSelectionContent onSelectLanguage={mockOnSelectLanguage} />);

    const plButton = screen.getByRole('button', { name: /^polski$/i });
    fireEvent.click(plButton);

    expect(mockOnSelectLanguage).toHaveBeenCalledTimes(1);
    expect(mockOnSelectLanguage).toHaveBeenCalledWith('pl', 'metric');
  });

  it('calls onSelectLanguage with "en" and selected measurement system', () => {
    render(<LanguageSelectionContent onSelectLanguage={mockOnSelectLanguage} />);

    // Default for EN is imperial
    const enButton = screen.getByRole('button', { name: /^english$/i });
    fireEvent.click(enButton);
    expect(mockOnSelectLanguage).toHaveBeenCalledWith('en', 'imperial');

    // Switch to Metric
    const metricButton = screen.getByRole('button', { name: /metric/i });
    fireEvent.click(metricButton);

    fireEvent.click(enButton);
    expect(mockOnSelectLanguage).toHaveBeenLastCalledWith('en', 'metric');
  });
});

describe('LanguageSelectionModal', () => {
  const mockOnSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <LanguageSelectionModal open={false} onSelected={mockOnSelected} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('stores selections in localStorage and triggers callback when language is selected', () => {
    render(<LanguageSelectionModal open={true} onSelected={mockOnSelected} />);

    const plButton = screen.getByRole('button', { name: /^polski$/i });
    fireEvent.click(plButton);

    expect(localStorage.getItem('language_selected')).toBe('pl');
    expect(localStorage.getItem('measurement_system')).toBe('metric');
    expect(mockOnSelected).toHaveBeenCalledTimes(1);
  });
});
