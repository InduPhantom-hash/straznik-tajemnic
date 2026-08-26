import React from 'react';
import en from '../../messages/en.json';
import pl from '../../messages/pl.json';

type AppMessages = typeof en;

declare module 'next-intl' {
  interface AppConfig {
    Messages: AppMessages;
  }
}

type Messages = Record<string, unknown>;
type TranslationValues = Record<string, unknown>;

const MESSAGES: Record<string, Messages> = {
  en: en as unknown as Messages,
  pl: pl as unknown as Messages,
};

/** Zwraca surowy komunikat (lub undefined) dla namespace + klucz. */
function resolveMessage(namespace: string, key: string): unknown {
  const fullKey = namespace ? `${namespace}.${key}` : key;
  const parts = fullKey.split('.');
  let node: unknown = MESSAGES.pl;
  for (const part of parts) {
    if (node !== null && typeof node === 'object') {
      node = (node as Messages)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

/** Natywna interpolacja zmiennych {name} znana z next-intl. */
function interpolate(
  message: string,
  values?: TranslationValues
): string {
  if (!values) return message;
  return Object.entries(values).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, stringifyValue(value)),
    message
  );
}

/**
 * Jawne rzutowanie wartości interpolacji na tekst (chunk_ac: liczby pancerza,
 * obrażeń i punktów w komponentach walki trafiają do {placeholders}).
 * - number/boolean/string -> String() (bez formatowania - asercje cyfra w cyfrę)
 * - Date                  -> ISO (deterministycznie w testach)
 * - null/undefined        -> '' (brak 'undefined' w renderowanym DOM)
 */
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Obsługa tagów <tag>...</tag> z t.rich()/t.markup(): funkcja przekazana
 * w values pod nazwą tagu dostaje tekst wewnętrzny i zwraca ReactNode.
 * Zwraca tablicę węzłów (wirtualny DOM) ze stabilnymi kluczami - asercje
 * typu getByText / container.querySelector działają 1:1 jak przy realnym
 * next-intl.
 */
function renderTags(message: string, values?: TranslationValues): React.ReactNode {
  if (!values) return message;
  const parts = message.split(/(<(\w+)>[\s\S]*?<\/\2>)/g);
  const nodes = parts.map((part, index) => {
    const match = part.match(/^<(\w+)>([\s\S]*?)<\/\1>$/);
    if (!match) return part;
    const [, tag, inner] = match;
    const render = values[tag];
    if (typeof render === 'function') {
      return React.createElement(
        React.Fragment,
        { key: `${tag}-${index}` },
        render(inner)
      );
    }
    return inner;
  });
  return React.createElement(React.Fragment, null, nodes);
}

export function useTranslations(namespace = '') {
  const translate = (
    key: string,
    values?: TranslationValues
  ): string => {
    const raw = resolveMessage(namespace, key);
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (typeof raw !== 'string') return fullKey;
    return interpolate(raw, values);
  };

  translate.rich = (
    key: string,
    values?: TranslationValues
  ): React.ReactNode => {
    const raw = resolveMessage(namespace, key);
    const fullKey = namespace ? `${namespace}.${key}` : key;
    if (typeof raw !== 'string') return fullKey;
    return renderTags(interpolate(raw, values), values);
  };
  translate.has = (key: string) => typeof resolveMessage(namespace, key) === 'string';
  translate.raw = (key: string) => resolveMessage(namespace, key);
  translate.markup = translate.rich;
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
  return MESSAGES.pl;
}
