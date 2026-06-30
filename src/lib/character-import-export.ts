// Character Import/Export System
// Handles importing and exporting characters in various formats

import { Character } from './types';

/**
 * Type guard: skill jest oznaczony do rozwoju (CoC 7e Faza Rozwoju).
 * Eliminuje `as any` cast (IND-127 C6).
 */
function isMarkedSkill(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    'markedForImprovement' in v &&
    (v as { markedForImprovement?: unknown }).markedForImprovement === true
  );
}

export interface CharacterExportData {
  version: string;
  exportDate: Date;
  character: Character;
  metadata: {
    appVersion: string;
    creator: string;
    campaign?: string;
    notes?: string;
  };
}

export interface ImportResult {
  success: boolean;
  character?: Character;
  error?: string;
  warnings?: string[];
}

export interface ExportOptions {
  format: 'json' | 'pdf' | 'txt' | 'qr';
  includePortrait: boolean;
  includeHistory: boolean;
  includeStats: boolean;
  campaign?: string;
  notes?: string;
}

class CharacterImportExportSystem {
  private readonly CURRENT_VERSION = '2.0.0';
  private readonly APP_VERSION = '2.0.0';

  // Export character to JSON
  exportToJSON(
    character: Character,
    options: Partial<ExportOptions> = {}
  ): CharacterExportData {
    const exportData: CharacterExportData = {
      version: this.CURRENT_VERSION,
      exportDate: new Date(),
      character: this.prepareCharacterForExport(character, options),
      metadata: {
        appVersion: this.APP_VERSION,
        creator: 'Zew Cthulhu App 2.0',
        campaign: options.campaign,
        notes: options.notes,
      },
    };

    return exportData;
  }

