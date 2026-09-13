/**
 * @file idea-roll-modal.tsx
 *
 * Komponent modalny dla Testu Pomysłu (Idea Roll na cechę Inteligencja INT) CoC 7e RAW.
 * Integruje się z Dziennikiem Sesji / Aktami Śledczymi i umożliwia:
 * 1. Wybór podmiotu analizy (ogólny stan śledztwa lub konkretny ślad/poszlakę).
 * 2. Rzut kością D100 przeciwko Cechy INT badacza (RAW s. 199-201).
 * 3. Wywołanie szybkiej analizy śledczej przez neutralny endpoint AI (/api/ai/utility).
 * 4. Zapisanie dedukcji bezpośrednio do poszlaki, do Kroniki lub jako notatki.
 * 5. Akcję "Pytaj o to na czacie" (Quote-to-Input).
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Dices,
  RotateCcw,
  Sparkles,
  Loader2,
  Check,
  CheckCircle,
  BookOpen,
  MessageSquare,
  Compass,
  Search,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";
import type { MiceQuotientType } from "@/lib/journal/dossier-types";
import {
  executeIdeaRoll,
  buildIdeaRollPrompt,
  buildQuoteToInputText,
  inferMiceType,
  getIdeaRollCooldown,
  setIdeaRollCooldown,
  type IdeaRollResult,
  type IdeaRollCooldownState,
} from "@/lib/journal/idea-roll-service";
import { fetchWithApiKeys } from "@/lib/api-keys-service";
import { collectSSEText } from "@/lib/sse-parser";

export interface IdeaRollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character;
  targetSubject?: {
    id: string;
    title: string;
    description?: string;
    type?: string;
    miceType?: MiceQuotientType;
  };
  contextClues?: Array<{
    title: string;
    description?: string;
    type?: string;
    miceType?: MiceQuotientType;
  }>;
  onSaveInsightToTarget?: (insight: string) => void;
  onSaveInsightToChronicle?: (title: string, insight: string) => void;
  onQuoteToInput?: (text: string) => void;
}

export function IdeaRollModal({
  open,
  onOpenChange,
  character,
  targetSubject,
  contextClues = [],
  onSaveInsightToTarget,
  onSaveInsightToChronicle,
  onQuoteToInput,
}: IdeaRollModalProps) {
  const t = useTranslations("IdeaRoll");
  const locale = useLocale() as "pl" | "en";

  const [selectedMiceLens, setSelectedMiceLens] = useState<MiceQuotientType>("inquiry");
  const [rollResult, setRollResult] = useState<IdeaRollResult | null>(null);
  const [insightText, setInsightText] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [isDeducing, setIsDeducing] = useState(false);
  const [savedToTarget, setSavedToTarget] = useState(false);
  const [savedToChronicle, setSavedToChronicle] = useState(false);
  const [cooldownState, setCooldownState] = useState<IdeaRollCooldownState>({
    isCoolingDown: false,
    remainingSeconds: 0,
  });

  const intValue = character.int || 50;

  useEffect(() => {
    if (open) {
      const cd = getIdeaRollCooldown(character.id, targetSubject?.id);
      setCooldownState(cd);
      if (cd.isCoolingDown && cd.lastResult) {
        setRollResult(cd.lastResult);
        if (cd.lastInsight) {
          setInsightText(cd.lastInsight);
        } else {
          const fallback = cd.lastResult.isSuccess
            ? t("fallbackSuccess", { name: character.name })
            : t("fallbackFailure", { name: character.name });
          setInsightText(fallback);
          setIdeaRollCooldown(character.id, targetSubject?.id, cd.lastResult, fallback);
        }
      } else {
        setRollResult(null);
        setInsightText("");
      }
      setIsRolling(false);
      setIsDeducing(false);
      setSavedToTarget(false);
      setSavedToChronicle(false);
      setSelectedMiceLens(targetSubject ? inferMiceType(targetSubject) : "inquiry");
    }
  }, [open, character.id, targetSubject?.id]);

  useEffect(() => {
    if (!cooldownState.isCoolingDown) return;
    const interval = setInterval(() => {
      const cd = getIdeaRollCooldown(character.id, targetSubject?.id);
      setCooldownState(cd);
      if (!cd.isCoolingDown) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownState.isCoolingDown, character.id, targetSubject?.id]);

  const handleRoll = useCallback(async () => {
    const currentCd = getIdeaRollCooldown(character.id, targetSubject?.id);
    if (currentCd.isCoolingDown) {
      setCooldownState(currentCd);
      return;
    }

    setIsRolling(true);
    setSavedToTarget(false);
    setSavedToChronicle(false);

    const result = executeIdeaRoll({
      character,
      targetSubject,
      contextClues,
      selectedMiceLens,
    });
    setRollResult(result);
    setIdeaRollCooldown(character.id, targetSubject?.id, result);
    setCooldownState({
      isCoolingDown: true,
      remainingSeconds: 180,
      lastResult: result,
      timestamp: Date.now(),
    });

    setIsDeducing(true);
    let finalInsight = "";
    try {
      const prompt = buildIdeaRollPrompt(
        result,
        targetSubject,
        contextClues,
        locale
      );

      const response = await fetchWithApiKeys("/api/ai/utility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      if (response.ok) {
        const fullText = await collectSSEText(response);
        if (fullText && fullText.trim()) {
          finalInsight = fullText.trim();
        } else {
          finalInsight = result.isSuccess
            ? t("fallbackSuccess", { name: character.name })
            : t("fallbackFailure", { name: character.name });
        }
      } else {
        finalInsight = result.isSuccess
          ? t("fallbackSuccess", { name: character.name })
          : t("fallbackFailure", { name: character.name });
      }
      setInsightText(finalInsight);
      setIdeaRollCooldown(character.id, targetSubject?.id, result, finalInsight);
    } catch {
      finalInsight = result.isSuccess
        ? t("fallbackSuccess", { name: character.name })
        : t("fallbackFailure", { name: character.name });
      setInsightText(finalInsight);
      setIdeaRollCooldown(character.id, targetSubject?.id, result, finalInsight);
    } finally {
      setIsDeducing(false);
      setIsRolling(false);
    }
  }, [character, targetSubject, contextClues, locale, selectedMiceLens, t]);

  const handleSaveTarget = () => {
    if (!insightText.trim()) return;
    onSaveInsightToTarget?.(insightText.trim());
    setSavedToTarget(true);
  };

  const handleSaveChronicle = () => {
    if (!insightText.trim()) return;
    const title = targetSubject
      ? t("chronicleTitleSubject", { title: targetSubject.title })
      : t("chronicleTitleGeneral", { name: character.name });
    onSaveInsightToChronicle?.(title, insightText.trim());
    setSavedToChronicle(true);
  };

  const handleQuote = () => {
    const textToQuote = targetSubject
      ? buildQuoteToInputText(
          targetSubject.type || "clue",
          targetSubject.title,
          undefined,
          locale
        )
      : (locale === "pl"
          ? "Zastanawiam się nad dotychczasowymi faktami: "
          : "Reflecting upon the known facts: ");

    if (onQuoteToInput) {
      onQuoteToInput(textToQuote);
    } else {
      window.dispatchEvent(
        new CustomEvent("straznik:quote-to-input", {
          detail: { text: textToQuote },
        })
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="idea-roll-modal"
        size="wide"
        className="bg-card border-2 border-brass/50 text-foreground w-[80vw] h-[78vh] max-h-[85vh] overflow-y-auto shadow-2xl p-6"
      >
        <DialogHeader className="border-b border-brass/30 pb-3">
          <div className="flex items-center gap-2 text-brass font-special-elite text-xs uppercase tracking-widest">
            <Lightbulb className="h-4 w-4 text-brass" />
            <span>{t("headerSubtitle")}</span>
          </div>
          <DialogTitle className="font-display text-xl font-bold tracking-wide text-brass flex items-center justify-between">
            <span>{t("headerTitle")}</span>
            <span className="text-xs font-mono font-bold bg-primary/20 text-primary-foreground border border-primary/40 px-2 py-0.5 rounded">
              INT: {intValue}%
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-serif italic">
            {t("headerDescription")}
          </DialogDescription>
          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-600/40 text-amber-200 px-2.5 py-1 rounded text-[11px] font-serif font-semibold mt-1">
            <span>⚠️</span>
            <span>{t("deadEndNotice")}</span>
          </div>
        </DialogHeader>

        {/* Kontekst badanego elementu */}
        <div className="bg-input/40 border border-border/60 rounded-lg p-3 my-2 text-xs font-serif">
          <span className="text-brass font-bold uppercase tracking-wider block text-[10px] mb-1">
            {targetSubject ? t("subjectLabel") : t("generalInvestigationLabel")}
          </span>
          <p className="text-foreground font-bold text-sm">
            {targetSubject ? targetSubject.title : t("generalDeductionTitle")}
          </p>
          {targetSubject?.description && (
            <p className="text-muted-foreground text-xs mt-1 line-clamp-2 italic">
              {targetSubject.description}
            </p>
          )}
        </div>

        {/* Progi CoC 7e RAW dla Inteligencji */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs py-1">
          <div className="bg-input/30 border border-border/50 rounded p-1.5">
            <span className="block text-[9px] uppercase text-muted-foreground font-mono">{t("thresholdRegular")}</span>
            <span className="font-bold font-mono text-foreground">≤ {intValue}</span>
          </div>
          <div className="bg-input/30 border border-border/50 rounded p-1.5">
            <span className="block text-[9px] uppercase text-primary font-mono">{t("thresholdHard")}</span>
            <span className="font-bold font-mono text-primary">≤ {Math.floor(intValue / 2)}</span>
          </div>
          <div className="bg-input/30 border border-border/50 rounded p-1.5">
            <span className="block text-[9px] uppercase text-brass/80 font-mono">{t("thresholdExtreme")}</span>
            <span className="font-bold font-mono text-brass">≤ {Math.floor(intValue / 5)}</span>
          </div>
          <div className="bg-input/30 border border-border/50 rounded p-1.5">
            <span className="block text-[9px] uppercase text-gold font-mono">{t("thresholdCritical")}</span>
            <span className="font-bold font-mono text-gold">01</span>
          </div>
        </div>

        {/* Wybór Soczewki Dramaturgicznej M.I.C.E. (Card / Kowal) */}
        <div className="bg-input/30 border border-brass/30 rounded-lg p-3 my-2 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-brass">
              {t("miceSectionTitle")}
            </span>
            <span className="text-[10px] text-muted-foreground font-serif italic">
              {t("miceSectionDescription")}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'inquiry', icon: Search, label: t('miceInquiry'), desc: t('miceInquiryDesc'), activeBorder: 'border-brass bg-brass/20 text-foreground' },
              { id: 'milieu', icon: Compass, label: t('miceMilieu'), desc: t('miceMilieuDesc'), activeBorder: 'border-primary bg-primary/20 text-primary-foreground' },
              { id: 'character', icon: User, label: t('miceCharacter'), desc: t('miceCharacterDesc'), activeBorder: 'border-brass/80 bg-brass/10 text-foreground' },
              { id: 'event', icon: Zap, label: t('miceEvent'), desc: t('miceEventDesc'), activeBorder: 'border-destructive bg-destructive/20 text-destructive-foreground' },
            ].map((lens) => {
              const Icon = lens.icon;
              const isSelected = selectedMiceLens === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setSelectedMiceLens(lens.id as MiceQuotientType)}
                  className={cn(
                    "p-2 rounded border text-left transition-all flex flex-col justify-between cursor-pointer",
                    isSelected
                      ? lens.activeBorder
                      : "bg-background/60 border-border text-muted-foreground hover:border-brass/40 hover:text-foreground"
                  )}
                  title={lens.desc}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lens.label}</span>
                  </div>
                  <span className="text-[9px] line-clamp-2 mt-1 opacity-75 font-serif leading-tight">
                    {lens.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel rzutu lub wynik */}
        {!rollResult ? (
          <div className="text-center py-5 border-y border-brass/20 my-2 space-y-2">
            {cooldownState.isCoolingDown ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-destructive/15 border border-destructive/40 text-destructive-foreground px-4 py-2 rounded-md text-xs font-serif font-bold">
                  <span>⏳ {t("cooldownActive")}</span>
                  <span className="font-mono">({cooldownState.remainingSeconds}s)</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic max-w-md mx-auto font-serif">
                  {t("cooldownNotice")}
                </p>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleRoll}
                  disabled={isRolling}
                  className="bg-brass text-background hover:bg-brass-light border border-brass/60 px-8 py-3 rounded-lg text-sm font-serif font-bold shadow-lg transition-all cursor-pointer"
                >
                  <Dices className="h-5 w-5 mr-2 text-background" />
                  {t("rollButton")}
                </Button>
                <p className="text-[11px] text-muted-foreground italic mt-2.5 max-w-md mx-auto font-serif">
                  {t("rawRuleHint")}
                </p>
                <p className="text-[10px] text-brass/80 italic mt-1 font-serif">
                  {t("miceLifoHint")}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 my-2">
            {/* Wynik kości */}
            <div
              className={cn(
                "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                rollResult.isSuccess
                  ? "bg-primary/15 border-primary/50 text-foreground"
                  : "bg-destructive/15 border-destructive/50 text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-brass">{rollResult.roll}</span>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{rollResult.outcomeEmoji}</span>
                    <span>{rollResult.outcomeLabel}</span>
                    <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ml-1.5 bg-input/60 border-border text-foreground">
                      M.I.C.E.: [{rollResult.miceLens.toUpperCase()[0]}]
                    </span>
                  </div>
                  <span className="text-[10px] opacity-80 font-serif text-muted-foreground">
                    {rollResult.isSuccess ? t("verdictSuccess") : t("verdictFailureWithComplication")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-brass/80 border border-brass/30 bg-background/60 px-2.5 py-1 rounded self-stretch sm:self-auto justify-center">
                <span className="text-destructive font-bold">🚫</span>
                <span>{t("noPushedRollOrLuck")}</span>
              </div>
            </div>

            {/* Treść dedukcji AI */}
            {isDeducing ? (
              <div className="p-5 bg-input/30 border border-brass/30 rounded-lg flex items-center justify-center gap-3 text-sm text-brass font-serif">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t("analyzingClues")}</span>
              </div>
            ) : (
              <div className="bg-[#f4ebd0] text-[#1a140f] p-4 rounded shadow-lg border border-[#c4b59d] space-y-2">
                <div className="flex items-center justify-between border-b border-[#1a140f]/20 pb-1 font-special-elite text-xs font-bold text-[#4a3525]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#8c7353]" />
                    {t("deductionResultHeading")}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-75">
                    {rollResult.isSuccess ? t("leadClean") : t("leadComplication")}
                  </span>
                </div>
                <textarea
                  value={insightText}
                  onChange={(e) => setInsightText(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent border-0 font-special-elite text-sm text-[#1a140f] leading-relaxed outline-none resize-y"
                />
              </div>
            )}
          </div>
        )}

        {/* Przyciski dolne modala */}
        <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-border/60 mt-2">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:bg-input/60 hover:text-foreground"
          >
            {t("closeButton")}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Akcja Quote-to-Input ("Pytaj o to na czacie") */}
            <Button
              onClick={handleQuote}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/40 font-serif text-xs"
              title={t("quoteToChatTooltip")}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              {t("quoteToChatButton")}
            </Button>

            {rollResult && !isDeducing && (
              <>
                {targetSubject && onSaveInsightToTarget && (
                  <Button
                    onClick={handleSaveTarget}
                    size="sm"
                    disabled={savedToTarget}
                    className={cn(
                      "font-serif text-xs border transition-colors",
                      savedToTarget
                        ? "bg-primary/20 border-primary text-primary-foreground"
                        : "bg-input/60 hover:bg-input text-foreground border-border"
                    )}
                  >
                    {savedToTarget ? (
                      <><Check className="h-3.5 w-3.5 mr-1" /> {t("savedToTargetButton")}</>
                    ) : (
                      <><CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("saveToTargetButton")}</>
                    )}
                  </Button>
                )}

                {onSaveInsightToChronicle && (
                  <Button
                    onClick={handleSaveChronicle}
                    size="sm"
                    disabled={savedToChronicle}
                    className={cn(
                      "font-serif text-xs border transition-colors",
                      savedToChronicle
                        ? "bg-primary/20 border-primary text-primary-foreground"
                        : "bg-input/60 hover:bg-input text-foreground border-border"
                    )}
                  >
                    {savedToChronicle ? (
                      <><Check className="h-3.5 w-3.5 mr-1" /> {t("savedToChronicleButton")}</>
                    ) : (
                      <><BookOpen className="h-3.5 w-3.5 mr-1" /> {t("saveToChronicleButton")}</>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
