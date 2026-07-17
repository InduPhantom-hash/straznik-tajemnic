'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { StepGeminiKey } from './steps/step-gemini-key';
import { StepContentSources } from './steps/step-content-sources';
import { StepUploadRulebook } from './steps/step-upload-rulebook';
import { hasRequiredKeys } from '@/lib/api-keys-service';
import { ScrollText } from 'lucide-react';

interface FirstRunWizardProps {
  open: boolean;
  /** Gra zablokowana - jeśli true, kreatora nie da się zamknąć (produkt B). */
  gated: boolean;
  /** Po pomyślnym wgraniu podręcznika (page robi refresh + odblokowanie). */
  onCompleted: () => void;
  /** Zamknięcie (dozwolone tylko gdy !gated). */
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Klucz' },
  { n: 2, label: 'Podręcznik' },
  { n: 3, label: 'Wgraj' },
];

/**
 * Fala 2 - kreator pierwszego uruchomienia ("Strażnik Tajemnic", produkt B).
 * 3 kroki: klucz Gemini → skąd wziąć podręcznik → wgraj PDF (indeks lokalny).
 * RAG jest lokalny - PDF gracza ląduje jako data/rag/rules.*, bez chmury.
 */
export function FirstRunWizard({
  open,
  gated,
  onCompleted,
  onClose,
}: FirstRunWizardProps) {
  const localMode = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
  const [step, setStep] = useState<Step>(1);

  // Po otwarciu: jeśli klucz już jest (tryb lokalny lub zapisany), zacznij od kroku 2.
  useEffect(() => {
    if (open) setStep(localMode || hasRequiredKeys() ? 2 : 1);
  }, [open, localMode]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (gated) return; // mandatory gate - ignoruj próby zamknięcia
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="wide"
        className="bg-gradient-to-b from-card to-background border border-brass/40 shadow-[0_0_30px_rgba(0,0,0,0.55)] deco-corners"
        onEscapeKeyDown={(e) => gated && e.preventDefault()}
        onPointerDownOutside={(e) => gated && e.preventDefault()}
        onInteractOutside={(e) => gated && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.12em] text-foreground text-xl">
            <ScrollText className="w-6 h-6 text-brass" />
            Pierwsze uruchomienie
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Trzy kroki do pierwszej sesji: klucz Google, skąd wziąć podręcznik i
            wgranie własnego PDF. Twój podręcznik zostaje na Twoim dysku.
          </DialogDescription>
        </DialogHeader>

        {/* Pasek kroków */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 text-xs font-special-elite uppercase tracking-[0.08em] ${
                  step === s.n
                    ? 'text-brass font-medium'
                    : step > s.n
                      ? 'text-emerald-500'
                      : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    step >= s.n ? 'border-brass bg-brass/10' : 'border-border'
                  }`}
                >
                  {s.n}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <span className="w-6 h-px bg-brass/30" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="py-2">
          {step === 1 && <StepGeminiKey onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepContentSources
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepUploadRulebook
              onBack={() => setStep(2)}
              onUploaded={onCompleted}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
