'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArtDecoEye } from '@/components/ui/art-deco-eye';
import { DesktopUpdateModal } from '@/components/desktop-update-modal';
import {
  checkDesktopUpdate,
  formatVersionWithCommit,
  getDesktopUpdateStatus,
  type UpdateCheckView,
  type UpdateStatusView,
} from '@/lib/desktop/update-client';

const DAY_MS = 86_400_000;
const LAST_CHECK_KEY = 'zew-update-last-check';
const DISMISSED_UNTIL_KEY = 'zew-update-dismissed-until';
const DISMISSED_TARGET_KEY = 'zew-update-dismissed-target';
const SEEN_RESULT_KEY = 'zew-update-result-seen';

function getTargetIdentity(view?: UpdateCheckView | null): string {
  if (!view?.manifest) return '';
  return `${view.manifest.version}@${view.manifest.commitSha ?? ''}`;
}

export function DesktopUpdateNotifier() {
  const t = useTranslations('UpdateSettings');
  const [update, setUpdate] = useState<UpdateCheckView | null>(null);
  const [result, setResult] = useState<UpdateStatusView | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const check = useCallback(async (force: boolean) => {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (!force && Date.now() - last < DAY_MS) return;
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    try {
      const response = await checkDesktopUpdate();
      const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
      const dismissedTarget = localStorage.getItem(DISMISSED_TARGET_KEY) || '';
      const currentTarget = getTargetIdentity(response);
      const isDismissed =
        Date.now() < dismissedUntil && (!dismissedTarget || dismissedTarget === currentTarget);
      if (response.available && !isDismissed) {
        setUpdate(response);
      }
    } catch { /* automatyczne sprawdzanie pozostaje ciche */ }
  }, []);

  useEffect(() => {
    getDesktopUpdateStatus().then((status) => {
      if (!['succeeded', 'rolled_back', 'failed'].includes(status.state) || localStorage.getItem(SEEN_RESULT_KEY) === status.id) return;
      localStorage.setItem(SEEN_RESULT_KEY, status.id);
      setResult(status);
    }).catch(() => {});
    const timer = window.setTimeout(() => check(true), 4_000);
    const onFocus = () => check(false);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [check]);

  const later = () => {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DAY_MS));
    const target = getTargetIdentity(update);
    if (target) localStorage.setItem(DISMISSED_TARGET_KEY, target);
    setUpdate(null);
    setModalOpen(false);
  };

  const targetVersionLabel = formatVersionWithCommit(
    update?.manifest?.version,
    update?.manifest?.commitSha,
    update?.manifest?.shortCommit
  );

  const resultLabel = result?.state === 'succeeded'
    ? t('result.succeeded')
    : result?.state === 'rolled_back'
    ? t('result.rolled_back')
    : t('result.failed');

  return (
    <>
      {/* 1. Modal aktualizacji Dark Art Deco z changelogiem i okiem */}
      {update?.available && (
        <DesktopUpdateModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          update={update}
          onDismissLater={later}
        />
      )}

      {/* 2. Dyskretny toast w rogu ekranu prowadzący do modala lub pokazujący status */}
      {(update?.available || result) && !modalOpen && (
        <aside
          data-testid="desktop-update-notification"
          className="fixed bottom-6 right-6 z-[9999] w-[min(92vw,390px)] rounded-xl border border-brass/60 bg-[#0B0C0F]/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur space-y-2.5"
        >
          {result ? (
            <>
              <h2 className="font-display font-semibold text-brass">{resultLabel}</h2>
              {result.message && <p className="text-sm text-muted-foreground">{result.message}</p>}
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>{t('close')}</Button>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <ArtDecoEye size={42} mode="gentle" className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <h2 className="font-display text-sm font-semibold text-brass truncate">
                  {t('notificationTitle', { version: targetVersionLabel })}
                </h2>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                  {t('notificationDescription')}
                </p>
                <div className="flex gap-2 pt-1.5">
                  <Button
                    size="sm"
                    className="bg-brass hover:bg-brass/90 text-black text-xs font-semibold px-3 h-7 cursor-pointer"
                    onClick={() => setModalOpen(true)}
                  >
                    {t('openModal')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-7 cursor-pointer"
                    onClick={later}
                  >
                    {t('later')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
}

export default DesktopUpdateNotifier;
