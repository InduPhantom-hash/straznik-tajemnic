import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { TypographySettings } from '../typography-settings';
import {
  useTextScale,
  TEXT_SCALE_KEY,
  applyTextScale,
  getInitialTextScale,
} from '@/hooks/useTextScale';

// Mock next-intl translations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      eyebrow: 'Dostępność i Ergonomia',
      title: 'Rozmiar Tekstu i Czytelność',
      description: 'Dopasuj wielkość krojów pisma do swojego ekranu.',
      'scales.normal.label': 'A Standardowy',
      'scales.normal.description': 'Bazowy rozmiar interfejsu (100%).',
      'scales.larger.label': 'A+ Większy',
      'scales.larger.description': 'Zwiększona czytelność (115%).',
      'scales.largest.label': 'A++ Duży',
      'scales.largest.description': 'Maksymalny kontrast (125%).',
      previewTitle: 'Podgląd Czytelności Kroniki',
      previewText: 'Przykładowy tekst kroniki w blasku lampy naftowej.',
      appliedNotice: 'Zsynchronizowano rozmiar.',
    };
    return translations[key] || key;
  },
}));

describe('useTextScale hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-scale');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-scale');
  });

  it('defaults to normal scale when localStorage is empty', () => {
    expect(getInitialTextScale()).toBe('normal');
    const { result } = renderHook(() => useTextScale());
    expect(result.current.scale).toBe('normal');
  });

  it('updates text scale, localStorage, and document attribute when changed', () => {
    const { result } = renderHook(() => useTextScale());

    act(() => {
      result.current.setScale('larger');
    });

    expect(result.current.scale).toBe('larger');
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe('larger');
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('larger');

    act(() => {
      result.current.setScale('largest');
    });

    expect(result.current.scale).toBe('largest');
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe('largest');
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('largest');
  });

  it('reads pre-existing scale from localStorage on initialization', () => {
    localStorage.setItem(TEXT_SCALE_KEY, 'larger');
    expect(getInitialTextScale()).toBe('larger');

    const { result } = renderHook(() => useTextScale());
    expect(result.current.scale).toBe('larger');
    expect(document.documentElement.getAttribute('data-text-scale')).toBe('larger');
  });
});

describe('TypographySettings component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-text-scale');
  });

  it('renders typography settings section and scale options', () => {
    render(<TypographySettings />);

    expect(screen.getByTestId('typography-settings-section')).toBeInTheDocument();
    expect(screen.getByText('Rozmiar Tekstu i Czytelność')).toBeInTheDocument();
    expect(screen.getByText('A Standardowy')).toBeInTheDocument();
    expect(screen.getByText('A+ Większy')).toBeInTheDocument();
    expect(screen.getByText('A++ Duży')).toBeInTheDocument();
  });

  it('switches text scale upon clicking scale button', () => {
    render(<TypographySettings />);

    const largerButton = screen.getByText('A+ Większy').closest('button');
    expect(largerButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(largerButton!);
    });

    expect(document.documentElement.getAttribute('data-text-scale')).toBe('larger');
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe('larger');
  });
});
