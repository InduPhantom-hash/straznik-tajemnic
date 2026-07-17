import Link from 'next/link';
import { DebugApiStatus } from './debug-api-status';
import { DebugToolsGrid } from './debug-tools-grid';

interface TestResults {
  gemini: boolean | null;
  googleTTS: boolean | null;
  replicate: boolean | null;
  cloudSessions: boolean | null;
}

interface DebugSettingsProps {
  testResults: TestResults;
  isLoading: boolean;
  testAllAPIs: () => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

export function DebugSettings({
  testResults,
  isLoading,
  testAllAPIs,
  getTestResultColor,
  getTestResultIcon,
}: DebugSettingsProps) {
  return (
    <>
      <DebugApiStatus
        testResults={testResults}
        isLoading={isLoading}
        testAllAPIs={testAllAPIs}
        getTestResultColor={getTestResultColor}
        getTestResultIcon={getTestResultIcon}
      />

      <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-4 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
        <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/50" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/50" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold">
            Narzędzia Debugowania
          </h3>
          <Link
            href="/debug"
            className="font-special-elite uppercase tracking-[0.1em] text-[14px] text-primary hover:text-primary/80 hover:underline"
          >
            Otwórz stronę debug →
          </Link>
        </div>

        <DebugToolsGrid />
      </div>
    </>
  );
}
