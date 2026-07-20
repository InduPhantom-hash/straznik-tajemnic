'use client';

import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Settings,
  User,
  BookOpen,
  Volume2,
  VolumeX,
  Users,
  Save,
  FolderOpen,
  Package,
  RotateCcw,
  Image as ImageIcon,
  LogOut,
} from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { SettingsModal } from '../ui/settings-modal';
import { CharacterDialog } from '../dialogs/CharacterDialog';
import { CharacterSheet } from '../ui/character-sheet';
import { deriveStats } from '../ui/character-sheet/utils/derive-stats';
import { SessionJournal } from '../ui/session-journal';

import { GMToolsPanel } from '../ui/gm-tools-panel';
import {
  SessionZeroModal,
  SessionZeroSettings,
} from '../ui/session-zero-modal';
import { HandoutGenerator } from '../ui/handout-generator';
import { AdventureSelector } from '../ui/adventure-selector';
import { EquipmentModal } from '../ui/equipment-modal';
import { NewAdventureModal } from '../ui/new-adventure-modal';

import {
  Character,
  ActiveGameState,
  HotSeatConfig,
  JournalEntry,
} from '@/lib/types';
import { AdventureContext, CustomAdventure } from '@/lib/adventures-data';
import { useResolvedPortrait } from '@/hooks/useResolvedPortrait';
import { getEraImageFilter } from '@/lib/era-visual-style';
import { mergeAdventureJournalEntries } from '@/lib/journal/shared-adventure-journal';
import type { AISettings } from '@/lib/ai-settings';

interface CthulhuSidebarProps {
  activeCharacter?: Character;
  characters?: Character[]; // Lista wszystkich postaci
  onCharacterSwitch?: (character: Character) => void;
  onCharacterCreate?: () => void;
  onCharacterManage?: () => void;
  onUpdateCharacter?: (character: Character) => void; // Dla dziennika
  onUpdateSharedJournal?: (journal: JournalEntry[]) => void;
  handleSendMessage?: (message: string) => void;
  activeGameState?: ActiveGameState | null;
  voiceFeatureAvailable?: boolean;
  voiceEnabled?: boolean;
  setVoiceEnabled?: (enabled: boolean) => void;
  isTTSEnabled?: boolean;
  setIsTTSEnabled?: (enabled: boolean) => void;
  onToggleNarrator?: (enabled: boolean) => void; // IND-258: trwały mute lektora (voiceSettings.enabled)
  queueStatus?: {
    queueLength: number;
    totalCharacters: number;
    processing: boolean;
  };
  onStartNewGame?: () => void;
  onNewAdventure?: () => void; // Powrót do kreatora bez zapisu (Nowa przygoda)
  onSaveAndNewAdventure?: () => void; // Zapisz sesję, potem powrót do kreatora
  onOpenGameSession?: () => void;
  onOpenGMTools?: (tool: string) => void; // Otwiera narzędzie GM
  onOpenDevelopmentPhase?: () => void; // IND-230: otwiera Fazę Rozwoju (rzuty na poprawę)
  markedSkillsCount?: number; // IND-230: liczba umiejętności oznaczonych do rozwoju
  onSaveGame?: () => void; // Zapisz grę (nowy system)
  onOpenHotSeat?: () => void; // Otwórz tryb Hot Seat
  onSessionZeroComplete?: () => void; // Callback po zakończeniu Sesji Zero
  registerOpenSessionZero?: (openFn: () => void) => void; // Rejestracja funkcji otwierającej Sesję Zero
  registerOpenAdventureSelector?: (openFn: () => void) => void; // Rejestracja funkcji otwierającej AdventureSelector
  hideSidebarPanel?: boolean; // Welcome: ukryj wizualny panel (komponent zostaje zamontowany, by hostować modale + rejestrację)
  onAdventureSelect?: (adventure: AdventureContext) => void; // Callback: przygoda była wybrana
  // Custom Adventures
  customAdventures?: CustomAdventure[];
  onUploadAdventure?: (file: File) => Promise<CustomAdventure | null>;
  onDeleteAdventure?: (id: string) => Promise<void>;
  isUploadingAdventure?: boolean;
  uploadProgressAdventure?: number;
  loadingStatusAdventure?: string;
  // Hot Seat config - potrzebny dla wspólnego dziennika (sharedJournal)
  hotSeatConfig?: HotSeatConfig;
  aiSettings?: AISettings;
  onUpdateAISettings?: (settings: AISettings) => void;
}

