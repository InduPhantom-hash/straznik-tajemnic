'use client';

import { useState, useCallback } from 'react';
import type { Message, Character, Campaign, HotSeatConfig } from '@/lib/types';
import type { FullGameSave } from '@/lib/full-game-save-manager';
import { normalizePdfMemory, type PdfMemory } from './usePdfMemory';
import type { ActiveGameState } from '@/lib/types';
import type { AISettings } from '@/lib/ai-settings/types';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { migrateEquipmentCatalog } from '@/lib/equipment-catalog';
import type { EquipmentVisualEra } from '@/lib/types';

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
  handleLoadFullSave: (save: FullGameSave) => void;
  handleStartNewGame: () => void;
}

interface UseFullSaveOptions {
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
  } = options;

  const [showFullSaveModal, setShowFullSaveModal] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'save' | 'load'>('save');
  const [sessionStartTime] = useState<string>(new Date().toISOString());

  const handleLoadFullSave = useCallback(
    (save: FullGameSave) => {
      try {
        clearDeclarations?.();
        // Wczytaj wiadomości
        const loadedMessages: Message[] = save.messages.map((msg, idx) => ({
          id: `loaded_${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          illustrations: msg.illustrations || [],
          // Obrazy scen żyją w generatedImages (nie illustrations) - bez tego
          // wczytany save tracił ilustracje scen.
          generatedImages: msg.generatedImages || [],
        }));
        setMessages(loadedMessages);

        // Wczytaj ustawienia AI
        if (save.gameSettings?.aiSettings) {
          const loadedSettings = save.gameSettings.aiSettings;
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
        const migratedCharacters = save.characters.map((character) => ({
          ...character,
          equipment: migrateEquipmentCatalog(
            character.equipment,
            saveEquipmentEra
          ),
        }));
        setCharacters(migratedCharacters);
        if (save.activeCharacterId) {
          const activeChar = migratedCharacters.find(
            (c) => c.id === save.activeCharacterId
          );
          if (activeChar) {
            setActiveCharacter(activeChar);
          }
        }
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

        // Aktualizuj activeGameState
        setActiveGameState({
          currentCharacter: save.activeCharacterId
            ? save.characters.find((c) => c.id === save.activeCharacterId) ||
              null
            : null,
          campaign: save.activeCampaignId
            ? save.campaigns.find((c) => c.id === save.activeCampaignId) || null
            : null,
          session: null,
          players: [],
        });

        console.log(`✅ Wczytano save: ${save.name}`);
        alert(
          `Wczytano save: ${save.name}\n\nWiadomości: ${save.messages.length}\nPostacie: ${save.characters.length}\nKampanie: ${save.campaigns.length}`
        );
      } catch (error) {
        console.error("Błąd podczas wczytywania save'u:", error);
        alert("Wystąpił błąd podczas wczytywania save'u");
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
