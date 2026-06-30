'use client';

import { Button } from './button';

/**
 * 2-stopniowy confirm dialog Pełnego Resetu.
 *
 * Step 1 - pierwszy confirm z listą co zostanie usunięte.
 * Step 2 - finalne ostrzeżenie ("OSTATNIE OSTRZEŻENIE").
 *
 * Stan dialogu jest własnością `useFullReset()` hook'a - komponent jest "dumb",
 * dostaje propsy i woła callbacki.
 *
 * Wyodrębniony z `settings-modal.tsx` (linie 676-759) jako część IND-17.
 */

interface FullResetDialogProps {
  show: boolean;
  step: 0 | 1 | 2;
  onClose: () => void;
  onConfirmStep1: () => void;
  onConfirm: () => void | Promise<void>;
}

export function FullResetDialog({
  show,
  step,
  onClose,
  onConfirmStep1,
  onConfirm,
}: FullResetDialogProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        // Zamknij tylko jeśli kliknięto w tło
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card border-2 border-red-500 rounded-xl p-6 w-[90vw] max-w-[1440px] mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 && (
          <>
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              ⚠️ Pełny Reset Aplikacji
            </h3>
            <div className="text-foreground mb-6 space-y-2">
              <p>
                Ta operacja{' '}
                <strong className="text-red-400">NIEODWRACALNIE</strong> usunie:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Wszystkie postaci i ich historię</li>
                <li>Wszystkie sesje i kampanie</li>
                <li>Historię czatu i wiadomości</li>
                <li>Ustawienia aplikacji</li>
                <li>Notatki i zapisane dane</li>
                <li>
                  🖼️ Cache mediów (IndexedDB ~150 MB - portrety NPC, obrazy,
                  audio)
                </li>
                <li>🌲 Pinecone Vector DB (zasady CoC, NPC, świat gry)</li>
                <li>📚 PDFy w GCS (zasady CoC, przygody, notatki MG)</li>
                <li>Cache i tymczasowe pliki</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-muted hover:bg-muted border-border"
              >
                Anuluj
              </Button>
              <Button
                onClick={onConfirmStep1}
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Rozumiem, kontynuuj
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
              🚨 OSTATNIE OSTRZEŻENIE
            </h3>
            <div className="text-foreground mb-6">
              <p className="text-center text-lg mb-4">
                Czy na pewno chcesz{' '}
                <strong className="text-red-500">USUNĄĆ WSZYSTKIE DANE</strong>?
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Ta operacja nie może być cofnięta!
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-muted hover:bg-muted border-border"
              >
                ❌ Anuluj
              </Button>
              <Button
                onClick={() => onConfirm()}
                variant="destructive"
                className="flex-1 bg-red-700 hover:bg-red-800 animate-pulse"
              >
                🗑️ TAK, USUŃ WSZYSTKO
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FullResetDialog;
