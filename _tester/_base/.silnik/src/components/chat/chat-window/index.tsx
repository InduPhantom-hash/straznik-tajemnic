'use client';

/**
 * @file ChatWindow - orchestrator głównego widoku czatu (IND-144 Wariant C, sesja 131).
 *
 * Implementacja po splicie 438→<20 lin (barrel re-export w ChatWindow.tsx).
 * Composition 5 sub-komponentów z `./components/` + 1 hook + state lightbox.
 *
 * Sesja 132 (D9 follow-up): drop 11 dead propsów - patrz `./types.ts`.
 */

import type { FC } from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '../../ui/scroll-area';
import { ImageLightbox } from '../../ui/image-lightbox';
import { RollTestModal, type RollTestData } from '../../dialogs/RollTestModal';
import { WelcomeScreen } from '../WelcomeScreen';
import type { ChatWindowProps } from './types';
import type { SkillTestData } from '@/lib/parsers/types';
import { usePlayerColors } from './hooks/use-player-colors';
import { useResolvedPortrait } from '@/hooks/useResolvedPortrait';
import {
  collectTestGroupResult,
  type CollectedTestResult,
} from '@/lib/hot-seat/test-groups';
import { ChatHeader } from './components/chat-header';
import { LoadingIndicator } from './components/loading-indicator';
import { MessageCard } from './components/message-card';
import { MessageInput } from './components/message-input';

