// src/components/Footer.tsx
'use client';

import { useTranslations } from 'next-intl';

export const Footer = () => {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t border-border/40 py-6 md:py-8">
      <div className="container max-w-screen-2xl text-center text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">{t('title')}</p>
        <p>{t('subtitle')}</p>
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
};
