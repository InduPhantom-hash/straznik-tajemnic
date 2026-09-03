import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  CloudFog,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  Wind,
  Cloud,
  Sun,
} from 'lucide-react';
import { CampaignClock, getWeatherIcon } from './campaign-clock';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      defaultWeather: 'Lekka mgła, rześkie powietrze',
      weather: 'Pogoda',
      moonLabel: 'Księżyc',
      title: 'Chronometr Kampanii',
      day: 'Dzień',
      night: 'Noc',
      dayLabel: 'Doba',
      'months.0': 'Styczeń',
      'moon.waxing_crescent': 'Rosnący Sierp',
      'days.0': 'Niedziela',
    };
    return translations[key] || key;
  },
}));

describe('getWeatherIcon (Lucide Weather Pictograms)', () => {
  it('maps fog, mist and haze in PL and EN to CloudFog', () => {
    expect(getWeatherIcon('Lekka mgła, rześkie powietrze')).toBe(CloudFog);
    expect(getWeatherIcon('Gęsta mgła nad Arkham')).toBe(CloudFog);
    expect(getWeatherIcon('Light fog, crisp air')).toBe(CloudFog);
    expect(getWeatherIcon('Thick mist rolling from the sea')).toBe(CloudFog);
    expect(getWeatherIcon('Eerie haze')).toBe(CloudFog);
  });

  it('maps rain and downpour in PL and EN to CloudRain', () => {
    expect(getWeatherIcon('Ulewny deszcz')).toBe(CloudRain);
    expect(getWeatherIcon('Rzęsisty opad')).toBe(CloudRain);
    expect(getWeatherIcon('Heavy downpour')).toBe(CloudRain);
    expect(getWeatherIcon('Cold rain splashing on cobblestones')).toBe(CloudRain);
    expect(getWeatherIcon('Pouring rain')).toBe(CloudRain);
  });

  it('maps drizzle in PL and EN to CloudDrizzle', () => {
    expect(getWeatherIcon('Lekka mżawka')).toBe(CloudDrizzle);
    expect(getWeatherIcon('Kapuśniaczek o świcie')).toBe(CloudDrizzle);
    expect(getWeatherIcon('Fine drizzle')).toBe(CloudDrizzle);
    expect(getWeatherIcon('Light sprinkle')).toBe(CloudDrizzle);
  });

  it('maps storms, thunder and lightning in PL and EN to CloudLightning', () => {
    expect(getWeatherIcon('Burza z piorunami')).toBe(CloudLightning);
    expect(getWeatherIcon('Gwałtowna nawałnica')).toBe(CloudLightning);
    expect(getWeatherIcon('Severe thunderstorm')).toBe(CloudLightning);
    expect(getWeatherIcon('Lightning flashing across the sky')).toBe(CloudLightning);
  });

  it('maps snow, frost and blizzard in PL and EN to Snowflake', () => {
    expect(getWeatherIcon('Gęsty śnieg')).toBe(Snowflake);
    expect(getWeatherIcon('Przeszywający mróz i szron')).toBe(Snowflake);
    expect(getWeatherIcon('Zimowa zamieć')).toBe(Snowflake);
    expect(getWeatherIcon('Freezing blizzard and snow')).toBe(Snowflake);
    expect(getWeatherIcon('Heavy snowfall and frost')).toBe(Snowflake);
  });

  it('maps sunny and clear conditions in PL and EN to Sun', () => {
    expect(getWeatherIcon('Słonecznie i ciepło')).toBe(Sun);
    expect(getWeatherIcon('Bezchmurne niebo')).toBe(Sun);
    expect(getWeatherIcon('Bright sunny morning')).toBe(Sun);
    expect(getWeatherIcon('Clear sky')).toBe(Sun);
  });

  it('maps partly cloudy conditions to CloudSun', () => {
    expect(getWeatherIcon('Częściowo słonecznie')).toBe(CloudSun);
    expect(getWeatherIcon('Partly cloudy with sunny breaks')).toBe(CloudSun);
    expect(getWeatherIcon('Przejaśnienia po deszczu')).toBe(CloudSun);
  });

  it('maps overcast and cloudy conditions to Cloud', () => {
    expect(getWeatherIcon('Pochmurny, ponury dzień')).toBe(Cloud);
    expect(getWeatherIcon('Ciężkie ołowiane chmury')).toBe(Cloud);
    expect(getWeatherIcon('Overcast sky')).toBe(Cloud);
    expect(getWeatherIcon('Gloomy dark clouds')).toBe(Cloud);
  });

  it('maps wind and gale conditions to Wind', () => {
    expect(getWeatherIcon('Porywisty wiatr')).toBe(Wind);
    expect(getWeatherIcon('Wichura nad zatoką')).toBe(Wind);
    expect(getWeatherIcon('Strong wind and gale')).toBe(Wind);
  });

  it('falls back to atmospheric CloudFog for unknown or empty input', () => {
    expect(getWeatherIcon('')).toBe(CloudFog);
    expect(getWeatherIcon('Niezdefiniowane warunki')).toBe(CloudFog);
  });
});

describe('CampaignClock Component', () => {
  it('renders compact weather icon and description', () => {
    render(<CampaignClock compact />);

    const weatherIcon = screen.getByTestId('weather-icon');
    expect(weatherIcon).toBeInTheDocument();
    expect(weatherIcon).toHaveClass('w-3.5', 'h-3.5');

    expect(screen.getByText('Lekka mgła, rześkie powietrze')).toBeInTheDocument();
  });
});
