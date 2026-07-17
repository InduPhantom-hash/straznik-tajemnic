import type { TestResults } from '@/hooks/useApiTester';
import { Button } from '../../ui/button';

// M5+M6 sesja 146: drop 'openai' + 'elevenlabs' z TTSProvider per D2.
type TTSProvider = 'google' | 'gemini' | undefined;

export function getActiveTestResult(
  provider: TTSProvider,
  testResults: TestResults
): boolean | null {
  if (provider === 'gemini') return testResults.gemini;
  return testResults.googleTTS;
}

function resolveTestApiId(provider: TTSProvider): string {
  if (provider === 'gemini') return 'gemini';
  return 'googleTTS';
}

interface ProviderTestButtonProps {
  provider: TTSProvider;
  testResults: TestResults;
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

export function ProviderTestButton({
  provider,
  testResults,
  isLoading,
  testAPI,
  getTestResultColor,
  getTestResultIcon,
}: ProviderTestButtonProps) {
  const activeResult = getActiveTestResult(provider, testResults);
  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg ${getTestResultColor(activeResult)}`}>
        {getTestResultIcon(activeResult)}
      </span>
      <Button
        size="sm"
        onClick={() => testAPI(resolveTestApiId(provider))}
        disabled={isLoading}
        className="font-display font-semibold uppercase tracking-[0.14em] text-[#04110f] bg-primary border border-primary hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,0.3)]"
      >
        Test API
      </Button>
    </div>
  );
}
