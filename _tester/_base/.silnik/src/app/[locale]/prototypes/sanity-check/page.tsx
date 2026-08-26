'use client';

import { useState, useCallback } from 'react';
import { Brain, Dices, AlertCircle, CheckCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';


export default function SanityCheckPrototype() {
  const t = useTranslations('Page');

  const [currentSanity, setCurrentSanity] = useState(65);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failure'>('idle');
  const [sanityLoss, setSanityLoss] = useState<number | null>(null);

  const rollSanityCheck = useCallback(() => {
    setIsRolling(true);
    setStatus('idle');
    setSanityLoss(null);

    
    let frames = 0;
    const interval = setInterval(() => {
      setRollResult(Math.floor(Math.random() * 100) + 1);
      frames++;

      if (frames >= 20) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 100) + 1;
        setRollResult(finalRoll);
        setIsRolling(false);

        
        if (finalRoll <= currentSanity) {
          setStatus('success');
        } else {
          setStatus('failure');
          
          const loss = Math.floor(Math.random() * 6) + 1;
          setSanityLoss(loss);
          setCurrentSanity(prev => Math.max(0, prev - loss));
        }
      }
    }, 50);
  }, [currentSanity]);

  const resetTest = useCallback(() => {
    setCurrentSanity(65);
    setRollResult(null);
    setStatus('idle');
    setSanityLoss(null);
  }, []);

  
  const getSanityColor = (sanity: number) => {
    if (sanity >= 60) return 'from-purple-600 to-purple-400';
    if (sanity >= 40) return 'from-yellow-600 to-yellow-400';
    if (sanity >= 20) return 'from-orange-600 to-orange-400';
    return 'from-red-600 to-red-400';
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-md mx-auto">
        {}
        <Link
          href="/prototypes"
          className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('backToPrototypes')}
        </Link>

        <h1 className="text-2xl font-bold text-emerald-500 flex items-center gap-2 mb-2">
          <Brain className="w-6 h-6" />
          {t('sanityCheckTitle')}
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          {t('sanityCheckSubtitle')}
        </p>

        {}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-zinc-500 text-sm mb-1">{t('currentSanity')}</div>
            <div className={`text-5xl font-bold transition-colors duration-300 ${
              currentSanity >= 60 ? 'text-purple-500' :
              currentSanity >= 40 ? 'text-yellow-500' :
              currentSanity >= 20 ? 'text-orange-500' :
              'text-red-500'
            }`}>
              {currentSanity}
            </div>
          </div>

          {}
          <div className="mt-4 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getSanityColor(currentSanity)} transition-all duration-500`}
              style={{ width: `${currentSanity}%` }}
            />
          </div>

          {}
          <div className="mt-2 text-center text-xs text-zinc-500">
            {currentSanity >= 80 ? t('sanityStatusStable') :
             currentSanity >= 60 ? t('sanityStatusSlightUnease') :
             currentSanity >= 40 ? t('sanityStatusGrowingFear') :
             currentSanity >= 20 ? t('sanityStatusOnTheEdge') :
             currentSanity > 0 ? t('sanityStatusAbyssOfMadness') :
             t('sanityStatusTotalMadness')}
          </div>
        </div>

        {}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 text-center">
          <div className="text-zinc-500 text-sm mb-2">{t('rollResult1d100')}</div>
          <div
            className={`text-6xl font-bold font-mono transition-all duration-200 ${
              isRolling
                ? 'text-zinc-400 animate-pulse scale-110'
                : status === 'success'
                ? 'text-green-500'
                : status === 'failure'
                ? 'text-red-500 animate-shake'
                : 'text-zinc-600'
            }`}
          >
            {rollResult !== null ? String(rollResult).padStart(2, '0') : '—'}
          </div>

          {}
          {!isRolling && rollResult !== null && (
            <div className="mt-2 text-xs text-zinc-500">
              {t('thresholdPrefix')} {currentSanity + (status === 'failure' ? (sanityLoss || 0) : 0)}
            </div>
          )}

          {}
          {status !== 'idle' && !isRolling && (
            <div
              className={`mt-4 flex items-center justify-center gap-2 text-sm ${
                status === 'success' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {status === 'success' ? (
                <>
                  <CheckCircle size={18} />
                  <span>{t('successMessage')}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} />
                  <span>{t('failureMessage', { sanityLoss: sanityLoss || 0 })}</span>
                </>
              )}
            </div>
          )}
        </div>

        {}
        <button
          onClick={rollSanityCheck}
          disabled={isRolling || currentSanity === 0}
          className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
            isRolling || currentSanity === 0
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <Dices className={isRolling ? 'animate-spin' : ''} size={20} />
          {currentSanity === 0 
            ? t('buttonSanityZero') 
            : isRolling 
            ? t('buttonRolling') 
            : t('buttonRollSanity')}
        </button>

        {}
        <button
          onClick={resetTest}
          className="w-full mt-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-1 transition-colors"
        >
          <RotateCcw size={14} />
          {t('resetButton')}
        </button>

        {}
        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-500">
          <h3 className="font-semibold text-zinc-400 mb-2">{t('howItWorksTitle')}</h3>
          <ul className="space-y-1">
            <li>• {t('howItWorksRoll1d100')}</li>
            <li>• {t('howItWorksSuccessCondition')}</li>
            <li>• {t('howItWorksFailureCondition')}</li>
          </ul>
        </div>
      </div>

      {}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}