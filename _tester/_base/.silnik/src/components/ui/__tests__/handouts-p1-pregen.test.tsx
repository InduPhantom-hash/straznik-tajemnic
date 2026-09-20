import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import plMessages from '../../../../messages/pl.json';
import enMessages from '../../../../messages/en.json';
import {
  PregenCharacterSelector,
  buildCharacterFromPregen,
} from '../pregen-character-selector';
import type { PregenCharacterConcept } from '@/lib/adventures-data';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const messages = (plMessages as unknown as Record<string, Record<string, string>>)[namespace] || {};
    return (key: string, params?: Record<string, string | number>) => {
      let str = messages[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }
      return str;
    };
  },
  useLocale: () => 'pl',
}));

// Mock openSeaDragon & wavesurfer.js
jest.mock('openseadragon', () => {
  return jest.fn().mockImplementation(() => ({
    addHandler: jest.fn(),
    viewport: {
      getZoom: jest.fn().mockReturnValue(1),
      zoomTo: jest.fn(),
      setRotation: jest.fn(),
      getRotation: jest.fn().mockReturnValue(0),
      goHome: jest.fn(),
    },
    destroy: jest.fn(),
  }));
});

jest.mock('wavesurfer.js', () => ({
  create: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    playPause: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    setMuted: jest.fn(),
    getDuration: jest.fn().mockReturnValue(120),
    getCurrentTime: jest.fn().mockReturnValue(15),
    destroy: jest.fn(),
  })),
}));

describe('Handouts P1 and Pregen Character System', () => {
  const samplePregens: PregenCharacterConcept[] = [
    {
      id: 'pregen-tomek',
      name: 'Tomek Wilmowski',
      age: 14,
      gender: 'male',
      occupation: 'Młodociany Odkrywca',
      background: 'Młody podróżnik z zamiłowaniem do zoologii i przygód.',
      skills: ['Spostrzegawczość 65%', 'Przetrwanie (Dzicz): 55', 'Nauka (Biologia) 50%'],
      stats: {
        str: 45,
        con: 55,
        siz: 40,
        dex: 65,
        app: 60,
        int: 70,
        pow: 50,
        edu: 50,
        luck: 75,
      },
    },
    {
      id: 'pregen-jan',
      name: 'Dr Jan Smuga',
      age: 42,
      gender: 'male',
      occupation: 'Podróżnik i Strzelec',
      background: 'Doświadczony myśliwy i przewodnik wypraw.',
      skills: ['Broń Palna (Strzelba) 75%', 'Tropienie 60%'],
      stats: {
        str: 65,
        con: 70,
        siz: 65,
        dex: 60,
        app: 50,
        int: 65,
        pow: 60,
        edu: 75,
        luck: 50,
      },
    },
  ];

  describe('buildCharacterFromPregen', () => {
    it('converts PregenCharacterConcept to a complete Character with derived stats', () => {
      const pregen = samplePregens[0];
      const char = buildCharacterFromPregen(pregen, 'Przygoda w Dżungli');

      expect(char.name).toBe('Tomek Wilmowski');
      expect(char.age).toBe(14);
      expect(char.gender).toBe('male');
      expect(char.occupation).toBe('Młodociany Odkrywca');
      expect(char.str).toBe(45);
      expect(char.dex).toBe(65);
      expect(char.int).toBe(70);

      // Sprawdzenie pochodnych (Derived stats CoC 7e)
      // HP = floor((CON 55 + SIZ 40) / 10) = 9
      expect(char.hp).toBe(9);
      expect(char.maxHp).toBe(9);
      // SAN = POW 50
      expect(char.san).toBe(50);
      // MP = floor(POW 50 / 5) = 10
      expect(char.mp).toBe(10);

      // Umiejętności sparsowane z pregena
      expect(char.skills['Spostrzegawczość']).toBe(65);
      expect(char.skills['Przetrwanie (Dzicz)']).toBe(55);
      expect(char.skills['Nauka (Biologia)']).toBe(50);
      expect(char.skills['Język Ojczysty']).toBe(50); // WYK

      // Poprawność notatek i przynależności do scenariusza
      expect(char.notes).toContain('Przygoda w Dżungli');
      expect(char.playerName).toBe('');
      expect(char.isActive).toBe(true);
    });
  });

  describe('PregenCharacterSelector Component', () => {
    it('renders list of pregen investigators and switches selection', () => {
      const handleSelect = jest.fn();
      const handleCustomize = jest.fn();
      const handleScratch = jest.fn();

      render(
        <PregenCharacterSelector
          pregens={samplePregens}
          adventureTitle="Tajemnica Czarnego Lądu"
          onSelectCharacter={handleSelect}
          onCustomizeInWizard={handleCustomize}
          onCreateFromScratch={handleScratch}
        />
      );

      // Sprawdzenie obecności obu postaci
      expect(screen.getAllByText('Tomek Wilmowski').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Dr Jan Smuga').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Tajemnica Czarnego Lądu/i)).toBeInTheDocument();

      // Przełączenie na Dr Jana Smugę
      fireEvent.click(screen.getAllByText('Dr Jan Smuga')[0]);
      expect(screen.getByText(/Doświadczony myśliwy i przewodnik wypraw/i)).toBeInTheDocument();

      // Kliknięcie "Wybierz tę postać i graj"
      const selectBtn = screen.getByText(/Wybierz tę postać i graj/i);
      fireEvent.click(selectBtn);
      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect.mock.calls[0][0].name).toBe('Dr Jan Smuga');

      // Kliknięcie "Dostosuj w Kreatorze"
      const customizeBtn = screen.getByText(/Dostosuj w Kreatorze/i);
      fireEvent.click(customizeBtn);
      expect(handleCustomize).toHaveBeenCalledTimes(1);
      expect(handleCustomize.mock.calls[0][0].name).toBe('Dr Jan Smuga');

      // Kliknięcie "Stwórz od zera"
      const scratchBtn = screen.getByText(/Stwórz od zera/i);
      fireEvent.click(scratchBtn);
      expect(handleScratch).toHaveBeenCalledTimes(1);
    });
  });

  describe('i18n Symmetry and Plain Polish (Hyphen only)', () => {
    it('ensures DocumentViewer, AudioReelPlayer and PregenCharacterSelector keys match exactly between PL and EN', () => {
      const pl = plMessages as unknown as Record<string, Record<string, string>>;
      const en = enMessages as unknown as Record<string, Record<string, string>>;

      const sections = ['DocumentViewer', 'AudioReelPlayer', 'PregenCharacterSelector'];

      for (const section of sections) {
        expect(pl[section]).toBeDefined();
        expect(en[section]).toBeDefined();

        const plKeys = Object.keys(pl[section]).sort();
        const enKeys = Object.keys(en[section]).sort();

        expect(plKeys).toEqual(enKeys);

        // Weryfikacja reguły braku pauz/półpauz w polskim tekście (tylko dywiz '-')
        for (const [key, val] of Object.entries(pl[section])) {
          expect(val).not.toContain('—'); // em dash
          expect(val).not.toContain('–'); // en dash
        }
      }
    });
  });
});
