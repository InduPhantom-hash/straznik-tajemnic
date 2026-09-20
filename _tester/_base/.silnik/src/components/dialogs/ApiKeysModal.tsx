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
import {
  ApiKeys,
  saveApiKeys,
  getApiKeys,
  getGeminiTier,
  type GeminiTier,
} from '@/lib/api-keys-service';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeysModal: FC<ApiKeysModalProps> = ({ open, onOpenChange }) => {
  const t = useTranslations('ApiKeysModal');
  const [keys, setKeys] = useState<ApiKeys>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  // Walidacja klucza Gemini (bramka autoryzacji)
  const [geminiValidation, setGeminiValidation] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle');
  const [validationErrorCode, setValidationErrorCode] = useState<string | null>(null);
  const [validationErrorDetails, setValidationErrorDetails] = useState<string | null>(null);
  const [geminiTier, setGeminiTierState] = useState<GeminiTier>('free');

  // Załaduj zapisane klucze przy otwarciu
  useEffect(() => {
    if (open) {
      const loaded = getApiKeys();
      setKeys(loaded);
      setGeminiTierState(getGeminiTier());
      setSaved(false);
      setGeminiValidation('idle');
      setValidationErrorCode(null);
      setValidationErrorDetails(null);
    }
  }, [open]);

  const handleChange = (key: keyof ApiKeys, value: string) => {
    setKeys((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    // Zmiana klucza unieważnia poprzedni wynik walidacji.
    if (key === 'GEMINI_API_KEY') {
      setGeminiValidation('idle');
      setValidationErrorCode(null);
      setValidationErrorDetails(null);
    }
  };

  // Testowe wywołanie Gemini przez /api/chat-test z precyzyjną diagnozą błędu i detekcją tieru
  const handleValidateGemini = async (
    keyOverride?: string
  ): Promise<{ valid: boolean; tier: GeminiTier }> => {
    const key = (keyOverride ?? keys.GEMINI_API_KEY)?.trim();
    if (!key) {
      setGeminiValidation('invalid');
      setValidationErrorCode('AUTH_FAILED');
      return { valid: false, tier: 'free' };
    }
    setGeminiValidation('checking');
    setValidationErrorCode(null);
    setValidationErrorDetails(null);
    try {
      const { geminiService } = await import('@/lib/gemini-service');
      const res = await geminiService.validateApiKey(key, { checkTier: true });
      if (res.valid) {
        const detectedTier: GeminiTier = res.tier === 'paid' ? 'paid' : 'free';
        setGeminiTierState(detectedTier);
        setKeys((prev) => ({ ...prev, GEMINI_TIER: detectedTier }));
        setGeminiValidation('valid');
        return { valid: true, tier: detectedTier };
      } else {
        setGeminiValidation('invalid');
        setValidationErrorCode(res.code || 'UNKNOWN');
        setValidationErrorDetails(res.details || null);
        return { valid: false, tier: 'free' };
      }
    } catch {
      setGeminiValidation('invalid');
      setValidationErrorCode('NETWORK_ERROR');
      return { valid: false, tier: 'free' };
    }
  };

  const handleSave = async () => {
    const key = keys.GEMINI_API_KEY?.trim();
    if (!key) return;

    let finalTier = geminiTier;
    // Jeśli klucz nie został jeszcze pomyślnie zwalidowany, uruchom walidację
    if (geminiValidation !== 'valid') {
      const validationRes = await handleValidateGemini(key);
      if (!validationRes.valid) {
        return; // Blokada zapisu przy błędnym kluczu
      }
      finalTier = validationRes.tier;
    }

    saveApiKeys({ ...keys, GEMINI_TIER: finalTier });
    setSaved(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 1000);
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
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
          <Card className="bg-brass/10 border-brass/40">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-brass mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/90">
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
                {geminiValidation === 'valid' && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {geminiValidation === 'invalid' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
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

            {/* Komunikat o stanie walidacji klucza Gemini */}
            {(geminiValidation === 'valid' || geminiValidation === 'invalid') && (
              <div className="flex flex-col gap-2 pt-1">
                {geminiValidation === 'valid' && (
                  <div className="flex flex-col gap-1.5 p-2.5 rounded border border-border/40 bg-card/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-500 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> {t('keyWorks')}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          geminiTier === 'paid'
                            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30 text-[11px] font-mono'
                            : 'text-amber-400 border-amber-500/40 bg-amber-950/30 text-[11px] font-mono'
                        }
                      >
                        {geminiTier === 'paid' ? t('paidTierBadge') : t('freeTierBadge')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {geminiTier === 'paid' ? t('paidTierDesc') : t('freeTierDesc')}
                    </p>
                  </div>
                )}

                {geminiValidation === 'invalid' && (
                  <div className="text-xs text-red-400 flex flex-col gap-0.5 bg-red-950/20 border border-red-900/30 rounded p-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      {validationErrorCode === 'AUTH_FAILED'
                        ? t('authFailed')
                        : validationErrorCode === 'PERMISSION_DENIED'
                          ? t('permissionDenied')
                          : validationErrorCode === 'QUOTA_EXCEEDED'
                            ? t('quotaExceeded')
                            : validationErrorCode === 'NETWORK_ERROR'
                              ? t('networkError')
                              : t('keyInvalid')}
                    </span>
                    {validationErrorDetails && (
                      <span className="text-[11px] text-muted-foreground pl-5.5 font-mono">
                        {validationErrorDetails}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
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
            disabled={
              !keys.GEMINI_API_KEY?.trim() ||
              geminiValidation === 'checking'
            }
          >
            {geminiValidation === 'checking' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('validating')}
              </>
            ) : saved ? (
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
