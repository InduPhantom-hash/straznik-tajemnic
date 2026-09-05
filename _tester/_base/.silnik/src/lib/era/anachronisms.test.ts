import { detectAnachronism } from './anachronisms';

describe('detectAnachronism', () => {
  it('wykrywa smartfona w 1924 roku', () => {
    const res = detectAnachronism('Wyciągam smartfon i dzwonię do kolegi', 1924, 'US', 'pl');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.term).toBe('smartfon');
    expect(res?.alternative).toContain('telefon');
  });

  it('wykrywa numer 911 w 1920 roku', () => {
    const res = detectAnachronism('Dzwonię pod 911 po pomoc', 1920, 'US', 'pl');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.alternative).toContain('telefonistk');
  });

  it('nie zgłasza błędu dla telefonu w 1924 roku', () => {
    const res = detectAnachronism('Podnoszę słuchawkę telefonu na biurku', 1924, 'US', 'pl');
    expect(res).toBeNull();
  });

  it('wykrywa prywatnego detektywa w PRL (Polska 1973)', () => {
    const res = detectAnachronism('Wynajmuję prywatnego detektywa w Warszawie', 1973, 'PL', 'pl');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.alternative).toContain('Milicj');
  });

  it('nie blokuje prywatnego detektywa w USA w 1973 roku', () => {
    const res = detectAnachronism('Hire a private detective in New York', 1973, 'US', 'en');
    expect(res).toBeNull();
  });

  it('wykrywa samochód w 1895 roku (Gaslight)', () => {
    const res = detectAnachronism('Wsiadam do samochodu i uciekam', 1895, 'GB', 'pl');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.alternative).toContain('dorożka');
  });

  it('wykrywa test DNA w 1944 roku', () => {
    const res = detectAnachronism('Żądam natychmiastowego badania DNA tej plamy krwi', 1944, 'US', 'pl');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.alternative).toContain('krwi');
  });

  it('pozwala na smartfony i internet we współczesności (2024)', () => {
    const res = detectAnachronism('Szukam w internecie na smartfonie przez wifi', 2024, 'US', 'pl');
    expect(res).toBeNull();
  });

  it('zwraca wersję angielską przy locale en', () => {
    const res = detectAnachronism('I check my smartphone for clues', 1924, 'US', 'en');
    expect(res).not.toBeNull();
    expect(res?.detected).toBe(true);
    expect(res?.reason).toContain('Smartphones');
  });
});
