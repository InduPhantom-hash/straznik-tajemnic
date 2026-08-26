'use client';

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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

export const ApiKeysModal: FC<ApiKeysModalProps> = ({ open, onOpenChange }) => {
  const t = useTranslations('ApiKeysModal');
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
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ostrzeżenie o bezpieczeństwie */}
          <Card className="bg-amber-900/20 border-amber-500/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  <strong>{t('securityLabel')}</strong>{' '}
                  {t('securityDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Formularz kluczy (localStorage - BYOK: Gemini wymagany + Replicate/Vertex opcjonalne) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="GEMINI_API_KEY"
                className="flex items-center gap-2 font-display uppercase tracking-[0.08em] text-sm text-foreground"
              >
                Google Gemini API Key
                <Badge variant="destructive" className="text-[14px] px-1 py-0">
                  {t('requiredBadge')}
                </Badge>
                {isKeySet('GEMINI_API_KEY') && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </Label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brass hover:underline flex items-center gap-1"
              >
                Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <Input
                id="GEMINI_API_KEY"
                type={showKeys.GEMINI_API_KEY ? 'text' : 'password'}
                autoComplete="new-password"
                value={keys.GEMINI_API_KEY || ''}
                onChange={(e) => handleChange('GEMINI_API_KEY', e.target.value)}
                placeholder={t('inputPlaceholder', { label: 'Google Gemini API Key' })}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('GEMINI_API_KEY')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys.GEMINI_API_KEY ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">{t('geminiHint')}</p>

            {/* IND-206 BYOK: walidacja klucza Gemini "czy żyje" */}
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
                    {t('checking')}
                  </>
                ) : (
                  t('checkKey')
                )}
              </Button>
              {geminiValidation === 'valid' && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('keyWorks')}
                </span>
              )}
              {geminiValidation === 'invalid' && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t('keyInvalid')}
                </span>
              )}
            </div>
          </div>

          {/* Instrukcja */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <h4 className="font-medium text-sm text-foreground mb-2">
                📖 {t('howToTitle')}
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>
                  {t('step1Pre')} <strong>aistudio.google.com</strong>{' '}
                  {t('step1Post')}
                </li>
                <li>
                  {t('step2Pre')} <strong>&ldquo;Get API key&rdquo;</strong> →{' '}
                  <strong>&ldquo;Create API key&rdquo;</strong>
                </li>
                <li>
                  {t('step3Pre')}{' '}
                  <strong>{t('checkKeyQuoted')}</strong>
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
            {t('cancel')}
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={!keys.GEMINI_API_KEY?.trim()}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('saved')}
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                {t('saveKeys')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
