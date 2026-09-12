'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Bug,
  Copy,
  Download,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';

export type FeedbackCategory =
  | 'mechanics'
  | 'audio'
  | 'graphics'
  | 'narrative'
  | 'general';

interface BetaFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioTitle?: string;
  characterName?: string;
  eraLabel?: string;
  messageCount?: number;
}

export function BetaFeedbackModal({
  open,
  onOpenChange,
  scenarioTitle,
  characterName,
  eraLabel,
  messageCount,
}: BetaFeedbackModalProps) {
  const t = useTranslations('BetaFeedback');
  const [category, setCategory] = useState<FeedbackCategory>('mechanics');
  const [description, setDescription] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);

  const categories: Array<{ id: FeedbackCategory; label: string }> = [
    { id: 'mechanics', label: t('categoryMechanics') },
    { id: 'audio', label: t('categoryAudio') },
    { id: 'graphics', label: t('categoryGraphics') },
    { id: 'narrative', label: t('categoryNarrative') },
    { id: 'general', label: t('categoryGeneral') },
  ];

  const generateDiagnosticData = () => {
    return {
      appVersion: 'v0.9.3 (Beta)',
      timestamp: new Date().toISOString(),
      scenario: scenarioTitle || 'Nie wybrano (Ekran główny)',
      era: eraLabel || 'Nie określono',
      character: characterName || 'Brak aktywnego badacza',
      messageCount: messageCount ?? 0,
      category,
      userDescription: description.trim(),
      browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      screenResolution:
        typeof window !== 'undefined'
          ? `${window.innerWidth}x${window.innerHeight}`
          : 'Unknown',
    };
  };

  const handleCopyReport = async () => {
    const diag = generateDiagnosticData();
    const catLabel =
      categories.find((c) => c.id === category)?.label || category;

    const reportMarkdown = `### [BETA FEEDBACK] ${catLabel}

**Opis problemu:**
${diag.userDescription || '*(Brak dodatkowego opisu)*'}

<details>
<summary><b>Dane diagnostyczne sesji</b></summary>

- **Wersja aplikacji:** \`${diag.appVersion}\`
- **Data i czas:** \`${diag.timestamp}\`
- **Scenariusz:** ${diag.scenario}
- **Epoka:** ${diag.era}
- **Badacz:** ${diag.character}
- **Liczba wiadomości w sesji:** ${diag.messageCount}
- **Rozdzielczość ekranu:** \`${diag.screenResolution}\`
- **Przeglądarka / Środowisko:** \`${diag.browserInfo}\`

</details>
`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(reportMarkdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast({
          title: t('copySuccess'),
          description: t('subtitle'),
        });
      }
    } catch (err) {
      console.error('Błąd kopiowania do schowka:', err);
    }
  };

  const handleDownloadDiagnostics = () => {
    const diag = generateDiagnosticData();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(diag, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `straznik-tajemnic-diagnostyka-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-2xl border-brass/50 bg-[#0d0f12]/95 backdrop-blur-md">
        <DialogHeader className="space-y-2 pb-3 border-b border-brass/20">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/70 text-primary bg-primary/10 font-display font-semibold uppercase tracking-wider text-xs px-2.5 py-0.5"
            >
              <Bug className="w-3.5 h-3.5 mr-1" />
              Feedback
            </Badge>
          </div>
          <DialogTitle className="font-display text-xl font-bold tracking-wide text-foreground uppercase">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-xs font-special-elite text-muted-foreground">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Wybór kategorii */}
          <div className="space-y-2">
            <label className="text-xs font-display font-semibold uppercase tracking-wider text-brass">
              {t('categoryLabel')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`text-left text-xs p-2.5 rounded border transition-colors ${
                    category === cat.id
                      ? 'border-primary bg-primary/15 text-foreground font-semibold shadow-sm'
                      : 'border-brass/20 bg-card/40 text-muted-foreground hover:border-brass/50 hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <label
              htmlFor="feedback-description"
              className="text-xs font-display font-semibold uppercase tracking-wider text-brass"
            >
              {t('descriptionLabel')}
            </label>
            <Textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={4}
              className="border-brass/30 bg-card/50 text-xs font-special-elite focus-visible:ring-primary"
            />
          </div>

          {/* Dane diagnostyczne - Zwijany panel */}
          <div className="border border-brass/20 rounded p-3 bg-black/40">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center justify-between w-full text-xs font-display uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brass" />
                {t('diagnosticsTitle')}
              </span>
              {showDiagnostics ? (
                <ChevronDown className="w-4 h-4 text-brass" />
              ) : (
                <ChevronRight className="w-4 h-4 text-brass" />
              )}
            </button>

            {showDiagnostics && (
              <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                <div>
                  <span className="text-foreground/70 block">{t('appVersion')}:</span>
                  v0.9.3 (Beta)
                </div>
                <div>
                  <span className="text-foreground/70 block">{t('currentScenario')}:</span>
                  {scenarioTitle || '—'}
                </div>
                <div>
                  <span className="text-foreground/70 block">{t('currentEra')}:</span>
                  {eraLabel || '—'}
                </div>
                <div>
                  <span className="text-foreground/70 block">{t('character')}:</span>
                  {characterName || '—'}
                </div>
                <div>
                  <span className="text-foreground/70 block">{t('messagesCount')}:</span>
                  {messageCount ?? 0}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-brass/20">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDiagnostics}
            className="w-full sm:w-auto text-xs border-brass/30 text-brass hover:bg-brass/10"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            {t('downloadButton')}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={handleCopyReport}
              className="w-full sm:w-auto font-display uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:brightness-110"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-2 text-emerald-300" />
                  Skopiowano!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  {t('copyButton')}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('close')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
