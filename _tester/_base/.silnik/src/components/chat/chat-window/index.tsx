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
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
import { TTSHardLoadingScreen } from './components/tts-hard-loading-screen';
import { CombatDefenseDialog } from './components/combat-defense-dialog';
import { getSkillValue } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';

export const ChatWindow: FC<ChatWindowProps> = ({
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  pendingCombatAttack,
  pendingCombatDefensesUsed = 0,
  combatDefenseWeapons = [],
  onCombatDefense,
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
  onQuickStart,
  onLoadSave,
  onOpenApiKeys,
  onOpenHelp,
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
  isInitialBuffering = false,
  isStarting = false,
  startProgress = 0,
  startStatus = '',
  isReadyToEnter = false,
  onConfirmEnterGame,
  adventureContext,
  adventureDescription,
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
  isSessionEnded,
  sessionEndStatus,
  onCharacterUpdate,
  onContinueNarration,
  cheatCombatModal,
  onCloseCheatCombat,
  cheatChaseModal,
  onCloseCheatChase,
  activeChaseState,
  onChaseStateChange,

  eraContext,
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
  const combatRoundAttacks = pendingCombatAttack
    ? messages.flatMap((message) => message.pendingMeleeAttacks ?? []).filter(
        (attack) => attack.roundId === pendingCombatAttack.roundId
      )
    : [];
  const groupResultsRef = useRef(new Map<string, CollectedTestResult[]>());
  const resolvedHazardIds = useMemo(() => {
    const ids = new Set<string>();
    const pattern = /\[WYNIK_ZAGROŻENIA:\s*id=([^|\]]+)/gi;
    for (const message of messages) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(message.content)) !== null)
        ids.add(match[1].trim());
      pattern.lastIndex = 0;
    }
    return ids;
  }, [messages]);
  const resolvedSpellIds = useMemo(() => {
    const ids = new Set<string>();
    const pattern = /\[WYNIK_CZARU:\s*id=([^|\]]+)/gi;
    for (const message of messages) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(message.content)) !== null)
        ids.add(match[1].trim());
      pattern.lastIndex = 0;
    }
    return ids;
  }, [messages]);
  const resolvedTomeIds = useMemo(() => {
    const ids = new Set<string>();
    const pattern = /\[WYNIK_TOMU:\s*id=([^|\]]+)/gi;
    for (const message of messages) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(message.content)) !== null)
        ids.add(match[1].trim());
      pattern.lastIndex = 0;
    }
    return ids;
  }, [messages]);

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
    <div className="relative flex-1 flex flex-col h-full bg-background bg-[radial-gradient(1200px_700px_at_50%_0%,rgba(20,184,166,0.06),transparent_55%),radial-gradient(600px_400px_at_100%_100%,rgba(201,169,74,0.04),transparent_60%)]">
      <TTSHardLoadingScreen
        isBuffering={isInitialBuffering}
        isStarting={isStarting}
        isReadyToEnter={isReadyToEnter}
        startProgress={startProgress}
        startStatus={startStatus}
        onConfirmEnterGame={onConfirmEnterGame}
        adventureTitle={adventureTitle}
        adventureDescription={adventureDescription}
        region={region}
        eraContext={eraContext}
        adventureContext={adventureContext}
      />
      <ChatHeader
        title={adventureTitle}
        region={region}
        currentLocation={currentLocation}
        onOpenHelp={onOpenHelp}
      />
      {!hasStartedGame ? (
        <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
          <WelcomeScreen
            onUploadRules={onUploadRules || (() => {})}
            onSelectAdventure={onSelectAdventure || (() => {})}
            onSessionZero={onSessionZero}
            onCreateCharacter={onCreateCharacter || (() => {})}
            onPickPredefinedCharacter={onPickPredefinedCharacter}
            onPickCharacter={onPickCharacter}
            onStartGame={onStartGame || (() => {})}
            onQuickStart={onQuickStart}
            onChoosePlayMode={onChoosePlayMode}
            onLoadSave={onLoadSave}
            onOpenApiKeys={onOpenApiKeys}
            onOpenHelp={onOpenHelp}
            onColdStart={onColdStart}
            hasRules={hasRules}
            hasAdventure={hasAdventure}
            adventureTitle={adventureTitle}
            hasSessionZero={hasSessionZero}
            hasCharacter={
              hotSeatConfig?.enabled ? duetReady : !!activeCharacter
            }
            activeCharacter={activeCharacter}
            hasSavedCharacters={characters.length > 0}
            isDuet={!!hotSeatConfig?.enabled}
            duetCharacterSlots={duetCharacterSlots}
            onOpenCharacterSheet={onOpenCharacterSheet}
            characters={characters}
            isStarting={isStarting}
            startProgress={startProgress}
            startStatus={startStatus}
          />
        </div>
      ) : (
        <>
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 md:p-8">
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {messages.map((message, index) =>
                message.role === 'user' && message.mechanicsContext?.combat ? null : (
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
                  isSessionEnded={isSessionEnded}
                  isLastMessage={index === messages.length - 1}
                  onCharacterUpdate={onCharacterUpdate}
                  onSendHazardResult={handleSendMessage}
                  resolvedHazardIds={resolvedHazardIds}
                  onSendSpellResult={handleSendMessage}
                  resolvedSpellIds={resolvedSpellIds}
                  onSendTomeResult={handleSendMessage}
                  resolvedTomeIds={resolvedTomeIds}
                  onChaseManeuver={(maneuverType, nextState, decl) => {
                    onChaseStateChange?.(nextState);
                    handleSendMessage(decl, { chase: nextState });
                  }}
                  isDuet={isDuet}
                  characters={characters}
                  onContinueNarration={onContinueNarration}
                />
              ))}
              {/* Loading indicator - animowane kropki */}
              {isLoading && <LoadingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          {/* Pasek wpisywania tylko w grze - ekran powitalny ma być czysty ("tylko ekran powitalny") */}
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
            isSessionEnded={isSessionEnded}
            sessionEndStatus={sessionEndStatus}
            eraContext={eraContext}
          />
        </>
      )}
      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          images={lightboxImages}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {pendingCombatAttack && onCombatDefense && activeCharacter && (
        <DialogPrimitive.Root open>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <DialogPrimitive.Content
              className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(75vw,64rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto focus:outline-none"
              onEscapeKeyDown={(event) => event.preventDefault()}
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              <DialogPrimitive.Title className="sr-only">
                Melee combat defense
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Choose how the investigator reacts to the incoming attack.
              </DialogPrimitive.Description>
              <CombatDefenseDialog
                attackerName={pendingCombatAttack.attacker.name}
                attackerWeapon={pendingCombatAttack.weapon.name}
                intent={pendingCombatAttack.intent}
                targetName={pendingCombatAttack.target.name}
                dodgeSkill={resolveTestValue(
                  'Unik',
                  activeCharacter.id === pendingCombatAttack.target.characterId
                    ? activeCharacter
                    : characters.find(
                        (character) =>
                          character.id === pendingCombatAttack.target.characterId
                      ) ?? activeCharacter
                ) ?? 0}
                weapons={combatDefenseWeapons}
                defensesUsedThisRound={pendingCombatDefensesUsed}
                queuePosition={pendingCombatAttack.ordinal + 1}
                queueTotal={Math.max(combatRoundAttacks.length, 1)}
                disabled={isLoading}
                onSelectDefense={(choice, weapon) =>
                  onCombatDefense(pendingCombatAttack, choice, weapon)
                }
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}

      {/* Retro Cheat: ten sam komponent reakcji, bez zapisu mechaniki. */}
      {cheatCombatModal && !pendingCombatAttack && (
        <DialogPrimitive.Root open>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
            <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(75vw,64rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto focus:outline-none">
              <DialogPrimitive.Title className="sr-only">Melee combat defense</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Choose a reaction.</DialogPrimitive.Description>
            <CombatDefenseDialog
              attackerName={cheatCombatModal.attackerName}
              attackerWeapon={cheatCombatModal.attackerWeapon}
              dodgeSkill={cheatCombatModal.dodgeSkill}
              weapons={[{
                id: 'cheat-unarmed',
                name: 'Walka wręcz',
                skillId: 'Walka Wręcz',
                skillValue: cheatCombatModal.brawlSkill,
                damageFormula: '1d3',
                damageType: 'non_impaling',
              }]}
              onSelectDefense={(choice, weapon) => {
                handleSendMessage(`[OBRONA: ${choice}${weapon ? ` | ${weapon.name}` : ''}]`);
                if (onCloseCheatCombat) onCloseCheatCombat();
              }}
            />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
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
