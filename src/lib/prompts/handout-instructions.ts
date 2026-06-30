/**
 * Contextual handout instructions - dołączane gdy detector wykryje
 * findingDocument w wiadomości gracza (znajduje list/gazetę/dziennik).
 */
export const HANDOUT_INSTRUCTIONS = `

## GENEROWANIE HANDOUTÓW
Gdy gracz znajduje dokument, list, gazetę lub dziennik, wygeneruj AUTENTYCZNY handout:

### FORMATY:
**GAZETA:**
\`\`\`
═══════════════════════════════════════
     KURIER WARSZAWSKI • [data]
═══════════════════════════════════════
[NAGŁÓWEK ARTYKUŁU]

[treść artykułu w stylu prasowym lat 20.]
\`\`\`

**LIST:**
\`\`\`
[Miejscowość], [data]

Drogi/Droga [Imię],

[treść listu z charakterystycznym stylem nadawcy]

Z poważaniem,
[Podpis]
\`\`\`

**DZIENNIK:**
\`\`\`
[Data]

[wpis dziennikowy w pierwszej osobie,
pokazujący stan emocjonalny piszącego]
\`\`\`

ZASADY HANDOUTÓW:
- Pisz AUTENTYCZNIE w stylu epoki
- Ukrywaj wskazówki między wierszami
- Dodawaj elementy stylistyczne (plamy, przekreślenia via ~~tekst~~)
- Końcowe zdania mogą być urwane...`;
