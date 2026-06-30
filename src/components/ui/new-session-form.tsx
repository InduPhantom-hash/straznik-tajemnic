"use client";

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button } from './button';

interface NewSessionFormProps {
  onSave: (sessionName: string, description?: string) => Promise<boolean>;
  onClose: () => void;
}

export function NewSessionForm({ onSave, onClose }: NewSessionFormProps) {
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      setError('Nazwa sesji jest wymagana');
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
        setError('Błąd podczas zapisywania sesji');
      }
    } catch {
      setError('Nieoczekiwany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="sessionName"
          className="block text-sm font-medium text-foreground"
        >
          Nazwa sesji *
        </label>
        <input
          id="sessionName"
          type="text"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="np. Przygoda w Arkham, Sesja z Testowym, etc."
          className="w-full px-4 py-3 bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-foreground"
        >
          Opis (opcjonalny)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Krótki opis sesji, co się wydarzyło, gdzie się rozgrywa..."
          rows={3}
          className="w-full px-4 py-3 bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !sessionName.trim()}
          className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-foreground font-medium rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Zapisywanie...
            </div>
          ) : (
            '💾 Zapisz jako nową sesję'
          )}
        </Button>

        <Button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-6 py-3 bg-muted hover:bg-muted disabled:bg-muted text-foreground font-medium rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
        >
          Anuluj
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 <strong>Wskazówka:</strong> Nadaj opisową nazwę sesji, aby łatwo ją
          znaleźć później
        </p>
        <p>📅 Sesja zostanie zapisana z aktualną datą i czasem</p>
      </div>
    </form>
  );
}
