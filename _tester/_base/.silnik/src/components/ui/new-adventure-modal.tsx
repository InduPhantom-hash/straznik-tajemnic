'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Save, RotateCcw } from 'lucide-react';

interface NewAdventureModalProps {
  open: boolean;
  onClose: () => void;
  /** Zapisz aktualną sesję, a po zapisie wróć do kreatora. */
  onSaveFirst: () => void;
  /** Wróć do kreatora bez zapisywania (utracisz niezapisany postęp). */
  onSkipSave: () => void;
}

/**
 * Okienko potwierdzenia dla "Nowej przygody".
 *
 * Pyta gracza, czy zapisać aktualną sesję przed powrotem do ekranu głównego
 * (kreatora). Trzy wyjścia: zapisz i wróć / wróć bez zapisu / anuluj.
 */
export function NewAdventureModal({
  open,
  onClose,
  onSaveFirst,
  onSkipSave,
}: NewAdventureModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="wide">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/60" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/60" />

        <DialogHeader className="text-center sm:text-center">
          <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
            Powrót do progu
          </div>
          <DialogTitle className="mt-1 flex items-center justify-center gap-2 font-display-decorative text-2xl font-black uppercase tracking-[0.12em] text-foreground">
            <RotateCcw className="h-5 w-5 text-primary" />
            Nowa przygoda
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            Wrócisz do ekranu głównego, by wybrać nowy scenariusz. Czy chcesz
            najpierw zapisać aktualną sesję?
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-3 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

        <div className="relative mt-3 border border-destructive/30 bg-card p-4">
          <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-destructive/50" />
          <p className="font-serif text-base italic leading-relaxed text-destructive">
            ⚠️ Bez zapisu utracisz postęp obecnej rozgrywki. Twoje postacie
            pozostaną w katalogu.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            onClick={() => {
              onSaveFirst();
              onClose();
            }}
            className="w-full font-display font-semibold uppercase tracking-[0.16em]"
          >
            <Save className="mr-2 h-4 w-4" />
            Zapisz i rozpocznij nową
          </Button>
          <Button
            onClick={() => {
              onSkipSave();
              onClose();
            }}
            variant="outline"
            className="w-full font-display font-semibold uppercase tracking-[0.16em]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rozpocznij bez zapisywania
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full font-display uppercase tracking-[0.16em] text-muted-foreground hover:text-brass"
          >
            Anuluj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewAdventureModal;
