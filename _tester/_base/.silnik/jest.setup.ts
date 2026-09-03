// jest.setup.ts
import React from 'react';
import '@testing-library/jest-dom';
import enMessages from './messages/en.json';
import plMessages from './messages/pl.json';

// next-intl: useTranslations czyta PRAWDZIWE messages/*.json (domyślnie pl),
// dzięki czemu komponenty z hookami renderują się w testach bez providera,
// a asercje na polskich tekstach pozostają aktualne.
type Messages = Record<string, unknown>;

const MESSAGES: Record<string, Messages> = {
  en: enMessages as unknown as Messages,
  pl: plMessages as unknown as Messages,
};

const resolveMessage = (
  locale: string,
  namespace: string,
  key: string,
  values?: Record<string, unknown>
): string => {
  const bag = MESSAGES[locale] ?? MESSAGES.pl;
  const ns = bag[namespace] as Record<string, unknown> | undefined;
  const raw = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ns);
  if (typeof raw !== 'string') return `${namespace}.${key}`;
  if (!values) return raw;
  return Object.entries(values).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    raw
  );
};

jest.mock('next-intl', () => {
  type TranslateFn = ((key: string, values?: Record<string, unknown>) => string) & {
    rich: (key: string, chunks?: Record<string, unknown>) => string;
    raw: (key: string) => unknown;
    has: (key: string) => boolean;
  };

  const makeT = (locale: string, namespace: string): TranslateFn => {
    const t = ((key: string, values?: Record<string, unknown>) =>
      resolveMessage(locale, namespace, key, values)) as TranslateFn;
    t.rich = (key: string) => resolveMessage(locale, namespace, key);
    t.raw = (key: string) => {
      const ns = (MESSAGES[locale] ?? MESSAGES.pl)[namespace] as Record<string, unknown> | undefined;
      return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ns);
    };
    t.has = (key: string) => {
      const ns = (MESSAGES[locale] ?? MESSAGES.pl)[namespace] as Record<string, unknown> | undefined;
      const raw = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ns);
      return raw !== undefined;
    };
    return t;
  };

  // next-intl jest ESM-only i nie przechodzi przez transform Jest - zamiast
  // requireActual dajemy passthrough stub providera (testy renderują komponenty
  // z hookami bezpośrednio, bez drzewa providerów).
  const NextIntlClientProvider = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => children as React.ReactElement;

  return {
    useLocale: () => process.env.NEXT_INTL_TEST_LOCALE ?? 'pl',
    useMessages: () =>
      MESSAGES[process.env.NEXT_INTL_TEST_LOCALE ?? 'pl'] ?? MESSAGES.pl,
    useTranslations: (namespace: string) =>
      makeT(process.env.NEXT_INTL_TEST_LOCALE ?? 'pl', namespace),
    getTranslations: (namespaceOrOpts: string | { namespace?: string }) =>
      makeT(
        process.env.NEXT_INTL_TEST_LOCALE ?? 'pl',
        typeof namespaceOrOpts === 'string' ? namespaceOrOpts : namespaceOrOpts.namespace ?? ''
      ),
    NextIntlClientProvider,
  };
});

// Radix UI portals + observers (potrzebne dla Dialog, Select, Slider w settings-modal)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Radix uses these on Element prototype
Element.prototype.hasPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.scrollIntoView = jest.fn();

// Global fetch — modal robi loadDefaultPrompt, /api/playtest, /api/tts/azure
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);
