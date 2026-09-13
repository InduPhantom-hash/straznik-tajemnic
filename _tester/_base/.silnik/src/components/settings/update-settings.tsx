'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { checkDesktopUpdate, startDesktopUpdate, type UpdateCheckView } from '@/lib/desktop/update-client';

export function UpdateSettings() {
  const t = useTranslations('UpdateSettings');
  const [result, setResult] = useState<UpdateCheckView | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'starting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const check = async () => {
    setState('checking'); setError(null);
    try { setResult(await checkDesktopUpdate()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setState('idle'); }
  };
  const update = async () => {
    setState('starting'); setError(null);
    try { await startDesktopUpdate(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setState('idle'); }
  };
  return (
    <section data-testid="update-settings" className="space-y-3 border border-brass/30 bg-card p-4">
      <div><h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-brass">{t('title')}</h3><p className="mt-1 text-sm text-muted-foreground">{t('description')}</p></div>
      {result && <p className="text-sm">{t('currentVersion', { version: result.currentVersion })}</p>}
      {result?.available && result.manifest && <div className="space-y-2 border-l-2 border-primary pl-3"><p className="text-sm">{t('availableVersion', { version: result.manifest.version })}</p>{result.manifest.releaseNotes && <a className="text-sm text-primary underline" href={result.manifest.releaseNotes} target="_blank" rel="noreferrer">{t('releaseNotes')}</a>}{!result.canSelfUpdate && <p className="text-xs text-muted-foreground">{t('devMode')}</p>}</div>}
      {result && !result.configured && <p className="text-xs text-muted-foreground">{t('notConfigured')}</p>}
      {result?.configured && !result.available && <p className="text-sm text-muted-foreground">{t('upToDate')}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={check} disabled={state !== 'idle'}>{state === 'checking' ? t('checking') : t('checkNow')}</Button>{result?.available && result.canSelfUpdate && <Button onClick={update} disabled={state !== 'idle'}>{state === 'starting' ? t('starting') : t('updateRestart')}</Button>}</div>
    </section>
  );
}
