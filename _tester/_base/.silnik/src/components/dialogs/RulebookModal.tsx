'use client';

import type { FC } from 'react';
import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  BookOpen,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { getApiKeyHeaders } from '@/lib/api-keys-service';

export interface RulebookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gated?: boolean;
  onUploaded?: () => void;
  rulesCount?: number;
}

type Stage = 'idle' | 'working' | 'done' | 'error';

/**
 * RulebookModal - modal wgrywania i indeksowania podręcznika zasad CoC 7e (PDF).
 * Twarda bramka (hard gate) odblokowująca grę analogicznie do klucza API.
 * Plik PDF jest przetwarzany w pamięci na urządzeniu i indeksowany do lokalnej bazy RAG (data/rag/rules).
 */
export const RulebookModal: FC<RulebookModalProps> = ({
  open,
  onOpenChange,
  gated = false,
  onUploaded,
  rulesCount = 0,
}) => {
  const t = useTranslations('RulebookModal');
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [indexed, setIndexed] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const hasRules = rulesCount > 0 || stage === 'done';

  useEffect(() => {
    if (open) {
      setStage('idle');
      setError('');
      setProgress(0);
      setFileName('');
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && gated && !hasRules) {
      return;
    }
    onOpenChange(next);
  };

  const handlePick = () => {
    if (stage === 'working') return;
    inputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStage('error');
      setError(t('errorTitle') + ': ' + t('dropZoneSub'));
      return;
    }

    setFileName(file.name);
    setError('');
    setStage('working');
    setProgress(5);

    // Symulacja postępu podczas przetwarzania pliku PDF
    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 2 : p));
    }, 600);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'rules');
      form.append('fileName', file.name);

      const res = await fetch('/api/pdf/ingest-local', {
        method: 'POST',
        headers: getApiKeyHeaders(),
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

      const totalIndexed = data.indexed ?? 0;
      setIndexed(totalIndexed);
      setProgress(100);
      setStage('done');

      // Powiadom system o aktualizacji bazy zasad
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('rules-changed', { detail: { recordCount: totalIndexed } })
        );
      }
    } catch (err) {
      clearInterval(timer);
      setStage('error');
      setError(err instanceof Error ? err.message : 'Błąd połączenia');
      setProgress(0);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (stage !== 'working') setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (stage === 'working') return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleComplete = () => {
    onUploaded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="wide"
        className={`bg-gradient-to-b from-card to-background border border-brass/40 shadow-[0_0_30px_rgba(0,0,0,0.55)] deco-corners ${
          gated && !hasRules ? '[&>button:last-child]:hidden' : ''
        }`}
        onEscapeKeyDown={(e) => gated && !hasRules && e.preventDefault()}
        onPointerDownOutside={(e) => gated && !hasRules && e.preventDefault()}
        onInteractOutside={(e) => gated && !hasRules && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.12em] text-foreground text-xl">
            <BookOpen className="w-6 h-6 text-brass" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Informacja o bezpieczeństwie i lokalnym RAG */}
          <Card className="bg-amber-900/20 border-amber-500/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  <strong>{t('privacyLabel')}</strong>{' '}
                  {t('privacyDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Aktualny status bazy */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-display uppercase tracking-[0.08em] text-muted-foreground">
              {t('statusCurrent')}
            </span>
            <div className="flex items-center gap-2">
              {hasRules ? (
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/50 bg-emerald-950/30 text-xs px-2 py-0.5">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {t('readyBadge')} ({rulesCount > 0 ? rulesCount : indexed})
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  {t('requiredBadge')}
                </Badge>
              )}
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Stan: Gotowość do wyboru / Drag & Drop */}
          {stage === 'idle' && (
            <div
              onClick={handlePick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full rounded-lg border-2 border-dashed transition-all p-8 flex flex-col items-center justify-center gap-3 cursor-pointer ${
                isDragOver
                  ? 'border-brass bg-brass/15 scale-[0.99]'
                  : 'border-brass/40 hover:border-brass/70 bg-[#14100c] hover:bg-[#1a1610]'
              }`}
            >
              <div className="p-3 rounded-full bg-brass/10 border border-brass/30 text-brass">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-display uppercase tracking-wider text-foreground">
                  {t('dropZonePrompt')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('dropZoneSub')}
                </p>
              </div>
            </div>
          )}

          {/* Stan: Przetwarzanie i liczenie embeddingów */}
          {stage === 'working' && (
            <Card className="bg-[#14100c] border border-brass/40 shadow-inner">
              <CardContent className="py-5 px-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-foreground truncate mr-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brass shrink-0" />
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-mono text-xs">{fileName || 'Podręcznik CoC 7e'}</span>
                  </div>
                  <span className="text-xs font-mono text-brass shrink-0">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-black/60" />
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs font-display uppercase tracking-wider text-brass">
                    {t('processingTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('processingDescription')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stan: Sukces */}
          {stage === 'done' && (
            <Card className="bg-emerald-950/30 border border-emerald-500/50">
              <CardContent className="py-5 px-5 space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-400 font-display uppercase tracking-wider text-sm">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>{t('successTitle')}</span>
                </div>
                <p className="text-xs text-emerald-200/90 font-serif">
                  {t('successIndexed', { count: indexed })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stan: Błąd */}
          {stage === 'error' && (
            <Card className="bg-red-950/30 border border-red-500/50">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-display uppercase tracking-wider text-xs text-red-400 font-semibold mb-0.5">
                      {t('errorTitle')}
                    </div>
                    <div className="text-xs text-red-200">{error}</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePick}
                    className="border-red-500/40 text-red-200 hover:bg-red-900/30 text-xs"
                  >
                    {t('retry')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Źródła legalne podręcznika (z dawnego step-content-sources) */}
          <div className="rounded-lg border border-brass/25 bg-[#120f0b] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wider text-brass/90">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('sourcesTitle')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('sourcesDesc')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href="https://blackmonk.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded border border-brass/30 bg-brass/5 hover:bg-brass/15 transition-colors text-xs text-foreground group"
              >
                <span>Black Monk (PL)</span>
                <ExternalLink className="w-3 h-3 text-brass/70 group-hover:text-brass" />
              </a>
              <a
                href="https://www.drivethrurpg.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded border border-brass/30 bg-brass/5 hover:bg-brass/15 transition-colors text-xs text-foreground group"
              >
                <span>DriveThruRPG (EN)</span>
                <ExternalLink className="w-3 h-3 text-brass/70 group-hover:text-brass" />
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground/60 italic pt-1">
              {t('disclaimer')}
            </p>
          </div>
        </div>

        {/* Dolny pasek przycisków */}
        <div className="flex justify-between items-center pt-2">
          <div>
            {!gated && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={stage === 'working'}
                className="border-brass/30 text-muted-foreground hover:text-foreground text-xs uppercase font-display tracking-wider"
              >
                {t('close')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {stage === 'done' ? (
              <Button
                onClick={handleComplete}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-[0.14em] text-xs px-6 py-2 shadow-[0_0_15px_rgba(201,162,39,0.25)]"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('continueToGame')}
              </Button>
            ) : stage === 'idle' && hasRules ? (
              <Button
                onClick={handleComplete}
                variant="outline"
                className="border-brass/40 text-brass hover:bg-brass/10 font-display uppercase tracking-[0.12em] text-xs"
              >
                {t('continueToGame')}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
