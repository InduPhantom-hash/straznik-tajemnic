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
import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '../../ui/scroll-area';
import { ImageLightbox } from '../../ui/image-lightbox';
import { RollTestModal, type RollTestData } from '../../dialogs/RollTestModal';
import { WelcomeScreen } from '../WelcomeScreen';
import type { ChatWindowProps } from './types';
import type { SkillTestData } from '@/lib/parsers/types';
import { usePlayerColors } from './hooks/use-player-colors';
import { useResolvedPortrait } from '@/hooks/useResolvedPortrait';
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
  onPickPredefinedCharacter, // NOWE: gotowa postać
  hasRules = false,
  hasAdventure = false,
  adventureTitle,
  adventureDescription,
  region,
  currentLocation,
  hasSessionZero = false,
  hasStartedGame = false,
  hotSeatConfig,
  onSummarizeScene,
  isSummarizingScene = false,
  isLoading = false,
  isDuet = false,
  pendingDeclarations,
  playersAwaitingDeclaration,
  onAddDeclaration,
  onSendTurn,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  // D1: tacka testu sterowana WYŁĄCZNIE tagiem [TEST:] - "Rzuć" otwiera mały modal
  // RollTestModal (podsumowanie → animacja → wynik do czatu + dziennika).
  // Trudność (½/⅕) i bilans kości premii/kary egzekwuje silnik dice-utils.
  const [diceTest, setDiceTest] = useState<RollTestData | null>(null);

  const handleRollTest = (test: SkillTestData) => {
    // Bilans kości: premie dodatnie, kary ujemne (zgodnie z SkillTestCard).
    const bonusDice = test.modifiers.reduce(
      (balance, mod) =>
         balance + (mod.type === 'bonus' ? mod.count : -mod.count),
      0
    );
    setDiceTest({
      skill: test.skillName,
      value: test.skillValue,
      difficulty: test.difficulty,
      bonusDice,
      justification: test.justification,
    });
  };

  // Mapa kolorów graczy dla Hot Seat (imię postaci -> kolor)
  const playerColors = usePlayerColors(hotSeatConfig, characters);

  // Portret gracza dla awatarów wiadomości - dociągany z IndexedDB gdy portraitUrl
  // pusty (wyścig hydratacji). Liczony RAZ tu, nie per-wiadomość. Patrz #2b.
  const playerPortraitUrl = useResolvedPortrait(activeCharacter);

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
        adventureDescription={adventureDescription}
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
              hasRules={hasRules}
              hasAdventure={hasAdventure}
              adventureTitle={adventureTitle}
              hasSessionZero={hasSessionZero}
              hasCharacter={!!activeCharacter}
              hasSavedCharacters={characters.length > 0}
              isDuet={!!hotSeatConfig?.enabled}
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
                onImageClick={(imgUrl, allImages) => {
                  setLightboxImages(allImages);
                  setLightboxImage(imgUrl);
                }}
                onRollTest={handleRollTest}
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
          onSendTurn={onSendTurn}
          isLoading={isLoading}
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
          if (!open) setDiceTest(null);
        }}
        test={diceTest}
        activeCharacter={activeCharacter ?? undefined}
        onRollSendToChat={
          handleSendMessage
            ? (message) => handleSendMessage(message)
            : undefined
        }
        onJournalRoll={onJournalRoll}
        onSpendLuck={onSpendLuck}
      />
    </div>
  );
};
