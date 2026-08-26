// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const Header = () => {
  const t = useTranslations('Header');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-bold text-lg">
          {t('appName')}
        </Link>
      </div>
    </header>
  );
};
