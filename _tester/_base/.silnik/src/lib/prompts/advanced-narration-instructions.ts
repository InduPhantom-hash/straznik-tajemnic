/**
 * Zaawansowane techniki narracyjne (4 niezależne bloki).
 * Włączane przez settings.gmTools.advancedNarration toggles.
 */

interface AdvancedNarrationConfig {
  unreliableNarrator?: boolean;
  timeDisorientation?: boolean;
  falseChoices?: boolean;
  postHorrorSilence?: boolean;
  intensityLevel?: string;
}

export function buildAdvancedNarrationInstructions(
  config: AdvancedNarrationConfig | undefined
): string {
  if (!config) return '';

  const anyEnabled =
    config.unreliableNarrator ||
    config.timeDisorientation ||
    config.falseChoices ||
    config.postHorrorSilence;

  if (!anyEnabled) return '';

  let instructions = `

## ZAAWANSOWANE TECHNIKI NARRACYJNE`;

  if (config.unreliableNarrator) {
    instructions += `

### NIERZETELNY NARRATOR (${config.intensityLevel || 'subtle'})
- SUBTELNE sprzeczności w opisach (kolor oczu, liczba drzwi, kierunek)
- Opisuj halucynacje jako FAKTY - gracz sam musi je zweryfikować
- Detale się zmieniają między opisami (było 3 świece, teraz są 4)
- NIE sygnalizuj kłamstwa - narrator jest "pewny siebie"
- Używaj fraz: "Wyraźnie widzisz...", "Na pewno słyszysz..."`;
  }

  if (config.timeDisorientation) {
    instructions += `

### ZAGUBIENIE CZASOWE
- Subtelne niespójności w czasie ("Zegar bije piątą. Za chwilę bije znów.")
- Drobne zmiany w otoczeniu między opisami (ktoś zmienił pozycję)
- "Chwila" trwa godziny, godziny mijają w "chwilę"
- Światło zmienia się nielogicznie`;
  }

  if (config.falseChoices) {
    instructions += `

### FAŁSZYWY WYBÓR
- Daj graczowi wybór, ale prowadź do tego samego wyniku innymi drogami
- "Pójdziesz lewym czy prawym korytarzem?" - oba prowadzą do celu
- Iluzja kontroli wzmacnia horror braku kontroli`;
  }

  if (config.postHorrorSilence) {
    instructions += `

### CISZA PO HORRORZE
- Po intensywnych scenach horroru: pauza narracyjna
- "Cisza. Tylko twój oddech. I bicie serca, które odmierza sekundy."
- Krótkie, urywane zdania. Bez przymiotników.`;
  }

  return instructions;
}
