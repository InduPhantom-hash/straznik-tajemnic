'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

/**
 * Szablon mikro-komponentu UI dla Strażnika Tajemnic AI.
 *
 * Inwarianty architektoniczne:
 * 1. ZAKAZ wpisywania surowych tekstów (hardcoded strings) w tagach JSX.
 * 2. Wszystkie etykiety pochodzą z hooka useTranslations.
 * 3. Defensywna normalizacja danych wejściowych (Array.isArray, fallbacki na null/undefined).
 * 4. Klucze użyte w t('...') muszą istnieć jednocześnie w messages/pl.json i messages/en.json.
 */

export interface ItemEntry {
  id: string;
  name: string;
  quantity?: number;
  description?: string;
}

export interface UiComponentTemplateProps {
  titleKey?: string;
  items?: ItemEntry[];
  isLoading?: boolean;
  onItemSelect?: (item: ItemEntry) => void;
  className?: string;
}

export const UiComponentTemplate: React.FC<UiComponentTemplateProps> = ({
  titleKey = 'defaultTitle',
  items = [],
  isLoading = false,
  onItemSelect,
  className = '',
}) => {
  // Nazwa przestrzeni (namespace) musi odpowiadać gałęzi w messages/*.json
  const t = useTranslations('UiComponentTemplate');

  // BEZPIECZNIK ANTY-REGRESYJNY: ochrona przed błędami typu .map is not a function
  const safeItems = Array.isArray(items) ? items : [];

  if (isLoading) {
    return (
      <div className={`p-4 text-sm text-muted-foreground animate-pulse ${className}`} role="status">
        {t('loading')}
      </div>
    );
  }

  return (
    <section className={`rounded-lg border border-border p-4 bg-card ${className}`}>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground tracking-wide">
          {t(titleKey)}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('totalCount', { count: safeItems.length })}
        </span>
      </header>

      {safeItems.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          {t('emptyState')}
        </p>
      ) : (
        <ul className="divide-y divide-border/50" role="list">
          {safeItems.map((item) => (
            <li
              key={item.id}
              className="py-2 flex items-center justify-between hover:bg-muted/50 rounded px-2 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.quantity !== undefined && (
                  <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">
                    x{item.quantity}
                  </span>
                )}
                {onItemSelect && (
                  <button
                    type="button"
                    onClick={() => onItemSelect(item)}
                    className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90 transition-opacity"
                  >
                    {t('selectAction')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
