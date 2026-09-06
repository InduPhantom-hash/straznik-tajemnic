'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { travelService, TravelResult } from '@/lib/travel-service';
import { timeManager } from '@/lib/time-manager';
import { GameEra } from '@/lib/types';
import { Loader2, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface TravelLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  travelResult: TravelResult | null;
  isLoading: boolean;
}

export function TravelLoader({ isOpen, onClose, travelResult, isLoading }: TravelLoaderProps) {
  const t = useTranslations('TravelLoader');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!isOpen) return null;

  return (
    (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-brass/40 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden">
        {isLoading ? (
          // Loading state
          (<div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <Loader2 className="w-24 h-24 text-primary animate-spin" />
              <MapPin className="w-8 h-8 text-brass absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('traveling')}{dots}
            </h2>
            <p className="text-muted-foreground">
              {t('calculatingRoute')}
            </p>
          </div>)
        ) : travelResult ? (
          // Result state
          (<div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-brass mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-brass">
                {t('travelComplete')}
              </h2>
            </div>
            {/* Duration */}
            <div className="bg-input/40 border border-border/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-brass" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('durationLabel')}</p>
                  <p className="text-lg font-semibold text-foreground">{travelResult.durationText}</p>
                </div>
              </div>
            </div>
            {/* Route & Transport */}
            <div className="bg-input/40 border border-border/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{t('routeLabel')}</p>
              <p className="text-foreground">{travelResult.route}</p>
              <p className="text-sm text-brass mt-1">
                {t('transportLabel', { transport: travelResult.transport })}
              </p>
            </div>
            {/* Risks */}
            {travelResult.risks.length > 0 && (
              <div className="bg-destructive/15 border border-destructive/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">{t('risksLabel')}</p>
                </div>
                <ul className="text-sm text-foreground/80 space-y-1">
                  {travelResult.risks.map((risk, i) => (
                    <li key={i}>• {risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Narrative */}
            <div className="bg-input/20 border border-border/40 rounded-lg p-4 italic text-foreground/90 text-sm font-serif">
              &quot;{travelResult.narrativeDescription}&quot;
            </div>
            {/* Cost */}
            <p className="text-center text-muted-foreground text-sm">
              {t('costLabel')} <span className="text-brass font-semibold">{travelResult.cost}</span>
            </p>
            {/* Continue button */}
            <button
              onClick={onClose}
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors"
            >
              {t('continueAdventure')}
            </button>
          </div>)
        ) : null}
      </div>
    </div>)
  );
}

// Hook do obsługi podróży
export function useTravelLoader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TravelResult | null>(null);

  const startTravel = async (
    from: string,
    to: string,
    era: GameEra = '1920s',
    apiKey?: string
  ) => {
    setIsOpen(true);
    setIsLoading(true);
    setResult(null);

    try {
      if (apiKey) {
        travelService.initialize(apiKey);
      }

      const travelResult = await travelService.undertakeTravel({
        from,
        to,
        era,
      });

      setResult(travelResult);
    } catch (error) {
      console.error('Travel failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setResult(null);
  };

  return {
    isOpen,
    isLoading,
    result,
    startTravel,
    close,
  };
}

export default TravelLoader;
