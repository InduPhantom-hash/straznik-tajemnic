'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { checkDesktopUpdate, getDesktopUpdateStatus, startDesktopUpdate, type UpdateCheckView, type UpdateStatusView } from '@/lib/desktop/update-client';

const DAY_MS = 86_400_000;
const LAST_CHECK_KEY = 'zew-update-last-check';
const DISMISSED_UNTIL_KEY = 'zew-update-dismissed-until';
const SEEN_RESULT_KEY = 'zew-update-result-seen';

export function DesktopUpdateNotifier() {
  const t = useTranslations('UpdateSettings');
  const [update, setUpdate] = useState<UpdateCheckView | null>(null);
  const [result, setResult] = useState<UpdateStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const check = useCallback(async (force: boolean) => {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (!force && Date.now() - last < DAY_MS) return;
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    try {
      const response = await checkDesktopUpdate();
      const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
      if (response.available && Date.now() >= dismissedUntil) setUpdate(response);
    } catch { /* automatyczne sprawdzanie pozostaje ciche */ }
  }, []);
  useEffect(() => {
    getDesktopUpdateStatus().then((status) => {
      if (!['succeeded', 'rolled_back', 'failed'].includes(status.state) || localStorage.getItem(SEEN_RESULT_KEY) === status.id) return;
      localStorage.setItem(SEEN_RESULT_KEY, status.id); setResult(status);
    }).catch(() => {});
    const timer = window.setTimeout(() => check(true), 30_000);
    const onFocus = () => check(false);
    window.addEventListener('focus', onFocus);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', onFocus); };
  }, [check]);
  if (!update?.available && !result) return null;
  const resultLabel = result?.state === 'succeeded' ? t('result.succeeded') : result?.state === 'rolled_back' ? t('result.rolled_back') : t('result.failed');
  const later = () => { localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DAY_MS)); setUpdate(null); };
  const start = async () => { setError(null); try { await startDesktopUpdate(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); } };
  return (
    <aside data-testid="desktop-update-notification" className="fixed bottom-5 right-5 z-[110] w-[min(92vw,420px)] space-y-3 rounded-lg border border-brass/50 bg-card p-5 shadow-2xl">
      {result ? <><h2 className="font-display font-semibold text-brass">{resultLabel}</h2>{result.message && <p className="text-sm text-muted-foreground">{result.message}</p>}<Button variant="outline" onClick={() => setResult(null)}>{t('close')}</Button></> : <><h2 className="font-display font-semibold text-brass">{t('notificationTitle', { version: update?.manifest?.version ?? '' })}</h2><p className="text-sm text-muted-foreground">{t('notificationDescription')}</p>{update?.manifest?.releaseNotes && <a className="text-sm text-primary underline" href={update.manifest.releaseNotes} target="_blank" rel="noreferrer">{t('releaseNotes')}</a>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex gap-2"><Button variant="outline" onClick={later}>{t('later')}</Button>{update?.canSelfUpdate && <Button onClick={start}>{t('updateRestart')}</Button>}</div></>}
    </aside>
  );
}
