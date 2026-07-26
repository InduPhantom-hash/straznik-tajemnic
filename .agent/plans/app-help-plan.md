# Plan: Encyklopedia Aplikacji & Przewodnik dla Gracza (Pomoc w Sidebarze)

Data: 2026-07-26
Złożoność: Średnia

### Problem
Użytkownik potrzebuje łatwo dostępnej pomocy (onboarding/encyklopedia) bezpośrednio z Sidebara, która wytłumaczy:
1. Jak działają poszczególne elementy interfejsu (Karta Badacza, Ekwipunek, Dziennik i Corkboard Tablica Poszlak, Tacka Rzutów).
2. Czym charakteryzuje się wirtualny Strażnik Tajemnic AI w porównaniu do klasycznego spotkania z MG (automatyzacja zasad Call of Cthulhu 7E, pilnowanie spójności lore i fabuły).
3. Jak być dobrym graczem RPG w interakcji z AI (wskazówki narracyjne, odgrywanie postaci, budowanie klimatu, przykłady promptowania z zastrzeżeniem "graj tak jak lubisz") wraz z przydatną listą materiałów i odnośników.

### Rozwiązanie
Stworzenie dedykowanego komponentu modalu `AppHelpModal.tsx` z ustrukturyzowaną treścią z pliku `app-help-data.ts`. Modal będzie wywoływany nowym przyciskiem "Pomoc i Przewodnik" w `CthulhuSidebar.tsx` (z ikoną `HelpCircle`). Treść podzielona na 3 czytelne zakładki: `Elementy Interfejsu`, `Strażnik Tajemnic AI`, `Poradnik Gracza & Protipy`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/data/app-help-data.ts` | [NEW] Definicje treści pomocy, opisu interfejsu, protipów i odnośników | Niskie |
| `src/components/ui/app-help-modal.tsx` | [NEW] Modal z zakładkami (Tabs) i stylizacją Art Déco | Niskie |
| `src/components/sidebar/CthulhuSidebar.tsx` | [MODIFY] Dodanie przycisku pomocy w sekcji narządziowej oraz obsługa otwarcia modalu | Niskie |

---

### Fazy implementacji

**Faza 1: Baza danych i treści przewodnika**
- [ ] Utworzenie `src/lib/data/app-help-data.ts` ze słownikiem i strukturą:
  - Opis interfejsu (Karta Badacza, Ekwipunek, Dziennik i Tablica Poszlak, Rzuty & Tacka).
  - Rola AI Strażnika Tajemnic (mechanika CoC 7E, pilnowanie zasad, elastyczna narracja).
  - Poradnik Gracza (jak rozmawiać z czatem, budowanie zmysłów, wspólne tworzenie świata, zastrzeżenie "graj po swojemu", katalog poradników/linków).
- Weryfikacja: Brak błędów składniowych w TypeScript.

**Faza 2: Komponent Modalu Pomocy (AppHelpModal)**
- [ ] Utworzenie `src/components/ui/app-help-modal.tsx`:
  - Użycie Radix UI Dialog / Modal.
  - Nawigacja zakładkowa z ikonami (`Layout`, `Bot`, `Sparkles` / `BookOpen`).
  - Responsywny layout z przewijaniem i klimatyczną oprawą (ciemny motyw, złotave akcenty).
- Weryfikacja: Komponent renderuje się czysto.

**Faza 3: Integracja z Sidebarem**
- [ ] Modyfikacja `CthulhuSidebar.tsx`:
  - Dodanie przycisku z ikoną `HelpCircle` w menu dolnym/narzędziowym.
  - Podpięcie stanu `showHelpModal`.
- Weryfikacja: Przycisk w sidebarze otwiera i zamyka modal.

---

### Weryfikacja końcowa
- `npx tsc --noEmit` (0 błędów w TypeScript).
- Test wizualny przycisku i reaktywności modalu.

### Co może się zepsuć
- Znikome ryzyko – nowy modal to odizolowana kompozycja UI, która nie wpływa na stan rozgrywki.
