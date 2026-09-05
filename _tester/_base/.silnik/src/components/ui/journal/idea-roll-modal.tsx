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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";
import {
  executeIdeaRoll,
  buildIdeaRollPrompt,
  buildQuoteToInputText,
  type IdeaRollResult,
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
  };
  contextClues?: Array<{
    title: string;
    description?: string;
    type?: string;
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

  const [rollResult, setRollResult] = useState<IdeaRollResult | null>(null);
  const [insightText, setInsightText] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [isDeducing, setIsDeducing] = useState(false);
  const [savedToTarget, setSavedToTarget] = useState(false);
  const [savedToChronicle, setSavedToChronicle] = useState(false);

  const intValue = character.int || 50;

  useEffect(() => {
    if (open) {
      setRollResult(null);
      setInsightText("");
      setIsRolling(false);
      setIsDeducing(false);
      setSavedToTarget(false);
      setSavedToChronicle(false);
    }
  }, [open, targetSubject?.id]);

  const handleRoll = useCallback(async () => {
    setIsRolling(true);
    setSavedToTarget(false);
    setSavedToChronicle(false);

    const result = executeIdeaRoll({
      character,
      targetSubject,
      contextClues,
    });
    setRollResult(result);

    setIsDeducing(true);
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
          setInsightText(fullText.trim());
        } else {
          setInsightText(
            result.isSuccess
              ? t("fallbackSuccess", { name: character.name })
              : t("fallbackFailure", { name: character.name })
          );
        }
      } else {
        setInsightText(
          result.isSuccess
            ? t("fallbackSuccess", { name: character.name })
            : t("fallbackFailure", { name: character.name })
        );
      }
    } catch {
      setInsightText(
        result.isSuccess
          ? t("fallbackSuccess", { name: character.name })
          : t("fallbackFailure", { name: character.name })
      );
    } finally {
      setIsDeducing(false);
      setIsRolling(false);
    }
  }, [character, targetSubject, contextClues, locale, t]);

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

    onQuoteToInput?.(textToQuote);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="idea-roll-modal"
        size="wide"
        className="bg-zinc-950 border-2 border-emerald-900/60 text-zinc-300 w-[80vw] h-[78vh] max-h-[85vh] overflow-y-auto shadow-2xl p-6"
      >
        <DialogHeader className="border-b border-emerald-900/40 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-special-elite text-xs uppercase tracking-widest">
            <Lightbulb className="h-4 w-4" />
            <span>{t("headerSubtitle")}</span>
          </div>
          <DialogTitle className="font-display text-xl font-bold tracking-wide text-emerald-500 flex items-center justify-between">
            <span>{t("headerTitle")}</span>
            <span className="text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded">
              INT: {intValue}%
            </span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs font-serif italic">
            {t("headerDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Kontekst badanego elementu */}
        <div className="bg-zinc-900/60 border border-emerald-900/40 rounded-lg p-3 my-2 text-xs font-serif">
          <span className="text-emerald-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
            {targetSubject ? t("subjectLabel") : t("generalInvestigationLabel")}
          </span>
          <p className="text-zinc-200 font-bold text-sm">
            {targetSubject ? targetSubject.title : t("generalDeductionTitle")}
          </p>
          {targetSubject?.description && (
            <p className="text-zinc-400 text-xs mt-1 line-clamp-2 italic">
              {targetSubject.description}
            </p>
          )}
        </div>

        {/* Progi CoC 7e RAW dla Inteligencji */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs py-1">
          <div className="bg-zinc-900/80 border border-emerald-900/40 rounded p-1.5">
            <span className="block text-[9px] uppercase text-zinc-500 font-mono">{t("thresholdRegular")}</span>
            <span className="font-bold font-mono text-zinc-200">≤ {intValue}</span>
          </div>
          <div className="bg-zinc-900/80 border border-emerald-900/40 rounded p-1.5">
            <span className="block text-[9px] uppercase text-emerald-500/70 font-mono">{t("thresholdHard")}</span>
            <span className="font-bold font-mono text-emerald-400">≤ {Math.floor(intValue / 2)}</span>
          </div>
          <div className="bg-zinc-900/80 border border-emerald-900/40 rounded p-1.5">
            <span className="block text-[9px] uppercase text-purple-400/70 font-mono">{t("thresholdExtreme")}</span>
            <span className="font-bold font-mono text-purple-300">≤ {Math.floor(intValue / 5)}</span>
          </div>
          <div className="bg-zinc-900/80 border border-emerald-900/40 rounded p-1.5">
            <span className="block text-[9px] uppercase text-amber-400/70 font-mono">{t("thresholdCritical")}</span>
            <span className="font-bold font-mono text-amber-300">01</span>
          </div>
        </div>

        {/* Panel rzutu lub wynik */}
        {!rollResult ? (
          <div className="text-center py-6 border-y border-emerald-900/30 my-2">
            <Button
              onClick={handleRoll}
              disabled={isRolling}
              className="bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-100 border-2 border-emerald-500/50 px-8 py-3 rounded-lg text-sm font-serif font-bold shadow-lg transition-all"
            >
              <Dices className="h-5 w-5 mr-2 text-emerald-400" />
              {t("rollButton")}
            </Button>
            <p className="text-[11px] text-zinc-500 italic mt-3 max-w-md mx-auto font-serif">
              {t("rawRuleHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 my-2">
            {/* Wynik kości */}
            <div
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                rollResult.isSuccess
                  ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-200"
                  : "bg-amber-950/30 border-amber-600/40 text-amber-200"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold">{rollResult.roll}</span>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>{rollResult.outcomeEmoji}</span>
                    <span>{rollResult.outcomeLabel}</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-serif">
                    {rollResult.isSuccess ? t("verdictSuccess") : t("verdictFailureWithComplication")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRoll}
                disabled={isDeducing}
                className="text-xs text-emerald-400 hover:text-emerald-200 flex items-center gap-1 underline disabled:opacity-50 font-serif"
              >
                <RotateCcw className="h-3 w-3" /> {t("reroll")}
              </button>
            </div>

            {/* Treść dedukcji AI */}
            {isDeducing ? (
              <div className="p-5 bg-zinc-900/80 border border-emerald-900/40 rounded-lg flex items-center justify-center gap-3 text-sm text-emerald-400 font-serif">
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
        <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-emerald-900/40 mt-2">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            size="sm"
            className="border-emerald-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            {t("closeButton")}
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Akcja Quote-to-Input ("Pytaj o to na czacie") */}
            <Button
              onClick={handleQuote}
              size="sm"
              className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/40 font-serif text-xs"
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
                        ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600"
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
                        ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600"
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
