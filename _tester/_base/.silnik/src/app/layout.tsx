// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { PHProvider } from '@/lib/posthog';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Strażnik Tajemnic | Pradawna Wiedza',
  description: 'Twoje centrum dowodzenia w walce z kosmiczną grozą.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        {/*
          Fonty ladowane przez <link> (nie @import w globals.css) - Tailwind/PostCSS
          wycina @import url() do Google Fonts przy buildzie, przez co Special Elite,
          Cinzel i Cormorant wpadaly w systemowy fallback. <link> w <head> omija ten
          problem. (Dla wersji w pelni offline: docelowo self-host przez next/font.)
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
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
