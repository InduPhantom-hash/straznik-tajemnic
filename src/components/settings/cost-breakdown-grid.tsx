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
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="text-xs font-medium text-blue-300 mb-1 flex items-center gap-1">
            🤖 Gemini
          </div>
          <div className="text-lg font-bold text-blue-200">
            ${(costStats?.gemini.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-blue-300/60">
            {((costStats?.gemini.tokens || 0) / 1000).toFixed(1)}k tokenów
          </div>
        </div>

        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="text-xs font-medium text-green-300 mb-1 flex items-center gap-1">
            🎵 TTS
          </div>
          <div className="text-lg font-bold text-green-200">
            ${(costStats?.tts.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-green-300/60">
            {((costStats?.tts.characters || 0) / 1000).toFixed(1)}k znaków
          </div>
        </div>

        <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="text-xs font-medium text-purple-300 mb-1 flex items-center gap-1">
            🖼️ Obrazy
          </div>
          <div className="text-lg font-bold text-purple-200">
            ${(costStats?.image.cost || 0).toFixed(4)}
          </div>
          <div className="text-xs text-purple-300/60">
            {costStats?.image.count || 0} obrazów
          </div>
        </div>

        {/* M5 sesja 146: ElevenLabs cost card DROPPED per D2. */}
      </div>
      <p className="mt-2 text-xs text-muted-foreground font-special-elite">
        Cennik zweryfikowany {PRICING_LAST_VERIFIED}
      </p>
    </div>
  );
}
