## Plan Review: Przebudowa Predefiniowanych Badaczy
Data: 2026-07-30

### Ocena ogólna
🔴 **Czerwony** — Plan jest ryzykowny z powodu braku jasnego zakresu dla nowej funkcjonalności (brak zdefiniowanych 6 postaci) i nie przechodzi bramki jakości specyfikacji (Spec Quality Gate) dla modyfikacji UI.

### Znalezione problemy

**Krytyczne** (blokują implementację):
- **Wymiar 8 (Spec Quality Gate): 2/10**
  - **Boundaries (0/2):** Brak jasnej sekcji wykluczeń (czego NIE budujemy w UI kafelków, np. "nie zmieniamy animacji", "nie dodajemy nowych filtrów").
  - **Verification (0/2):** Brak 3 mierzalnych kryteriów akceptacyjnych dla UI (np. "Tekst tacticalNotes jest ukryty na mniejszych ekranach" lub "Kafelek nie przekracza wysokości 300px").
  - **Examples (0/2):** Brak konkretnych przykładów (np. jak będzie wyglądał krótki vs bardzo długi wpis `tacticalNotes`).
  - **Focus (2/2):** Plan jest skupiony na kafelkach badaczy.
  - **Budget (0/2):** Opis samego UX/UI featuru nie jest wyizolowany w osobnym opisie.
  → *Sugestia:* Przed zakodowaniem czegokolwiek musimy ustrukturyzować nową wizję kafelków (Boundaries, Verification, Examples).

- **Wymiar 4 (Rabbit holes): Brak aktywów**
  - Stworzenie 6 nowych postaci od zera to ogromny narzut (imiona, 9 statystyk, szczegółowa historia, notatki, ekwipunek startowy, ścieżki do obrazków `portraitUrl`).
  → *Sugestia:* Albo uznajemy, że 34 postaci nam wystarczy i porzucamy pomysł 40 postaci (zmniejszając zakres), albo precyzujemy, że AI ma zmyślić brakujące postacie (co odbije się na balansie), albo dostarczysz gotowe teksty.

**Ostrzeżenia** (warto adresować):
- **Wymiar 2 (Kompletność):**
  - Plan nie wymienia modyfikacji `types.ts` i struktury typów sprzętu (jeśli nowe postacie wymagałyby nowego ekwipunku startowego). 
  - Nie uwzględnia ewentualnego testowania portretów w `SafeImage`.

**Obserwacje** (do rozważenia):
- Rozszerzenie kafelka w `predefined-characters-selector.tsx` o `tacticalNotes` może zepsuć dotychczasowy bardzo gęsty Grid css. Warto zastanowić się nad trybem "szczegóły on hover", aby utrzymać zgrabny wygląd.

### Rekomendacja
**🔴 Wymaga poprawy planu**. 
Plan jest dobry koncepcyjnie, ale spec dla AI buildera w kwestii samego UI ma zaledwie 2/10. Zanim zaczniemy kodować, musimy poprawić zakres: Boundaries, Verification, Examples oraz podjąć twardą decyzję skąd weźmiemy 6 nowych postaci, aby nie utknąć na wymyślaniu historii zamiast kodowaniu.
