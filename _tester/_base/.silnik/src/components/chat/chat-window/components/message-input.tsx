'use client';

/**
 * @file MessageInput - input czatu z Textarea + Send button + opcjonalny SummarizeScene (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx jako micro 7/8. SummarizeScene button renderowany
 * conditional gdy messagesCount>=3 i onSummarizeScene defined.
 *
 * Textarea onKeyDown: Enter (bez shift) wysyła wiadomość + reset newMessage.
 */

import { Send, BookOpen, Loader2, Users, Check } from 'lucide-react';
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
}: MessageInputProps) {
  // C4: w duecie Enter/klik DOKŁADA deklarację (nie wysyła); solo bez zmian.
  const duetActive = isDuet && !!onAddDeclaration;

  const submitInput = () => {
    if (isSessionEnded) return;
    const text = newMessage.trim();
    if (!text) return;
    if (duetActive) {
      onAddDeclaration!(text);
    } else {
      handleSendMessage(text);
    }
    setNewMessage('');
  };

  return (
    <div className="relative px-4 py-3 bg-card border-t border-brass/30">
      {/* déco: złota linia akcentu nad paskiem wpisywania */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />

      {/* Komunikat o zamkniętej sesji */}
      {isSessionEnded && (
        <div className="max-w-4xl mx-auto mb-3 px-4 py-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-xs font-special-elite flex items-center justify-between shadow-inner">
          <span className="flex items-center gap-2">
            <span>🔒</span> Sesja została bezpiecznie zamknięta. Zapis gry wykonany automatycznie.
          </span>
          <span className="text-amber-400/80 text-[11px]">Koniec Sesji</span>
        </div>
      )}

      {/* C4 (duet): zebrane deklaracje + kto jeszcze nie zadeklarował */}
      {duetActive && !isSessionEnded && (
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

      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSessionEnded || isLoading}
          placeholder={
            isSessionEnded
              ? '🔒 Sesja została zakończona. Wczytaj sesję lub rozpocznij nową przygodę.'
              : duetActive
                ? `${currentPlayerName ? `${currentPlayerName}: ` : ''}wpisz deklarację i naciśnij Enter...`
                : 'Wpisz wiadomość do Mistrza Gry...'
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
