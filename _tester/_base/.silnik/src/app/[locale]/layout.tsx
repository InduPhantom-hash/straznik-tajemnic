import type { Metadata } from 'next';
import { PHProvider } from '@/lib/posthog';
import { Toaster } from '@/components/ui/toaster';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Strażnik Tajemnic | Pradawna Wiedza',
  description: 'Twoje centrum dowodzenia w walce z kosmiczną grozą.',
};

/**
 * Layout segmentu [locale]. Jedyne <html> w drzewie żyje w root layout
 * (lang z nagłówka x-next-intl-locale od middleware) - duplikat html/body
 * tutaj powodował niedeterministyczny lang po hydratacji.
 */
export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Włącz locale w kontekście żądania - bez tego komponenty serwerowe
  // (not-found, loading itd.) renderują się z domyślnym locale.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PHProvider>
        {children}
        {/* IND-234: nieblokujące toasty (zastępują alert()) */}
        <Toaster />
      </PHProvider>
    </NextIntlClientProvider>
  );
}
