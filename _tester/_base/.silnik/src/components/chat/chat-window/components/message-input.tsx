'use client';

/**
 * @file MessageInput - input czatu z Textarea + Send button + opcjonalny SummarizeScene (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx jako micro 7/8. SummarizeScene button renderowany
 * conditional gdy messagesCount>=3 i onSummarizeScene defined.
 *
 * Textarea onKeyDown: Enter (bez shift) wysyła wiadomość + reset newMessage.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, BookOpen, Loader2, Users, Check, Clock, Mic, ArrowLeftRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { ResolvedEraContext, AnachronismDetection } from '@/lib/era';
import { detectAnachronism } from '@/lib/era';
import { filterCheatSuggestions, type CheatSuggestion } from '@/lib/cheats/cheat-engine';
import { CheatAutocompletePopup } from './cheat-autocomplete-popup';
import { usePushToTalk } from '@/hooks/usePushToTalk';
import { useSettingsSelector } from '@/hooks/use-settings-subscription';

import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';

/** C4: pojedyncza deklaracja gracza w buforze tury (lustro PendingDeclaration). */
interface DeclarationView {
  playerId: string;
  playerName: string;
  characterName?: string;
  text: string;
}

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (message: string) => void;
  messagesCount: number;
  onSummarizeScene?: () => Promise<void>;
  isSummarizingScene?: boolean;
  // === C4 (duet): bufor deklaracji ===
  /** Czy tryb dla dwojga - decyduje o buforowaniu (Enter dokłada zamiast wysyłać). */
  isDuet?: boolean;
  pendingDeclarations?: DeclarationView[];
  playersAwaitingDeclaration?: { id: string; name: string }[];
  /** Dokłada deklarację aktualnego gracza (Enter w duecie). */
  onAddDeclaration?: (text: string) => void;
  onPassDeclaration?: () => void;
  currentPlayerName?: string;
  isTurnReady?: boolean;
  /** Składa bufor w turę i wysyła do MG ("Wyślij turę"). */
  onSendTurn?: () => void;
  /** Przypisuje kwestie obu badaczy do bufora (diarizacja mowy). */
  onAssignDuetDeclarations?: (player1Text: string, player2Text: string) => void;
  /** Zamienia przypisanie kwestii między badaczami ("Odwróć role"). */
  onSwapDuetDeclarations?: () => void;
  isLoading?: boolean;
  // === Przełącznik graczy (przeniesiony z sidebaru) ===
  /** Przełącza aktywnego gracza Hot Seat (index w tablicy players). */
  onSwitchPlayer?: (playerIndex: number) => void;
  /** Wyłącza tryb Hot Seat. */
  onDisableHotSeat?: () => void;
  /** Mapowanie id gracza na index - potrzebne bo plakietki operują na id, a handleSwitchPlayer na index. */
  hotSeatPlayers?: { id: string; name: string; index: number }[];
  isSessionEnded?: boolean;
  sessionEndStatus?: 'idle' | 'awaiting_player_closure' | 'ended';
  /** Kontekst kanoniczny epoki sceny dla reguł i detekcji anachronizmów. */
  eraContext?: ResolvedEraContext | null;
  /** Dynamiczny kontekst sesji dla słownika transkrypcji */
  investigators?: Array<string | { name?: string; characterName?: string; playerName?: string }>;
  sceneNpcs?: string[];
  currentLocation?: string;
  /** Czy funkcja Push-to-Talk jest aktywna (domyślnie false z Ustawień). */
  pushToTalkEnabled?: boolean;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  messagesCount,
  onSummarizeScene,
  isSummarizingScene = false,
  isDuet = false,
  pendingDeclarations = [],
  playersAwaitingDeclaration = [],
  onAddDeclaration,
  onPassDeclaration,
  currentPlayerName,
  isTurnReady = false,
  onSendTurn,
  onAssignDuetDeclarations,
  onSwapDuetDeclarations,
  isLoading = false,
  onSwitchPlayer,
  onDisableHotSeat,
  hotSeatPlayers,
  isSessionEnded = false,
  sessionEndStatus = 'idle',
  eraContext,
  investigators = [],
  sceneNpcs = [],
  currentLocation,
  pushToTalkEnabled,
}: MessageInputProps) {
  const t = useTranslations('MessageInput');
  const tAnachronism = useTranslations('Anachronism');
  const locale = (useLocale?.() || 'pl') as 'pl' | 'en';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveYear = eraContext?.effectiveYear;
  const countryOrRegion = eraContext?.countryCode || eraContext?.regionProfile || 'US';

  const [anachronismAlert, setAnachronismAlert] = useState<AnachronismDetection | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedCheatIndex, setSelectedCheatIndex] = useState(0);
  const [cheatSuggestions, setCheatSuggestions] = useState<CheatSuggestion[]>([]);
  const [showCheatPopup, setShowCheatPopup] = useState(false);

  // Autocomplete cheatów pod znak [
  useEffect(() => {
    if (newMessage.startsWith('[')) {
      const suggestions = filterCheatSuggestions(newMessage);
      setCheatSuggestions(suggestions);
      setShowCheatPopup(suggestions.length > 0);
      setSelectedCheatIndex(0);
    } else {
      setShowCheatPopup(false);
      setCheatSuggestions([]);
    }
  }, [newMessage]);

  const handleSelectCheat = (suggestion: CheatSuggestion) => {
    setNewMessage(suggestion.template);
    setShowCheatPopup(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = suggestion.template.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 50);
  };


  // Debounced detekcja anachronizmów (250ms)
  useEffect(() => {
    if (!newMessage.trim() || !effectiveYear) {
      setAnachronismAlert(null);
      setIsDismissed(false);
      return;
    }

    const timer = setTimeout(() => {
      const detection = detectAnachronism(newMessage, effectiveYear, countryOrRegion, locale);
      setAnachronismAlert((prev) => {
        if (prev?.term !== detection?.term) {
          setIsDismissed(false);
        }
        return detection;
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [newMessage, effectiveYear, countryOrRegion, locale]);

  // Nasłuchiwanie na akcję "Pytaj o to" (Quote-to-Input) ze wszystkich widoków Dziennika
  useEffect(() => {
    const handleQuoteToInput = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>;
      const text = customEvent.detail?.text;
      if (typeof text === 'string') {
        setNewMessage(text);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
          }
        }, 50);
      }
    };

    window.addEventListener('straznik:quote-to-input', handleQuoteToInput);
    return () => {
      window.removeEventListener('straznik:quote-to-input', handleQuoteToInput);
    };
  }, [setNewMessage]);

  // C4: w duecie Enter/klik DOKŁADA deklarację (nie wysyła); solo bez zmian.
  const duetActive = isDuet && !!onAddDeclaration;

  const submitInput = () => {
    if (isSessionEnded || sessionEndStatus === 'ended') return;
    const text = newMessage.trim();
    if (!text) return;
    if (duetActive) {
      onAddDeclaration!(text);
    } else {
      handleSendMessage(text);
    }
    setNewMessage('');
    setAnachronismAlert(null);
    setIsDismissed(false);
  };

  const handleTranscriptionSuccess = useCallback(
    (result: {
      text: string;
      segments?: Array<{ speaker: string; text: string }>;
      mode: 'solo' | 'duet';
    }) => {
      if (duetActive || isDuet) {
        const segs = result.segments || [];
        const seg1 =
          segs.find((s) => s.speaker.toLowerCase().includes('1'))?.text ||
          segs[0]?.text ||
          '';
        const seg2 =
          segs.find((s) => s.speaker.toLowerCase().includes('2'))?.text ||
          segs[1]?.text ||
          '';

        if (seg1 && seg2) {
          if (onAssignDuetDeclarations) {
            onAssignDuetDeclarations(seg1, seg2);
          } else if (onAddDeclaration) {
            onAddDeclaration(seg1);
          }
        } else {
          const text = seg1 || seg2 || result.text;
          if (text) {
            if (onAddDeclaration) {
              onAddDeclaration(text);
            } else {
              setNewMessage(
                newMessage.trim() ? `${newMessage.trim()} ${text}` : text
              );
            }
          }
        }
      } else {
        const text = result.text.trim();
        if (text) {
          setNewMessage(
            newMessage.trim() ? `${newMessage.trim()} ${text}` : text
          );
        }
      }

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
    },
    [duetActive, isDuet, onAssignDuetDeclarations, onAddDeclaration, setNewMessage]
  );

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  }, []);

  const settingsPushToTalk = useSettingsSelector((s) =>
    Boolean(s.pushToTalkEnabled ?? s.voiceSettings?.pushToTalkEnabled)
  );
  const effectivePushToTalkEnabled =
    pushToTalkEnabled !== undefined ? pushToTalkEnabled : settingsPushToTalk;

  const {
    isRecording,
    isTranscribing,
    isHoldMode,
    toggleRecording,
  } = usePushToTalk({
    onTranscriptionSuccess: handleTranscriptionSuccess,
    mode: isDuet ? 'duet' : 'solo',
    investigators,
    sceneNpcs,
    location: currentLocation,
    language: locale,
    disabled: !effectivePushToTalkEnabled || isSessionEnded || sessionEndStatus === 'ended' || isLoading,
    onFocusInput: focusTextarea,
    tMicPermissionDenied: t('micPermissionDenied'),
    tMicPermissionDeniedTitle: t('micPermissionDeniedTitle'),
    tApiKeyMissing: t('apiKeyMissing'),
    tApiKeyMissingTitle: t('apiKeyMissingTitle'),
    tTranscribeError: t('transcribeError'),
    tTranscribeErrorTitle: t('transcribeErrorTitle'),
  });

  return (
    <div className="relative px-4 py-3 bg-card border-t border-brass/30">
      {/* déco: złota linia akcentu nad paskiem wpisywania */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />

      {/* Komunikat o zamkniętej sesji */}
      {(isSessionEnded || sessionEndStatus === 'ended') && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-2 bg-card/90 border border-brass/40 rounded-lg text-brass text-xs font-special-elite flex items-center justify-between shadow-inner">
          <span className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            Sesja została bezpiecznie zamknięta. Postać i historia są zapisane.
          </span>
        </div>
      )}

      {/* C4 (duet): zebrane deklaracje + kto jeszcze nie zadeklarował */}
      {duetActive && !isSessionEnded && sessionEndStatus !== 'ended' && (
        <div className="max-w-4xl mx-auto mb-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-special-elite uppercase tracking-[0.14em] text-brass/90 mr-1">
            <Users className="w-3.5 h-3.5" />
            Tura
          </div>
          {pendingDeclarations.map((declaration) => (
            <div
              key={declaration.playerId}
              className="max-w-[260px] inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/25 px-2.5 py-1 text-emerald-100"
              title={declaration.text}
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="font-medium">{declaration.playerName}</span>
              <span className="truncate text-emerald-100/65">
                {declaration.text}
              </span>
            </div>
          ))}
          {playersAwaitingDeclaration.map((player) => {
            const hsPlayer = hotSeatPlayers?.find(hp => hp.id === player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => hsPlayer != null && onSwitchPlayer?.(hsPlayer.index)}
                className="inline-flex items-center rounded-full border border-brass/25 bg-black/15 px-2.5 py-1 text-muted-foreground hover:border-brass/50 hover:bg-brass/10 hover:text-foreground transition-colors cursor-pointer"
                title={`Przełącz na ${player.name}`}
              >
                Czeka: {player.name}
              </button>
            );
          })}
          {/* Przycisk szybkiej zamiany ról w duecie ("Odwróć role") */}
          {pendingDeclarations.length >= 2 && onSwapDuetDeclarations && (
            <button
              type="button"
              onClick={onSwapDuetDeclarations}
              className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-card px-2.5 py-1 text-brass hover:border-brass hover:bg-brass/10 hover:text-gold transition-colors cursor-pointer text-xs font-special-elite"
              title={t('swapRolesTitle')}
              data-testid="swap-roles-button"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-brass" />
              <span>{t('swapRoles')}</span>
            </button>
          )}
          {/* Przycisk zamknięcia trybu Hot Seat */}
          {onDisableHotSeat && (
            <button
              type="button"
              onClick={onDisableHotSeat}
              className="ml-auto h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Wyłącz tryb Hot Seat"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Detekcja anachronizmu: Subtelny, klimatyczny badge Art Déco (non-blocking) */}
      {anachronismAlert && !isDismissed && effectiveYear && (
        <div
          data-testid="anachronism-alert"
          className="max-w-4xl mx-auto mb-2 px-3.5 py-2 rounded-lg border border-brass/50 bg-gradient-to-r from-card via-black/80 to-card text-foreground text-xs font-special-elite flex items-center justify-between gap-3 shadow-deco animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-brass shrink-0" />
            <span className="font-semibold text-brass tracking-wide shrink-0">
              {tAnachronism('badgeTitle', { year: effectiveYear || '' })}:
            </span>
            <span className="truncate text-foreground/90">
              {tAnachronism('warning', { term: anachronismAlert.term || '' })}
              {anachronismAlert.alternative && (
                <>
                  {' '}
                  <span className="text-brass font-medium">
                    {tAnachronism('recommendation')}
                  </span>{' '}
                  <span className="italic text-foreground font-sans text-[11px] bg-brass/15 px-1.5 py-0.5 rounded border border-brass/30">
                    {anachronismAlert.alternative}
                  </span>
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            data-testid="anachronism-dismiss-button"
            onClick={() => setIsDismissed(true)}
            className="text-[11px] text-brass hover:text-foreground underline shrink-0 transition-colors cursor-pointer px-1 py-0.5"
          >
            {tAnachronism('dismiss')}
          </button>
        </div>
      )}

      {/* Retro Popup Autocomplete Cheatów pod [ */}
      {showCheatPopup && (
        <div className="max-w-4xl mx-auto relative">
          <CheatAutocompletePopup
            suggestions={cheatSuggestions}
            selectedIndex={selectedCheatIndex}
            onSelectSuggestion={handleSelectCheat}
            locale={locale}
          />
        </div>
      )}
      {/* Push-to-Talk: Optyczny stan nagrywania i retro fala audio Art Déco */}
      {effectivePushToTalkEnabled && isRecording && (
        <div
          data-testid="ptt-recording-indicator"
          className="max-w-4xl mx-auto mb-2 px-3.5 py-1.5 rounded-md border border-brass/40 bg-card text-brass text-xs font-special-elite flex items-center justify-between shadow-inner animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
            </span>
            <div className="flex items-center gap-0.5 h-3.5 px-1" aria-hidden="true">
              <span className="w-0.5 h-1.5 bg-brass animate-pulse rounded-full" />
              <span className="w-0.5 h-3 bg-brass animate-pulse delay-75 rounded-full" />
              <span className="w-0.5 h-2 bg-brass animate-pulse delay-150 rounded-full" />
              <span className="w-0.5 h-3.5 bg-brass animate-pulse delay-100 rounded-full" />
              <span className="w-0.5 h-2 bg-brass animate-pulse delay-200 rounded-full" />
            </div>
            <span className="text-foreground tracking-wide font-medium">
              {isHoldMode ? t('recordingHold') : t('recordingToggle')}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
            {isHoldMode ? t('recordingHoldHint') : t('recordingToggleHint')}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSessionEnded || isLoading}
          placeholder={
            isSessionEnded
              ? `🔒 ${t('sessionEndedPlaceholder')}`
              : (effectivePushToTalkEnabled && isRecording)
                ? `🎙️ ${isHoldMode ? t('recordingHold') : t('recordingToggle')}...`
                : duetActive
                  ? t('declarationPlaceholder', {
                      player: currentPlayerName ? `${currentPlayerName}: ` : '',
                    })
                  : t('messagePlaceholder')
          }
          rows={2}
          className={`min-h-[52px] max-h-[112px] resize-y font-special-elite shadow-[0_0_14px_hsl(var(--primary)/0.12)] focus-visible:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isRecording
              ? 'border-brass/70 ring-1 ring-brass/40 shadow-[0_0_16px_hsl(var(--primary)/0.25)]'
              : 'border-primary/40'
          }`}
          onKeyDown={(e) => {
            if (showCheatPopup && cheatSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCheatIndex((prev) => (prev + 1) % cheatSuggestions.length);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCheatIndex((prev) => (prev - 1 + cheatSuggestions.length) % cheatSuggestions.length);
                return;
              }
              if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && newMessage.trim().length <= 5)) {
                e.preventDefault();
                const selected = cheatSuggestions[selectedCheatIndex];
                if (selected) {
                  handleSelectCheat(selected);
                  return;
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setShowCheatPopup(false);
                return;
              }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              setShowCheatPopup(false);
              submitInput();
            }
          }}
        />
        <div className="flex items-center gap-2 pb-0.5">
          {/* Przycisk mikrofonu Push-to-Talk (Hold-to-Talk spacja / Toggle kliknięcie) */}
          {effectivePushToTalkEnabled && (
            <Button
              type="button"
              onClick={toggleRecording}
              disabled={isSessionEnded || sessionEndStatus === 'ended' || isLoading || isTranscribing}
              variant="outline"
              className={`h-[52px] px-3.5 border-brass/40 text-brass hover:bg-brass/10 hover:border-brass transition-all relative ${
                isRecording
                  ? 'border-brass bg-brass/20 text-gold ring-1 ring-brass/50 animate-pulse'
                  : ''
              }`}
              title={t('micTitle')}
              aria-label={t('micTitle')}
              data-testid="ptt-mic-button"
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin text-brass" />
              ) : (
                <Mic className={`w-4 h-4 ${isRecording ? 'text-gold' : 'text-brass'}`} />
              )}
            </Button>
          )}

          <Button
            onClick={submitInput}
            disabled={isSessionEnded || !newMessage.trim() || isLoading}
            className="h-[52px] px-4"
            title={duetActive ? 'Dodaj deklarację gracza' : 'Wyślij wiadomość'}
          >
            <Send className="w-4 h-4" />
          </Button>

          {/* C4 (duet): wyślij zebrane deklaracje jako jedną turę do MG */}
          {duetActive && onSendTurn && !isSessionEnded && (
            <>
              <Button
                onClick={onPassDeclaration}
                disabled={!onPassDeclaration || isLoading || isSessionEnded}
                variant="outline"
                className="h-[52px] px-3 whitespace-nowrap"
                title={`Zapisz deklarację "Pasuję"${currentPlayerName ? ` dla ${currentPlayerName}` : ''}`}
              >
                Pasuję
              </Button>
              <Button
                onClick={onSendTurn}
                disabled={!isTurnReady || isLoading || isSessionEnded}
                className="h-[52px] px-4 whitespace-nowrap"
                title="Złóż obie deklaracje w jedną turę i wyślij do Mistrza Gry"
              >
                Wyślij turę
              </Button>
            </>
          )}

          {/* Przycisk podsumowania sceny */}
          {onSummarizeScene && messagesCount >= 3 && !isSessionEnded && (
            <Button
              onClick={onSummarizeScene}
              disabled={isSummarizingScene || isLoading}
              variant="outline"
              className="h-[52px] px-3 border-brass/50 text-brass hover:bg-brass/10"
              title="Podsumuj ostatnią scenę do dziennika"
            >
              {isSummarizingScene ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