export const CthulhuSidebar: FC<CthulhuSidebarProps> = ({
  activeCharacter,
  characters,
  onCharacterSwitch,
  onCharacterCreate,
  onCharacterManage,
  onUpdateCharacter,
  onUpdateSharedJournal,
  handleSendMessage,
  activeGameState,
  voiceFeatureAvailable,
  voiceEnabled,
  setVoiceEnabled,
  isTTSEnabled,
  setIsTTSEnabled,
  onToggleNarrator,
  queueStatus,
  onStartNewGame,
  onNewAdventure,
  onSaveAndNewAdventure,
  onOpenGameSession,
  onOpenGMTools,
  onOpenDevelopmentPhase,
  markedSkillsCount = 0,
  onSaveGame,
  onOpenHotSeat,
  onSessionZeroComplete,
  registerOpenSessionZero,
  registerOpenAdventureSelector,
  hideSidebarPanel,
  onAdventureSelect,
  customAdventures,
  onUploadAdventure,
  onDeleteAdventure,
  isUploadingAdventure,
  uploadProgressAdventure = 0,
  loadingStatusAdventure = '',
  hotSeatConfig,
  aiSettings,
  onUpdateAISettings,
}) => {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showSessionZero, setShowSessionZero] = useState(false);
  const [showHandoutGenerator, setShowHandoutGenerator] = useState(false);
  const [showAdventureSelector, setShowAdventureSelector] = useState(false);
  const [showNewAdventureConfirm, setShowNewAdventureConfirm] = useState(false);
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string>();
  const [adventureContext, setAdventureContext] =
    useState<AdventureContext | null>(null);

  // System notyfikacji - nowe pozycje w dzienniku
  const [unseenJournalCount, setUnseenJournalCount] = useState(0);

  // Portret do panelu postaci - dociągany z IndexedDB gdy portraitUrl pusty
  // (wyścig hydratacji po starcie/wczytaniu gry, IND-262). Wspólna logika z
  // awatarami wiadomości w czacie - patrz useResolvedPortrait (#2b).
  const portraitSrc = useResolvedPortrait(activeCharacter);
  const inspectedCharacter =
    characters?.find((character) => character.id === inspectedCharacterId) ??
    activeCharacter;
  const sharedJournalEnabled =
    Boolean(hotSeatConfig?.enabled) && (characters?.length ?? 0) >= 2;
  const sharedJournal = useMemo(
    () =>
      sharedJournalEnabled
        ? mergeAdventureJournalEntries(
            characters ?? [],
            hotSeatConfig?.adventureJournalId
          )
        : undefined,
    [characters, hotSeatConfig?.adventureJournalId, sharedJournalEnabled]
  );
  const participantNames = useMemo(
    () =>
      sharedJournalEnabled
        ? (characters ?? []).map(
            (character) => character.playerName || character.name
          )
        : [],
    [characters, sharedJournalEnabled]
  );
  const journalEntryCount = sharedJournalEnabled
    ? (sharedJournal?.length ?? 0)
    : (activeCharacter?.journal?.length ?? 0);
  const journalStorageKey = sharedJournalEnabled
    ? `unseen_journal_${(characters ?? [])
        .map((character) => character.id)
        .sort()
        .join('_')}`
    : activeCharacter
      ? `unseen_${activeCharacter.id}`
      : null;

  // Zmiana tury synchronizuje domyślny widok tylko przy zamkniętych modalach.
  // Otwarta karta/ekwipunek może niezależnie oglądać drugiego badacza.
  useEffect(() => {
    if (!openDialog) setInspectedCharacterId(activeCharacter?.id);
  }, [activeCharacter?.id, openDialog]);

  // Śledzenie nowych pozycji
  useEffect(() => {
    if (!journalStorageKey) return;

    const stored = localStorage.getItem(journalStorageKey);
    const unseenData = stored ? JSON.parse(stored) : { journalSeen: 0 };

    // Oblicz ile nowych pozycji od ostatniego widzenia
    const newJournal = Math.max(0, journalEntryCount - unseenData.journalSeen);

    setUnseenJournalCount(newJournal);
  }, [journalEntryCount, journalStorageKey]);

  // Resetuj licznik po otwarciu modala
  useEffect(() => {
    if (!journalStorageKey) return;

    if (openDialog === 'journal') {
      const stored = localStorage.getItem(journalStorageKey);
      const unseenData = stored
        ? JSON.parse(stored)
        : { journalSeen: 0, inventorySeen: 0 };
      localStorage.setItem(
        journalStorageKey,
        JSON.stringify({ ...unseenData, journalSeen: journalEntryCount })
      );
      setUnseenJournalCount(0);
    }
  }, [journalEntryCount, journalStorageKey, openDialog]);

  // Rejestracja funkcji otwierającej Sesję Zero dla zewnętrznych komponentów
  useEffect(() => {
    if (registerOpenSessionZero) {
      registerOpenSessionZero(() => setShowSessionZero(true));
    }
  }, [registerOpenSessionZero]);

  // Rejestracja funkcji otwierającej AdventureSelector dla WelcomeScreen
  useEffect(() => {
    if (registerOpenAdventureSelector) {
      registerOpenAdventureSelector(() => setShowAdventureSelector(true));
    }
  }, [registerOpenAdventureSelector]);

  // Narzędzia gracza - przeniesione do Pomoce Badacza
  const playerTools = [
    {
      id: 'characterSheet',
      icon: User,
      label: 'Karta Postaci',
      description: 'Statystyki i umiejętności',
    },
    {
      id: 'equipment',
      icon: Package,
      label: 'Ekwipunek',
      description: 'Przedmioty i broń',
    },
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Dziennik Przygody',
      description: 'Zapiski i notatki',
    },
  ];

  return (
    <>
      <div
        className={`w-80 max-[1100px]:w-72 max-[900px]:w-64 shrink-0 bg-sidebar border-l border-brass/25 h-full flex flex-col relative z-10 ${hideSidebarPanel ? 'hidden' : ''}`}
      >
        {/* Header - Compact Token Counter - wyrównane z ChatWindow */}
        <div className="relative h-16 flex items-center px-4 border-b border-brass/30">
          {/* déco: złota linia akcentu */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
          />
          <div className="flex items-center justify-center gap-3 w-full">
            {/* Ikona aplikacji - Oko Horusa (ta sama grafika co launcher/icon.png) */}
            <NextImage
              src="/app-icon.png"
              alt="Strażnik Tajemnic"
              width={32}
              height={32}
              className="w-8 h-8 rounded-md border border-brass/40 shadow-inner"
              priority
            />
            <div className="text-left">
              <div className="text-[14px] text-brass/80 font-special-elite tracking-[0.22em] uppercase">
                Zew Cthulhu 7ed
              </div>
              <div className="text-sm font-medium text-emerald-400 font-special-elite tracking-wide">
                Strażnik Tajemnic AI
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Character Management */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-special-elite text-foreground">
                  Postacie
                </CardTitle>
                {/* Character Selector Dropdown - w linii z nagłówkiem */}
                {characters && characters.length > 0 && (
                  <div className="relative flex-1">
                    <select
                      value={activeCharacter?.id || ''}
                      onChange={(e) => {
                        const selected = characters.find(
                          (c) => c.id === e.target.value
                        );
                        if (selected && onCharacterSwitch) {
                          onCharacterSwitch(selected);
                        }
                      }}
                      className="w-full appearance-none bg-card border-2 border-primary/60 rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground font-medium cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="" disabled>
                        Wybierz...
                      </option>
                      {characters.map((char) => (
                        <option key={char.id} value={char.id}>
                          🎭 {char.name} ({char.occupation || 'Badacz'})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
                      ▼
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Character Portrait and Stats - klikalny kafelek otwierający kartę postaci */}
              {activeCharacter &&
                (() => {
                  const derived = deriveStats(activeCharacter);
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setInspectedCharacterId(activeCharacter.id);
                        setOpenDialog('characterSheet');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpenDialog('characterSheet');
                        }
                      }}
                      aria-label={`Otwórz kartę postaci: ${activeCharacter.name}`}
                      title="Otwórz kartę postaci"
                      className="relative deco-corners p-4 bg-card rounded-lg border border-brass/30 cursor-pointer transition-colors hover:bg-muted/40 hover:border-brass/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <div className="flex items-center gap-3">
                        {portraitSrc ? (
                          <img
                            src={portraitSrc}
                            alt={activeCharacter.name}
                            className="w-16 h-16 rounded-lg object-cover border border-brass/40"
                            style={{
                              filter: getEraImageFilter(
                                adventureContext?.yearRange?.split('-')[0]
                              ),
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-input flex items-center justify-center text-2xl border border-brass/40">
                            👤
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-base font-semibold text-foreground tracking-wide truncate">
                            {activeCharacter.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-special-elite tracking-wide truncate">
                            {activeCharacter.occupation}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs">
                        <Badge
                          variant="outline"
                          className="w-full inline-flex items-center justify-center text-center bg-destructive/15 text-destructive border-destructive/40 py-1"
                        >
                          PŻ: {activeCharacter.hp}/{derived.maxHp}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="w-full inline-flex items-center justify-center text-center bg-brass/15 text-brass border-brass/40 py-1"
                        >
                          PR: {activeCharacter.san}/{derived.maxSan}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="w-full inline-flex items-center justify-center text-center bg-primary/15 text-primary border-primary/40 py-1"
                        >
                          PM: {activeCharacter.mp}/{derived.maxMp}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="w-full inline-flex items-center justify-center text-center bg-gold/10 text-gold border-gold/40 py-1"
                        >
                          SZC: {activeCharacter.luck}
                        </Badge>
                      </div>
                    </div>
                  );
                })()}

              {/* Action Buttons - zielone ikony */}
              <div className="space-y-1">
                {playerTools.map((item) => {
                  const IconComponent = item.icon;
                  // Pobierz liczbę nowych pozycji dla badge
                  const badgeCount =
                    item.id === 'journal' ? unseenJournalCount : 0;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start border border-brass/15 font-special-elite tracking-wide text-foreground hover:bg-brass/5 hover:border-brass/40 hover:text-foreground relative"
                      onClick={() => {
                        setInspectedCharacterId(activeCharacter?.id);
                        setOpenDialog(item.id);
                      }}
                    >
                      <IconComponent className="w-4 h-4 mr-3 text-brass" />
                      {item.label}
                      {/* Badge z liczbą nowych pozycji */}
                      {badgeCount > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Button>
                  );
                })}

                {/* IND-230: Faza Rozwoju CoC - rzuty na poprawę oznaczonych umiejętności */}
                {activeCharacter && onOpenDevelopmentPhase && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start border border-brass/15 font-special-elite tracking-wide text-foreground hover:bg-brass/5 hover:border-brass/40 hover:text-foreground relative"
                    onClick={onOpenDevelopmentPhase}
                    title="Faza Rozwoju - rzuć na poprawę oznaczonych umiejętności"
                  >
                    <span className="w-4 h-4 mr-3 flex items-center justify-center">
                      ✨
                    </span>
                    Faza Rozwoju
                    {markedSkillsCount > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {markedSkillsCount > 99 ? '99+' : markedSkillsCount}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Create New Character / Koniec Sesji */}
              {activeCharacter ? (
                <Button
                  onClick={() => {
                    if (handleSendMessage) {
                      handleSendMessage('[KONIEC_SESJI]');
                    }
                  }}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  title="Wyślij sygnał końca sesji do Strażnika Tajemnic"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Koniec Sesji
                </Button>
              ) : (
                <Button
                  onClick={onCharacterCreate}
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Stwórz nową postać
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Zapisz / Wczytaj (IND-264) */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-special-elite text-foreground">
                Zapisz / Wczytaj
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={onSaveGame}
                  variant="outline"
                  className="flex-1"
                  title="Zapisz grę"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Zapisz
                </Button>
                <Button
                  onClick={onOpenGameSession}
                  variant="outline"
                  className="flex-1"
                  title="Wczytaj zapisaną sesję"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Wczytaj
                </Button>
              </div>
              {/* Nowa przygoda - powrót do ekranu głównego (kreatora) */}
              {(onNewAdventure || onSaveAndNewAdventure) && (
                <Button
                  onClick={() => setShowNewAdventureConfirm(true)}
                  variant="outline"
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                  title="Rozpocznij nową przygodę (powrót do kreatora)"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nowa przygoda
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pomoce Badacza - narzędzia pomocnicze */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-special-elite text-foreground flex items-center gap-2">
                <span>🔍</span> Pomoce Badacza
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Handout Generator - UKRYTY (funkcjonalność zachowana na przyszłość)
              <Button
                onClick={() => setShowHandoutGenerator(true)}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                📜 Generator Handoutów
              </Button>
              */}

              {/* YouTube */}
              <GMToolsPanel />
            </CardContent>
          </Card>

          {/* Ustawienia */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-special-elite text-foreground">
                ⚙️ Ustawienia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setOpenDialog('settings')}
              >
                <Settings className="w-4 h-4 mr-3 text-green-400" />
                Konfiguracja
              </Button>
              {/* IND-258: szybki mute lektora w grze (trwały, niezależny od presetu) */}
              {voiceFeatureAvailable !== false && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => onToggleNarrator?.(!isTTSEnabled)}
                  title="Włącz/wyłącz automatyczny lektor narracji MG (niezależnie od presetu)"
                >
                  {isTTSEnabled ? (
                    <Volume2 className="w-4 h-4 mr-3 text-green-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 mr-3 text-muted-foreground" />
                  )}
                  Lektor: {isTTSEnabled ? 'Wł' : 'Wył'}
                </Button>
              )}
              {/* Szybki toggle generowania obrazów w czacie (oszczędność kosztów) */}
              {aiSettings && onUpdateAISettings && (
                <Button
                  variant="ghost"
                  className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    const updated = {
                      ...aiSettings,
                      imageGenerationEnabled:
                        !aiSettings.imageGenerationEnabled,
                    };
                    onUpdateAISettings(updated);
                    // Zapisz trwale
                    import('@/lib/ai-settings').then(({ saveAISettings }) => {
                      saveAISettings(updated);
                    });
                  }}
                  title="Włącz/wyłącz generowanie ilustracji w czacie (oszczędność kosztów)"
                >
                  <ImageIcon
                    className={`w-4 h-4 mr-3 ${aiSettings.imageGenerationEnabled ? 'text-green-400' : 'text-muted-foreground'}`}
                  />
                  Obrazy: {aiSettings.imageGenerationEnabled ? 'Wł' : 'Wył'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {openDialog === 'settings' && (
        <SettingsModal
          open={openDialog === 'settings'}
          onClose={() => setOpenDialog(null)}
          onOpenChange={(open) => !open && setOpenDialog(null)}
        />
      )}
      <CharacterDialog
        open={openDialog === 'character'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        activeCharacter={activeCharacter}
        characters={characters}
        onCharacterSwitch={onCharacterSwitch}
        onCharacterCreate={onCharacterCreate}
        onCharacterManage={onCharacterManage}
      />
      <CharacterSheet
        open={openDialog === 'characterSheet'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        character={inspectedCharacter}
        onCharacterUpdate={onUpdateCharacter}
        characters={characters}
        onCharacterChange={(character) => setInspectedCharacterId(character.id)}
      />

      {openDialog === 'journal' && activeCharacter && onUpdateCharacter && (
        <SessionJournal
          character={activeCharacter}
          onUpdateCharacter={onUpdateCharacter}
          sharedJournal={sharedJournal}
          onUpdateSharedJournal={
            sharedJournalEnabled ? onUpdateSharedJournal : undefined
          }
          participantNames={participantNames}
          onClose={() => setOpenDialog(null)}
        />
      )}
      {openDialog === 'journal' && !activeCharacter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-8 text-center w-[90vw] max-w-[1440px]">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Wybierz postać
            </h3>
            <p className="text-muted-foreground mb-6">
              Dziennik jest powiązany z postacią. Wybierz lub stwórz postać, aby
              otworzyć dziennik.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setOpenDialog('character')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                📋 Wybierz postać
              </Button>
              <Button
                onClick={() => {
                  setOpenDialog(null);
                  if (onCharacterCreate) onCharacterCreate();
                }}
                variant="outline"
              >
                ➕ Nowa postać
              </Button>
            </div>
            <Button
              onClick={() => setOpenDialog(null)}
              variant="ghost"
              className="mt-4 text-muted-foreground"
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}
      {openDialog === 'equipment' && activeCharacter && onUpdateCharacter && (
        <EquipmentModal
          open={openDialog === 'equipment'}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          character={inspectedCharacter ?? activeCharacter}
          onCharacterUpdate={onUpdateCharacter}
          era={adventureContext?.yearRange?.split('-')[0] || '1920s'}
          adventureTheme={adventureContext?.title}
          characters={characters}
          onCharacterChange={(character) =>
            setInspectedCharacterId(character.id)
          }
        />
      )}
      <SessionZeroModal
        open={showSessionZero}
        onClose={() => setShowSessionZero(false)}
        adventureContext={adventureContext || undefined}
        onComplete={(settings: SessionZeroSettings) => {
          console.log('Session Zero completed:', settings);
          setShowSessionZero(false);
          // Wywołaj callback do page.tsx
          if (onSessionZeroComplete) {
            onSessionZeroComplete();
          }
        }}
      />
      <AdventureSelector
        open={showAdventureSelector}
        onClose={() => setShowAdventureSelector(false)}
        onSelect={(adventure) => {
          setAdventureContext(adventure);
          // Zapisz do localStorage dla strony tworzenia postaci
          localStorage.setItem('adventure_context', JSON.stringify(adventure));
          // Powiadom page.tsx o wyborze przygody
          if (onAdventureSelect) {
            onAdventureSelect(adventure);
          }
          setShowAdventureSelector(false);
          // Automatycznie otwórz Sesję Zero po wybraniu przygody
          setTimeout(() => setShowSessionZero(true), 300);
        }}
        customAdventures={customAdventures}
        onUploadAdventure={onUploadAdventure}
        onDeleteAdventure={onDeleteAdventure}
        isUploading={isUploadingAdventure}
        uploadProgress={uploadProgressAdventure}
        loadingStatus={loadingStatusAdventure}
      />
      <HandoutGenerator
        open={showHandoutGenerator}
        onClose={() => setShowHandoutGenerator(false)}
        onGenerate={(handout) => {
          console.log('Handout generated:', handout);
        }}
      />
      <NewAdventureModal
        open={showNewAdventureConfirm}
        onClose={() => setShowNewAdventureConfirm(false)}
        onSaveFirst={() => onSaveAndNewAdventure?.()}
        onSkipSave={() => onNewAdventure?.()}
      />
    </>
  );
};
