## Research: Dziennik cRPG & Auto-Loot
Data: 2026-07-27
Stack: Next.js, React, Tailwind CSS, TypeScript

### Obszar problemu
- `_tester/_base/.silnik/src/components/ui/session-journal.tsx` - komponent Dziennika Misji. Odpowiada za wyświetlanie zakładek `Postacie`, `Lokacje`, `Przedmioty`. Aktualnie zawartość jest renderowana jako zbiór kafelków. Należy przebudować szerokość okna (zmiana z 95vw/90vh na 85vw/85vh) i zmodyfikować strukturę HTML kafelków, by wyświetlały się jako "akta/Karty cRPG". 
- `_tester/_base/.silnik/src/components/chat/chat-window/components/acquired-item-card.tsx` - komponent podsumowujący zdobyty łup. Według założeń, przyciski "Dodaj do ekwipunku" i "Odrzuć" mają zniknąć, a karta ma służyć jedynie jako powiadomienie wizualne. 

### Zależności
- Rozmiar modalu zdefiniowany w `session-journal.tsx` bezpośrednio wpływa na dostępne miejsce dla `InvestigatorBoard`.
- Pasek scrollowania wymaga klas Tailwinda dla modyfikacji paska natywnego (np. `scrollbar-thin scrollbar-thumb-[kolor]`).
- Auto-loot działa aktualnie jako `useEffect` wołający `onConfirm` w trybie Solo. W trybie Hot Seat, `AcquiredItemCard` żąda wyboru postaci, której przydziela się sprzęt.

### Istniejące testy
- `_tester/_base/.silnik/src/components/ui/session-journal.test.tsx`
- `_tester/_base/.silnik/src/lib/acquired-equipment.test.ts`
Zmiana struktury HTML (klasy, usunięte przyciski w kartach postaci czy Dzienniku) może wywołać błędy w wyszukiwaniu po tekście lub rolach w bibliotece React Testing Library.

### Ryzyka i uwagi
- **Tryb Hot Seat (Duet)**: Jeśli pozbędziemy się przycisków w `acquired-item-card.tsx`, trzeba rozstrzygnąć, co dzieje się z auto-lootem, gdy gramy we dwóch. Czy AI przydziela to domyślnie aktywnemu graczowi? Jeśli tak, stracimy asynchroniczny dropdown na czacie.
- Style `cRPG`: Należy ostrożnie dobrać tło i czcionki (korzystając z istniejących zmiennych, np. Cinzel, Special Elite, i koloru drewna).

### Rekomendowany następny krok
Zalecam przejście do `/dev-2-plan` w celu zatwierdzenia przez PO (Jakuba) sposobu rozwiązania asynchroniczności (Hot Seat) w funkcji Auto-loot oraz dokładnego rozpisania klas CSS dla kart "akt" w Dzienniku.
