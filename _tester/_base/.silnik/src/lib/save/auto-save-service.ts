import type { FullGameSave } from '@/lib/full-game-save-manager';
import type { AISettings } from '@/lib/ai-settings';
import { loadAISettings } from '@/lib/ai-settings';
import type {
  Character,
  Campaign,
  NPC,
  Location,
  HotSeatConfig,
  EquipmentVisualEra,
  Message as LibMessage,
  GameTime,
} from '@/lib/types';
import type { InvestigatorBoardState } from '@/types/investigator-board';
import type { PdfMemory } from '@/hooks/usePdfMemory';
import {
  collectSaveImages,
  applySaveImageUrls,
  dataUrlExtension,
  sanitizeHistoryForApi,
  sanitizeCharacterForApi,
  sanitizeNpcForApi,
} from '@/lib/chat-history-sanitizer';
import { loadStoredWorldSetup } from '@/lib/world-setup';
import { loadCampaignMemoryScope } from '@/core/memory/campaign-scope';

export interface GameTimeLike {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
}

export function generateSessionEndSaveName(
  characterName?: string,
  gameTime?: GameTime | GameTimeLike | null
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const investigator = characterName?.trim() || 'Badacz';

  const isValidNumber = (val: unknown): val is number =>
    typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val);

  let timeString = '';
  if (
    gameTime &&
    isValidNumber(gameTime.year) &&
    isValidNumber(gameTime.month) &&
    isValidNumber(gameTime.day) &&
    isValidNumber(gameTime.hour) &&
    isValidNumber(gameTime.minute)
  ) {
    // GameTime.month w konwencji silnika / time-manager to 0-11 (styczeń=0).
    // Jeśli month jest w przedziale 0-11, formatujemy go jako 1-12 (+1).
    // Jeśli z jakiegoś powodu przekazano już 1-12 (np. 12), zachowujemy 12.
    const monthNum =
      gameTime.month >= 0 && gameTime.month <= 11
        ? gameTime.month + 1
        : gameTime.month;

    timeString = `${gameTime.year}-${pad(monthNum)}-${pad(gameTime.day)} ${pad(gameTime.hour)}:${pad(gameTime.minute)}`;
  } else {
    const now = new Date();
    timeString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  return `Koniec sesji - ${investigator} - ${timeString}`;
}

export interface FullGameSaveDataInput {
  messages: Array<any>;
  locale?: 'pl' | 'en';
  aiSettings?: AISettings | null;
  equipmentVisualEra?: EquipmentVisualEra | string;
  characters: Character[];
  activeCharacterId?: string;
  hotSeatConfig?: HotSeatConfig | null;
  investigatorBoard?: InvestigatorBoardState;
  campaigns?: Campaign[];
  activeCampaignId?: string;
  npcs?: NPC[];
  locations?: Location[];
  currentLocationId?: string;
  pdfMemory?: PdfMemory;
  notes?: string;
  sessionStartTime?: string;
}

export interface PerformFullGameSaveOptions {
  saveName: string;
  saveNotes?: string;
  saveImages?: boolean;
  saveSettings?: boolean;
  currentLocale?: 'pl' | 'en';
  data?: FullGameSaveDataInput;
}

export interface PerformFullGameSaveResult {
  success: boolean;
  saveId: string;
  saveName: string;
  size: number;
  formattedSize: string;
  messageCount: number;
  imageCount: number;
  [key: string]: unknown;
}

