import { AISettings } from './ai-settings';
import {
  Character,
  Campaign,
  NPC,
  Location,
  MessageIllustration,
  HotSeatConfig,
  EquipmentVisualEra,
} from './types';

// Lokalnie zdefiniowany interfejs Message
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  illustrations?: MessageIllustration[];
  // URL-e/base64 wygenerowanych obrazów scen (pole `generatedImages` z @/lib/types).
  // Zapisywane do save'u, więc MUSZĄ tu być, by ścieżka load je odtworzyła.
  generatedImages?: string[];
}

/**
 * Interface dla pełnego save'u gry
 * Zawiera wszystkie dane potrzebne do przywrócenia stanu gry
 */
export interface FullGameSave {
  // === Metadata ===
  id: string;
  name: string;
  version: string;
  createdAt: string;
  lastUpdated: string;
  userId: string;

  // === Historia sesji ===
  messages: Message[];

  // === Wygenerowane obrazy ===
  images: Array<{
    id: string;
    url: string;
    gcsPath: string;
    prompt: string;
    timestamp: string;
    type: 'character' | 'location' | 'item' | 'creature' | 'illustration';
    messageId?: string; // Powiązanie z wiadomością
  }>;

  // === Opisy i notatki ===
  descriptions: Array<{
    id: string;
    type: string;
    content: string;
    timestamp: string;
    relatedTo?: string; // ID powiązanego elementu (postać, lokacja, etc.)
  }>;

  // === Ustawienia gry ===
  gameSettings: {
    aiSettings: AISettings;
  };
  /** Profil assetów katalogowych potrzebny do poprawnej migracji starego ekwipunku. */
  equipmentVisualEra?: EquipmentVisualEra;

  // === Postacie ===
  characters: Character[];
  activeCharacterId?: string;
  /** Jawne przypisania dwóch graczy do postaci; brak w starszych save'ach. */
  hotSeatConfig?: HotSeatConfig;

  // === Kampanie ===
  campaigns: Campaign[];
  activeCampaignId?: string;

  // === NPC ===
  npcs: NPC[];

  // === Lokacje ===
  locations: Location[];
  currentLocationId?: string;

  // === Stan aktywnej gry ===
  activeGameState: {
    currentScene?: string;
    storyProgress?: Record<string, unknown>;
    gameTime?: string;
    sessionNumber?: number;
    totalPlayTime?: number;
  };

  // === PDF Memory ===
  pdfMemory: {
    rulesUrl?: string;
    rulesGeminiFileUri?: string;
    rulesFileName?: string;
    adventureUrl?: string;
    adventureGeminiFileUri?: string;
    adventureFileName?: string;
    rulesIndexedLocally?: boolean;
    rulesIndexedChunks?: number;
    adventureIndexedLocally?: boolean;
    adventureIndexedChunks?: number;
    /** @deprecated Kompatybilność save'ów sprzed lokalnego RAG. */
    rulesIndexedToPinecone?: boolean;
    /** @deprecated Kompatybilność save'ów sprzed lokalnego RAG. */
    adventureIndexedToPinecone?: boolean;
  };

  // === GM Tools ===
  // IND-103 (sesja 69) dropped legacy code dla tych modułów; pola zostają jako
  // opaque `Record` dla backward compat (stare save'y w localStorage mogą zawierać dane).
  gmTools: {
    initiativeTracker?: Record<string, unknown>;
    npcManager?: Record<string, unknown>;
    locationManager?: Record<string, unknown>;
  };

  // === Inne dane ===
  notes: string;
  sessionMetadata: {
    startTime: string;
    endTime?: string;
    duration?: number; // w minutach
    messageCount: number;
    imageCount: number;
    sessionCost?: number; // Koszt tej sesji
  };
}

/**
 * Manager do zarządzania pełnym save/load systemu
 */
export class FullGameSaveManager {
  private static readonly SAVE_VERSION = '2.0.0';
  private static readonly LOCAL_STORAGE_KEY = 'zew-game-saves-list';

