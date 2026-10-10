import { useTranslations } from 'next-intl';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';
import type { TestResults } from '@/hooks/useApiTester';

interface DebugApiStatusProps {
  testResults: TestResults;
  isLoading: boolean;
  testAllAPIs: () => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

export function DebugApiStatus({
  testResults,
  isLoading,
  testAllAPIs,
  getTestResultColor,
  getTestResultIcon,
}: DebugApiStatusProps) {
  const t = useTranslations('DebugApiStatus');

  return (
    <div className="relative border border-brass/30 bg-[#16130f] p-4">
      <span className="pointer-events-none absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/60" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display uppercase tracking-[0.16em] text-brass flex items-center gap-2">
          📊 {t('title')}
          <HelpIcon content={t('tooltip')} />
        </h3>
        <Button
          onClick={testAllAPIs}
          disabled={isLoading}
          className="text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10 font-display font-semibold uppercase tracking-[0.12em]"
        >
          {isLoading ? t('testing') : t('testAll')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-3 border border-brass/22 bg-[#100d09]">
          <span className={`text-lg ${getTestResultColor(testResults.gemini)}`}>
            {getTestResultIcon(testResults.gemini)}
          </span>
          <span className="text-sm font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
            {t('serviceGemini')}
          </span>
        </div>

        <div className="flex items-center gap-2 p-3 border border-brass/22 bg-[#100d09]">
          <span className={`text-lg ${getTestResultColor(testResults.tts)}`}>
            {getTestResultIcon(testResults.tts)}
          </span>
          <span className="text-sm font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
            {t('serviceTts')}
          </span>
        </div>

        <div className="flex items-center gap-2 p-3 border border-brass/22 bg-[#100d09]">
          <span className={`text-lg ${getTestResultColor(testResults.image)}`}>
            {getTestResultIcon(testResults.image)}
          </span>
          <span className="text-sm font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
            {t('serviceImage')}
          </span>
        </div>

        <div className="flex items-center gap-2 p-3 border border-brass/22 bg-[#100d09]">
          <span className={`text-lg ${getTestResultColor(testResults.hue)}`}>
            {getTestResultIcon(testResults.hue)}
          </span>
          <span className="text-sm font-special-elite uppercase tracking-[0.08em] text-muted-foreground">
            {t('serviceHue')}
          </span>
        </div>
      </div>
    </div>
  );
}
