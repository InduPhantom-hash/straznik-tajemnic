'use client';

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import {
  Key,
  ExternalLink,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { getApiKeys, saveApiKeys } from '@/lib/api-keys-service';

interface StepGeminiKeyProps {
  /** Przejście do kroku 2 - aktywne dopiero po walidacji klucza. */
  onNext: () => void;
}

type Validation = 'idle' | 'checking' | 'valid' | 'invalid';

/**
 * Krok 1 kreatora: klucz Google Gemini (jeden klucz na całość - narracja,
 * lektor, embeddingi lokalnego RAG). Reuse logiki walidacji z ApiKeysModal.
 */
export function StepGeminiKey({ onNext }: StepGeminiKeyProps) {
  const [apiKey, setApiKey] = useState(() => getApiKeys().GEMINI_API_KEY || '');
  const [show, setShow] = useState(false);
  const [validation, setValidation] = useState<Validation>('idle');

  const handleChange = (value: string) => {
    setApiKey(value);
    setValidation('idle');
  };

  const handleValidate = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setValidation('checking');
    try {
      const { geminiService } = await import('@/lib/gemini-service');
      const ok = await geminiService.checkAPIStatus(key);
      setValidation(ok ? 'valid' : 'invalid');
      if (ok) saveApiKeys({ ...getApiKeys(), GEMINI_API_KEY: key });
    } catch {
      setValidation('invalid');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wklej swój klucz Google Gemini. Napędza narrację Mistrza Gry, głos
        lektora oraz pamięć zasad (embeddingi). Klucz jest przechowywany
        wyłącznie lokalnie w Twojej przeglądarce - nikt poza Tobą go nie widzi.
      </p>

      <div className="flex items-center justify-end">
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brass hover:underline flex items-center gap-1"
        >
          Pobierz klucz w Google AI Studio
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={apiKey}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Wklej klucz Google Gemini..."
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleValidate}
          disabled={!apiKey.trim() || validation === 'checking'}
        >
          {validation === 'checking' ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Sprawdzam…
            </>
          ) : (
            'Sprawdź klucz'
          )}
        </Button>
        {validation === 'valid' && (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <Check className="w-3 h-3" /> Klucz działa
          </span>
        )}
        {validation === 'invalid' && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Klucz nieprawidłowy lub limit
            przekroczony
          </span>
        )}
      </div>

      <Card className="bg-[#1a1610] border border-brass/30">
        <CardContent className="py-3 px-4">
          <h4 className="font-display uppercase tracking-[0.08em] text-sm text-brass mb-2">
            📖 Jak uzyskać klucz?
          </h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Wejdź na <strong>aistudio.google.com</strong> i zaloguj się kontem
              Google
            </li>
            <li>
              Kliknij <strong>&bdquo;Get API key&rdquo;</strong> →{' '}
              <strong>&bdquo;Create API key&rdquo;</strong>
            </li>
            <li>
              Skopiuj klucz, wklej powyżej i kliknij &bdquo;Sprawdź klucz&rdquo;
            </li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={onNext}
          disabled={validation !== 'valid'}
        >
          <Key className="w-4 h-4 mr-2" />
          Dalej
        </Button>
      </div>
    </div>
  );
}
