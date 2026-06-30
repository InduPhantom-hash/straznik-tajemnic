'use client';

import { useSettingsModal } from '@/hooks/useSettingsModal';
import { HelpIcon } from './tooltip';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { FullResetDialog } from './full-reset-dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion';
import { ReplicateSettings } from '../settings/replicate-settings';
import { GameMasterSettings } from '../settings/game-master-settings';
// Lista 1 (offline fork): sekcje schowane z UI - kod i ustawienia zostają, render zakomentowany niżej.
// import { CustomCommandsSettings } from '../settings/custom-commands-settings';
// import { CloudStorageSettings } from '../settings/cloud-storage-settings';
// import { PDFMemorySettings } from '../settings/pdf-memory-settings';
import { CostControlSettings } from '../settings/cost-control-settings';
import { HealthStatusPanel } from '../settings/health-status-panel';
import { DebugSettings } from '../settings/debug-settings';
import { GeminiSettings } from '../settings/gemini-settings';
// M3 sesja 146: ElevenLabsSettings DROPPED per D2.
import { QualityPresets } from '../settings/quality-presets';
import { TTSSettings } from '../settings/tts-settings';

interface SettingsModalProps {
  open?: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
}

/** Modal ustawień - shell konsumujący `useSettingsModal()` (logika w 4 hookach po IND-17). */
export function SettingsModal({
  open,
  onClose,
  onOpenChange,
}: SettingsModalProps) {
  const m = useSettingsModal({ open, onClose, onOpenChange });

  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange ||
        ((open) => {
          if (!open) onClose();
        })
      }
    >
      <DialogContent size="screen">
        <DialogHeader>
          {/* Nagłówek déco: nadtytuł + tytuł dekoracyjny + separator z rombem */}
          <div className="text-center">
            <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
              Konfiguracja Strażnika
            </div>
            <DialogTitle className="mt-1.5 justify-center font-display-decorative text-2xl font-black uppercase tracking-[0.12em] text-foreground">
              Ustawienia
            </DialogTitle>
            <DialogDescription className="sr-only">
              Konfiguruj wszystkie ustawienia aplikacji, AI, głosu i interfejsu
            </DialogDescription>
          </div>
          <div className="flex items-center gap-4 pt-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
            <span className="h-2 w-2 rotate-45 bg-brass" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <QualityPresets settings={m.settings} setSettings={m.setSettings} />

          {/* Lista 1 (offline fork): Custom Commands, Cloud Storage (GCS),
              PDF Memory - schowane z UI prywatnej gry. Ustawienia i logika
              (np. domyślne komendy) działają dalej; render przywracalny przez
              odkomentowanie importów wyżej. */}
          {/* <CustomCommandsSettings /> - edytor własnych komend slash (nisza) */}
          {/* <CloudStorageSettings />  - GCS; offline trzyma save'y na dysku */}
          {/* <PDFMemorySettings />     - załączanie PDF per-wiadomość; RAG i tak ma zasady */}

          {/* IND-272: panel kosztów czyta server-side /api/user/usage (jedno źródło prawdy). */}
          <CostControlSettings
            settings={m.settings}
            setSettings={m.setSettings}
          />

          {/* IND-273 T6: widoczny panel zdrowia klucza/modeli */}
          <HealthStatusPanel />

          {/* IND-265 A: progressive disclosure - zaawansowane ustawienia w
              zwiniętej harmonijce, by nie przytłaczać gracza, którego to nie obchodzi.
              ElevenLabsSettings render DROPPED per D2 (sesja 146). */}
          <Accordion type="multiple" className="space-y-3">
            <AccordionItem
              value="nerdy"
              className="border border-brass/30 bg-card px-4"
            >
              <AccordionTrigger className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                ⚙️ Ustawienia dla nerdów
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-2">
                  <GeminiSettings
                    settings={m.settings}
                    setSettings={m.setSettings}
                    testResults={m.apiTester.testResults}
                    isLoading={m.apiTester.isLoading}
                    testAPI={m.apiTester.testAPI}
                    getTestResultColor={m.apiTester.getTestResultColor}
                    getTestResultIcon={m.apiTester.getTestResultIcon}
                  />

                  <TTSSettings
                    settings={m.settings}
                    setSettings={m.setSettings}
                    testResults={m.apiTester.testResults}
                    isLoading={m.apiTester.isLoading}
                    testAPI={m.apiTester.testAPI}
                    getTestResultColor={m.apiTester.getTestResultColor}
                    getTestResultIcon={m.apiTester.getTestResultIcon}
                    availableVoices={m.availableVoices}
                    loadAvailableVoices={m.loadAvailableVoices}
                  />

                  <ReplicateSettings
                    settings={m.settings}
                    setSettings={m.setSettings}
                    testResults={m.apiTester.testResults}
                    isLoading={m.apiTester.isLoading}
                    testAPI={m.apiTester.testAPI}
                    getTestResultColor={m.apiTester.getTestResultColor}
                    getTestResultIcon={m.apiTester.getTestResultIcon}
                  />

                  <GameMasterSettings
                    settings={m.settings}
                    setSettings={m.setSettings}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Narzędzia Debug - tylko w trybie deweloperskim (npm run dev),
                zwinięte w osobnym zielonym boksie. */}
            {process.env.NODE_ENV === 'development' && (
              <AccordionItem
                value="debug"
                className="border border-green-700/40 bg-green-950/20 px-4"
              >
                <AccordionTrigger className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-green-400">
                  🔧 Narzędzia Debug (dev)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <DebugSettings
                      testResults={m.apiTester.testResults}
                      isLoading={m.apiTester.isLoading}
                      testAllAPIs={m.apiTester.testAllAPIs}
                      getTestResultColor={m.apiTester.getTestResultColor}
                      getTestResultIcon={m.apiTester.getTestResultIcon}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Separator déco nad stopką akcji */}
          <div className="flex items-center gap-4 pt-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-brass/70" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
          </div>
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={m.handleSave}
              className="flex-1 border border-primary bg-primary font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] hover:brightness-110"
            >
              💾 Zapisz Ustawienia
            </Button>
            <div className="flex items-center gap-1">
              <Button
                onClick={m.handleReset}
                variant="destructive"
                className="px-6 font-display font-semibold uppercase tracking-[0.16em]"
              >
                🔄 Resetuj
              </Button>
              <HelpIcon content="Resetuje TYLKO ustawienia AI (model, temperatura, głośność itp.). NIE usuwa postaci, sesji ani historii czatu." />
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={m.fullReset.openConfirm}
                variant="destructive"
                className="px-6 bg-red-800 font-display font-semibold uppercase tracking-[0.16em] hover:bg-red-900"
              >
                🗑️ Pełny Reset
              </Button>
              <HelpIcon content="USUWA WSZYSTKO: postaci, sesje, historię czatu, ustawienia, notatki, cache. Operacja nieodwracalna!" />
            </div>
            <Button
              onClick={() => {
                onClose();
                if (onOpenChange) onOpenChange(false);
              }}
              variant="outline"
              className="border-brass/30 bg-brass/[0.04] px-6 font-display font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:border-brass/60 hover:text-brass"
            >
              ❌ Zamknij
            </Button>
          </div>

          {/* Lista 1 (offline fork): box „Szacunkowe koszty" schowany -
              prywatna gra na kanapie nie śledzi budżetu API. */}
        </div>

        <FullResetDialog
          show={m.fullReset.showConfirm}
          step={m.fullReset.fullResetStep}
          onClose={m.fullReset.closeConfirm}
          onConfirmStep1={m.fullReset.confirmStep1}
          onConfirm={m.fullReset.handleFullReset}
        />
      </DialogContent>
    </Dialog>
  );
}
