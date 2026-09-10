'use client';

import { SafeImage } from '@/components/ui/safe-image';
/**
 * @file MessageCard - 1 wiadomość czatu z Avatar + TTS controls + Body + Images (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx (Card per message ~122 lin) jako micro 6/8 HOT.
 * Największy sub-moduł Wariantu C - TTS coupling + image onClick callback +
 * NarrativeFormatter integration + cleanMarkdown vs NarrativeFormatter branch
 * per role.
 *
 * Image onClick: propaguje przez callback `onImageClick(imgUrl, allImages)` -
 * parent (orchestrator) zarządza state lightbox.
 */

import { Dices, Pause, Play, Square } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../ui/avatar';
import { NarrativeFormatter } from '../../NarrativeFormatter';
import { SkillTestCard } from './skill-test-card';
import { HazardCard } from './hazard-card';
import { SpellCard } from './spell-card';
import { TomeCard } from './tome-card';
import { AcquiredItemCard } from './acquired-item-card';
import { DevelopmentPhaseCard } from './DevelopmentPhaseCard';
import { cleanMarkdown } from '@/lib/utils';
import { ChaseCard } from './chase-card';
import { CombatCard } from './combat-card';
import type { Character, Message } from '@/lib/types';
import type { ChaseManeuverType, ChaseState } from '@/lib/chase/chase-engine';
import type { PendingMeleeAttack, DefenseChoice, ManeuverType } from '@/lib/combat/combat-resolver';
import type { CombatDefenseWeaponOption } from '@/lib/combat/weapon-context';
import type { SkillTestData } from '@/lib/parsers/types';
import {
  getMessageStyle,
  getAuthorColor,
  getAuthorName,
  getAuthorInitials,
} from '../utils/message-helpers';

interface MessageCardProps {
  message: Message;
  activeCharacter: Character | null;
  /** Portret gracza dociągnięty przez useResolvedPortrait (fallback z IndexedDB
   *  gdy activeCharacter.portraitUrl pusty). Liczony raz w ChatWindow. */
  playerPortraitUrl?: string | null;
  isTTSEnabled: boolean;
  currentAudio: HTMLAudioElement | null;
  toggleAudioPause?: () => void;
  isAudioPaused?: boolean;
  stopCurrentAudio: () => void;
  playerColors: Map<string, string>;
  onImageClick: (imgUrl: string, allImages: string[]) => void;
  onRollTest?: (test: SkillTestData) => void;
  completedTestIds?: ReadonlySet<string>;
  onConfirmAcquiredItem?: (messageId: string, proposalId: string, characterId?: string) => void;
  onDismissAcquiredItem?: (messageId: string, proposalId: string) => void;
  isSessionEnded?: boolean;
  isLastMessage?: boolean;
  onCharacterUpdate?: (char: Character) => void;
  onSendHazardResult?: (message: string) => void;
  resolvedHazardIds?: ReadonlySet<string>;
  onSendSpellResult?: (message: string) => void;
  resolvedSpellIds?: ReadonlySet<string>;
  onSendTomeResult?: (message: string) => void;
  resolvedTomeIds?: ReadonlySet<string>;
  onSendCombatResult?: (message: string) => void;
  resolvedCombatIds?: ReadonlySet<string>;
  onCombatDefense?: (
    attack: PendingMeleeAttack,
    choice: DefenseChoice,
    weapon?: CombatDefenseWeaponOption,
    maneuverType?: ManeuverType
  ) => void;
  onChaseManeuver?: (
    maneuverType: ChaseManeuverType,
    chaseState: ChaseState,
    narrativeDeclaration: string
  ) => void;
  /** Kontynuacja uciętej narracji (MAX_TOKENS) - deklaruje caller; pole
   *  opcjonalne dla zgodności z testami i chat-window types. */
  onContinueNarration?: (messageId?: string) => void;
  isDuet?: boolean;
  characters?: Character[];
}

