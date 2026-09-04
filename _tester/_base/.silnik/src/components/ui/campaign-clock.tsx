'use client';

import { useState, useEffect } from 'react';
import { timeManager } from '@/lib/time-manager';
import { GameTime, MoonPhase } from '@/lib/types';
import {
  Moon,
  Sun,
  Clock,
  Calendar,
  CloudFog,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  Wind,
  Cloud,
  LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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

// ============================================================================
// WEATHER ICONS (Lucide weather pictograms, PL + EN)
// ============================================================================

export function getWeatherIcon(text: string): LucideIcon {
  const lower = (text || '').toLowerCase();

  // Burze / Thunderstorm
  if (
    lower.includes('burz') ||
    lower.includes('piorun') ||
    lower.includes('nawałnic') ||
    lower.includes('grzmot') ||
    lower.includes('storm') ||
    lower.includes('thunder') ||
    lower.includes('lightning')
  ) {
    return CloudLightning;
  }

  // Śnieg / Mróz / Zima / Snow / Frost
  if (
    lower.includes('śnieg') ||
    lower.includes('zamieć') ||
    lower.includes('mróz') ||
    lower.includes('szron') ||
    lower.includes('zawieja') ||
    lower.includes('grad') ||
    lower.includes('snow') ||
    lower.includes('blizzard') ||
    lower.includes('frost') ||
    lower.includes('freezing') ||
    lower.includes('sleet') ||
    lower.includes('hail')
  ) {
    return Snowflake;
  }

  // Częściowe zachmurzenie / Przejaśnienia / Partly cloudy
  if (
    lower.includes('częściow') ||
    lower.includes('przejaśn') ||
    lower.includes('partly') ||
    lower.includes('broken clouds') ||
    lower.includes('scattered')
  ) {
    return CloudSun;
  }

  // Ulewa / Deszcz / Rain / Downpour
  if (
    lower.includes('deszcz') ||
    lower.includes('ulew') ||
    lower.includes('oberwanie') ||
    lower.includes('opad') ||
    lower.includes('rain') ||
    lower.includes('downpour') ||
    lower.includes('shower') ||
    lower.includes('pour')
  ) {
    return CloudRain;
  }

  // Mżawka / Drizzle
  if (
    lower.includes('mżawk') ||
    lower.includes('kapuśniaczek') ||
    lower.includes('drizzle') ||
    lower.includes('sprinkle')
  ) {
    return CloudDrizzle;
  }

  // Wiatr / Wichura / Wind / Gale
  if (
    lower.includes('wichur') ||
    lower.includes('wicher') ||
    lower.includes('wietrzn') ||
    lower.includes('wiatr') ||
    lower.includes('wind') ||
    lower.includes('gale') ||
    lower.includes('breeze')
  ) {
    return Wind;
  }

  // Mgła / Zamglenie / Fog / Mist / Haze
  if (
    lower.includes('mgła') ||
    lower.includes('mgieł') ||
    lower.includes('mglist') ||
    lower.includes('zamglen') ||
    lower.includes('opary') ||
    lower.includes('fog') ||
    lower.includes('mist') ||
    lower.includes('haze') ||
    lower.includes('smog')
  ) {
    return CloudFog;
  }

  // Słońce / Bezchmurnie / Jasno / Sun / Clear
  if (
    lower.includes('słońc') ||
    lower.includes('słonecz') ||
    lower.includes('pogodn') ||
    lower.includes('jasn') ||
    lower.includes('upał') ||
    lower.includes('bezchmurn') ||
    lower.includes('sun') ||
    lower.includes('sunny') ||
    lower.includes('clear') ||
    lower.includes('bright')
  ) {
    return Sun;
  }

  // Chmury / Pochmurno / Clouds / Overcast
  if (
    lower.includes('chmur') ||
    lower.includes('mrocz') ||
    lower.includes('ponur') ||
    lower.includes('pochmurn') ||
    lower.includes('zachmurz') ||
    lower.includes('cloud') ||
    lower.includes('overcast') ||
    lower.includes('gloomy')
  ) {
    return Cloud;
  }

  // Domyślna nastrojowa ikona dla klimatu CoC
  return CloudFog;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CampaignClockProps {
  className?: string;
  compact?: boolean;
}

export function CampaignClock({
  className = '',
  compact = false,
}: CampaignClockProps) {
  const t = useTranslations('CampaignClock');
  const [time, setTime] = useState<GameTime>(timeManager.getTime());
  const [weather, setWeather] = useState<string>(timeManager.getWeather());
  const [moonPhase, setMoonPhase] = useState<MoonPhase>(
    timeManager.getMoonPhase()
  );
  const [isNight, setIsNight] = useState<boolean>(timeManager.isNight());
  const [dayOfWeek, setDayOfWeek] = useState<string>(
    timeManager.getDayOfWeek()
  );

  useEffect(() => {
    // Subskrybuj zmiany czasu i pogody
    const unsubscribe = timeManager.subscribe((newTime) => {
      setTime(newTime);
      setWeather(timeManager.getWeather());
      setMoonPhase(timeManager.getMoonPhase());
      setIsNight(timeManager.isNight());
      setDayOfWeek(timeManager.getDayOfWeek());
    });

    return unsubscribe;
  }, []);

  // Formatowanie
  const formattedDate = `${time.day} ${t(`months.${time.month}` as never)} ${time.year}`;
  const formattedTime = timeManager.formatTime();
  const moonName = t(`moon.${moonPhase}`);
  const dayName = t(`days.${new Date(time.year, time.month, time.day).getDay()}` as never);
  const weatherLabel = weather === 'Lekka mgła, rześkie powietrze' ? t('defaultWeather') : weather;
  const WeatherIcon = getWeatherIcon(weatherLabel);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 bg-zinc-950/60 backdrop-blur-md border border-emerald-900/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] ${className}`}
      >
        <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3">
          <Clock className="w-3.5 h-3.5 text-emerald-500/80" />
          <span className="text-sm font-mono font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-300 tracking-tight uppercase">
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-1 pl-3 border-l border-zinc-800 text-xs text-zinc-300">
          <span className="flex items-center gap-1.5 max-w-[140px] truncate" title={`${t('weather')}: ${weatherLabel}`}>
            <WeatherIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" data-testid="weather-icon" />
            <span className="truncate">{weatherLabel}</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span
            className="flex items-center gap-1"
            title={`${t('moonLabel')}: ${moonName}`}
          >
            <span aria-hidden="true">{MOON_PHASE_EMOJI[moonPhase]}</span>
            <span>{moonName}</span>
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
          {t('title')}
        </h3>
        {isNight ? (
          <div className="flex items-center gap-1.5 text-blue-400/80">
            <Moon className="w-4 h-4" />
            <span className="text-[14px] font-medium uppercase tracking-wider">
              {t('night')}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400/80">
            <Sun className="w-4 h-4" />
            <span className="text-[14px] font-medium uppercase tracking-wider">
              {t('day')}
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
          {dayName}
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center justify-center gap-2 text-zinc-200 bg-zinc-900/50 rounded-lg py-2 mb-4 border border-zinc-800/50 relative z-10">
        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-sm font-medium tracking-wide">
          {formattedDate}
        </span>
      </div>

      {/* Moon Phase & Stats Footer */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-zinc-900/30 rounded-lg p-2 border border-zinc-800/30 flex items-center gap-2 transition-colors group-hover:border-emerald-900/20">
          <span className="text-xl">{MOON_PHASE_EMOJI[moonPhase]}</span>
          <div className="flex flex-col">
            <span className="text-[13px] uppercase text-zinc-500 font-bold">
              {t('moonLabel')}
            </span>
            <span className="text-[14px] text-zinc-300 font-medium whitespace-nowrap">
              {moonName}
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
              {t('dayLabel')}
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
