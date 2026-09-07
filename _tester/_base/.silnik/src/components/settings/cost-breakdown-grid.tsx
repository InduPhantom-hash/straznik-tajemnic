import { useTranslations } from 'next-intl';
import type { CostStats } from '@/lib/cost-event-emitter';
import { PRICING_LAST_VERIFIED } from '@/lib/pricing/pricing-data';

interface CostBreakdownGridProps {
  costStats: CostStats | null;
}

/**
 * Per-API cost breakdown grid (Gemini/TTS/Images/ElevenLabs).
 * Wyciągnięte z cost-control-settings.tsx (IND-58 micro 2/5, parent 265 → 195 lin).
 */
export function CostBreakdownGrid({ costStats }: CostBreakdownGridProps) {
  const t = useTranslations('CostControl');

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-card/70 border border-brass/40 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-brass mb-1 flex items-center gap-1 font-special-elite">
            🤖 {t.has('gemini') ? t('gemini') : 'Gemini'}
          </div>
          <div className="text-lg font-bold text-foreground font-special-elite">
            ${(costStats?.gemini.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground font-special-elite">
            {t.has('kTokens')
              ? t('kTokens', { count: ((costStats?.gemini.tokens || 0) / 1000).toFixed(1) })
              : `${((costStats?.gemini.tokens || 0) / 1000).toFixed(1)}k tokenów`}
          </div>
        </div>

        <div className="p-3 bg-card/70 border border-emerald-500/30 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1 font-special-elite">
            🎵 {t.has('tts') ? t('tts') : 'TTS'}
          </div>
          <div className="text-lg font-bold text-foreground font-special-elite">
            ${(costStats?.tts.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground font-special-elite">
            {t.has('kChars')
              ? t('kChars', { count: ((costStats?.tts.characters || 0) / 1000).toFixed(1) })
              : `${((costStats?.tts.characters || 0) / 1000).toFixed(1)}k znaków`}
          </div>
        </div>

        <div className="p-3 bg-card/70 border border-gold/40 rounded-lg shadow-sm">
          <div className="text-xs font-medium text-gold mb-1 flex items-center gap-1 font-special-elite">
            🖼️ {t.has('images') ? t('images') : 'Obrazy'}
          </div>
          <div className="text-lg font-bold text-foreground font-special-elite">
            ${(costStats?.image.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground font-special-elite">
            {t.has('imageCount')
              ? t('imageCount', { count: costStats?.image.count || 0 })
              : `${costStats?.image.count || 0} obrazów`}
          </div>
        </div>

        {/* M5 sesja 146: ElevenLabs cost card DROPPED per D2. */}
      </div>
      <p className="mt-2 text-xs text-muted-foreground font-special-elite">
        {t.has('pricingVerified')
          ? t('pricingVerified', { date: PRICING_LAST_VERIFIED })
          : `Cennik zweryfikowany ${PRICING_LAST_VERIFIED}`}
      </p>
    </div>
  );
}
