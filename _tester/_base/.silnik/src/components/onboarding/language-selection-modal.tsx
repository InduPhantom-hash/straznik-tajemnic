'use client';

import { usePathname, useRouter } from '@/i18n/routing';

export function LanguageSelectionContent({
  onSelectLanguage
}: {
  onSelectLanguage: (locale: 'pl' | 'en') => void;
}) {
  return (
    <div className="relative deco-corners w-full max-w-3xl border border-brass/40 bg-[#100d09] bg-[radial-gradient(circle_at_center,_#1a1610_0%,_#100d09_100%)] p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(201,162,39,0.18)]">
      <p className="font-special-elite text-[10px] sm:text-xs uppercase tracking-[0.14em] text-brass/90 whitespace-nowrap">
        ZANIM ROZPOCZNIE SIĘ ŚLEDZTWO &bull; BEFORE THE INVESTIGATION BEGINS
      </p>
      <h1
        id="language-selection-title"
        className="mt-4 font-display-decorative text-xl sm:text-2xl md:text-3xl uppercase tracking-[0.06em] text-foreground whitespace-nowrap"
      >
        WYBIERZ JĘZYK <span className="text-brass/40 font-sans font-light text-lg sm:text-xl md:text-2xl mx-2">/</span> CHOOSE LANGUAGE
      </h1>
      <div className="mt-4 space-y-1">
        <p className="font-serif text-base sm:text-lg italic text-muted-foreground">
          Ten wybór ustawia język gry i narracji.
        </p>
        <p className="font-serif text-xs sm:text-sm italic text-muted-foreground/70">
          This choice sets the game and narrative language.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onSelectLanguage('pl')}
          className="border border-brass/50 bg-brass/10 hover:bg-brass/20 px-6 py-4 font-display uppercase tracking-[0.14em] text-brass transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 cursor-pointer shadow-[0_0_15px_rgba(201,162,39,0.06)] hover:shadow-[0_0_20px_rgba(201,162,39,0.18)]"
        >
          Polski
        </button>
        <button
          type="button"
          onClick={() => onSelectLanguage('en')}
          className="border border-brass/50 bg-brass/10 hover:bg-brass/20 px-6 py-4 font-display uppercase tracking-[0.14em] text-brass transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 cursor-pointer shadow-[0_0_15px_rgba(201,162,39,0.06)] hover:shadow-[0_0_20px_rgba(201,162,39,0.18)]"
        >
          English
        </button>
      </div>
    </div>
  );
}

interface LanguageSelectionModalProps {
  open: boolean;
  onSelected: () => void;
}

export function LanguageSelectionModal({
  open,
  onSelected,
}: LanguageSelectionModalProps) {
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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 bg-[radial-gradient(ellipse_at_center,_rgba(26,22,16,0.85)_0%,_rgba(10,8,6,0.95)_100%)] p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-selection-title"
    >
      <LanguageSelectionContent onSelectLanguage={selectLanguage} />
    </div>
  );
}
