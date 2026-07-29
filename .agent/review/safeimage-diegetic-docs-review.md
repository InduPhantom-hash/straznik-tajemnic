## Plan Review: SafeImage i Dokumenty Diegetyczne
Data: 2026-07-29

### Ocena ogólna
🟡 Żółty — Plan technicznie rozwiązuje problemy, ale łączy zbyt wiele wątków i ma ryzyko zostania Rabbit Hole w warstwie projektowania UI biletów.

### Znalezione problemy

**Krytyczne (blokują implementację w tym kształcie)**:
- **Spec Quality Gate (6/10)**: 
  - *Focus*: Zadanie to "kombajn" - pakiet 3 różnych zmian (Fallback obrazów + Synchronizacja parsera z _testera + Nowe widoki UI). To ryzyko rozmycia.
  - *Boundaries*: Brak sekcji "Czego NIE robimy".
  - *Examples*: Brak przykładu jak wygląda wejściowy obiekt `documentType: 'ticket'` dla weryfikacji.
  👉 **Sugestia**: Ustalmy sztywne ramy, że w tej iteracji dla `ticket` robimy tylko prosty szkielet i puszczamy to przez główną aplikację. Wszelkie wodotryski CSS zostawiamy na oddzielny etap szlifowania.

**Ostrzeżenia (warto adresować)**:
- **Rabbit Hole (Faza 3)**: Projektowanie "wyglądu perforowanego biletu ze wstawkami Art Déco" za pomocą klas Tailwind w jednej iteracji, podczas której synchronizujemy też logikę bazową, gwarantuje nam zablokowanie się na estetyce. 
  👉 **Sugestia**: Stwórzmy absolutnie minimalistyczny bilet (tylko tło i ramka) jako dowód, że mechanika `documentType` w UI działa poprawnie.
- **Strategia testowania**: Pominięto komendę `npm test`. Skoro w poprzedniej sesji tak bardzo walczono o testy w `_tester/_base/.silnik/`, przenieśmy to na weryfikację.
  👉 **Sugestia**: Dołączyć `npm test` do weryfikacji końcowej.

**Obserwacje (do rozważenia)**:
- Propagacja stylów w nowym komponencie `SafeImage`: wymiana tagów `<img className="..."/>` na `<SafeImage className="..."/>` wymaga, by nowy komponent bezwzględnie przepuszczał klasy w dół do wewnętrznego tagu `img`.

### Rekomendacja
Plan technicznie jest akceptowalny, ale aby zachować pęd (vibe-coding) proponuję go świadomie "zubożyć" o graficzne wodotryski w bilecie i uzupełnić komendę weryfikującą o odpalenie testów.
