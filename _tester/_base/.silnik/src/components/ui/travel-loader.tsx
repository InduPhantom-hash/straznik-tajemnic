'use client';

import { useState, useEffect } from 'react';
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
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {isLoading ? (
          // Loading state
          (<div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <Loader2 className="w-24 h-24 text-emerald-500 animate-spin" />
              <MapPin className="w-8 h-8 text-emerald-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Podróżujesz{dots}
            </h2>
            <p className="text-zinc-400">
              Obliczam trasę i czas podróży...
            </p>
          </div>)
        ) : travelResult ? (
          // Result state
          (<div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-zinc-100">
                Podróż zakończona!
              </h2>
            </div>
            {/* Duration */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-zinc-400">Czas podróży</p>
                  <p className="text-lg font-semibold text-zinc-100">{travelResult.durationText}</p>
                </div>
              </div>
            </div>
            {/* Route & Transport */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400 mb-1">Trasa</p>
              <p className="text-zinc-100">{travelResult.route}</p>
              <p className="text-sm text-emerald-400 mt-1">
                Środek transportu: {travelResult.transport}
              </p>
            </div>
            {/* Risks */}
            {travelResult.risks.length > 0 && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-medium text-amber-400">Ryzyka</p>
                </div>
                <ul className="text-sm text-amber-200/80 space-y-1">
                  {travelResult.risks.map((risk, i) => (
                    <li key={i}>• {risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Narrative */}
            <div className="bg-zinc-800/50 rounded-lg p-4 italic text-zinc-300 text-sm">
              "{travelResult.narrativeDescription}"
            </div>
            {/* Cost */}
            <p className="text-center text-zinc-400 text-sm">
              Koszt: <span className="text-emerald-400">{travelResult.cost}</span>
            </p>
            {/* Continue button */}
            <button
              onClick={onClose}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Kontynuuj przygodę
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
