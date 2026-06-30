import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Usuwa znaki markdown (**) z tekstu wiadomości
 * Zamienia również inne podstawowe elementy markdown na czytelny tekst
 * Usuwa artefakty techniczne: orphan braces, JSON fragments, markdown blocks
 */
export function cleanMarkdown(text: string): string {
  if (!text) return text;

  // === NOWE: Usuń wewnętrzne tagi promptu ===
  // Te tagi są częścią komunikacji z AI i NIE powinny być widoczne dla użytkownika
  let cleaned = text
    // Usuń sekcje AKTUALNA WIADOMOŚĆ z całą treścią do końca linii
    .replace(/AKTUALNA WIADOMOŚĆ:?\s*[^\n]*/gi, '')
    // Usuń sekcję ODPOWIEDŹ: (może być na początku odpowiedzi AI)
    .replace(/^ODPOWIEDŹ:?\s*/gim, '')
    .replace(/\nODPOWIEDŹ:?\s*/gi, '\n')
    // Usuń sekcję HISTORIA: (nie powinna być widoczna)
    .replace(/HISTORIA:\s*/gi, '')
    // Usuń prefiksy gracza G: lub Gracz: - WSZĘDZIE w tekście, nie tylko na początku linii
    // Np. "tekst G: - dialog" -> "tekst - dialog"
    .replace(/\bG:\s*-?\s*/gi, '')
    .replace(/\bGracz:\s*-?\s*/gi, '')
    // Usuń też format "G: - tekst" na początku linii (z myślnikiem dialogowym)
    .replace(/^-\s*G:\s*/gim, '- ')
    .trim();

  // Usuń prefiksy AI z początku tekstu (MG: Assistant:, GM:, itp.)
  cleaned = cleaned
    .replace(/^(MG|GM|AI|Assistant|Mistrz Gry|Game Master):\s*(Assistant:\s*)?/gi, '')
    .replace(/^(Assistant:\s*)?/i, '')
    .trim();

  // Usuń tagi ilustracji/obrazów - NIE powinny być widoczne w chacie
  // Pattern dla tagów: [ILUSTRACJA: opis], [OBRAZ: opis], [IMAGE: opis], etc.
  cleaned = cleaned.replace(/\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT):\s*[^\]]*\]/gi, '');

  // Usuń ukryte instrukcje MG w nawiasach klamrowych (ze specjalnymi prefiksami)
  cleaned = cleaned.replace(/\{(?:INSTRUKCJA|GM|META|UKRYTE|HIDDEN|SFX|DŹWIĘK|DZWIEK):[^}]*\}/gi, '');

  // === NAPRAWIONE: Wyciągnij treść z nawiasów klamrowych {tekst} ===
  // AI używa {} do narracji - treść powinna być WIDOCZNA (bez samych nawiasów)
  // Np. "{Witaj, Aleksandrze!}" -> "Witaj, Aleksandrze!"
  cleaned = cleaned.replace(/\{([^}]*)\}/g, '$1');

  // Usuń podwójne gwiazdki (pogrubienie)
  cleaned = cleaned.replace(/\*\*/g, '');

  // Opcjonalnie: zamień *tekst* na zwykły tekst (kursywa -> zwykły)
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');

  // === NOWE: Usuwanie artefaktów technicznych ===

  // Usuń bloki kodu markdown z zawartością JSON-ową
  cleaned = cleaned.replace(/```(?:json|javascript|typescript)?\s*[\s\S]*?```/gi, '');

  // Usuń orphan opening braces na początku linii (bez zamknięcia w tej samej linii)
  cleaned = cleaned.replace(/^\s*\{\s*$/gm, '');

  // Usuń orphan closing braces na początku linii
  cleaned = cleaned.replace(/^\s*\}\s*$/gm, '');

  // Usuń pozostałości po formatowaniu JSON (np. [{, }], pojedyncze { lub })
  cleaned = cleaned.replace(/^\s*\[\{[\s\S]*?\}\]\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*\{[\s\S]{0,20}\s*$/gm, ''); // Short orphan braces

  // Usuń linie zawierające tylko klucze JSON (np. "key": )
  cleaned = cleaned.replace(/^\s*"[^"]+"\s*:\s*$/gm, '');

  // Usuń orphan quotation marks i nawiasy
  cleaned = cleaned.replace(/^\s*["\[\]{}]\s*$/gm, '');

  // Usuń nadmiarowe białe znaki (wielokrotne spacje, puste linie)
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 puste linie
  cleaned = cleaned.replace(/  +/g, ' ');

  return cleaned.trim();
}
