'use client';

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
import { Card, CardContent } from '../../../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../ui/avatar';
import { NarrativeFormatter } from '../../NarrativeFormatter';
import { SkillTestCard } from './skill-test-card';
import { AcquiredItemCard } from './acquired-item-card';
import { cleanMarkdown } from '@/lib/utils';
import type { Character, Message } from '@/lib/types';
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
  onConfirmAcquiredItem?: (messageId: string, proposalId: string) => void;
  onDismissAcquiredItem?: (messageId: string, proposalId: string) => void;
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
}: MessageCardProps) {
  return (
    <Card
      className={`${getMessageStyle(message.role)} relative overflow-hidden`}
    >
      <CardContent className="py-3 overflow-hidden">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8 mt-1">
            {message.role === 'assistant' ? (
              /* MG - ikona kostki K10 */
              <AvatarFallback className="bg-primary/15 text-primary border border-primary/50">
                <Dices className="w-4 h-4" />
              </AvatarFallback>
            ) : (
              /* Gracz - portret postaci lub inicjały. Portret z useResolvedPortrait
                 (fallback IndexedDB), bo activeCharacter.portraitUrl bywa pusty po
                 offloadzie - inaczej awatar przy wiadomościach zostawał na 👤. */
              <>
                {(playerPortraitUrl ?? activeCharacter?.portraitUrl) && (
                  <AvatarImage
                    src={playerPortraitUrl ?? activeCharacter?.portraitUrl}
                    alt={activeCharacter?.name || 'Portret gracza'}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {getAuthorInitials(message, activeCharacter)}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-medium text-base ${getAuthorColor(message.role)}`}
              >
                {getAuthorName(message, activeCharacter)}
              </span>
              <span className="text-sm text-muted-foreground">
                {message.gameTime
                  ? `${message.gameTime.hour.toString().padStart(2, '0')}:${message.gameTime.minute.toString().padStart(2, '0')}`
                  : message.timestamp.toLocaleTimeString('pl-PL', {
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
                        isAudioPaused ? 'Wznów czytanie' : 'Pauzuj czytanie'
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
                    title="Zatrzymaj czytanie (Stop TTS)"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              )}
            </div>
            {/* Formatowanie wiadomości - różne dla MG vs gracza */}
            {message.role === 'assistant' ? (
              <>
                <NarrativeFormatter
                  content={message.content}
                  className="text-[18px] leading-relaxed font-special-elite"
                  playerColors={playerColors}
                  onImageClick={onImageClick}
                />
                {message.content.includes('[KONIEC_SESJI:POTWIERDZENIE]') && (
                  <div className="mt-6 p-4 rounded-lg border border-red-950 bg-red-950/20 text-red-200/90 font-special-elite text-sm text-center tracking-wider animate-pulse shadow-md">
                    <p className="font-semibold text-red-400 mb-1">𓂀 KRONIKA ZAPISANA 𓂀</p>
                    <p className="italic">
                      "Mrok nie śpi, a cienie Arkham wydłużają się w nieskończoność. Dziękujemy za wspólną sesję..."
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[18px] leading-relaxed font-special-elite break-words overflow-wrap-anywhere whitespace-pre-wrap chat-message">
                {cleanMarkdown(message.content)}
              </p>
            )}

            {/* Wygenerowane obrazy */}
            {message.generatedImages && message.generatedImages.length > 0 && (
              <div className="mt-3 space-y-4">
                {message.generatedImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-zinc-700 shadow-lg"
                    style={{
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Ilustracja ${idx + 1}`}
                      className="w-full aspect-[16/9] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        filter: 'sepia(0.1) saturate(1.1)',
                      }}
                      loading="lazy"
                      onClick={() =>
                        onImageClick(imgUrl, message.generatedImages || [])
                      }
                    />
                  </div>
                ))}
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

            {message.acquiredItems && message.acquiredItems.length > 0 && (
              <div>
                {message.acquiredItems.map((proposal) => (
                  <AcquiredItemCard
                    key={proposal.id}
                    proposal={proposal}
                    onConfirm={() =>
                      void onConfirmAcquiredItem?.(message.id, proposal.id)
                    }
                    onDismiss={() =>
                      onDismissAcquiredItem?.(message.id, proposal.id)
                    }
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
