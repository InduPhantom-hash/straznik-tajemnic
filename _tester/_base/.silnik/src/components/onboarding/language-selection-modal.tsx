'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

interface LanguageSelectionModalProps {
  open: boolean;
  onSelected: () => void;
}

export function LanguageSelectionModal({
  open,
  onSelected,
}: LanguageSelectionModalProps) {
  const t = useTranslations('LanguageSelection');
  const router = useRouter();
  const pathname = usePathname();

  if (!open) return null;

  const selectLanguage = (locale: 'pl' | 'en') => {
    localStorage.setItem('language_selected', locale);
    onSelected();
    router.replace(pathname, { locale });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-selection-title"
    >
      <div className="deco-corners w-full max-w-xl border border-brass/50 bg-[#100d09] p-8 text-center shadow-[0_0_50px_rgba(201,162,39,0.16)]">
        <p className="font-special-elite text-xs uppercase tracking-[0.28em] text-brass">
          {t('eyebrow')}
        </p>
        <h1
          id="language-selection-title"
          className="mt-3 font-display-decorative text-3xl uppercase tracking-[0.1em] text-foreground"
        >
          {t('title')}
        </h1>
        <p className="mt-4 font-serif text-lg italic text-muted-foreground">
          {t('description')}
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => selectLanguage('pl')}
            className="border border-brass/50 bg-brass/10 px-5 py-4 font-display uppercase tracking-[0.12em] text-brass transition-colors hover:bg-brass/20"
          >
            {t('polish')}
          </button>
          <button
            type="button"
            onClick={() => selectLanguage('en')}
            className="border border-brass/50 bg-brass/10 px-5 py-4 font-display uppercase tracking-[0.12em] text-brass transition-colors hover:bg-brass/20"
          >
            {t('english')}
          </button>
        </div>
      </div>
    </div>
  );
}
