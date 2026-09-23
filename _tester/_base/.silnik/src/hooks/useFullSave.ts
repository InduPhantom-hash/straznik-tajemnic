'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, Character, Campaign, HotSeatConfig } from '@/lib/types';
import type { FullGameSave } from '@/lib/full-game-save-manager';
import { normalizePdfMemory, type PdfMemory } from './usePdfMemory';
import type { ActiveGameState } from '@/lib/types';
import type { AISettings } from '@/lib/ai-settings/types';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { migrateEquipmentCatalog } from '@/lib/equipment-catalog';
import type { EquipmentVisualEra } from '@/lib/types';
import { clearStoredWorldSetup, storeWorldSetup } from '@/lib/world-setup';
import { ensureCharacterDossier } from '@/lib/journal/dossier-migration';
import { toast } from '@/components/ui/use-toast';
import {
  clearCampaignMemoryScope,
  isCampaignMemoryScope,
  storeCampaignMemoryScope,
} from '@/core/memory/campaign-scope';

/**
 * Hook do zarządzania zapisem i wczytywaniem gry
 * Wyodrębniony z page.tsx dla zgodności z GEMINI.md (max 200 linii/plik)
 */

/**
 * Zapis do localStorage odporny na `QuotaExceededError`. Save'y gry niosą inline
 * base64 (portrety, ilustracje) - pojedynczy `setItem` mógł przekroczyć quota i
 * wyjątkiem wywrócić CAŁE wczytywanie. Stan w React jest ustawiany niezależnie,
 * więc cicha degradacja persystencji jest akceptowalna (gra działa w tej sesji).
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`⚠️ Nie udało się zapisać '${key}' do localStorage:`, e);
  }
}

export interface UseFullSaveReturn {
  showFullSaveModal: boolean;
  setShowFullSaveModal: React.Dispatch<React.SetStateAction<boolean>>;
  saveModalMode: 'save' | 'load';
  setSaveModalMode: React.Dispatch<React.SetStateAction<'save' | 'load'>>;
  sessionStartTime: string;
  handleLoadFullSave: (save: FullGameSave) => Promise<boolean>;
  handleStartNewGame: () => void;
}

export interface FullSaveRouterLike {
  replace: (pathname: string, options?: { locale?: 'pl' | 'en' }) => void;
}

export interface UseFullSaveOptions {
  equipmentVisualEra?: EquipmentVisualEra;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  setPdfMemory: React.Dispatch<React.SetStateAction<PdfMemory>>;
  setActiveGameState: React.Dispatch<React.SetStateAction<ActiveGameState>>;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings | null>>;
  stopCurrentAudio: () => void;
  restoreHotSeatConfig?: (
    config: HotSeatConfig | undefined,
    characters: Character[]
  ) => boolean;
  clearDeclarations?: () => void;
  currentLocale?: 'pl' | 'en';
  router?: FullSaveRouterLike;
  pathname?: string;
}

export function useFullSave(options: UseFullSaveOptions): UseFullSaveReturn {
  const {
    setMessages,
    setCharacters,
    setActiveCharacter,
    setCampaigns,
    setPdfMemory,
    setActiveGameState,
    setAiSettings,
    stopCurrentAudio,
    restoreHotSeatConfig,
    clearDeclarations,
    equipmentVisualEra,
    currentLocale,
    router,
    pathname,
  } = options;

  const [showFullSaveModal, setShowFullSaveModal] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'save' | 'load'>('save');
  const [sessionStartTime] = useState<string>(new Date().toISOString());
  const restoreRequest = useRef<{ save: FullGameSave; requestId: string } | null>(null);
  const loading = useRef(false);

  const handleLoadFullSave = useCallback(
    async (save: FullGameSave): Promise<boolean> => {
      if (loading.current) return false;
      loading.current = true;
      try {
        if (restoreRequest.current?.save !== save) {
          restoreRequest.current = { save, requestId: crypto.randomUUID() };
        }
        const response = await fetch('/api/memory/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: restoreRequest.current.requestId,
            snapshot: save.memorySnapshot,
            scope: save.campaignMemory,
            messages: save.messages,
            characters: save.characters,
            activeCharacterId: save.activeCharacterId,
            id: save.id,
            name: save.name,
          }),
        });
        const restored = await response.json();
        if (!response.ok || !isCampaignMemoryScope(restored.scope)) {
          throw new Error(restored.error || 'Nie udało się odtworzyć pamięci');
        }
        const campaignMemory = restored.scope;
        clearDeclarations?.();
        // Wczytaj wiadomości
        const loadedMessages: Message[] = save.messages.map((msg, idx) => ({
          id: msg.id || `loaded_${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          illustrations: msg.illustrations || [],
          // Obrazy scen żyją w generatedImages (nie illustrations) - bez tego
          // wczytany save tracił ilustracje scen.
          generatedImages: msg.generatedImages || [],
          // Status urwanej narracji (MAX_TOKENS + zamówiona kontynuacja) musi
          // przeżyć pełny load, inaczej przycisk "Kontynuuj narrację" znikał.
          finishReason: msg.finishReason,
          continuationRequested: msg.continuationRequested,
          mechanicsContext: msg.mechanicsContext,
        }));
        setMessages(loadedMessages);

        // Wczytaj ustawienia AI
        if (save.gameSettings?.aiSettings) {
          const loadedSettings = {
            ...save.gameSettings.aiSettings,
            sessionId: campaignMemory.playthroughId,
            costControl: save.gameSettings.aiSettings.costControl
              ? { ...save.gameSettings.aiSettings.costControl } : undefined,
          } as AISettings & { sessionId: string };
          // Guard: stare/puste save'y (zapisane bez ustawień AI) mogą nie mieć
          // `costControl` - bez tego przypisanie .sessionCost rzucało wyjątkiem.
          if (
            loadedSettings.costControl &&
            save.sessionMetadata?.sessionCost !== undefined
          ) {
            loadedSettings.costControl.sessionCost =
              save.sessionMetadata.sessionCost;
          }

          setAiSettings(loadedSettings);
          safeSetItem('ai_settings', JSON.stringify(loadedSettings));
        }

        // Wczytaj postacie
        const saveEquipmentEra = save.equipmentVisualEra ?? equipmentVisualEra;
        const migratedCharacters = save.characters.map((character) =>
          ensureCharacterDossier({
            ...character,
            equipment: migrateEquipmentCatalog(
              character.equipment,
              saveEquipmentEra
            ),
            investigatorBoard: character.investigatorBoard || save.investigatorBoard,
          })
        );
        setCharacters(migratedCharacters);
        setActiveCharacter(migratedCharacters.find((c) => c.id === save.activeCharacterId) ?? null);
        // Postacie niosą portrety inline (~MB base64). Pisanie ich wprost do
        // localStorage przekraczało quota i wywalało CAŁE wczytywanie. Przez
        // `persistCharacters`: obrazy wycinane do IndexedDB, roster lekki,
        // hydracja przy następnym renderze (page.tsx hydrateCharacterImages).
        persistCharacters(migratedCharacters);

        // Stare save'y bez tego pola pozostają zgodne i nie uruchamiają
        // automatycznego zgadywania przypisania postaci.
        restoreHotSeatConfig?.(save.hotSeatConfig, migratedCharacters);

        // Wczytaj kampanie
        setCampaigns(save.campaigns);
        safeSetItem('campaigns', JSON.stringify(save.campaigns));

        // Wczytaj PDF Memory
        if (save.pdfMemory) {
          const migratedPdfMemory = normalizePdfMemory(save.pdfMemory);
          setPdfMemory(migratedPdfMemory);
          safeSetItem('pdf_memory', JSON.stringify(migratedPdfMemory));
        }

        if (save.worldSetup) {
          storeWorldSetup(save.worldSetup);
        } else {
          clearStoredWorldSetup();
        }

        storeCampaignMemoryScope(campaignMemory);

        // Przywróć listę NPC oraz lokacji z pliku zapisu do pamięci podręcznej
        if (Array.isArray(save.npcs)) {
          safeSetItem('gm_npcs', JSON.stringify(save.npcs));
        }
        if (Array.isArray(save.locations)) {
          safeSetItem('gm_locations', JSON.stringify(save.locations));
        }

        // Aktualizuj activeGameState
        setActiveGameState({
          currentCharacter: save.activeCharacterId
            ? migratedCharacters.find((c) => c.id === save.activeCharacterId) ||
              null
            : null,
          campaign: save.activeCampaignId
            ? save.campaigns.find((c) => c.id === save.activeCampaignId) || null
            : null,
          session: null,
          players: [],
        });

        // Auto-synchronizacja języka przy wczytywaniu zapisu (Issue #490)
        const activeLocale: 'pl' | 'en' =
          currentLocale === 'en' || currentLocale === 'pl'
            ? currentLocale
            : typeof window !== 'undefined' &&
              localStorage.getItem('language_selected') === 'en'
            ? 'en'
            : 'pl';

        if (
          (save.locale === 'pl' || save.locale === 'en') &&
          save.locale !== activeLocale
        ) {
          safeSetItem('language_selected', save.locale);
          if (typeof document !== 'undefined') {
            document.cookie = `NEXT_LOCALE=${save.locale};path=/;max-age=31536000;SameSite=Lax`;
          }
          if (router) {
            router.replace(pathname || '/', { locale: save.locale });
          }
        }

        console.log(`✅ Wczytano save: ${save.name}`);
        toast({
          title: `Wczytano: ${save.name}`,
          description: `Wiadomości: ${save.messages.length} · Postacie: ${save.characters.length} · Kampanie: ${save.campaigns.length}`,
        });
        restoreRequest.current = null;
        return true;
      } catch (error) {
        console.error("Błąd podczas wczytywania save'u:", error);
        toast({
          title: "Błąd wczytywania save'u",
          description: error instanceof Error ? error.message : "Wystąpił błąd podczas wczytywania save'u",
          variant: 'destructive',
        });
        return false;
      } finally {
        loading.current = false;
      }
    },
    [
      setMessages,
      setCharacters,
      setActiveCharacter,
      setCampaigns,
      setPdfMemory,
      setActiveGameState,
      setAiSettings,
      restoreHotSeatConfig,
      clearDeclarations,
      equipmentVisualEra,
      currentLocale,
      router,
      pathname,
    ]
  );

  const handleStartNewGame = useCallback(() => {
    if (
      confirm(
        'Czy na pewno chcesz rozpocząć nową grę? Wszystkie niezapisane dane zostaną utracone.'
      )
    ) {
      clearDeclarations?.();
      // Wyczyść wiadomości
      setMessages([]);

      // Wyczyść pamięć PDF
      setPdfMemory({});
      clearStoredWorldSetup();
      clearCampaignMemoryScope();

      // Zatrzymaj aktualny audio
      stopCurrentAudio();

      // Wyczyść stan gry
      setActiveGameState({
        currentCharacter: null,
        campaign: null,
        session: null,
        players: [],
      });

      // Wyczyść pamięć PDF w API
      fetch('/api/pdf-memory', { method: 'DELETE' }).catch(console.error);

      // Dodaj wiadomość powitalną
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          '🎲 Witaj w nowej przygodzie! Przygotuj swoją postać i rozpocznij eksplorację tajemnic. Co chcesz zrobić?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [
    clearDeclarations,
    setMessages,
    setPdfMemory,
    setActiveGameState,
    stopCurrentAudio,
  ]);

  return {
    showFullSaveModal,
    setShowFullSaveModal,
    saveModalMode,
    setSaveModalMode,
    sessionStartTime,
    handleLoadFullSave,
    handleStartNewGame,
  };
}
