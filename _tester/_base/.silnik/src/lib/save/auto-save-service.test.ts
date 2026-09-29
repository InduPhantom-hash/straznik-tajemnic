import {
  generateSessionEndSaveName,
  performFullGameSave,
} from './auto-save-service';
import type { Character, HotSeatConfig } from '@/lib/types';

describe('auto-save-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSessionEndSaveName', () => {
    it('generuje nazwę z imieniem badacza i czasem w grze (GameTime month 0-indexed)', () => {
      const name = generateSessionEndSaveName('Edward Carnby', {
        year: 1920,
        month: 9, // Październik w GameTime (0-11)
        day: 1,
        hour: 20,
        minute: 15,
      });
      expect(name).toBe('Koniec sesji - Edward Carnby - 1920-10-01 20:15');
    });

    it('poprawnie formatuje styczeń (month: 0) jako 01 zamiast 00', () => {
      const name = generateSessionEndSaveName('Edward Carnby', {
        year: 1925,
        month: 0, // Styczeń w GameTime (0-11)
        day: 14,
        hour: 10,
        minute: 0,
      });
      expect(name).toBe('Koniec sesji - Edward Carnby - 1925-01-14 10:00');
    });

    it('poprawnie formatuje grudzień (month: 11) jako 12', () => {
      const name = generateSessionEndSaveName('Edward Carnby', {
        year: 1920,
        month: 11,
        day: 31,
        hour: 23,
        minute: 59,
      });
      expect(name).toBe('Koniec sesji - Edward Carnby - 1920-12-31 23:59');
    });

    it('obsługuje fallback 1-based (np. month: 12) bez podbijania do 13', () => {
      const name = generateSessionEndSaveName('Edward Carnby', {
        year: 1920,
        month: 12,
        day: 25,
        hour: 18,
        minute: 0,
      });
      expect(name).toBe('Koniec sesji - Edward Carnby - 1920-12-25 18:00');
    });

    it('używa domyślnego "Badacz" gdy imię jest puste', () => {
      const name = generateSessionEndSaveName('', {
        year: 1920,
        month: 4, // Maj w GameTime
        day: 3,
        hour: 8,
        minute: 5,
      });
      expect(name).toBe('Koniec sesji - Badacz - 1920-05-03 08:05');
    });

    it('używa czasu rzeczywistego, gdy gameTime jest nullem', () => {
      const name = generateSessionEndSaveName('Harvey Walters', null);
      expect(name).toMatch(/^Koniec sesji - Harvey Walters - \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('używa czasu rzeczywistego, gdy gameTime zawiera NaN', () => {
      const name = generateSessionEndSaveName('Edward Carnby', {
        year: NaN,
        month: 0,
        day: 1,
        hour: 12,
        minute: 0,
      });
      expect(name).toMatch(/^Koniec sesji - Edward Carnby - \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });

  describe('performFullGameSave', () => {
    it('rzuca błąd gdy saveName jest puste', async () => {
      await expect(
        performFullGameSave({
          saveName: '   ',
          data: {
            messages: [],
            characters: [],
          },
        })
      ).rejects.toThrow('Nazwa zapisu jest wymagana');
    });

    it('rzuca błąd gdy data jest niezdefiniowane', async () => {
      await expect(
        performFullGameSave({
          saveName: 'Test Save',
        })
      ).rejects.toThrow('Brak danych do zapisania');
    });

    it('wysyła poprawny payload POST do /api/game-save i zwraca wynik', async () => {
      const mockResult = {
        success: true,
        saveId: 'save_123',
        saveName: 'Koniec sesji - Edward Carnby - 1920-10-01 20:15',
        size: 2048,
        formattedSize: '2 KB',
        messageCount: 3,
        imageCount: 0,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const character: Character = {
        id: 'char-1',
        name: 'Edward Carnby',
        skills: {},
      } as Character;

      const result = await performFullGameSave({
        saveName: 'Koniec sesji - Edward Carnby - 1920-10-01 20:15',
        saveNotes: 'Autozapis po zakończeniu sesji',
        data: {
          messages: [
            { id: '1', role: 'user', content: 'Cześć', timestamp: new Date() },
            { id: '2', role: 'assistant', content: 'Witaj w Arkham', timestamp: new Date() },
          ],
          characters: [character],
          activeCharacterId: 'char-1',
        },
      });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game-save',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const calledBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(calledBody.name).toBe('Koniec sesji - Edward Carnby - 1920-10-01 20:15');
      expect(calledBody.activeCharacterId).toBe('char-1');
      expect(calledBody.messages).toHaveLength(2);
    });

    it('rzuca błąd gdy odpowiedź serwera ma status błędu', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Błąd dysku' }),
      });

      await expect(
        performFullGameSave({
          saveName: 'Test Save',
          data: {
            messages: [],
            characters: [],
          },
        })
      ).rejects.toThrow('Błąd dysku');
    });

    it('poprawnie serializuje obu badaczy i konfigurację HotSeat', async () => {
      const char1: Character = { id: 'char-1', name: 'Edward Carnby', skills: {} } as Character;
      const char2: Character = { id: 'char-2', name: 'Emily Hartwood', skills: {} } as Character;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, saveId: 'save_hotseat' }),
      });

      await performFullGameSave({
        saveName: 'Koniec sesji - HotSeat',
        data: {
          messages: [],
          characters: [char1, char2],
          activeCharacterId: 'char-2',
          hotSeatConfig: {
            enabled: true,
            players: [
              { id: 'p1', name: 'Gracz 1', characterId: 'char-1' },
              { id: 'p2', name: 'Gracz 2', characterId: 'char-2' },
            ],
            currentPlayerIndex: 1,
          } as unknown as HotSeatConfig,
        },
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.characters).toHaveLength(2);
      expect(callBody.characters[0].name).toBe('Edward Carnby');
      expect(callBody.characters[1].name).toBe('Emily Hartwood');
      expect(callBody.activeCharacterId).toBe('char-2');
      expect(callBody.hotSeatConfig.enabled).toBe(true);
    });
  });
});