export function MessageCard({
  message,
  activeCharacter,
  playerPortraitUrl,
  isTTSEnabled,
  currentAudio,
  toggleAudioPause,
  isAudioPaused = false,
  stopCurrentAudio,
  playerColors,
  onImageClick,
  onRollTest,
  completedTestIds,
  onConfirmAcquiredItem,
  onDismissAcquiredItem,
  isSessionEnded = false,
  isLastMessage = false,
  onCharacterUpdate,
  onSendHazardResult,
  resolvedHazardIds,
  onSendSpellResult,
  resolvedSpellIds,
  onSendTomeResult,
  resolvedTomeIds,
  onSendCombatResult,
  resolvedCombatIds,
  onCombatDefense,
  onChaseManeuver,
  onContinueNarration,
  isDuet = false,
  characters = [],
}: MessageCardProps) {
  const t = useTranslations('MessageCard');
  const locale = useLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'pl-PL';

  return (
    <Card
      className={`${getMessageStyle(message.role)} relative overflow-hidden`}
    >
      <CardContent className="py-3 overflow-hidden">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-16 rounded-sm border border-brass/40 shadow-md shrink-0 mt-0.5">
            {message.role === 'assistant' ? (
              /* MG - ikona kostki K10 */
              <AvatarFallback className="bg-primary/15 text-primary border border-primary/50 rounded-none w-full h-full">
                <Dices className="w-5 h-5" />
              </AvatarFallback>
            ) : (
              /* Gracz - portret postaci retro prostokątny. */
              <>
                {(playerPortraitUrl ?? activeCharacter?.portraitUrl) && (
                  <AvatarImage
                    src={playerPortraitUrl ?? activeCharacter?.portraitUrl}
                    alt={activeCharacter?.name || t('playerPortraitAlt')}
                    className="object-cover object-top rounded-none w-full h-full"
                  />
                )}
                <AvatarFallback className="text-xs rounded-none">
                  {getAuthorInitials(message, activeCharacter, locale === 'en' ? 'en' : 'pl')}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium text-base ${getAuthorColor(message.role)}`}
              >
                {getAuthorName(message, activeCharacter, locale === 'en' ? 'en' : 'pl')}
              </span>
              <span className="text-sm text-muted-foreground">
                {message.gameTime
                  ? `${message.gameTime.hour.toString().padStart(2, '0')}:${message.gameTime.minute.toString().padStart(2, '0')}`
                  : message.timestamp.toLocaleTimeString(intlLocale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
              </span>
              {/* Przycisk Play/Pause/Stop TTS dla wiadomości asystenta */}
              {message.role === 'assistant' && isTTSEnabled && (
                <div className="ml-auto flex items-center gap-1">
                  {/* Toggle Play/Pause */}
                  {currentAudio && toggleAudioPause && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAudioPause();
                      }}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title={
                        isAudioPaused
                          ? t('resumeReading')
                          : t('pauseReading')
                      }
                    >
                      {isAudioPaused ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {/* Stop - zatrzymuje i czyści */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopCurrentAudio();
                    }}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title={t('stopReadingTitle')}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              )}
            </div>

            {/* Wygenerowane obrazy - ZAWSZE na szczycie wiadomości przed tekstem */}
            {message.generatedImages && message.generatedImages.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-4 items-start">
                {message.generatedImages.map((imgUrl, idx) => {
                  const imgType = message.generatedImageTypes?.[idx];
                  const isPortrait = imgType === 'portrait';
                  const isItem = imgType === 'item';
                  const isCompact = isPortrait || isItem;
                  return (
                  <div
                    key={idx}
                    className={`relative rounded-lg overflow-hidden border border-brass/30 shadow-lg ${
                      isCompact ? 'w-48 sm:w-56 flex-shrink-0' : 'w-full'
                    }`}
                    style={{
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={isPortrait ? t('portraitAlt', { value: idx + 1 }) : t('sceneAlt', { value: idx + 1 })}
                      className={`w-full cursor-pointer hover:opacity-90 transition-opacity ${
                        isPortrait
                          ? 'aspect-[3/4] object-cover object-top'
                          : isItem
                            ? 'aspect-square object-contain bg-black/40 p-2'
                            : 'h-auto max-h-[70vh] object-contain bg-black/30'
                      }`}
                      style={{
                        filter: 'sepia(0.1) saturate(1.1)',
                      }}
                      loading="lazy"
                      onClick={() =>
                        onImageClick(imgUrl, message.generatedImages || [])
                      }
                    />
                  </div>
                )})}
              </div>
            )}

            {/* Formatowanie wiadomości - różne dla MG vs gracza */}
            {message.role === 'assistant' ? (
              <>
                <NarrativeFormatter
                  content={message.content}
                  className="text-[18px] leading-relaxed font-special-elite"
                  playerColors={playerColors}
                  onImageClick={onImageClick}
                />
                {(message.content.includes('[KONIEC_SESJI:POTWIERDZENIE]') || (isSessionEnded && isLastMessage)) && (
                  <>
                    <div className="mt-6 p-4 rounded-lg border border-red-950 bg-red-950/20 text-red-200/90 font-special-elite text-sm text-center tracking-wider animate-pulse shadow-md">
                      <p className="font-semibold text-red-400 mb-1">{t('chronicleSavedTitle')}</p>
                      <p className="italic">{t('chronicleSavedMessage')}</p>
                    </div>

                    {activeCharacter && onCharacterUpdate && (
                      <DevelopmentPhaseCard
                        character={activeCharacter}
                        onCharacterUpdate={onCharacterUpdate}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-[18px] leading-relaxed font-special-elite break-words overflow-wrap-anywhere whitespace-pre-wrap chat-message">
                {cleanMarkdown(message.content)}
              </p>
            )}

            {/* Ręczna kontynuacja urwanej narracji (finishReason=MAX_TOKENS).
                Tylko ostatnia wiadomość MG; po zamówieniu przycisk się blokuje. */}
            {message.role === 'assistant' &&
              isLastMessage &&
              onContinueNarration &&
              message.finishReason === 'MAX_TOKENS' && (
                <div className="mt-3 flex justify-center print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={message.continuationRequested === true}
                    onClick={() => onContinueNarration(message.id)}
                  >
                    {message.continuationRequested
                      ? t('continuationRequested')
                      : t('continueNarration')}
                  </Button>
                </div>
              )}

            {/* Tacka testów umiejętności [TEST:...] (Bug 2, sesja 2026-06-17) */}
            {message.skillTests && message.skillTests.length > 0 && (
              <div className="mt-3">
                {message.skillTests.map((test) => (
                  <SkillTestCard
                    key={test.id}
                    {...test}
                    onRoll={onRollTest}
                    completed={completedTestIds?.has(test.id)}
                  />
                ))}
              </div>
            )}

            {/* Zagrożenia środowiskowe i trucizny CoC 7e RAW (Issue #60) */}
            {message.hazardEvents && message.hazardEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.hazardEvents.map((hazard) => {
                  const normalizeName = (value: string) =>
                    value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
                  const characterPool = activeCharacter
                    ? [activeCharacter, ...characters.filter((character) => character.id !== activeCharacter.id)]
                    : characters;
                  const targetCharacter = hazard.characterId
                    ? characterPool.find((character) => character.id === hazard.characterId)
                    : hazard.characterName
                      ? characterPool.find(
                          (character) => normalizeName(character.name) === normalizeName(hazard.characterName || '')
                        )
                      : activeCharacter;
                  return (
                  <HazardCard
                    key={hazard.id}
                    hazard={hazard}
                    playerCon={targetCharacter?.con || 50}
                    playerHp={targetCharacter?.hp}
                    playerJump={
                      typeof targetCharacter?.skills?.['Skakanie'] === 'number'
                        ? targetCharacter.skills['Skakanie']
                        : typeof targetCharacter?.skills?.['Jump'] === 'number'
                        ? targetCharacter.skills['Jump']
                        : 20
                    }
                    playerDodge={
                      typeof targetCharacter?.skills?.['Unik'] === 'number'
                        ? targetCharacter.skills['Unik']
                        : typeof targetCharacter?.skills?.['Dodge'] === 'number'
                        ? targetCharacter.skills['Dodge']
                        : targetCharacter?.dex
                        ? Math.floor(targetCharacter.dex / 2)
                        : 25
                    }
                    playerName={targetCharacter?.name || hazard.characterName}
                    completed={resolvedHazardIds?.has(hazard.id)}
                    canApply={Boolean(targetCharacter)}
                    onApplyDamage={(damage) => {
                      if (targetCharacter && onCharacterUpdate && !resolvedHazardIds?.has(hazard.id)) {
                        const newHp = Math.max(0, targetCharacter.hp - damage);
                        onCharacterUpdate({
                          ...targetCharacter,
                          hp: newHp,
                        });
                      }
                    }}
                    onSendChat={onSendHazardResult}
                  />
                  );
                })}
              </div>
            )}

            {/* Rzucanie czarów i rytuałów CoC 7e RAW (Issue #252) */}
            {message.spellCastEvents && message.spellCastEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.spellCastEvents.map((spellEvent) => (
                  <SpellCard
                    key={spellEvent.id}
                    spellEvent={spellEvent}
                    activeCharacter={activeCharacter}
                    characters={characters}
                    completed={resolvedSpellIds?.has(spellEvent.id)}
                    onCharacterUpdate={onCharacterUpdate}
                    onSendChat={onSendSpellResult}
                  />
                ))}
              </div>
            )}

            {/* Badanie tomów Mitów CoC 7e RAW (Issue #252) */}
            {message.tomeStudyEvents && message.tomeStudyEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.tomeStudyEvents.map((tomeEvent) => (
                  <TomeCard
                    key={tomeEvent.id}
                    tomeEvent={tomeEvent}
                    activeCharacter={activeCharacter}
                    characters={characters}
                    completed={resolvedTomeIds?.has(tomeEvent.id)}
                    onCharacterUpdate={onCharacterUpdate}
                    onSendChat={onSendTomeResult}
                  />
                ))}
              </div>
            )}

            {message.acquiredItems && message.acquiredItems.length > 0 && (
              <div>
                {message.acquiredItems.map((proposal) => (
                  <AcquiredItemCard
                    key={proposal.id}
                    proposal={proposal}
                    onConfirm={(characterId?: string) =>
                      void onConfirmAcquiredItem?.(message.id, proposal.id, characterId)
                    }
                    onDismiss={() =>
                      onDismissAcquiredItem?.(message.id, proposal.id)
                    }
                    isDuet={isDuet}
                    characters={characters}
                  />
                ))}
              </div>
            )}

            {/* Pościg i tor przeszkód CoC 7e RAW (Fiction First w czacie) */}
            {message.chaseState && (
              <div className="mt-3">
                <ChaseCard
                  chaseState={message.chaseState}
                  activeCharacter={activeCharacter}
                  characters={characters}
                  completed={!isLastMessage || message.chaseState.status !== 'ongoing'}
                  onManeuverSelect={onChaseManeuver}
                />
              </div>
            )}

            {/* Bliskie starcie wręcz CoC 7e RAW (Issue #302 - Fiction First w czacie) */}
            {message.pendingMeleeAttacks && message.pendingMeleeAttacks.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.pendingMeleeAttacks.map((attack) => (
                  <CombatCard
                    key={attack.eventId}
                    attack={attack}
                    activeCharacter={activeCharacter}
                    characters={characters}
                    completed={resolvedCombatIds?.has(attack.eventId)}
                    onCharacterUpdate={onCharacterUpdate}
                    onSendChat={onSendCombatResult}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
