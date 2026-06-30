'use client';

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Key,
  ExternalLink,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { ApiKeys, saveApiKeys, getApiKeys } from '@/lib/api-keys-service';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiKeyConfig {
  key: keyof ApiKeys;
  label: string;
  required: boolean;
  description: string;
  link: string;
  linkLabel: string;
}

// BYOK: gracz wkleja WYŁĄCZNIE klucz Google Gemini. Jeden klucz napędza całość -
// narrację, lektora (TTS), obrazy (Gemini Image) ORAZ embeddingi lokalnego RAG.
// RAG jest w 100% lokalny (data/rag/*.bin) - żadnego Pinecone ani drugiego klucza.
const API_KEYS_CONFIG: ApiKeyConfig[] = [
  {
    key: 'GEMINI_API_KEY',
    label: 'Google Gemini API Key',
    required: true,
    description:
      'Twój klucz z Google AI Studio - napędza narrację Mistrza Gry i głos lektora. Obrazy i pamięć działają po stronie serwera.',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Google AI Studio',
  },
];

export const ApiKeysModal: FC<ApiKeysModalProps> = ({ open, onOpenChange }) => {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  // IND-206 BYOK: walidacja "czy klucz żyje" przez /api/chat-test (reuse checkAPIStatus).
  const [geminiValidation, setGeminiValidation] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle');

  // Załaduj zapisane klucze przy otwarciu
  useEffect(() => {
    if (open) {
      setKeys(getApiKeys());
      setSaved(false);
      setGeminiValidation('idle');
    }
  }, [open]);

  const handleChange = (key: keyof ApiKeys, value: string) => {
    setKeys((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    // Zmiana klucza unieważnia poprzedni wynik walidacji.
    if (key === 'GEMINI_API_KEY') setGeminiValidation('idle');
  };

  // IND-206 BYOK: testowe wywołanie Gemini ("Hello") przez istniejący /api/chat-test.
  // Klucz idzie w body do serwera (jak przy każdej narracji - zero nowej ekspozycji);
  // endpoint nie loguje ani nie persystuje klucza.
  const handleValidateGemini = async () => {
    const key = keys.GEMINI_API_KEY?.trim();
    if (!key) return;
    setGeminiValidation('checking');
    try {
      const { geminiService } = await import('@/lib/gemini-service');
      const ok = await geminiService.checkAPIStatus(key);
      setGeminiValidation(ok ? 'valid' : 'invalid');
    } catch {
      setGeminiValidation('invalid');
    }
  };

  const handleSave = () => {
    saveApiKeys(keys);
    setSaved(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 1000);
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isKeySet = (key: keyof ApiKeys) => {
    return keys[key] && keys[key]!.trim() !== '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="wide"
        className="bg-gradient-to-b from-card to-background border border-brass/40 shadow-[0_0_30px_rgba(0,0,0,0.55)] deco-corners"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.12em] text-foreground text-xl">
            <Key className="w-6 h-6 text-brass" />
            Konfiguracja kluczy API
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Wklej swój klucz Google Gemini, aby grać. Klucz jest przechowywany
            wyłącznie lokalnie w Twojej przeglądarce - nikt poza Tobą go nie
            widzi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ostrzeżenie o bezpieczeństwie */}
          <Card className="bg-amber-900/20 border-amber-500/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  <strong>Bezpieczeństwo:</strong> Klucze są przechowywane w
                  Twojej przeglądarce (localStorage). Nie udostępniaj ich
                  nikomu. Każdy serwis ma własne limity i opłaty.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Formularz kluczy (localStorage - BYOK: Gemini wymagany + Replicate/Vertex opcjonalne) */}
          {API_KEYS_CONFIG.map((config) => (
            <div key={config.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={config.key}
                  className="flex items-center gap-2 font-display uppercase tracking-[0.08em] text-sm text-foreground"
                >
                  {config.label}
                  {config.required ? (
                    <Badge
                      variant="destructive"
                      className="text-[14px] px-1 py-0"
                    >
                      Wymagany
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[14px] px-1 py-0 text-muted-foreground"
                    >
                      Opcjonalny
                    </Badge>
                  )}
                  {isKeySet(config.key) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </Label>
                <a
                  href={config.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brass hover:underline flex items-center gap-1"
                >
                  {config.linkLabel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <Input
                  id={config.key}
                  type={showKeys[config.key] ? 'text' : 'password'}
                  value={keys[config.key] || ''}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  placeholder={`Wprowadź ${config.label}...`}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey(config.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys[config.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>

              {/* IND-206 BYOK: walidacja klucza Gemini "czy żyje" */}
              {config.key === 'GEMINI_API_KEY' && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidateGemini}
                    disabled={
                      !keys.GEMINI_API_KEY?.trim() ||
                      geminiValidation === 'checking'
                    }
                  >
                    {geminiValidation === 'checking' ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Sprawdzam…
                      </>
                    ) : (
                      'Sprawdź klucz'
                    )}
                  </Button>
                  {geminiValidation === 'valid' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Klucz działa
                    </span>
                  )}
                  {geminiValidation === 'invalid' && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Klucz nieprawidłowy
                      lub limit przekroczony
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Instrukcja */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <h4 className="font-medium text-sm text-foreground mb-2">
                📖 Jak uzyskać klucz Google Gemini?
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>
                  Wejdź na <strong>aistudio.google.com</strong> i zaloguj się
                  kontem Google
                </li>
                <li>
                  Kliknij <strong>&bdquo;Get API key&rdquo;</strong> →{' '}
                  <strong>&bdquo;Create API key&rdquo;</strong>
                </li>
                <li>
                  Skopiuj klucz, wklej powyżej i kliknij{' '}
                  <strong>&bdquo;Sprawdź klucz&rdquo;</strong>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Przyciski */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={!keys.GEMINI_API_KEY?.trim()}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Zapisano!
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Zapisz klucze
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
