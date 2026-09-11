'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, CircleDot, Loader2, Sparkles } from 'lucide-react';
import type { DramatronGenerationStageId } from '@/lib/adventure-generator/types';

interface StageConfig {
  id: DramatronGenerationStageId;
  labelKey: 'stagePremise' | 'stageCast' | 'stageClueWeb' | 'stageLocations' | 'stageScenes';
}

const STAGES: StageConfig[] = [
  { id: 'premise', labelKey: 'stagePremise' },
  { id: 'cast', labelKey: 'stageCast' },
  { id: 'clue_web', labelKey: 'stageClueWeb' },
  { id: 'locations', labelKey: 'stageLocations' },
  { id: 'scenes', labelKey: 'stageScenes' },
];

interface DramatronStageProgressProps {
  currentStage?: DramatronGenerationStageId;
  isGenerating?: boolean;
}

export function DramatronStageProgress({
  currentStage,
  isGenerating = false,
}: DramatronStageProgressProps) {
  const t = useTranslations('AdventureBuilder.dramatron');

  const getStageIndex = (stage?: DramatronGenerationStageId) => {
    if (!stage) return -1;
    return STAGES.findIndex((s) => s.id === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="border border-brass/30 bg-[#16120e] p-4 rounded-md space-y-3 font-serif">
      <div className="flex items-center justify-between border-b border-brass/20 pb-2">
        <span className="font-display text-xs uppercase tracking-wider text-brass flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brass" />
          {t('stagesHeader')}
        </span>
        <span className="text-[11px] font-special-elite text-muted-foreground">
          DeepMind Dramatron &bull; CoC 7e RAW
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {STAGES.map((st, idx) => {
          const isDone = currentIndex > idx || (!isGenerating && currentIndex === 4);
          const isCurrent = isGenerating && currentIndex === idx;

          return (
            <div
              key={st.id}
              className={`p-2.5 rounded border text-xs flex flex-col justify-between transition-all ${
                isDone
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                  : isCurrent
                    ? 'border-brass bg-brass/10 text-brass shadow-md animate-pulse'
                    : 'border-brass/20 bg-[#110e0c] text-[#8e8272]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono opacity-80">0{idx + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 text-brass animate-spin" />
                ) : (
                  <CircleDot className="h-3.5 w-3.5 opacity-40" />
                )}
              </div>
              <span className="font-display uppercase tracking-wider text-[11px] leading-tight">
                {t(st.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