  /**
   * Tworzy pełny save gry
   */
  static createFullSave(data: {
    name: string;
    /**
     * Opcjonalne ID nadane przez klienta. Pozwala wygenerować saveId PRZED zapisem,
     * by obrazy uploadować do folderu /game-saves/{userId}/{saveId}/ i wstawić ich
     * URL-e do save.json (zamiast ciężkiego base64). Brak → generujemy jak dotąd.
     */
    id?: string;
    userId: string;
    messages: Message[];
    images?: FullGameSave['images'];
    descriptions?: FullGameSave['descriptions'];
    gameSettings: { aiSettings: AISettings };
    equipmentVisualEra?: EquipmentVisualEra;
    characters: Character[];
    activeCharacterId?: string;
    hotSeatConfig?: HotSeatConfig;
    campaigns: Campaign[];
    activeCampaignId?: string;
    npcs: NPC[];
    locations: Location[];
    currentLocationId?: string;
    activeGameState?: FullGameSave['activeGameState'];
    pdfMemory?: FullGameSave['pdfMemory'];
    gmTools?: FullGameSave['gmTools'];
    notes?: string;
    sessionStartTime?: string;
    sessionCost?: number; // Koszt tej sesji
  }): FullGameSave {
    const now = new Date().toISOString();
    const id =
      data.id ||
      `save_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return {
      // Metadata
      id,
      name: data.name,
      version: this.SAVE_VERSION,
      createdAt: now,
      lastUpdated: now,
      userId: data.userId,

      // Historia
      messages: data.messages,

      // Obrazy
      images: data.images || [],

      // Opisy
      descriptions: data.descriptions || [],

      // Ustawienia
      gameSettings: data.gameSettings,
      equipmentVisualEra: data.equipmentVisualEra,

      // Postacie
      characters: data.characters,
      activeCharacterId: data.activeCharacterId,
      hotSeatConfig: data.hotSeatConfig,

      // Kampanie
      campaigns: data.campaigns,
      activeCampaignId: data.activeCampaignId,

      // NPC
      npcs: data.npcs,

      // Lokacje
      locations: data.locations,
      currentLocationId: data.currentLocationId,

      // Stan gry
      activeGameState: data.activeGameState || {},

      // PDF Memory
      pdfMemory: data.pdfMemory || {},

      // GM Tools
      gmTools: data.gmTools || {},

      // Notatki
      notes: data.notes || '',

      // Metadata sesji
      sessionMetadata: {
        startTime: data.sessionStartTime || now,
        endTime: now,
        duration: data.sessionStartTime
          ? Math.floor(
              (new Date().getTime() -
                new Date(data.sessionStartTime).getTime()) /
                60000
            )
          : 0,
        messageCount: data.messages.length,
        imageCount: data.images?.length || 0,
        sessionCost: data.sessionCost || 0, // Koszt tej sesji
      },
    };
  }

  /**
   * Zapisuje listę save'ów w localStorage (tylko metadata)
   */
  static saveSavesList(
    saves: Array<{
      id: string;
      name: string;
      createdAt: string;
      lastUpdated: string;
      userId: string;
      messageCount: number;
      imageCount: number;
      size?: number;
    }>
  ) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(saves));
    }
  }

  /**
   * Pobiera listę save'ów z localStorage
   */
  static getSavesList(): Array<{
    id: string;
    name: string;
    createdAt: string;
    lastUpdated: string;
    userId: string;
    messageCount: number;
    imageCount: number;
    size?: number;
  }> {
    if (typeof window === 'undefined') return [];

    const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("Błąd podczas parsowania listy save'ów:", error);
      return [];
    }
  }

  /**
   * Dodaje save do listy
   */
  static addToSavesList(save: FullGameSave) {
    const list = this.getSavesList();

    const metadata = {
      id: save.id,
      name: save.name,
      createdAt: save.createdAt,
      lastUpdated: save.lastUpdated,
      userId: save.userId,
      messageCount: save.sessionMetadata.messageCount,
      imageCount: save.sessionMetadata.imageCount,
    };

    // Usuń stary save o tym samym ID (jeśli istnieje)
    const filtered = list.filter((s) => s.id !== save.id);

    // Dodaj nowy
    filtered.unshift(metadata);

    this.saveSavesList(filtered);
  }

  /**
   * Usuwa save z listy
   */
  static removeFromSavesList(saveId: string) {
    const list = this.getSavesList();
    const filtered = list.filter((s) => s.id !== saveId);
    this.saveSavesList(filtered);
  }

  /**
   * Waliduje save przed wczytaniem
   */
  static validateSave(save: unknown): save is FullGameSave {
    if (!save || typeof save !== 'object') return false;

    // Sprawdź wymagane pola
    const requiredFields = [
      'id',
      'name',
      'version',
      'createdAt',
      'userId',
      'messages',
      'gameSettings',
      'characters',
      'campaigns',
      'npcs',
      'locations',
      'sessionMetadata',
    ];

    for (const field of requiredFields) {
      if (!(field in save)) {
        console.warn(`Brak wymaganego pola w save: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Migruje stary format save'u do nowego
   */
  static migrateLegacySave(oldSave: unknown): FullGameSave | null {
    try {
      // Sprawdź czy to stary format
      if (!oldSave || typeof oldSave !== 'object' || !('messages' in oldSave))
        return null;

      console.log("🔄 Migracja starego save'u do nowego formatu...");

      const legacy = oldSave as Partial<FullGameSave> & {
        aiSettings?: AISettings;
        notes?: string;
      };

      return this.createFullSave({
        name: legacy.name || 'Zmigrowana sesja',
        userId: legacy.userId || 'local',
        messages: legacy.messages || [],
        gameSettings: {
          aiSettings: legacy.aiSettings || ({} as AISettings),
        },
        characters: legacy.characters || [],
        activeCharacterId: legacy.activeCharacterId,
        hotSeatConfig: legacy.hotSeatConfig,
        campaigns: [],
        npcs: [],
        locations: [],
        notes: legacy.notes || '',
        sessionStartTime: legacy.createdAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Błąd podczas migracji save'u:", error);
      return null;
    }
  }

  /**
   * Kompresuje save do przesłania (opcjonalne)
   */
  static compressSave(save: FullGameSave): string {
    return JSON.stringify(save);
  }

  /**
   * Dekompresuje save
   */
  static decompressSave(compressed: string): FullGameSave | null {
    try {
      const save = JSON.parse(compressed);

      if (!this.validateSave(save)) {
        // Spróbuj migracji
        return this.migrateLegacySave(save);
      }

      return save;
    } catch (error) {
      console.error("Błąd podczas dekompresji save'u:", error);
      return null;
    }
  }

  /**
   * Pobiera rozmiar save'u w bajtach
   */
  static getSaveSize(save: FullGameSave): number {
    return new Blob([JSON.stringify(save)]).size;
  }

  /**
   * Formatuje rozmiar do czytelnej postaci
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Eksportuje save do pliku JSON (do pobrania lokalnie)
   */
  static exportToFile(save: FullGameSave) {
    const json = JSON.stringify(save, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${save.name.replace(/[^a-zA-Z0-9]/g, '_')}_${save.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Importuje save z pliku JSON
   */
  static async importFromFile(file: File): Promise<FullGameSave | null> {
    try {
      const text = await file.text();
      return this.decompressSave(text);
    } catch (error) {
      console.error("Błąd podczas importu save'u:", error);
      return null;
    }
  }
}

export default FullGameSaveManager;
