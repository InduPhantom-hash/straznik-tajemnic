"use client";

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';

interface NewSessionFormProps {
  onSave: (sessionName: string, description?: string) => Promise<boolean>;
  onClose: () => void;
}

export function NewSessionForm({ onSave, onClose }: NewSessionFormProps) {
  const t = useTranslations('NewSessionForm');
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      setError(t('sessionNameRequired'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const success = await onSave(
        sessionName.trim(),
        description.trim() || undefined
      );
      if (success) {
        // Formularz zostanie zamknięty przez onSave
      } else {
        setError(t('saveError'));
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-md p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="sessionName"
          className="block text-sm font-medium text-foreground"
        >
          {t('sessionNameLabel')}
        </label>
        <input
          id="sessionName"
          type="text"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder={t('sessionNamePlaceholder')}
          className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-brass/30 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brass/60 focus:border-brass/70 transition-all duration-300"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground"
        >
          {t('descriptionLabel')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-brass/30 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brass/60 focus:border-brass/70 transition-all duration-300 resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !sessionName.trim()}
          className="flex-1 py-3 bg-gradient-to-r from-brass/80 to-gold/70 hover:from-brass hover:to-gold text-background font-medium rounded-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
              {t('saving')}
            </div>
          ) : (
            t('saveAsNewButton')
          )}
        </Button>

        <Button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          variant="outline"
          className="px-6 py-3 border-brass/30 text-foreground font-medium rounded-md transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100"
        >
          {t('cancel')}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 <strong>{t('tipLabel')}</strong> {t('tipText')}
        </p>
        <p>📅 {t('dateInfo')}</p>
      </div>
    </form>
  );
}