export const ChatWindow: FC<ChatWindowProps> = ({
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  currentAudio,
  stopCurrentAudio,
  toggleAudioPause,
  isAudioPaused = false,
  isTTSEnabled,
  activeCharacter,
  characters = [],
  onJournalRoll,
  onSpendLuck,
  onUploadRules,
  onSelectAdventure,
  onSessionZero,
  onCreateCharacter,
  onPickCharacter,
  onStartGame,
  onChoosePlayMode,
  onLoadSave,
  onOpenApiKeys,
  onColdStart,
  onPickPredefinedCharacter, // NOWE: gotowa postać
  hasRules = false,
  hasAdventure = false,
  adventureTitle,
  region,
  currentLocation,
  hasSessionZero = false,
  hasStartedGame = false,
  hotSeatConfig,
  onSwitchPlayer,
  onDisableHotSeat,
  onSummarizeScene,
  isSummarizingScene = false,
  isLoading = false,
  isDuet = false,
  pendingDeclarations,
  playersAwaitingDeclaration,
  onAddDeclaration,
  onPassDeclaration,
  currentPlayerName,
  isTurnReady,
  onSendTurn,
  onOpenCharacterSheet,
  onConfirmAcquiredItem,
  onDismissAcquiredItem,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  // D1: tacka testu sterowana WYŁĄCZNIE tagiem [TEST:] - "Rzuć" otwiera mały modal
  // RollTestModal (podsumowanie → animacja → wynik do czatu + dziennika).
  // Trudność (½/⅕) i bilans kości premii/kary egzekwuje silnik dice-utils.
  const [activeSkillTest, setActiveSkillTest] = useState<SkillTestData | null>(
    null
  );
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(
    () => new Set()
  );
  const groupResultsRef = useRef(new Map<string, CollectedTestResult[]>());

  const diceTest: RollTestData | null = useMemo(
    () =>
      activeSkillTest
        ? {
            testId: activeSkillTest.id,
            groupId: activeSkillTest.groupId,
            characterId: activeSkillTest.characterId,
            skill: activeSkillTest.skillName,
            value: activeSkillTest.skillValue,
            difficulty: activeSkillTest.difficulty,
            bonusDice: activeSkillTest.modifiers.reduce(
              (balance, mod) =>
                balance + (mod.type === 'bonus' ? mod.count : -mod.count),
              0
            ),
            justification: activeSkillTest.justification,
          }
        : null,
    [activeSkillTest]
  );

  const handleRollTest = (test: SkillTestData) => {
    setActiveSkillTest(test);
  };

  const handleRollResult = (chatMessage: string, systemContext: string) => {
    if (!activeSkillTest) return;
    const result: CollectedTestResult = {
      testId: activeSkillTest.id,
      chatMessage,
      systemContext,
    };
    setCompletedTestIds((current) => new Set([...current, activeSkillTest.id]));

    if (!activeSkillTest.groupId) {
      handleSendMessage(chatMessage);
      return;
    }

    const groupTests = messages
      .flatMap((message) => message.skillTests ?? [])
      .filter((test) => test.groupId === activeSkillTest.groupId);
    const currentResults =
      groupResultsRef.current.get(activeSkillTest.groupId) ?? [];
    const progress = collectTestGroupResult(
      groupTests as SkillTestData[],
      currentResults,
      result
    );
    groupResultsRef.current.set(activeSkillTest.groupId, progress.results);

    // Pierwszy wynik zostaje wyłącznie lokalnie. Drugiego nie ścigamy osobnym
    // requestem - dopiero komplet trafia do MG jako jedna wiadomość.
    if (progress.complete && progress.combinedMessage) {
      groupResultsRef.current.delete(activeSkillTest.groupId);
      handleSendMessage(progress.combinedMessage);
    }
  };

  // Mapa kolorów graczy dla Hot Seat (imię postaci -> kolor)
  const playerColors = usePlayerColors(hotSeatConfig, characters);

  // Portret gracza dla awatarów wiadomości - dociągany z IndexedDB gdy portraitUrl
  // pusty (wyścig hydratacji). Liczony RAZ tu, nie per-wiadomość. Patrz #2b.
  const playerPortraitUrl = useResolvedPortrait(activeCharacter);

  const duetCharacterSlots = hotSeatConfig?.enabled
    ? hotSeatConfig.players.map((player) => {
        const character = characters.find(
          (candidate) =>
            candidate.id === player.characterId ||
            candidate.playerName === player.name
        );
        return {
          playerId: player.id,
          playerName: player.name,
          character: character
            ? {
                id: character.id,
                name: character.name,
                occupation: character.occupation,
                portraitUrl: character.portraitUrl,
              }
            : undefined,
        };
      })
    : [];
  const duetReady =
    duetCharacterSlots.length === 2 &&
    duetCharacterSlots.every((slot) => slot.character) &&
    new Set(duetCharacterSlots.map((slot) => slot.character?.id)).size === 2;

  // Auto-scroll do dołu czatu
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background bg-[radial-gradient(1200px_700px_at_50%_0%,rgba(20,184,166,0.06),transparent_55%),radial-gradient(600px_400px_at_100%_100%,rgba(201,169,74,0.04),transparent_60%)]">
      <ChatHeader
        title={adventureTitle}
        region={region}
        currentLocation={currentLocation}
      />
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          {/* Pokaż WelcomeScreen dopóki użytkownik nie kliknie Rozpocznij */}
          {!hasStartedGame ? (
            <WelcomeScreen
              onUploadRules={onUploadRules || (() => {})}
              onSelectAdventure={onSelectAdventure || (() => {})}
              onSessionZero={onSessionZero}
              onCreateCharacter={onCreateCharacter || (() => {})}
              onPickPredefinedCharacter={onPickPredefinedCharacter}
              onPickCharacter={onPickCharacter}
              onStartGame={onStartGame || (() => {})}
              onChoosePlayMode={onChoosePlayMode}
              onLoadSave={onLoadSave}
              onOpenApiKeys={onOpenApiKeys}
              onColdStart={onColdStart}
              hasRules={hasRules}
              hasAdventure={hasAdventure}
              adventureTitle={adventureTitle}
              hasSessionZero={hasSessionZero}
              hasCharacter={
                hotSeatConfig?.enabled ? duetReady : !!activeCharacter
              }
              hasSavedCharacters={characters.length > 0}
              isDuet={!!hotSeatConfig?.enabled}
              duetCharacterSlots={duetCharacterSlots}
              onOpenCharacterSheet={onOpenCharacterSheet}
              characters={characters}
            />
          ) : (
            messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                activeCharacter={activeCharacter}
                playerPortraitUrl={playerPortraitUrl}
                isTTSEnabled={isTTSEnabled}
                currentAudio={currentAudio}
                toggleAudioPause={toggleAudioPause}
                isAudioPaused={isAudioPaused}
                stopCurrentAudio={stopCurrentAudio}
                playerColors={playerColors}
                completedTestIds={completedTestIds}
                onImageClick={(imgUrl, allImages) => {
                  setLightboxImages(allImages);
                  setLightboxImage(imgUrl);
                }}
                onRollTest={handleRollTest}
                onConfirmAcquiredItem={onConfirmAcquiredItem}
                onDismissAcquiredItem={onDismissAcquiredItem}
              />
            ))
          )}

          {/* Loading indicator - animowane kropki */}
          {isLoading && <LoadingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      {/* Pasek wpisywania tylko w grze - ekran powitalny ma być czysty ("tylko ekran powitalny") */}
      {hasStartedGame && (
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          messagesCount={messages.length}
          onSummarizeScene={onSummarizeScene}
          isSummarizingScene={isSummarizingScene}
          isDuet={isDuet}
          pendingDeclarations={pendingDeclarations}
          playersAwaitingDeclaration={playersAwaitingDeclaration}
          onAddDeclaration={onAddDeclaration}
          onPassDeclaration={onPassDeclaration}
          currentPlayerName={currentPlayerName}
          isTurnReady={isTurnReady}
          onSendTurn={onSendTurn}
          isLoading={isLoading}
          onSwitchPlayer={onSwitchPlayer}
          onDisableHotSeat={onDisableHotSeat}
          hotSeatPlayers={hotSeatConfig?.players?.map((p, i) => ({
            id: p.id,
            name: p.name,
            index: i,
          }))}
        />
      )}
      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          images={lightboxImages}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {/* D1: tacka testu ([TEST:]) odpala mały modal - rzut, ew. Szczęście, ręczna wysyłka */}
      <RollTestModal
        open={!!diceTest}
        onOpenChange={(open) => {
          if (!open) setActiveSkillTest(null);
        }}
        test={diceTest}
        activeCharacter={
          characters.find(
            (character) => character.id === activeSkillTest?.characterId
          ) ??
          activeCharacter ??
          undefined
        }
        onRollSendToChat={handleRollResult}
        onJournalRoll={onJournalRoll}
        onSpendLuck={onSpendLuck}
      />
    </div>
  );
};
