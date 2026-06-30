/**
 * Normalizacja nazw umiejętności CoC 7e + budowanie zbioru rekomendowanych.
 *
 * Problem: umiejętności zawodowe w `OCCUPATIONS` bywają zapisane ze
 * specjalizacją w nawiasie - `Nauka (Biologia)`, `Język Obcy (łacina)`,
 * `Język Obcy (2)` - albo jako wolny wybór `Dowolna`. Klucze w `BASE_SKILLS`
 * NIE mają nawiasów. Bez normalizacji punkty trafiają do "kluczy-widm"
 * (np. `Nauka (Biologia)`), które nie istnieją w `state.skills`, nie
 * renderują się i nie podświetlają.
 *
 * Dlatego highlight (★) i deterministyczny auto-przydział MUSZĄ korzystać
 * z TEGO SAMEGO znormalizowanego zbioru - patrz `buildRecommendedSkills`.
 *
 * BUG #1 (fix/skill-points) - sesja redesign Dark Art Déco.
 */

/**
 * Sprowadza nazwę umiejętności do kanonicznego klucza zgodnego z `BASE_SKILLS`.
 *
 * - `Nauka (Biologia)` → `Nauka`
 * - `Język Obcy (łacina)` → `Język Obcy`
 * - `Język Obcy (2)` → `Język Obcy`
 * - `Sztuka/Rzemiosło (Malarstwo)` → `Sztuka/Rzemiosło`
 * - `Dowolna` → `null` (wolny wybór gracza - nie jest konkretną umiejętnością)
 * - puste / białe znaki → `null`
 *
 * @param raw surowa nazwa umiejętności (może zawierać specjalizację w nawiasie)
 * @returns kanoniczny klucz umiejętności lub `null`, gdy nazwa nie mapuje się
 *   na konkretną umiejętność (np. `Dowolna`).
 */
export function normalizeSkillName(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  // Usuń specjalizację w nawiasie (cyfry, litery, dowolny tekst) + spacje wokół.
  const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();

  if (stripped.length === 0) return null;

  // `Dowolna` = wolny wybór gracza, nie konkretna umiejętność - odrzuć.
  if (stripped.toLowerCase() === 'dowolna') return null;

  return stripped;
}

/**
 * Buduje JEDEN, znormalizowany zbiór umiejętności rekomendowanych dla postaci.
 *
 * Zbiór = umiejętności archetypu ∪ umiejętności zawodowe. Specjalizacje są
 * znormalizowane (`Nauka (Biologia)` → `Nauka`), a `Dowolna` odrzucona.
 * Kolejność zachowuje pierwsze wystąpienie (archetyp przed zawodem), bez
 * duplikatów.
 *
 * To JEDYNE źródło prawdy dla highlight (★) ORAZ deterministycznego
 * auto-przydziału - dzięki temu podświetlenie i przydział nie rozjeżdżają się.
 *
 * @param archetypeSkills lista umiejętności kluczowych archetypu
 * @param occupationalSkills lista umiejętności zawodowych (mogą mieć nawiasy)
 * @returns uporządkowana, znormalizowana lista bez duplikatów
 */
export function buildRecommendedSkills(
  archetypeSkills: readonly string[],
  occupationalSkills: readonly string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of [...archetypeSkills, ...occupationalSkills]) {
    const normalized = normalizeSkillName(raw);
    if (normalized === null) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
