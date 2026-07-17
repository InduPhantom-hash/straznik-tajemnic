'use client';

import { useState, useEffect } from 'react';
import { timeManager } from '@/lib/time-manager';
import { GameTime, MoonPhase } from '@/lib/types';
import { Moon, Sun, Clock, Calendar, Cloud, CloudRain, Snowflake } from 'lucide-react';

// ============================================================================
// MOON PHASE ICONS
// ============================================================================

const MOON_PHASE_EMOJI: Record<MoonPhase, string> = {
  new: '🌑',
  waxing_crescent: '🌒',
  first_quarter: '🌓',
  waxing_gibbous: '🌔',
  full: '🌕',
  waning_gibbous: '🌖',
  last_quarter: '🌗',
  waning_crescent: '🌘',
};

const MOON_PHASE_NAMES: Record<MoonPhase, string> = {
  new: 'Nów',
  waxing_crescent: 'Rosnący Sierp',
  first_quarter: 'Pierwsza Kwadra',
  waxing_gibbous: 'Rosnący Garbaty',
  full: 'Pełnia',
  waning_gibbous: 'Malejący Garbaty',
  last_quarter: 'Ostatnia Kwadra',
  waning_crescent: 'Malejący Sierp',
};

// ============================================================================
// COMPONENT
// ============================================================================

interface CampaignClockProps {
  className?: string;
  compact?: boolean;
  weatherInfo?: string;
}