export async function uploadSaveImage(
  saveId: string,
  userId: string,
  name: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${name}.${dataUrlExtension(dataUrl)}`;
    const formData = new FormData();
    formData.append('images', blob, fileName);

    const uploadRes = await fetch(
      `/api/game-save/upload-images?saveId=${saveId}&userId=${userId}`,
      { method: 'POST', body: formData }
    );
    if (!uploadRes.ok) return null;
    const data = await uploadRes.json();
    return data?.images?.[0]?.url ?? null;
  } catch (e) {
    console.warn(`Image upload ${name} failed:`, e);
    return null;
  }
}

export async function performFullGameSave(
  options: PerformFullGameSaveOptions
): Promise<PerformFullGameSaveResult> {
  const {
    saveName,
    saveNotes = '',
    saveImages = true,
    saveSettings = true,
    currentLocale = 'pl',
    data,
  } = options;

  if (!saveName || !saveName.trim()) {
    throw new Error('Nazwa zapisu jest wymagana');
  }

  if (!data) {
    throw new Error('Brak danych do zapisania');
  }

  const userId = 'local';
  const saveId = `save_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 1. Zbierz base64 obrazy z historii
  const imageRefs = collectSaveImages(data.messages || []);

  // 2. Upload best-effort (tylko gdy saveImages === true)
  const urlByName: Record<string, string | null> = {};
  if (saveImages) {
    for (const ref of imageRefs) {
      urlByName[ref.name] = await uploadSaveImage(
        saveId,
        userId,
        ref.name,
        ref.dataUrl
      );
    }
  }

  // 3. Podmień base64 na URL-e plików + sanityzacja
  const messagesWithUrls = applySaveImageUrls(
    data.messages || [],
    imageRefs,
    urlByName
  );
  const safeMessages = sanitizeHistoryForApi(
    messagesWithUrls as unknown as LibMessage[]
  );

  // 4. Katalog obrazów save'u (miniatura + licznik) - tylko z uploadowanych URL-i
  const images: FullGameSave['images'] = imageRefs
    .filter((ref) => urlByName[ref.name])
    .map((ref, idx) => ({
      id: `img_${ref.msgIndex}_${idx}`,
      url: urlByName[ref.name] as string,
      gcsPath: urlByName[ref.name] as string,
      prompt: '',
      timestamp: new Date().toISOString(),
      type: 'illustration',
      messageId: `msg_${ref.msgIndex}`,
    }));

  const sessionCost = data.aiSettings?.costControl?.sessionCost || 0;

  let npcs = data.npcs;
  if (!npcs && typeof window !== 'undefined') {
    try {
      npcs = JSON.parse(localStorage.getItem('gm_npcs') || '[]');
    } catch {
      npcs = [];
    }
  }

  let locations = data.locations;
  if (!locations && typeof window !== 'undefined') {
    try {
      locations = JSON.parse(localStorage.getItem('gm_locations') || '[]');
    } catch {
      locations = [];
    }
  }

  let campaigns = data.campaigns;
  if (!campaigns && typeof window !== 'undefined') {
    try {
      campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    } catch {
      campaigns = [];
    }
  }

  let activeCharacterId = data.activeCharacterId;
  if (!activeCharacterId && data.characters && data.characters.length > 0) {
    activeCharacterId = data.characters[0].id;
  }

  let activeCampaignId = data.activeCampaignId;
  if (!activeCampaignId && typeof window !== 'undefined') {
    try {
      const savedState = localStorage.getItem('active_game_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        activeCampaignId = parsed.campaign?.id;
      }
    } catch {
      // ignore
    }
  }

  const saveData = {
    id: saveId,
    name: saveName.trim(),
    userId,
    locale: data.locale ?? currentLocale,
    messages: safeMessages,
    images,
    gameSettings: {
      aiSettings: saveSettings
        ? (data.aiSettings || (typeof window !== 'undefined' ? loadAISettings() : ({} as AISettings)))
        : ({} as AISettings),
    },
    equipmentVisualEra: data.equipmentVisualEra as EquipmentVisualEra | undefined,
    worldSetup: loadStoredWorldSetup(),
    characters: (data.characters || [])
      .map((c) => sanitizeCharacterForApi(c))
      .filter((c): c is Character => c !== null),
    activeCharacterId,
    hotSeatConfig: data.hotSeatConfig,
    investigatorBoard: data.investigatorBoard,
    campaigns: campaigns || [],
    activeCampaignId,
    campaignMemory: loadCampaignMemoryScope() ?? undefined,
    npcs: (npcs || []).map((n) => sanitizeNpcForApi(n)),
    locations: locations || [],
    currentLocationId: data.currentLocationId,
    pdfMemory: data.pdfMemory,
    notes: saveNotes,
    sessionStartTime: data.sessionStartTime,
    sessionCost,
  };

  const response = await fetch('/api/game-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saveData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Błąd zapisu gry');
  }

  const result = await response.json();
  return result as PerformFullGameSaveResult;
}
