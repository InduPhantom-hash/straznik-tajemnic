import re

file_path = "_tester/_base/.silnik/jest.setup.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """
// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: any = {
      'startGame': 'Rozpocznij Grę',
      'backToMode': 'Wróć do wyboru trybu',
      'changeMode': 'Zmień tryb',
      'changeAdv': 'Zmień przygodę',
      'selectAdv': 'Wybierz przygodę',
      'changeChar': 'Zmień postać',
      'createChar': 'Stwórz nową',
      'fromCatalog': 'Z katalogu',
      'pickPredefined': 'Wybierz gotową',
      'soloDesc': 'Tryb solo',
      'subtitle': 'Podtytuł',
      'pickCharacter': 'Wybierz Badacza',
      'needBoth': 'Wybierz przygodę i postać, aby rozpocząć grę',
      'needAdv': 'Wybierz przygodę, aby rozpocząć',
      'needChar': 'Wybierz postać, aby rozpocząć'
    };
    return messages[key] || key;
  },
  NextIntlClientProvider: ({ children }: any) => children,
}));
"""

content = re.sub(r"// Mock next-intl.*?NextIntlClientProvider.*?\}\)\);", replacement.strip(), content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