export function CampaignClock({
  className = '',
  compact = false,
  weatherInfo = '',
}: CampaignClockProps) {
  const [time, setTime] = useState<GameTime>(timeManager.getTime());
  const [moonPhase, setMoonPhase] = useState<MoonPhase>(
    timeManager.getMoonPhase()
  );
  const [isNight, setIsNight] = useState<boolean>(timeManager.isNight());
  const [dayOfWeek, setDayOfWeek] = useState<string>(
    timeManager.getDayOfWeek()
  );

  useEffect(() => {
    // Subskrybuj zmiany czasu
    const unsubscribe = timeManager.subscribe((newTime) => {
      setTime(newTime);
      setMoonPhase(timeManager.getMoonPhase());
      setIsNight(timeManager.isNight());
      setDayOfWeek(timeManager.getDayOfWeek());
    });

    return unsubscribe;
  }, []);

  // Formatowanie
  const formattedDate = timeManager.formatDate();
  const formattedTime = timeManager.formatTime();

  if (compact) {
    let weatherIcon = <Cloud className="w-3.5 h-3.5 text-zinc-400" />;
    let weatherLabel = '';

    if (weatherInfo) {
      const tempMatch = weatherInfo.match(/(-?\d+°C)/);
      const stateMatch = weatherInfo.match(/stan:\s*([^,(]+)/);
      
      const temp = tempMatch ? tempMatch[1] : '';
      const state = stateMatch ? stateMatch[1].trim() : '';
      
      if (temp || state) {
        weatherLabel = [temp, state].filter(Boolean).join(' · ');
      } else {
        weatherLabel = weatherInfo.replace(/\(dane historyczne dla dnia.*?\)/i, '').trim();
      }

      const lowerState = state.toLowerCase();
      if (lowerState.includes('deszcz') || lowerState.includes('opad') || lowerState.includes('deszczowo')) {
        weatherIcon = <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      } else if (lowerState.includes('śnieg') || lowerState.includes('mróz') || lowerState.includes('zimn')) {
        weatherIcon = <Snowflake className="w-3.5 h-3.5 text-sky-300" />;
      } else if (lowerState.includes('ciepł') || lowerState.includes('sucho') || lowerState.includes('słon')) {
        weatherIcon = <Sun className="w-3.5 h-3.5 text-amber-400" />;
      } else {
        weatherIcon = <Cloud className="w-3.5 h-3.5 text-emerald-400/80" />;
      }
    }

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Czas */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 backdrop-blur-md border border-emerald-900/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Clock className="w-3.5 h-3.5 text-emerald-500/80" />
          <span className="text-sm font-mono font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
            {formattedTime}
          </span>
        </div>

        {/* Data */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 backdrop-blur-md border border-emerald-900/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-300 tracking-tight uppercase">
            {formattedDate}
          </span>
        </div>

        {/* Pogoda */}
        {weatherLabel && (
          <div className="flex items-center gap-1.5 bg-zinc-950/60 backdrop-blur-md border border-emerald-900/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            {weatherIcon}
            <span className="text-xs text-zinc-300 tracking-tight font-special-elite whitespace-nowrap">
              {weatherLabel}
            </span>
          </div>
        )}

        {/* Księżyc z nazwą fazy */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 backdrop-blur-md border border-emerald-900/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <span
            className="text-lg filter drop-shadow-[0_0_3px_rgba(255,255,255,0.3)] cursor-help"
            title={MOON_PHASE_NAMES[moonPhase]}
          >
            {MOON_PHASE_EMOJI[moonPhase]}
          </span>
          <span className="text-xs text-zinc-400 font-medium font-special-elite whitespace-nowrap">
            {MOON_PHASE_NAMES[moonPhase]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-zinc-950/80 backdrop-blur-xl border border-emerald-900/40 rounded-xl p-5 shadow-2xl relative overflow-hidden group ${className}`}
    >
      {/* Subtle emerald glow in background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-[14px] font-bold text-emerald-500/60 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          Chronometr Kampanii
        </h3>
        {isNight ? (
          <div className="flex items-center gap-1.5 text-blue-400/80">
            <Moon className="w-4 h-4" />
            <span className="text-[14px] font-medium uppercase tracking-wider">
              Noc
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400/80">
            <Sun className="w-4 h-4" />
            <span className="text-[14px] font-medium uppercase tracking-wider">
              Dzień
            </span>
          </div>
        )}
      </div>

      {/* Main Time Display */}
      <div className="text-center mb-5 relative z-10">
        <div className="text-4xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
          {formattedTime}
        </div>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-[0.15em] mt-1 border-t border-zinc-800/50 pt-1 mx-8">
          {dayOfWeek}
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center justify-center gap-2 text-zinc-200 bg-zinc-900/50 rounded-lg py-2 mb-4 border border-zinc-800/50 relative z-10">
        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-sm font-medium tracking-wide">
          {formattedDate}
        </span>
      </div>

      {/* Pogoda */}
      {weatherInfo && (
        <div className="flex items-center justify-center gap-2 text-zinc-300 bg-zinc-900/30 rounded-lg py-2 mb-4 border border-zinc-800/30 relative z-10 px-3 text-center">
          <Cloud className="w-4 h-4 text-emerald-500/80 shrink-0" />
          <span className="text-xs font-special-elite font-medium leading-tight">
            {weatherInfo}
          </span>
        </div>
      )}

      {/* Moon Phase & Stats Footer */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-zinc-900/30 rounded-lg p-2 border border-zinc-800/30 flex items-center gap-2 transition-colors group-hover:border-emerald-900/20">
          <span className="text-xl">{MOON_PHASE_EMOJI[moonPhase]}</span>
          <div className="flex flex-col">
            <span className="text-[13px] uppercase text-zinc-500 font-bold">
              Księżyc
            </span>
            <span className="text-[14px] text-zinc-300 font-medium whitespace-nowrap">
              {MOON_PHASE_NAMES[moonPhase]}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/30 rounded-lg p-2 border border-zinc-800/30 flex items-center gap-2 transition-colors group-hover:border-emerald-900/20">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-800 flex items-center justify-center overflow-hidden">
            <div
              className={`w-full transition-all duration-700 ${isNight ? 'bg-blue-600' : 'bg-emerald-500'}`}
              style={{
                height: `${((time.hour * 60 + time.minute) / 1440) * 100}%`,
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] uppercase text-zinc-500 font-bold">
              Doba
            </span>
            <span className="text-[14px] text-zinc-300 font-medium">
              {Math.round(((time.hour * 60 + time.minute) / 1440) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignClock;
