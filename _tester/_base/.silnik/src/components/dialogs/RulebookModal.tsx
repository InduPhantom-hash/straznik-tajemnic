'use client';

import type { FC } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
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
  Trash2,
  Compass,
  Sparkles,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import type {
  InstalledOverlayInfo,
  SystemCapabilities,
} from '@/lib/pdf/capabilities-manager';
import {
  isBaseRulebookProfile,
  isRulebookColumnProfile,
  isRulebookExpansionProfile,
} from '@/lib/pdf/rulebook-fingerprint';
import type { CustomAdventure } from '@/lib/adventures-data';
import {
  loadCustomAdventures,
  saveCustomAdventures,
} from '@/lib/custom-adventures-storage';

export interface RulebookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gated?: boolean;
  onUploaded?: () => void;
  rulesCount?: number;
}

type Stage = 'idle' | 'working' | 'done' | 'error';

interface RoutingNotice {
  kind: 'moved_to_optional' | 'moved_to_rules';
  fileName: string;
  profileTitle: string;
  adventureCount: number;
}

async function syncAdventuresToClientStorage(
  rawAdventures: CustomAdventure[],
  fallbackFileName: string
): Promise<void> {
  if (!Array.isArray(rawAdventures) || rawAdventures.length === 0) return;

  try {
    const normalized: CustomAdventure[] = rawAdventures.map((adv, index) => ({
      ...adv,
      id: adv.id || `custom-${Date.now()}-${index}`,
      title:
        adv.title ||
        `${fallbackFileName.replace(/\.pdf$/i, '')} - Przygoda ${index + 1}`,
      era: adv.era || 'classic',
      eraLabel: adv.eraLabel || 'Klasyczne lata 20.',
      yearRange: adv.yearRange || '1920-1929',
      location: adv.location || 'Arkham / Massachusetts',
      country: adv.country || 'USA',
      tone: adv.tone || 'purist',
      themes: adv.themes?.length ? adv.themes : ['tajemnica', 'śledztwo'],
      suggestedOccupations: adv.suggestedOccupations?.length
        ? adv.suggestedOccupations
        : ['detektyw', 'dziennikarz'],
      suggestedArchetypes: adv.suggestedArchetypes?.length
        ? adv.suggestedArchetypes
        : ['investigator'],
      hook:
        adv.hook ||
        `Śledztwo w sprawie "${adv.title || 'bez nazwy'}" czeka na odkrycie.`,
      description: adv.description || '',
      estimatedSessions: adv.estimatedSessions || '2-3',
      playerCount: adv.playerCount || '1-4',
      difficulty: adv.difficulty || 'normal',
      isCustom: true,
      pdfUrl: '',
      geminiFileUri: '',
      fileName: adv.fileName || fallbackFileName,
      uploadedAt: adv.uploadedAt || new Date().toISOString(),
      isAnalyzed: true,
      graph: adv.graph || {
        npcs: [],
        locations: [],
        clues: [],
        connections: [],
      },
      documentType: adv.documentType || 'scenario',
      lorebookData: adv.lorebookData,
      attachedLorebookIds: adv.attachedLorebookIds || [],
    }));

    const fresh = await loadCustomAdventures();
    const filteredExisting = fresh.adventures.filter(
      (existing) =>
        !normalized.some(
          (added) =>
            added.id === existing.id ||
            (existing.fileName === added.fileName &&
              existing.title === added.title)
        )
    );
    const updated = [...filteredExisting, ...normalized];

    await saveCustomAdventures({
      adventures: updated,
      activeId: fresh.activeId,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('custom-adventures-changed', {
          detail: { addedIds: normalized.map((a) => a.id) },
        })
      );
    }
  } catch (err) {
    console.warn('⚠️ Nie udało się zsynchronizować przygód z magazynem lokalnym:', err);
  }
}

