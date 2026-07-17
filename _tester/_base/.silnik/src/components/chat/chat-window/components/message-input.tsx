'use client';

/**
 * @file MessageInput - input czatu z Textarea + Send button + opcjonalny SummarizeScene (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx jako micro 7/8. SummarizeScene button renderowany
 * conditional gdy messagesCount>=3 i onSummarizeScene defined.
 *
 * Textarea onKeyDown: Enter (bez shift) wysyła wiadomość + reset newMessage.
 */

import { Send, BookOpen, Loader2, Users } from 'lucide-react';
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
  /** Składa bufor w turę i wysyła do MG ("Wyślij turę"). */
  onSendTurn?: () => void;
  isLoading?: boolean;
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
  onSendTurn,
  isLoading = false,
}: MessageInputProps) {
  // C4: w duecie Enter/klik DOKŁADA deklarację (nie wysyła); solo bez zmian.
  const duetActive = isDuet && !!onAddDeclaration;

  const submitInput = () => {
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
    <div className="relative p-4 bg-card border-t border-brass/30">
      {/* déco: złota linia akcentu nad paskiem wpisywania */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />

      {/* C4 (duet): zebrane deklaracje + kto jeszcze nie zadeklarował */}
      {duetActive &&
        (pendingDeclarations.length > 0 ||
          playersAwaitingDeclaration.length > 0) && (
          <div className="max-w-4xl mx-auto mb-3 rounded-lg border border-brass/30 bg-card/60 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2 font-special-elite uppercase tracking-[0.16em] text-brass/90">
              <Users className="w-3.5 h-3.5" />
              Deklaracje tury
            </div>
            {pendingDeclarations.map((d) => (
              <div key={d.playerId} className="text-foreground">
                <span className="text-primary font-medium">
                  {d.playerName}
                  {d.characterName ? ` (@${d.characterName})` : ''}:
                </span>{' '}
                <span className="text-muted-foreground">{d.text}</span>
              </div>
            ))}
            {playersAwaitingDeclaration.length > 0 && (
              <div className="text-muted-foreground italic">
                Czeka na:{' '}
                {playersAwaitingDeclaration.map((p) => p.name).join(', ')}
              </div>
            )}
          </div>
        )}

      <div className="flex gap-2 max-w-4xl mx-auto">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            duetActive
              ? 'Wpisz deklarację gracza i naciśnij Enter (potem "Wyślij turę")...'
              : 'Wpisz wiadomość do Mistrza Gry...'
          }
          className="min-h-[60px] resize-none font-special-elite border-primary/40 shadow-[0_0_14px_hsl(var(--primary)/0.12)] focus-visible:shadow-glow"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitInput();
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={submitInput}
            disabled={!newMessage.trim()}
            className="px-4"
            title={duetActive ? 'Dodaj deklarację gracza' : 'Wyślij wiadomość'}
          >
            <Send className="w-4 h-4" />
          </Button>

          {/* C4 (duet): wyślij zebrane deklaracje jako jedną turę do MG */}
          {duetActive && onSendTurn && (
            <Button
              onClick={onSendTurn}
              disabled={pendingDeclarations.length === 0 || isLoading}
              className="px-4 whitespace-nowrap"
              title="Złóż deklaracje w jedną turę i wyślij do Mistrza Gry"
            >
              Wyślij turę
            </Button>
          )}

          {/* Przycisk podsumowania sceny */}
          {onSummarizeScene && messagesCount >= 3 && (
            <Button
              onClick={onSummarizeScene}
              disabled={isSummarizingScene}
              variant="outline"
              className="px-4 border-brass/50 text-brass hover:bg-brass/10"
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
