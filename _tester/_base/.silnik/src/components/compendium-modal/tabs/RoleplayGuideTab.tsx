'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Mic,
  Eye,
  HeartCrack,
  Flame,
  Users2,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

type ScenarioId = 'door' | 'search' | 'npc';

export function RoleplayGuideTab() {
  const t = useTranslations('CompendiumModal');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('door');

  const scenarios: ScenarioId[] = ['door', 'search', 'npc'];

  return (
    <div className="space-y-8">
      {/* Sekcja 1: Filozofia Fiction First & Solo/Duet */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brass/30 pb-2">
          <Flame className="w-5 h-5 text-brass" />
          <h3 className="text-sm font-serif font-bold text-brass uppercase tracking-wider">
            {t('rp_corePhilosophyHeader')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Fiction First */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <div className="flex items-center gap-2 text-brass">
              <Eye className="w-4 h-4" />
              <h4 className="text-xs font-serif font-bold uppercase tracking-wide">
                {t('rp_fictionFirstTitle')}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_fictionFirstDesc')}
            </p>
          </div>

          {/* Fail Forward */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <div className="flex items-center gap-2 text-brass">
              <HeartCrack className="w-4 h-4" />
              <h4 className="text-xs font-serif font-bold uppercase tracking-wide">
                {t('rp_failForwardTitle')}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_failForwardDesc')}
            </p>
          </div>

          {/* Somatyka i Emocje */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <div className="flex items-center gap-2 text-brass">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-serif font-bold uppercase tracking-wide">
                {t('rp_somaticTitle')}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_somaticDesc')}
            </p>
          </div>

          {/* Gra w Duecie na Kanapie */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <div className="flex items-center gap-2 text-brass">
              <Users2 className="w-4 h-4" />
              <h4 className="text-xs font-serif font-bold uppercase tracking-wide">
                {t('rp_duetTitle')}
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_duetDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* Sekcja 2: Kontrast czatu Side-by-Side */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brass/30 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brass" />
            <h3 className="text-sm font-serif font-bold text-brass uppercase tracking-wider">
              {t('rp_contrastHeader')}
            </h3>
          </div>

          {/* Przełącznik scenariuszy */}
          <div className="flex gap-1 bg-input/40 p-1 rounded-md border border-border">
            {scenarios.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setActiveScenario(sc)}
                className={`px-3 py-1 text-xs font-serif rounded transition-all ${
                  activeScenario === sc
                    ? 'bg-brass/20 text-brass font-bold border border-brass/40 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`rp_scenarioBtn_${sc}`)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('rp_contrastExplanation')}
        </p>

        {/* Dwie kolumny Side-by-Side w Dark Art Déco */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolumna 1: Styl Zwięzły */}
          <div className="rounded-md border border-border bg-card/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <span className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-wider">
                  {t('rp_conciseColumnHeader')}
                </span>
                <span className="text-[10px] font-courier-prime px-2 py-0.5 rounded bg-input text-muted-foreground">
                  {t('rp_conciseBadge')}
                </span>
              </div>

              {/* Wiadomość Gracza */}
              <div className="space-y-1">
                <div className="text-[10px] font-courier-prime text-brass uppercase">
                  {t('rp_playerPromptLabel')}
                </div>
                <div className="p-3 rounded bg-input/50 border border-border font-courier-prime text-xs text-foreground/90">
                  {t(`rp_scenario_${activeScenario}_concisePrompt`)}
                </div>
              </div>

              {/* Odpowiedź Strażnika */}
              <div className="space-y-1">
                <div className="text-[10px] font-courier-prime text-muted-foreground uppercase">
                  {t('rp_gmResponseLabel')}
                </div>
                <div className="p-3 rounded bg-card/80 border border-border/60 text-xs text-muted-foreground italic leading-relaxed">
                  {t(`rp_scenario_${activeScenario}_conciseResponse`)}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground/80 font-courier-prime">
              {t('rp_conciseOutcomeNote')}
            </div>
          </div>

          {/* Kolumna 2: Styl Immersyjny */}
          <div className="rounded-md border-2 border-brass/50 bg-brass/5 p-4 space-y-3 flex flex-col justify-between shadow-[0_0_20px_rgba(184,134,11,0.08)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-brass/30 pb-2">
                <span className="text-xs font-serif font-bold text-brass uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('rp_immersiveColumnHeader')}
                </span>
                <span className="text-[10px] font-courier-prime px-2 py-0.5 rounded bg-brass/20 text-brass font-bold border border-brass/30">
                  {t('rp_immersiveBadge')}
                </span>
              </div>

              {/* Wiadomość Gracza */}
              <div className="space-y-1">
                <div className="text-[10px] font-courier-prime text-brass uppercase font-bold">
                  {t('rp_playerPromptLabel')}
                </div>
                <div className="p-3 rounded bg-input/70 border border-brass/30 font-courier-prime text-xs text-foreground">
                  {t(`rp_scenario_${activeScenario}_immersivePrompt`)}
                </div>
              </div>

              {/* Odpowiedź Strażnika */}
              <div className="space-y-1">
                <div className="text-[10px] font-courier-prime text-brass uppercase font-bold">
                  {t('rp_gmResponseLabel')}
                </div>
                <div className="p-3 rounded bg-card border border-brass/30 text-xs text-foreground/95 italic leading-relaxed">
                  {t(`rp_scenario_${activeScenario}_immersiveResponse`)}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-brass/20 text-[11px] text-brass font-courier-prime font-medium">
              {t('rp_immersiveOutcomeNote')}
            </div>
          </div>
        </div>

        {/* Wniosek edukacyjny */}
        <div className="p-3.5 rounded-md bg-card/90 border border-brass/30 text-xs flex items-center gap-3">
          <span className="text-lg">⚖️</span>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-brass font-serif font-bold">
              {t('rp_goldenRuleHeader')}:
            </strong>{' '}
            {t('rp_goldenRuleBody')}
          </p>
        </div>
      </section>

      {/* Sekcja 3: Mów do czatu zamiast pisać (Głosowe odgrywanie STT) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brass/30 pb-2">
          <Mic className="w-5 h-5 text-brass" />
          <h3 className="text-sm font-serif font-bold text-brass uppercase tracking-wider">
            {t('rp_voiceGuideHeader')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* MacWhisper / Superwhisper */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <h4 className="text-xs font-serif font-bold text-brass uppercase tracking-wider">
              {t('rp_whisperToolsTitle')}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_whisperToolsDesc')}
            </p>
            <div className="text-[10px] font-courier-prime text-brass/80 pt-1">
              {t('rp_whisperToolsTip')}
            </div>
          </div>

          {/* WhisperFlow / Wispr Flow */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <h4 className="text-xs font-serif font-bold text-brass uppercase tracking-wider">
              {t('rp_whisperFlowTitle')}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_whisperFlowDesc')}
            </p>
            <div className="text-[10px] font-courier-prime text-brass/80 pt-1">
              {t('rp_whisperFlowTip')}
            </div>
          </div>

          {/* Natywne dyktowanie macOS */}
          <div className="p-4 rounded-md border border-border bg-card/60 space-y-2">
            <h4 className="text-xs font-serif font-bold text-brass uppercase tracking-wider">
              {t('rp_nativeDictationTitle')}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t('rp_nativeDictationDesc')}
            </p>
            <div className="text-[10px] font-courier-prime text-brass/80 pt-1">
              {t('rp_nativeDictationTip')}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-brass/10 border border-brass/30 flex items-start gap-3 text-xs">
          <ArrowRight className="w-4 h-4 text-brass shrink-0 mt-0.5" />
          <span className="text-foreground/90 font-sans leading-relaxed">
            {t('rp_voiceAdvantageSummary')}
          </span>
        </div>
      </section>
    </div>
  );
}
