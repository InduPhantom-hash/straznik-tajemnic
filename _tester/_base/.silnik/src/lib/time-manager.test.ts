import { timeManager } from './time-manager';

describe('timeManager weather state', () => {
  beforeEach(() => {
    timeManager.setWeather('Lekka mgła, rześkie powietrze');
  });

  test('should return default weather state', () => {
    expect(timeManager.getWeather()).toBe('Lekka mgła, rześkie powietrze');
  });

  test('should update weather state via setWeather', () => {
    timeManager.setWeather('Gęsta ulewa i pioruny');
    expect(timeManager.getWeather()).toBe('Gęsta ulewa i pioruny');
  });

  test('should trim whitespace when setting weather', () => {
    timeManager.setWeather('   Gęsta mgła nad Arkham   ');
    expect(timeManager.getWeather()).toBe('Gęsta mgła nad Arkham');
  });

  test('should ignore empty weather strings', () => {
    timeManager.setWeather('Początkowa pogoda');
    timeManager.setWeather('   ');
    expect(timeManager.getWeather()).toBe('Początkowa pogoda');
  });
});

describe('timeManager.resetForAdventure - dynamic start dates and weather', () => {
  test('ustawia dokładną datę i pogodę, gdy przygoda ma zdefiniowane startDate i initialWeather', () => {
    const adventure = {
      id: 'cien-nad-prabutami',
      title: 'Cień nad Prabutami',
      era: 'prl' as const,
      yearRange: '1973-1974',
      startDate: {
        year: 1973,
        month: 9, // Październik (0-indexed)
        day: 18,
        hour: 19,
        minute: 30,
      },
      initialWeather: 'Zimna mżawka i gęsty smog nad Elblągiem',
    };

    timeManager.resetForAdventure(adventure);
    const time = timeManager.getTime();

    expect(time.year).toBe(1973);
    expect(time.month).toBe(9); // Październik
    expect(time.day).toBe(18);
    expect(time.hour).toBe(19);
    expect(time.minute).toBe(30);
    expect(timeManager.getWeather()).toBe('Zimna mżawka i gęsty smog nad Elblągiem');
  });

  test('parsuje startDate w formacie stringa ISO lub daty tekstowej', () => {
    const adventure = {
      id: 'tajemnica-pendnika-lagiewki',
      title: 'Tajemnica Pędnika',
      era: 'custom' as const,
      yearRange: '1995-1999',
      startDate: '1996-05-12T14:15',
      initialWeather: 'Ciepłe majowe popołudnie, bezwietrznie',
    };

    timeManager.resetForAdventure(adventure);
    const time = timeManager.getTime();

    expect(time.year).toBe(1996);
    expect(time.month).toBe(4); // Maj (0-indexed)
    expect(time.day).toBe(12);
    expect(time.hour).toBe(14);
    expect(time.minute).toBe(15);
    expect(timeManager.getWeather()).toBe('Ciepłe majowe popołudnie, bezwietrznie');
  });

  test('wykrywa porę roku/miesiąc z opisu/haczyka i dobiera nastrojową datę oraz pogodę zamiast 14 stycznia', () => {
    const adventure = {
      id: 'jesienny-rytual',
      title: 'Jesienny Rytuał',
      era: 'classic' as const,
      yearRange: '1925',
      hook: 'Późną jesienią 1925 roku w lasach Arkham zaczynają znikać wędrowcy...',
      description: 'Listopadowe mgły otulają dolinę Miskatonic.',
      tone: 'noir' as const,
    };

    timeManager.resetForAdventure(adventure);
    const time = timeManager.getTime();

    expect(time.year).toBe(1925);
    // Wykryto listopad lub jesień - nie może być styczeń (0) ani dzień 14
    expect(time.month).toBe(10); // Listopad (0-indexed)
    expect(time.hour).toBe(19); // Ton noir -> zmierzch (19:00)
    expect(timeManager.getWeather()).toMatch(/mgł|deszcz|chłód|wilgoć/i);
  });

  test('dla tonu noir/purist bez podanej godziny ustawia zmierzch (19:00), a dla pulp poranek (09:30)', () => {
    const pulpAdventure = {
      id: 'pulp-ekspedycja',
      title: 'Pulp Ekspedycja',
      era: 'classic' as const,
      yearRange: '1930',
      tone: 'pulp' as const,
    };

    timeManager.resetForAdventure(pulpAdventure);
    const timePulp = timeManager.getTime();
    expect(timePulp.hour).toBe(9);
    expect(timePulp.minute).toBe(30);

    const noirAdventure = {
      id: 'noir-sprawa',
      title: 'Noir Sprawa',
      era: 'noir' as const,
      yearRange: '1946',
      tone: 'noir' as const,
    };

    timeManager.resetForAdventure(noirAdventure);
    const timeNoir = timeManager.getTime();
    expect(timeNoir.hour).toBe(19);
    expect(timeNoir.minute).toBe(0);
  });
});

