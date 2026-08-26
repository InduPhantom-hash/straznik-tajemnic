import React from 'react';

type TranslationValues = Record<string, unknown>;

export function useTranslations(namespace = '') {
  const translate = (key: string, values?: TranslationValues) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (!values) return fullKey;

    return Object.entries(values).reduce(
      (message, [name, value]) => message.replace(`{${name}}`, String(value)),
      fullKey
    );
  };

  translate.rich = (key: string, values?: TranslationValues) => translate(key, values);
  translate.has = (key: string) => false;
  translate.raw = (key: string) => translate(key);
  translate.markup = (key: string, values?: TranslationValues) => translate(key, values);
  return translate;
}

export function useLocale() {
  return 'pl';
}

export function useFormatter() {
  return {
    dateTime: (date: Date | number) => new Date(date).toISOString(),
    number: (val: number) => val.toString(),
    list: (val: string[]) => val.join(', '),
    relativeTime: () => '',
  };
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useNow() {
  return new Date();
}

export function useTimeZone() {
  return 'UTC';
}

export function useMessages() {
  return {};
}
