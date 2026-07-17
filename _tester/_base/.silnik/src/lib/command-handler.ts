import { Character, getSkillValue } from './types';
import { loadAISettings } from './ai-settings';

/**
 * Wyciąga komendę z wiadomości w formacie [komenda]
 * @param message - Wiadomość użytkownika
 * @returns Nazwa komendy bez nawiasów lub null jeśli nie znaleziono
 */
export function extractCommand(message: string): string | null {
  const match = message.match(/\[([^\]]+)\]/);
  return match ? match[1].toLowerCase().trim() : null;
}

/**
 * Sprawdza czy wiadomość zawiera komendę w nawiasach kwadratowych
 * @param message - Wiadomość użytkownika
 * @returns true jeśli wiadomość zawiera komendę
 */
export function isCommandMessage(message: string): boolean {
  return /\[[^\]]+\]/.test(message);
}

/**
 * Sprawdza czy odpowiedź jest odpowiedzią na komendę (nie powinna być czytana przez TTS)
 * @param response - Odpowiedź od AI
 * @param previousMessage - Poprzednia wiadomość użytkownika
 * @returns true jeśli odpowiedź jest na komendę
 */
export function isCommandResponse(response: string, previousMessage?: string): boolean {
  if (!previousMessage) return false;

  const command = extractCommand(previousMessage);
  if (!command) return false;

  // Sprawdź czy odpowiedź zawiera charakterystyczne elementy odpowiedzi na komendy
  // (np. statystyki postaci, listy przedmiotów, itp.)
  const isCardResponse = /PŻ:\s*\d+|PR:\s*\d+|PM:\s*\d+/i.test(response);
  const isEquipmentResponse = /ekwipunek|przedmiot|inwentarz/i.test(response);

  return isCardResponse || isEquipmentResponse || isCommandMessage(previousMessage);
}

/**
 * Formatuje ekwipunek postaci jako czytelną listę
 * @param character - Postać z ekwipunkiem
 * @returns Sformatowany tekst z ekwipunkiem lub informacja o pustym ekwipunku
 */
export function formatEquipment(character: Character | null): string {
  // Ekwipunek - USUNIĘTY (do reimplementacji)
  if (!character) {
    return 'Nie masz aktywnej postaci.';
  }
  return `**${character.name}** - Moduł ekwipunku jest w trakcie przebudowy i będzie dostępny wkrótce.`;
}

/**
 * Formatuje kartę postaci jako czytelny tekst
 * @param character - Postać
 * @returns Sformatowany tekst z kartą postaci
 */
export function formatCharacterCard(character: Character | null): string {
  if (!character) {
    return 'Nie masz aktywnej postaci. Stwórz postać lub wybierz aktywną, aby zobaczyć kartę.';
  }

  let cardText = `**Karta postaci: ${character.name}**\n\n`;
  cardText += `**Zawód:** ${character.occupation}\n`;
  cardText += `**Wiek:** ${character.age}\n\n`;

  cardText += `**Statystyki:**\n`;
  cardText += `PŻ: ${character.hp}\n`;
  cardText += `PR: ${character.san}\n`;
  cardText += `PM: ${character.mp}\n\n`;

  if (Object.keys(character.skills).length > 0) {
    cardText += `**Główne umiejętności:**\n`;
    const sortedSkills = Object.entries(character.skills)
      .sort(([, a], [, b]) => getSkillValue(b) - getSkillValue(a))
      .slice(0, 10);

    sortedSkills.forEach(([skill, skillValue]) => {
      const value = getSkillValue(skillValue);
      cardText += `${skill}: ${value}%\n`;
    });
  }

  return cardText;
}

/**
 * Obsługuje komendę i zwraca odpowiedź
 * @param command - Nazwa komendy (bez nawiasów)
 * @param character - Aktywna postać
 * @returns Odpowiedź na komendę lub null jeśli komenda nie jest obsługiwana
 */
export function handleCommand(command: string, character: Character | null): string | null {
  const normalizedCommand = command.toLowerCase().trim();

  // === KOMENDA [obraz] - Przekazywana do AI aby przeanalizował kontekst ===
  // Komendy: [obraz], [ilustracja], [grafika], [image], [picture]
  // Te komendy NIE są obsługiwane lokalnie - są przekazywane do AI
  // AI przeanalizuje kontekst rozmowy i wygeneruje odpowiedni obraz
  if (/^(obraz|ilustracja|grafika|image|picture|show)$/i.test(normalizedCommand)) {
    return null; // Przekaż do AI - AI wygeneruje [ILUSTRACJA: opis] na podstawie kontekstu
  }

  switch (normalizedCommand) {
    case 'ekwipunek':
    case 'equipment':
    case 'inventory':
      return formatEquipment(character);

    case 'karta':
    case 'card':
    case 'postać':
      return formatCharacterCard(character);

    default:
      // Sprawdź czy to niestandardowa komenda z ustawień
      const settings = loadAISettings();
      const customCommand = settings.customCommands?.find(
        cmd => cmd.command.toLowerCase() === normalizedCommand
      );

      if (customCommand) {
        // Niestandardowe komendy są obsługiwane przez AI (zwracamy null)
        // ale oznaczamy że to komenda
        return null;
      }

      return null;
  }
}


/**
 * Pobiera listę wszystkich dostępnych komend (wbudowane + niestandardowe)
 * @returns Lista komend z opisami
 */
export function getAvailableCommands(): Array<{ command: string; description: string }> {
  const settings = loadAISettings();
  const commands: Array<{ command: string; description: string }> = [];

  // Domyślne komendy
  commands.push(
    { command: 'karta', description: 'Wyświetla aktualną kartę postaci (PŻ, PR, PM, główne umiejętności)' },
    { command: 'ekwipunek', description: 'Wyświetla listę przedmiotów w ekwipunku postaci' }
  );

  // Niestandardowe komendy z ustawień
  if (settings.customCommands) {
    settings.customCommands.forEach(cmd => {
      // Unikaj duplikatów
      if (!commands.find(c => c.command.toLowerCase() === cmd.command.toLowerCase())) {
        commands.push({
          command: cmd.command,
          description: cmd.description
        });
      }
    });
  }

  return commands;
}

