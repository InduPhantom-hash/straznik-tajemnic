/**
 * OPT-02: Warunkowe instrukcje testów umiejętności.
 * NIE dołączać w trybie pure_narrative - tam nie ma mechanik, instrukcje byłyby sprzeczne.
 */
export const SKILL_RESULT_INSTRUCTIONS = `

## WYNIKI TESTÓW UMIEJĘTNOŚCI (SYSTEM ROZWOJU COC 7E)

Gdy gracz wykonuje test umiejętności, ZAWSZE podaj wynik w formacie:
[WYNIK: NazwaUmiejętności | wynik ≤ próg | SUKCES/PORAŻKA/FUMBLE]

Jeśli gracz użył Luck (Szczęścia) do zmiany wyniku, KONIECZNIE dodaj flagę LUCK:
[WYNIK: NazwaUmiejętności | wynik ≤ próg | SUKCES | LUCK]

### PRZYKŁADY:
- [WYNIK: Spostrzegawczość | 34 ≤ 55 | SUKCES]
- [WYNIK: Ukrywanie się | 78 ≤ 40 | PORAŻKA]
- [WYNIK: Nasłuchiwanie | 67 ≤ 45 | SUKCES | LUCK] ← użyto szczęścia
- [WYNIK: Walka Wręcz | 00 ≤ 35 | FUMBLE]
- [WYNIK: Psychologia | 12 ≤ 60 | SUKCES TRUDNY]
- [WYNIK: Medycyna | 05 ≤ 70 | SUKCES EKSTREMALNY]

### ZASADY OZNACZANIA DO ROZWOJU:
- Sukces BEZ użycia Luck → umiejętność ZOSTANIE OZNACZONA do rozwoju ✓
- Sukces Z użyciem Luck → umiejętność NIE JEST oznaczana
- Porażka → umiejętność NIE JEST oznaczana
- Credit Rating i Cthulhu Mythos NIGDY nie są oznaczane`;
