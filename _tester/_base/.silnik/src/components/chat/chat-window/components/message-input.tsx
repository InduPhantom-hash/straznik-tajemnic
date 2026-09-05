'use client';

/**
 * @file MessageInput - input czatu z Textarea + Send button + opcjonalny SummarizeScene (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx jako micro 7/8. SummarizeScene button renderowany
 * conditional gdy messagesCount>=3 i onSummarizeScene defined.
 *
 * Textarea onKeyDown: Enter (bez shift) wysyła wiadomość + reset newMessage.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Loader2, Users, Check, Clock } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { ResolvedEraContext, AnachronismDetection } from '@/lib/era';
import { detectAnachronism } from '@/lib/era';
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
  isLoading = false,
  onSwitchPlayer,
  onDisableHotSeat,
  hotSeatPlayers,
  isSessionEnded = false,
  sessionEndStatus = 'idle',
  eraContext,
}: MessageInputProps) {
  const t = useTranslations('MessageInput');
  const tAnachronism = useTranslations('Anachronism');
  const locale = (useLocale?.() || 'pl') as 'pl' | 'en';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveYear = eraContext?.effectiveYear;
  const countryOrRegion = eraContext?.countryCode || eraContext?.regionProfile || 'US';

  const [anachronismAlert, setAnachronismAlert] = useState<AnachronismDetection | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

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

  return (
    <div className="relative px-4 py-3 bg-card border-t border-brass/30">
      {/* déco: złota linia akcentu nad paskiem wpisywania */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />

      {/* Komunikat o zamkniętej sesji */}
      {(isSessionEnded || sessionEndStatus === 'ended') && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-special-elite flex items-center justify-between shadow-inner">
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
          className="max-w-4xl mx-auto mb-2 px-3.5 py-2 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-950/70 via-black/80 to-amber-950/70 text-amber-200 text-xs font-special-elite flex items-center justify-between gap-3 shadow-[0_2px_12px_rgba(217,119,6,0.15)] animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300 tracking-wide shrink-0">
              {tAnachronism('badgeTitle', { year: effectiveYear || '' })}:
            </span>
            <span className="truncate text-amber-200/90">
              {tAnachronism('warning', { term: anachronismAlert.term || '' })}
              {anachronismAlert.alternative && (
                <>
                  {' '}
                  <span className="text-amber-400 font-medium">
                    {tAnachronism('recommendation')}
                  </span>{' '}
                  <span className="italic text-amber-100 font-sans text-[11px] bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-600/30">
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
            className="text-[11px] text-amber-400/80 hover:text-amber-200 underline shrink-0 transition-colors cursor-pointer px-1 py-0.5"
          >
            {tAnachronism('dismiss')}
          </button>
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
              : duetActive
                ? t('declarationPlaceholder', {
                    player: currentPlayerName ? `${currentPlayerName}: ` : '',
                  })
                : t('messagePlaceholder')
          }
          rows={2}
          className="min-h-[52px] max-h-[112px] resize-y font-special-elite border-primary/40 shadow-[0_0_14px_hsl(var(--primary)/0.12)] focus-visible:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitInput();
            }
          }}
        />
        <div className="flex items-center gap-2 pb-0.5">
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
