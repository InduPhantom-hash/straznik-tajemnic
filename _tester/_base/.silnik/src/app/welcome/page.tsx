'use client';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../../messages/en.json';
import { LanguageSelectionContent } from '@/components/onboarding/language-selection-modal';

function WelcomeContent() {
  const setLanguage = (locale: 'pl' | 'en') => {
    localStorage.setItem('language_selected', locale);
    window.location.href = `/${locale}`;
  };

  return (
    <div data-testid="language-selection-screen" className="flex h-screen w-screen items-center justify-center bg-[#100d09] bg-[radial-gradient(circle_at_center,_#1a1610_0%,_#100d09_100%)] p-6">
      <LanguageSelectionContent onSelectLanguage={setLanguage} />
    </div>
  );
}

export default function WelcomePage() {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Europe/Warsaw">
      <WelcomeContent />
    </NextIntlClientProvider>
  );
}