  // Import character from JSON
  importFromJSON(jsonData: string): ImportResult {
    try {
      const data = JSON.parse(jsonData) as CharacterExportData;

      // Validate structure
      if (!this.validateImportData(data)) {
        return {
          success: false,
          error:
            'Nieprawidłowa struktura danych. Plik może być uszkodzony lub pochodzi z niekompatybilnej wersji.',
        };
      }

      // Convert dates
      const character = this.processImportedCharacter(data.character);

      // Version compatibility check
      const warnings = this.checkVersionCompatibility(data.version);

      return {
        success: true,
        character,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: `Błąd podczas importu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
      };
    }
  }

  // Export to downloadable file
  exportToFile(
    character: Character,
    format: 'json' | 'txt' = 'json',
    options: Partial<ExportOptions> = {}
  ): void {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        const exportData = this.exportToJSON(character, options);
        content = JSON.stringify(exportData, null, 2);
        filename = `${this.sanitizeFilename(character.name)}_character.json`;
        mimeType = 'application/json';
        break;

      case 'txt':
        content = this.exportToText(character, options);
        filename = `${this.sanitizeFilename(character.name)}_character.txt`;
        mimeType = 'text/plain';
        break;

      default:
        throw new Error(`Nieobsługiwany format eksportu: ${format}`);
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Export character to text format
  private exportToText(
    character: Character,
    options: Partial<ExportOptions> = {}
  ): string {
    let text = '';

    text += `=== KARTA POSTACI - ZEW CTHULHU 7. EDYCJA ===\n`;
    text += `Eksport z: Zew Cthulhu App 2.0\n`;
    text += `Data eksportu: ${new Date().toLocaleDateString('pl-PL')}\n\n`;

    text += `PODSTAWOWE INFORMACJE:\n`;
    text += `Imię i nazwisko: ${character.name}\n`;
    text += `Zawód: ${character.occupation}\n`;
    text += `Wiek: ${character.age || 'Nieznany'}\n\n`;

    if (options.includeStats !== false) {
      text += `CECHY PODSTAWOWE:\n`;
      text += `Siła (STR): ${character.str}\n`;
      text += `Zręczność (DEX): ${character.dex}\n`;
      text += `Kondycja (CON): ${character.con}\n`;
      text += `Wygląd (APP): ${character.app}\n`;
      text += `Siła Woli (POW): ${character.pow}\n`;
      text += `Wykształcenie (EDU): ${character.edu}\n`;
      text += `Budowa Ciała (SIZ): ${character.siz}\n`;
      text += `Inteligencja (INT): ${character.int}\n`;
      text += `Szczęście (LUCK): ${character.luck}\n\n`;

      text += `CECHY POCHODNE:\n`;
      text += `Punkty Życia (PŻ): ${character.hp}\n`;
      text += `Punkty Rozsądku (PR): ${character.san}\n`;
      text += `Punkty Magii (PM): ${character.mp}\n\n`;
    }

    text += `UMIEJĘTNOŚCI:\n`;
    Object.entries(character.skills)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([skill, value]) => {
        text += `${skill}: ${value}%\n`;
      });
    text += '\n';

    if (character.background) {
      text += `HISTORIA POSTACI:\n`;
      text += `${character.background}\n\n`;
    }

    text += `ROZWÓJ (CoC 7e):\n`;
    text += `Umiejętności oznaczone do rozwoju: ${Object.values(character.skills || {}).filter(isMarkedSkill).length}\n`;
    text += `Historia rozwoju: ${character.developmentHistory?.length || 0} wpisów\n\n`;

    if (
      options.includeHistory !== false &&
      character.developmentHistory.length > 0
    ) {
      text += `HISTORIA ROZWOJU:\n`;
      character.developmentHistory.forEach((entry) => {
        text += `${entry.timestamp.toLocaleDateString('pl-PL')}: ${entry.description}\n`;
      });
    }

    return text;
  }

  // Generate QR code data for character sharing
  generateQRData(character: Character): string {
    const compactData = {
      n: character.name,
      o: character.occupation,
      a: character.age,
      s: [
        character.str,
        character.dex,
        character.con,
        character.app,
        character.pow,
        character.edu,
        character.siz,
        character.int,
        character.luck,
      ],
      d: [character.hp, character.san, character.mp],
      v: this.CURRENT_VERSION,
    };

    return JSON.stringify(compactData);
  }

  // Import from QR code data
  importFromQRData(qrData: string): ImportResult {
    try {
      const data = JSON.parse(qrData);

      if (
        !data.n ||
        !data.o ||
        !data.s ||
        !Array.isArray(data.s) ||
        data.s.length !== 9
      ) {
        return {
          success: false,
          error: 'Nieprawidłowe dane QR. Kod może być uszkodzony.',
        };
      }

      const character: Character = {
        id: `imported_${Date.now()}`,
        name: data.n,
        occupation: data.o,
        age: data.a || 0,
        str: data.s[0],
        dex: data.s[1],
        con: data.s[2],
        app: data.s[3],
        pow: data.s[4],
        edu: data.s[5],
        siz: data.s[6],
        int: data.s[7],
        luck: data.s[8],
        hp: data.d?.[0] || Math.floor((data.s[2] + data.s[6]) / 10),
        san: data.d?.[1] || data.s[4],
        mp: data.d?.[2] || Math.floor(data.s[4] / 5),
        skills: this.getDefaultSkills(),
        background: '',
        // NOWE POLA dla lokalnej gry przy stole
        playerName: data.p || 'Imported Player',
        campaignId: data.c || undefined,
        isActive: false,
        lastUsed: new Date(),
        notes: data.notes || '',
        experience: {
          totalXP: data.x || 0,
          availableXP: data.x || 0,
          earnedThisSession: 0,
          maxEarnedThisSession: 3,
        },
        developmentHistory: [],
      };

      return {
        success: true,
        character,
        warnings: [
          'Import z QR zawiera tylko podstawowe dane. Umiejętności zostały zresetowane do wartości domyślnych.',
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Błąd podczas odczytu QR: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
      };
    }
  }

  // Bulk export multiple characters
  exportMultipleCharacters(
    characters: Character[],
    options: Partial<ExportOptions> = {}
  ): void {
    const exportData = {
      version: this.CURRENT_VERSION,
      exportDate: new Date(),
      characters: characters.map((char) =>
        this.prepareCharacterForExport(char, options)
      ),
      metadata: {
        appVersion: this.APP_VERSION,
        creator: 'Zew Cthulhu App 2.0',
        count: characters.length,
        campaign: options.campaign,
        notes: options.notes,
      },
    };

    const content = JSON.stringify(exportData, null, 2);
    const filename = `characters_backup_${new Date().toISOString().split('T')[0]}.json`;

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Import multiple characters
  importMultipleCharacters(jsonData: string): {
    success: boolean;
    characters?: Character[];
    errors?: string[];
    warnings?: string[];
  } {
    try {
      const data = JSON.parse(jsonData);

      if (!data.characters || !Array.isArray(data.characters)) {
        return {
          success: false,
          errors: ['Nieprawidłowy format pliku. Oczekiwano tablicy postaci.'],
        };
      }

      type ImportSuccess = {
        success: true;
        character: Character;
        index: number;
      };
      type ImportFailure = { success: false; error: string; index: number };
      type ImportAttempt = ImportSuccess | ImportFailure;

      const results: ImportAttempt[] = data.characters.map(
        (charData: unknown, index: number): ImportAttempt => {
          try {
            const character = this.processImportedCharacter(charData);
            return { success: true, character, index };
          } catch (error) {
            return {
              success: false,
              error: `Postać ${index + 1}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
              index,
            };
          }
        }
      );

      const successful = results.filter((r): r is ImportSuccess => r.success);
      const failed = results.filter((r): r is ImportFailure => !r.success);

      return {
        success: successful.length > 0,
        characters: successful.map((r) => r.character),
        errors: failed.map((r) => r.error),
        warnings:
          data.version !== this.CURRENT_VERSION
            ? [
                `Import z wersji ${data.version}. Mogą wystąpić problemy kompatybilności.`,
              ]
            : undefined,
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          `Błąd podczas importu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
        ],
      };
    }
  }

  // Prepare character for export (filter out unwanted data)
  private prepareCharacterForExport(
    character: Character,
    options: Partial<ExportOptions>
  ): Character {
    const exportChar = { ...character };

    if (options.includeHistory === false) {
      exportChar.developmentHistory = [];
    }

    return exportChar;
  }

  // Validate import data structure
  private validateImportData(data: unknown): data is CharacterExportData {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;

    if (!obj.version || !obj.character || typeof obj.character !== 'object')
      return false;

    const char = obj.character as Record<string, unknown>;
    return (
      typeof char.name === 'string' &&
      typeof char.occupation === 'string' &&
      typeof char.str === 'number' &&
      typeof char.dex === 'number' &&
      typeof char.con === 'number'
    );
  }

  // Process imported character (convert dates, validate data)
  private processImportedCharacter(characterData: unknown): Character {
    if (!characterData || typeof characterData !== 'object') {
      throw new Error('Invalid character data');
    }

    const data = characterData as Partial<Character> & Record<string, unknown>;

    // Process development history with proper types matching Character interface
    const rawHistory = Array.isArray(data.developmentHistory)
      ? data.developmentHistory
      : [];
    const developmentHistory = rawHistory.map(
      (entry: unknown, index: number) => {
        if (!entry || typeof entry !== 'object') {
          return {
            id: `imported_${index}`,
            timestamp: new Date(),
            type: 'special' as const,
            target: 'Unknown',
            oldValue: 0,
            newValue: 0,
            xpCost: 0,
            description: 'Imported entry',
          };
        }
        const e = entry as Record<string, unknown>;
        return {
          id: typeof e.id === 'string' ? e.id : `imported_${index}`,
          timestamp: e.timestamp
            ? new Date(e.timestamp as string | number | Date)
            : new Date(),
          type:
            (e.type as 'skill' | 'attribute' | 'new_skill' | 'special') ||
            'special',
          target: typeof e.target === 'string' ? e.target : 'Unknown',
          oldValue: typeof e.oldValue === 'number' ? e.oldValue : 0,
          newValue: typeof e.newValue === 'number' ? e.newValue : 0,
          xpCost: typeof e.xpCost === 'number' ? e.xpCost : 0,
          description: typeof e.description === 'string' ? e.description : '',
        };
      }
    );

    const character: Character = {
      ...(data as Partial<Character>),
      id: typeof data.id === 'string' ? data.id : `imported_${Date.now()}`,
      name: typeof data.name === 'string' ? data.name : 'Unknown',
      occupation:
        typeof data.occupation === 'string' ? data.occupation : 'Unknown',
      age: typeof data.age === 'number' ? data.age : 0,
      str: typeof data.str === 'number' ? data.str : 50,
      dex: typeof data.dex === 'number' ? data.dex : 50,
      con: typeof data.con === 'number' ? data.con : 50,
      app: typeof data.app === 'number' ? data.app : 50,
      pow: typeof data.pow === 'number' ? data.pow : 50,
      edu: typeof data.edu === 'number' ? data.edu : 50,
      siz: typeof data.siz === 'number' ? data.siz : 50,
      int: typeof data.int === 'number' ? data.int : 50,
      luck: typeof data.luck === 'number' ? data.luck : 50,
      hp: typeof data.hp === 'number' ? data.hp : 10,
      san: typeof data.san === 'number' ? data.san : 50,
      mp: typeof data.mp === 'number' ? data.mp : 10,
      skills:
        data.skills && typeof data.skills === 'object'
          ? data.skills
          : this.getDefaultSkills(),
      background: typeof data.background === 'string' ? data.background : '',
      playerName:
        typeof data.playerName === 'string' ? data.playerName : 'Unknown',
      isActive: typeof data.isActive === 'boolean' ? data.isActive : false,
      lastUsed: data.lastUsed
        ? new Date(data.lastUsed as string | number | Date)
        : new Date(),
      notes: typeof data.notes === 'string' ? data.notes : '',
      developmentHistory,
      experience:
        data.experience && typeof data.experience === 'object'
          ? data.experience
          : {
              totalXP: 0,
              availableXP: 0,
              earnedThisSession: 0,
              maxEarnedThisSession: 3,
            },
    } as Character;

    return character;
  }

  // Check version compatibility
  private checkVersionCompatibility(importVersion: string): string[] {
    const warnings: string[] = [];

    if (importVersion !== this.CURRENT_VERSION) {
      warnings.push(
        `Postać została wyeksportowana z wersji ${importVersion}. Aktualna wersja to ${this.CURRENT_VERSION}.`
      );

      // Add specific compatibility warnings
      const [major, minor] = importVersion.split('.').map(Number);
      const [currentMajor, currentMinor] =
        this.CURRENT_VERSION.split('.').map(Number);

      if (major < currentMajor) {
        warnings.push(
          'Import z starszej wersji głównej. Niektóre funkcje mogą nie działać poprawnie.'
        );
      }

      if (major === currentMajor && minor < currentMinor) {
        warnings.push(
          'Import z starszej wersji pomocniczej. Niektóre nowe funkcje mogą być niedostępne.'
        );
      }
    }

    return warnings;
  }

  // Sanitize filename for download
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-_]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  // Get default skills (should match the ones in character-wizard)
  private getDefaultSkills(): { [key: string]: number } {
    return {
      Gadanina: 5,
      Perswazja: 10,
      'Urok Osobisty': 15,
      Zastraszanie: 15,
      Psychologia: 10,
      'Walka Wręcz': 50,
      Unik: 0,
      Skakanie: 20,
      Pływanie: 20,
      Wspinaczka: 20,
      Rzucanie: 20,
      Spostrzegawczość: 25,
      Nasłuchiwanie: 20,
      Tropienie: 10,
      Ukrywanie: 20,
      Mechanika: 10,
      Elektryka: 10,
      Ślusarstwo: 1,
      'Sztuka/Rzemiosło': 5,
      'Korzystanie z Bibliotek': 20,
      Historia: 5,
      Nauka: 1,
      'Język Ojczysty': 0,
      'Język Obcy': 1,
      Medycyna: 1,
      'Pierwsza Pomoc': 30,
      Psychoanaliza: 1,
      'Mity Cthulhu': 0,
      Okultyzm: 5,
      Nawigacja: 10,
      Pilotowanie: 1,
      'Korzystanie z Komputerów': 5,
      Prawo: 5,
      Księgowość: 5,
      Antropologia: 1,
      Archeologia: 1,
      'Wiedza o Naturze': 10,
      'Sztuka Przetrwania': 10,
      'Prowadzenie Samochodu': 20,
      Jezdziectwo: 5,
      Majętność: 0,
      'Broń Palna': 20,
      'Broń Palna (Krótka)': 20,
      'Broń Palna (Karabin/Strzelba)': 25,
    };
  }
}

export const characterImportExport = new CharacterImportExportSystem();
