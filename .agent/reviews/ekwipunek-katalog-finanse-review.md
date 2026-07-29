## Plan Review: Ekwipunek, Finanse, Fallbacki UI
Data: 2026-07-29

### Ocena ogólna
🟡 Żółty — Plan jest solidny technicznie, ale kryje w sobie spore ryzyko pułapki czasowej (rabbit hole) i ignoruje delikatne powiązania z Tablicą Badacza wykryte w badaniach.

### Znalezione problemy

**Krytyczne** (blokują implementację):
- **Rabbit hole (Wymiar 4)**: Zadeklarowano stworzenie pełnej tabeli ról (profesji) na tabele Zamożności. Zew Cthulhu 7e ma kilkadziesiąt/kilkaset zawodów, to gigantyczny dataset do ręcznego wklepania.
  → Sugestia: Zawęzić cel. Stworzyć `credit-rating.ts` obsługujący sztywny mechanizm wyliczający wartości Zamożności na bazie generycznych kategorii (Biedny 1-9, Przeciętny 10-49, Bogaty 50-98) i poprzestać na fallbackowej kategorii "Przeciętny" dla ról nieuwzględnionych, bez konieczności wpisywania wszystkich ról naraz.
- **Kompletność (Wymiar 2)**: W badaniach odkryto, że zdobycze (Ekwipunek) lądują na Tablicy Badacza (jako poszlaka z `convert-entries.ts`). Ten plik nie został ujęty do testów weryfikujących, czy dodane pole Ekwipunku go nie połamie.
  → Sugestia: Dodać `src/lib/journal/convert-entries.test.ts` do sekcji "Faza 1" do uruchomienia i potencjalnie dodać nową fazę / krok na zweryfikowanie spójności typów.

**Ostrzeżenia** (warto adresować):
- **Strategia testowania (Wymiar 6)**: Wspomniano "testy dla przywróconych skryptów", jednak przywracane pliki mają stare zależności (np. `import { x } from ...`). Testy mogą upaść, gdy tylko zostaną wrzucone. 
  → Sugestia: Faza 1 musi stanowić o zmapowaniu aliasów importów i wyrzuceniu / przepisaniu starych referencji testera.

**Obserwacje** (do rozważenia):
- Typ obrazków SVG rezerwowych dla przedmiotu to bezpieczny wybór i wyeliminuje pękanie ramek TailwindCSS.

### Rekomendacja
Popraw plan. Przejście z 🟡 do 🟢 zajmie minutę (wymaga zawężenia zakresu i dodania 2 konkretnych poleceń).
