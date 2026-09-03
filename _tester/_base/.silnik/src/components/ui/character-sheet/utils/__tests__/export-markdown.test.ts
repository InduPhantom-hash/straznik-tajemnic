import type { Character } from '@/lib/types';
import { exportCharacterToMarkdown } from '../export-markdown';

describe('exportCharacterToMarkdown', () => {
  let createdAnchor: any;
  let clicked = false;
  let downloadedContent = '';

  beforeEach(() => {
    clicked = false;
    downloadedContent = '';
    global.URL.createObjectURL = jest.fn((blob: Blob) => {
      // Symulacja odczytu bloba w Node
      const reader = (blob as any).text;
      if (typeof reader === 'function') {
        reader.call(blob).then((t: string) => {
          downloadedContent = t;
        });
      }
      return 'blob:mock-url';
    });
    global.URL.revokeObjectURL = jest.fn();

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        createdAnchor = {
          href: '',
          download: '',
          click: () => {
            clicked = true;
          },
        };
        return createdAnchor as any;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('nie resetuje wartości 0 do wartości maksymalnych przy eksporcie', () => {
    const char: Character = {
      id: 'char-zero',
      name: 'Zero Badacz',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 0,
      san: 0,
      mp: 0,
      luck: 0,
      occupation: 'Pisarz',
      skills: {},
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    exportCharacterToMarkdown(char, 'pl');

    expect(clicked).toBe(true);
    expect(createdAnchor.download).toBe('Zero_Badacz_karta.md');
  });

  it('generuje angielską nazwę pliku w locale en', () => {
    const char: Character = {
      id: 'char-en',
      name: 'John Doe',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 10,
      san: 50,
      mp: 10,
      luck: 50,
      occupation: 'Reporter',
      skills: {},
      playerName: 'Player',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    exportCharacterToMarkdown(char, 'en');

    expect(clicked).toBe(true);
    expect(createdAnchor.download).toBe('John_Doe_sheet.md');
  });
});
