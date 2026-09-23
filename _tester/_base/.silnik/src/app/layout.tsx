// src/app/layout.tsx
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import './fonts.css';
import { PHProvider } from '@/lib/posthog';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Strażnik Tajemnic | Pradawna Wiedza',
  description: 'Twoje centrum dowodzenia w walce z kosmiczną grozą.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Root layout jest wspolny dla tras poza [locale] - jezyk <html> czytamy
  // z cookie NEXT_LOCALE ustawianego przez middleware next-intl.
  // Middleware next-intl przekazuje rozstrzygniety jezyk w naglowku zadania -
  // dziala to juz przy PIERWSZEJ wizycie (zanim powstanie cookie NEXT_LOCALE).
  const h = await headers();
  const locale =
    h.get('x-next-intl-locale') ??
    (await cookies()).get('NEXT_LOCALE')?.value ??
    'pl';

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head />
      <body className="font-serif" suppressHydrationWarning>
        {/* PHProvider transparentnie odpada gdy NEXT_PUBLIC_POSTHOG_KEY nie jest ustawiony */}
        <PHProvider>
          {children}
          {/* IND-234: nieblokujące toasty (zastępują alert()) */}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  );
}
