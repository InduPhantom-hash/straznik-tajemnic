'use client';

import { useRef, useState } from 'react';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Card, CardContent } from '../../ui/card';
import {
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { getApiKeyHeaders } from '@/lib/api-keys-service';

interface StepUploadRulebookProps {
  onBack: () => void;
  /** Po pomyślnym zaindeksowaniu - page robi refresh + odblokowuje grę. */
  onUploaded: () => void;
}

type Stage = 'idle' | 'working' | 'done' | 'error';

/**
 * Krok 3 kreatora: gracz wgrywa swój podręcznik PDF. Plik leci do
 * /api/pdf/ingest-local (parse w pamięci → chunk → embedding → data/rag/rules),
 * BEZ chmury. Postęp pozorny (jeden POST, brak streamu), wynik = liczba fragmentów.
 */
export function StepUploadRulebook({
  onBack,
  onUploaded,
}: StepUploadRulebookProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [indexed, setIndexed] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setStage('working');
    setProgress(5);

    // Postęp pozorny: jeden POST bez streamu - tykamy do 90% w czasie pracy.
    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 3 : p));
    }, 800);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'rules');
      form.append('fileName', file.name);

      const res = await fetch('/api/pdf/ingest-local', {
        method: 'POST',
        headers: getApiKeyHeaders(), // X-Gemini-Api-Key z localStorage
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      clearInterval(timer);

      if (!res.ok || !data.success) {
        setStage('error');
        setError(data.error || `Błąd HTTP ${res.status}`);
        setProgress(0);
        return;
      }

      setIndexed(data.indexed ?? 0);
      setProgress(100);
      setStage('done');
    } catch (err) {
      clearInterval(timer);
      setStage('error');
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      setProgress(0);
    } finally {
      // Pozwól wybrać ten sam plik ponownie po błędzie.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleBypass = async () => {
    setStage('working');
    try {
      // Stwórz wygenerowane mockowe rules gdy gracz klika Pomijam
      const res = await fetch('/api/pdf/ingest-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getApiKeyHeaders(),
        },
        body: JSON.stringify({
          text: 'Podręcznik Zasad Zew Cthulhu 7e. Zasadą główną gry jest rzut kością K100 (d100) przeciwko wartości umiejętności lub cechy postaci. Rzut równy lub niższy od wartości oznacza sukces. Rzut 01 to Ekstremalny Sukces (Krytyczny), a 100 to Pech (Fumble). Obłęd i Walka kierują się dedykowanymi tabelami i testami Poczytalności (SAN).',
          type: 'rules',
          fileName: 'domyslny_starter.pdf',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        onUploaded();
      } else {
        setStage('error');
        setError(data.error || 'Nie udało się zainicjalizować starterowych zasad');
      }
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Błąd połączenia');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wgraj swój podręcznik zasad (PDF). Plik zostanie przetworzony na Twoim
        urządzeniu i zapisany jako lokalna pamięć zasad - nie trafia do żadnej
        chmury. Duży podręcznik może się indeksować kilka minut.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFile}
        className="hidden"
      />

      {stage === 'idle' && (
        <button
          type="button"
          onClick={handlePick}
          className="w-full rounded-lg border-2 border-dashed border-brass/40 hover:border-brass/70 bg-[#1a1610] transition-colors py-10 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <UploadCloud className="w-8 h-8" />
          <span className="text-sm">Kliknij, aby wybrać plik PDF</span>
        </button>
      )}

      {stage === 'working' && (
        <Card className="bg-[#1a1610] border border-brass/30">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-brass" />
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{fileName || 'Inicjalizacja...'}</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              Przetwarzam podręcznik (parsowanie → liczenie embeddingów)…
            </p>
          </CardContent>
        </Card>
      )}

      {stage === 'done' && (
        <Card className="bg-emerald-900/20 border-emerald-500/40">
          <CardContent className="py-4 px-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <Check className="w-4 h-4" />
              <span>Gotowe - podręcznik wczytany.</span>
            </div>
            <p className="text-xs text-emerald-200/80">
              {indexed} fragmentów w lokalnej pamięci zasad.
            </p>
          </CardContent>
        </Card>
      )}

      {stage === 'error' && (
        <Card className="bg-red-900/20 border-red-500/40">
          <CardContent className="py-3 px-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handlePick}>
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={stage === 'working'}
        >
          Wstecz
        </Button>
        <div className="flex gap-2">
          {stage === 'idle' && (
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleBypass}
            >
              Użyj skróconych zasad (Starter)
            </Button>
          )}
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={onUploaded}
            disabled={stage !== 'done'}
          >
            <Check className="w-4 h-4 mr-2" />
            Gotowe, graj
          </Button>
        </div>
      </div>
    </div>
  );
}
