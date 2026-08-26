'use client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import enMessages from '../../../messages/en.json';

function WelcomeContent() {
  const setLanguage = (locale: 'pl' | 'en') => {
    window.location.href = `/${locale}`;
  };

  const t = useTranslations('Welcome');

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <Card className="p-8 text-center flex flex-col gap-6 max-w-md w-full border-muted/30">
        <h1 className="text-3xl font-serif text-white tracking-widest uppercase">
          {t('title')}
          <br />
          <span className="text-xl text-muted-foreground mt-2 block">{t('subtitle')}</span>
        </h1>

        <div className="flex flex-col gap-4 mt-4">
          <Button
            onClick={() => setLanguage('pl')}
            size="lg"
            className="w-full text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('playPl')}
          </Button>
          <Button
            onClick={() => setLanguage('en')}
            size="lg"
            variant="outline"
            className="w-full text-lg h-14 hover:bg-accent hover:text-accent-foreground"
          >
            {t('playEn')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <WelcomeContent />
    </NextIntlClientProvider>
  );
}