async function removeAdventuresFromClientStorage(
  deletedAdventureIds: string[],
  deletedFileName?: string
): Promise<void> {
  try {
    const fresh = await loadCustomAdventures();
    const idSet = new Set(deletedAdventureIds);
    const removedIds: string[] = [];

    const remaining = fresh.adventures.filter((adv) => {
      const matchById = idSet.has(adv.id);
      const matchByFile =
        Boolean(deletedFileName) && adv.fileName === deletedFileName;
      if (matchById || matchByFile) {
        removedIds.push(adv.id);
        return false;
      }
      return true;
    });

    if (removedIds.length === 0 && idSet.size === 0) return;

    const nextActiveId =
      fresh.activeId && removedIds.includes(fresh.activeId)
        ? null
        : fresh.activeId;

    await saveCustomAdventures({
      adventures: remaining,
      activeId: nextActiveId,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('custom-adventures-changed', {
          detail: {
            deletedIds: Array.from(new Set([...deletedAdventureIds, ...removedIds])),
            deletedFileName: deletedFileName || null,
          },
        })
      );
    }
  } catch (err) {
    console.warn('⚠️ Nie udało się usunąć powiązanych przygód z magazynu lokalnego:', err);
  }
}

/**
 * RulebookModal - dwukolumnowe centrum podręczników zasad, przygód i dodatków PDF.
 * Lewa kolumna: Wymagane podręczniki zasad (Starter, Księga Strażnika, Pulp Cthulhu, Podręcznik Badacza).
 * Prawa kolumna: Opcjonalne przygody, kampanie, bestiariusze, grymuary i lorebooki.
 * Zawiera Smart Auto-Routing, weryfikację zasad bazowych dla Pulp Cthulhu oraz kaskadowe usuwanie.
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
  const pendingColumnRef = useRef<'rules' | 'optional'>('rules');

  const [fileName, setFileName] = useState<string>('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [indexed, setIndexed] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [dragOverCol, setDragOverCol] = useState<'rules' | 'optional' | null>(null);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [serverRulesCount, setServerRulesCount] = useState<number>(rulesCount);
  const [legacyBaseUnlocked, setLegacyBaseUnlocked] = useState<boolean>(rulesCount > 0);
  const [routingNotice, setRoutingNotice] = useState<RoutingNotice | null>(null);
  const [starterScenarioNote, setStarterScenarioNote] = useState<boolean>(false);
  const [deletingOverlayId, setDeletingOverlayId] = useState<string | null>(null);

  const installedOverlays: InstalledOverlayInfo[] =
    capabilities?.installedOverlays ?? [];

  const rulesOverlays = installedOverlays.filter((o) =>
    o.column ? o.column === 'rules' : isRulebookColumnProfile(o.profile)
  );
  const optionalOverlays = installedOverlays.filter((o) =>
    o.column ? o.column === 'optional' : !isRulebookColumnProfile(o.profile)
  );

  // Gra odblokowuje się tylko wtedy, gdy wgrano podręcznik bazowy (Starter lub Core/Custom).
  // Sam Pulp Cthulhu lub Podręcznik Badacza nie odblokowuje gry.
  const hasBaseRules =
    installedOverlays.length > 0
      ? Boolean(capabilities?.flags?.hasBaseRules)
      : capabilities !== null
        ? Boolean(capabilities.flags?.hasBaseRules) ||
          (serverRulesCount > 0 && legacyBaseUnlocked)
        : rulesCount > 0 || serverRulesCount > 0 || legacyBaseUnlocked;

  const hasOnlyExpansionRules =
    installedOverlays.length > 0 &&
    Boolean(
      capabilities?.flags?.hasRulebookExpansion &&
        !capabilities?.flags?.hasBaseRules
    );

  const effectiveRulesCount =
    serverRulesCount > 0
      ? serverRulesCount
      : rulesCount > 0
        ? rulesCount
        : indexed;

  const fetchCurrentStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pdf/ingest-local?type=rules');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.recordCount === 'number') {
        setServerRulesCount(data.recordCount);
      }
      if (data.capabilities && Array.isArray(data.capabilities.installedOverlays)) {
        setCapabilities(data.capabilities as SystemCapabilities);
      } else if (typeof data.recordCount === 'number' && data.recordCount > 0) {
        const prof = data.rulebookProfile?.profile;
        if (!prof || isBaseRulebookProfile(prof)) {
          setLegacyBaseUnlocked(true);
        }
      }
    } catch {
      // Ignorujemy błędy sieciowe przy odświeżaniu statusu
    }
  }, []);

  useEffect(() => {
    setServerRulesCount(rulesCount);
    if (rulesCount > 0) {
      setLegacyBaseUnlocked(true);
    }
  }, [rulesCount]);

  useEffect(() => {
    if (open) {
      setStage('idle');
      setError('');
      setProgress(0);
      setFileName('');
      setRoutingNotice(null);
      setStarterScenarioNote(false);
      void fetchCurrentStatus();
    }
  }, [open, fetchCurrentStatus]);

  const handleOpenChange = (next: boolean) => {
    if (!next && gated && !hasBaseRules) {
      return;
    }
    onOpenChange(next);
  };

  const handlePickColumn = (column: 'rules' | 'optional') => {
    if (stage === 'working') return;
    pendingColumnRef.current = column;
    inputRef.current?.click();
  };

  const processSingleFile = async (
    file: File,
    requestedColumn: 'rules' | 'optional'
  ): Promise<boolean> => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStage('error');
      setError(`${t('errorTitle')}: ${t('dropZoneSub')}`);
      return false;
    }

    setFileName(file.name);
    setError('');
    setStage('working');
    setProgress(8);

    const timer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 3 : p));
    }, 500);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', requestedColumn === 'optional' ? 'adventure' : 'rules');
      form.append('targetColumn', requestedColumn);
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
        return false;
      }

      const totalIndexed = data.indexed ?? data.totalChunks ?? 0;
      setIndexed(totalIndexed);
      setProgress(100);
      setStage('done');

      if (data.capabilities && Array.isArray(data.capabilities.installedOverlays)) {
        setCapabilities(data.capabilities as SystemCapabilities);
      } else {
        // Fallback dla mocków testowych E2E nie zwracających capabilities
        const detectedProfile = data.rulebookProfile?.profile;
        if (!detectedProfile || isBaseRulebookProfile(detectedProfile)) {
          setLegacyBaseUnlocked(true);
        }
      }

      if (data.namespace === 'rules' && typeof data.totalChunks === 'number') {
        setServerRulesCount(data.totalChunks);
      } else if (data.namespace === 'rules' && typeof data.indexed === 'number') {
        setServerRulesCount(data.indexed);
      }

      // Synchronizacja wyekstrahowanych przygód z Manual Setup (customAdventures)
      const extractedAdventures: CustomAdventure[] = Array.isArray(data.adventures)
        ? data.adventures
        : data.adventure
          ? [data.adventure]
          : [];

      if (extractedAdventures.length > 0) {
        await syncAdventuresToClientStorage(extractedAdventures, file.name);
      }

      const playableAdventureCount = extractedAdventures.filter(
        (adv) => adv.documentType !== 'compendium' && adv.documentType !== 'setting'
      ).length;

      // Obsługa komunikatu Smart Auto-Routing
      if (
        data.autoRouted &&
        (data.routingKind === 'moved_to_optional' ||
          data.routingKind === 'moved_to_rules')
      ) {
        setRoutingNotice({
          kind: data.routingKind,
          fileName: file.name,
          profileTitle: data.rulebookProfile?.title || file.name,
          adventureCount: playableAdventureCount,
        });
      }

      if (
        data.rulebookProfile?.profile === 'starter-d100' &&
        playableAdventureCount > 0
      ) {
        setStarterScenarioNote(true);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('rules-changed', {
            detail: { recordCount: totalIndexed },
          })
        );
      }

      return true;
    } catch (err) {
      clearInterval(timer);
      setStage('error');
      setError(err instanceof Error ? err.message : 'Błąd połączenia');
      setProgress(0);
      return false;
    }
  };

  const processFileList = async (
    files: FileList | File[],
    requestedColumn: 'rules' | 'optional'
  ) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setRoutingNotice(null);
    setStarterScenarioNote(false);

    for (const file of list) {
      const ok = await processSingleFile(file, requestedColumn);
      if (!ok) break;
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFileList(files, pendingColumnRef.current);
    }
  };

  const handleDragOverCol = (
    e: React.DragEvent,
    column: 'rules' | 'optional'
  ) => {
    e.preventDefault();
    if (stage !== 'working') setDragOverCol(column);
  };

  const handleDragLeaveCol = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
  };

  const handleDropCol = (
    e: React.DragEvent,
    column: 'rules' | 'optional'
  ) => {
    e.preventDefault();
    setDragOverCol(null);
    if (stage === 'working') return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      pendingColumnRef.current = column;
      void processFileList(e.dataTransfer.files, column);
    }
  };

  const handleDeleteOverlay = async (overlay: InstalledOverlayInfo) => {
    if (deletingOverlayId) return;
    setDeletingOverlayId(overlay.id);
    setError('');
    setRoutingNotice(null);

    try {
      const res = await fetch(
        `/api/pdf/ingest-local?overlayId=${encodeURIComponent(overlay.id)}&fileName=${encodeURIComponent(overlay.fileName)}`,
        {
          method: 'DELETE',
          headers: getApiKeyHeaders(),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setStage('error');
        setError(data.error || `Błąd usuwania (${res.status})`);
        return;
      }

      if (data.capabilities && Array.isArray(data.capabilities.installedOverlays)) {
        setCapabilities(data.capabilities as SystemCapabilities);
        if (data.capabilities.installedOverlays.length === 0) {
          setLegacyBaseUnlocked(false);
          setStage('idle');
        }
      }

      if (typeof data.recordCount === 'number') {
        setServerRulesCount(data.recordCount);
        if (data.recordCount === 0) {
          setLegacyBaseUnlocked(false);
        }
      }

      const deletedAdvIds: string[] = Array.isArray(data.deletedAdventureIds)
        ? data.deletedAdventureIds
        : overlay.adventureIds ?? [];

      await removeAdventuresFromClientStorage(deletedAdvIds, overlay.fileName);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('rules-changed', {
            detail: { recordCount: data.recordCount ?? 0 },
          })
        );
      }
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'Błąd usuwania pliku');
    } finally {
      setDeletingOverlayId(null);
    }
  };

  const handleComplete = () => {
    if (!hasBaseRules) return;
    onUploaded?.();
    onOpenChange(false);
  };

  const renderOverlayCard = (item: InstalledOverlayInfo) => {
    const isBase = isBaseRulebookProfile(item.profile);
    const isExpansion = isRulebookExpansionProfile(item.profile);
    const isAdventure =
      item.profile === 'one_shot' ||
      item.profile === 'scenario_anthology' ||
      item.profile === 'mega_campaign';
    const isDeleting = deletingOverlayId === item.id;

    return (
      <div
        key={item.id}
        data-testid={`installed-overlay-${item.id}`}
        className="flex items-start justify-between gap-3 rounded-md border border-brass/30 bg-[#14100c] p-3 hover:border-brass/50 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-xs uppercase tracking-wider text-foreground truncate">
              {item.title}
            </span>
            {isBase && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-[10px] px-1.5 py-0"
              >
                {t('badgeBaseRulebook')}
              </Badge>
            )}
            {isExpansion && (
              <Badge
                variant="outline"
                className="border-brass/50 bg-brass/10 text-brass text-[10px] px-1.5 py-0"
              >
                {t('badgeExpansionRulebook')}
              </Badge>
            )}
            {!isBase && !isExpansion && isAdventure && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-950/30 text-emerald-400 text-[10px] px-1.5 py-0"
              >
                {t('badgeAdventure')}
              </Badge>
            )}
            {!isBase && !isExpansion && !isAdventure && (
              <Badge
                variant="outline"
                className="border-brass/40 bg-brass/10 text-brass text-[10px] px-1.5 py-0"
              >
                {t('badgeSupplement')}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span className="truncate max-w-[220px]">{item.fileName}</span>
            {typeof item.pageCount === 'number' && item.pageCount > 0 && (
              <span>• {t('statsPages', { count: item.pageCount })}</span>
            )}
            {item.stats.adventureCount > 0 && (
              <span className="text-emerald-400">
                • {t('statsScenarios', { count: item.stats.adventureCount })}
              </span>
            )}
            {item.stats.npcCount > 0 && (
              <span>• {t('statsNpcs', { count: item.stats.npcCount })}</span>
            )}
            {item.stats.spellCount > 0 && (
              <span>• {t('statsSpells', { count: item.stats.spellCount })}</span>
            )}
            {item.stats.creatureCount > 0 && (
              <span>• {t('statsCreatures', { count: item.stats.creatureCount })}</span>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDeleting || stage === 'working'}
          onClick={() => void handleDeleteOverlay(item)}
          title={t('removeCascadeHint')}
          data-testid={`delete-overlay-${item.id}`}
          className="shrink-0 h-7 px-2.5 border-red-500/35 bg-red-950/20 text-red-300 hover:bg-red-950/45 hover:text-red-200 text-[11px] font-display uppercase tracking-wider"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {t('removeFileButton')}
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="wide"
        className={`w-[85vw] max-w-[85vw] h-[85vh] max-h-[85vh] flex flex-col overflow-hidden bg-gradient-to-b from-card to-background border border-brass/40 shadow-[0_0_30px_rgba(0,0,0,0.55)] deco-corners ${
          gated && !hasBaseRules ? '[&>button:last-child]:hidden' : ''
        }`}
        onEscapeKeyDown={(e) => gated && !hasBaseRules && e.preventDefault()}
        onPointerDownOutside={(e) => gated && !hasBaseRules && e.preventDefault()}
        onInteractOutside={(e) => gated && !hasBaseRules && e.preventDefault()}
      >
        {/* Nagłówek */}
        <DialogHeader className="shrink-0 border-b border-brass/25 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2.5 font-display uppercase tracking-[0.12em] text-foreground text-lg sm:text-xl">
              <BookOpen className="w-6 h-6 text-brass shrink-0" />
              <span>{t('title')}</span>
            </DialogTitle>

            <div className="flex items-center gap-2">
              <span className="text-xs font-display uppercase tracking-[0.08em] text-muted-foreground">
                {t('statusCurrent')}
              </span>
              {hasBaseRules ? (
                <Badge
                  variant="outline"
                  data-testid="rules-status-ready"
                  className="text-emerald-400 border-emerald-500/50 bg-emerald-950/30 text-xs px-2.5 py-0.5"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {t('readyBadge', { count: effectiveRulesCount })}
                </Badge>
              ) : hasOnlyExpansionRules ? (
                <Badge
                  variant="outline"
                  data-testid="rules-status-expansion-only"
                  className="text-gold border-brass/60 bg-brass/15 text-xs px-2.5 py-0.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {t('expansionOnlyBadge')}
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  data-testid="rules-status-required"
                  className="text-xs px-2.5 py-0.5"
                >
                  {t('requiredBadge')}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Wspólny ukryty input dla kompatybilności z testami E2E i wieloma plikami */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Główny przewijany obszar roboczy */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 py-3">
          {/* Pasek prywatności + status przetwarzania / auto-routingu */}
          <Card className="bg-brass/10 border-brass/35">
            <CardContent className="py-2.5 px-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-brass shrink-0" />
                <p className="text-xs text-foreground/90">
                  <strong>{t('privacyLabel')}</strong> {t('privacyDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pasek postępu podczas indeksowania */}
          {stage === 'working' && (
            <Card className="bg-[#14100c] border border-brass/40 shadow-inner">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-foreground truncate mr-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brass shrink-0" />
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-mono text-xs">
                      {fileName || 'PDF'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-brass shrink-0">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2 bg-black/60" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
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

          {/* Banner Smart Auto-Routing */}
          {routingNotice && (
            <Card
              data-testid="auto-routing-banner"
              className="bg-brass/15 border border-brass/60"
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2.5">
                  <ArrowRightLeft className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="text-xs font-display uppercase tracking-wider text-gold font-semibold">
                      {routingNotice.kind === 'moved_to_optional'
                        ? t('autoRoutedToOptionalTitle')
                        : t('autoRoutedToRulesTitle')}
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {routingNotice.kind === 'moved_to_optional'
                        ? t('autoRoutedToOptionalDesc', {
                            fileName: routingNotice.fileName,
                            profileTitle: routingNotice.profileTitle,
                            adventureCount: routingNotice.adventureCount,
                          })
                        : t('autoRoutedToRulesDesc', {
                            fileName: routingNotice.fileName,
                            profileTitle: routingNotice.profileTitle,
                          })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Banner sukcesu */}
          {stage === 'done' && !routingNotice && (
            <Card className="bg-emerald-950/30 border border-emerald-500/50">
              <CardContent className="py-3 px-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-display uppercase tracking-wider text-xs">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t('successTitle')}</span>
                  <span className="text-emerald-200/90 font-serif normal-case tracking-normal">
                    - {t('successIndexed', { count: indexed })}
                  </span>
                </div>
                {starterScenarioNote && (
                  <p className="text-xs text-emerald-300/90 pl-6">
                    {t('starterScenarioExtractedNote')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Banner błędu */}
          {stage === 'error' && (
            <Card className="bg-red-950/30 border border-red-500/50">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-display uppercase tracking-wider text-xs text-red-400 font-semibold">
                      {t('errorTitle')}
                    </div>
                    <div className="text-xs text-red-200">{error}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePickColumn(pendingColumnRef.current)}
                  className="border-red-500/40 text-red-200 hover:bg-red-900/30 text-xs shrink-0"
                >
                  {t('retry')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* DWUKOLUMNOWY UKŁAD: Lewa (Wymagane Zasady) | Prawa (Opcjonalne Przygody i Suplementy) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* LEWA KOLUMNA: Podręczniki Zasad (Wymagane) */}
            <div
              data-testid="rules-column"
              className="rounded-lg border border-brass/40 bg-[#120f0b]/90 p-4 flex flex-col gap-3.5"
            >
              <div className="flex items-start justify-between gap-2 border-b border-brass/20 pb-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brass shrink-0" />
                    <h3 className="font-display text-sm uppercase tracking-[0.1em] text-foreground">
                      {t('leftColTitle')}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('leftColSubtitle')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    hasBaseRules
                      ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400 text-[10px] shrink-0'
                      : 'border-red-500/50 bg-red-950/30 text-red-300 text-[10px] shrink-0'
                  }
                >
                  {hasBaseRules ? 'OK' : t('requiredBadge')}
                </Badge>
              </div>

              {/* Ostrzeżenie gdy wgrano wyłącznie Pulp Cthulhu / Podręcznik Badacza bez Core/Starter */}
              {hasOnlyExpansionRules && (
                <div
                  data-testid="pulp-requires-core-banner"
                  className="rounded-md border border-brass/60 bg-brass/15 p-3 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wider text-gold font-semibold">
                    <Info className="w-4 h-4 text-gold shrink-0" />
                    <span>{t('pulpRequiresCoreTitle')}</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {t('pulpRequiresCoreDesc')}
                  </p>
                </div>
              )}

              {/* Strefa Dropzone Lewej Kolumny */}
              <div
                data-testid="upload-rules-dropzone"
                onClick={() => handlePickColumn('rules')}
                onDragOver={(e) => handleDragOverCol(e, 'rules')}
                onDragLeave={handleDragLeaveCol}
                onDrop={(e) => handleDropCol(e, 'rules')}
                className={`w-full rounded-lg border-2 border-dashed transition-all p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                  dragOverCol === 'rules'
                    ? 'border-brass bg-brass/15 scale-[0.99]'
                    : 'border-brass/40 hover:border-brass/70 bg-[#14100c] hover:bg-[#1a1610]'
                }`}
              >
                <div className="p-2.5 rounded-full bg-brass/10 border border-brass/30 text-brass">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-xs sm:text-sm font-display uppercase tracking-wider text-foreground">
                    {t('dropZonePrompt')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('dropZoneSub')}
                  </p>
                </div>
              </div>

              {/* Lista wgranych podręczników zasad */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-display uppercase tracking-wider text-brass/90">
                  {t('installedRulesHeader', { count: rulesOverlays.length })}
                </div>
                {rulesOverlays.length === 0 ? (
                  <div className="rounded-md border border-brass/20 bg-black/25 p-3 text-xs text-muted-foreground italic">
                    {t('emptyRulesList')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {rulesOverlays.map(renderOverlayCard)}
                  </div>
                )}
              </div>
            </div>

            {/* PRAWA KOLUMNA: Przygody, Lorebooki, Bestiariusze i Grymuary (Opcjonalne) */}
            <div
              data-testid="optional-column"
              className="rounded-lg border border-brass/30 bg-[#120f0b]/80 p-4 flex flex-col gap-3.5"
            >
              <div className="flex items-start justify-between gap-2 border-b border-brass/20 pb-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="font-display text-sm uppercase tracking-[0.1em] text-foreground">
                      {t('rightColTitle')}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('rightColSubtitle')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-950/25 text-emerald-400 text-[10px] shrink-0"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('optionalBadge')}
                </Badge>
              </div>

              {/* Strefa Dropzone Prawej Kolumny */}
              <div
                data-testid="upload-optional-dropzone"
                onClick={() => handlePickColumn('optional')}
                onDragOver={(e) => handleDragOverCol(e, 'optional')}
                onDragLeave={handleDragLeaveCol}
                onDrop={(e) => handleDropCol(e, 'optional')}
                className={`w-full rounded-lg border-2 border-dashed transition-all p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                  dragOverCol === 'optional'
                    ? 'border-emerald-500/70 bg-emerald-950/25 scale-[0.99]'
                    : 'border-brass/35 hover:border-emerald-500/50 bg-[#14100c] hover:bg-[#1a1610]'
                }`}
              >
                <div className="p-2.5 rounded-full bg-emerald-950/30 border border-emerald-500/35 text-emerald-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-xs sm:text-sm font-display uppercase tracking-wider text-foreground">
                    {t('dropZoneOptionalPrompt')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('dropZoneOptionalSub')}
                  </p>
                </div>
              </div>

              {/* Lista wgranych przygód i suplementów */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-display uppercase tracking-wider text-emerald-400/90">
                  {t('installedOptionalHeader', {
                    count: optionalOverlays.length,
                  })}
                </div>
                {optionalOverlays.length === 0 ? (
                  <div className="rounded-md border border-brass/20 bg-black/25 p-3 text-xs text-muted-foreground italic">
                    {t('emptyOptionalList')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {optionalOverlays.map(renderOverlayCard)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Źródła legalne podręcznika */}
          <div className="rounded-lg border border-brass/30 bg-[#120f0b] p-3 space-y-2 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-display uppercase tracking-wider text-brass">
                <ExternalLink className="w-3.5 h-3.5 text-brass" />
                <span>{t('sourcesTitle')}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://blackmonk.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-brass/35 bg-brass/10 hover:bg-brass/20 transition-colors text-xs text-foreground font-medium"
                >
                  <span>Black Monk (PL)</span>
                  <ExternalLink className="w-3 h-3 text-brass" />
                </a>
                <a
                  href="https://www.drivethrurpg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-brass/35 bg-brass/10 hover:bg-brass/20 transition-colors text-xs text-foreground font-medium"
                >
                  <span>DriveThruRPG (EN)</span>
                  <ExternalLink className="w-3 h-3 text-brass" />
                </a>
              </div>
            </div>
            <p className="text-[11px] text-foreground/85 font-sans">
              {t('sourcesDesc')}
            </p>
            <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-brass/15">
              {t('disclaimer')}
            </p>
          </div>
        </div>

        {/* Dolny pasek przycisków (stopka) */}
        <div className="shrink-0 flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-brass/25">
          <div className="flex items-center gap-2">
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
            {!hasBaseRules && (
              <span
                data-testid="locked-continue-hint"
                className="text-xs text-muted-foreground"
              >
                {t('lockedContinueHint')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasBaseRules && (
              <Button
                onClick={handleComplete}
                disabled={stage === 'working'}
                data-testid="continue-to-game-btn"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-[0.14em] text-xs px-6 py-2 shadow-[0_0_15px_rgba(201,162,39,0.25)]"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('continueToGame')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
