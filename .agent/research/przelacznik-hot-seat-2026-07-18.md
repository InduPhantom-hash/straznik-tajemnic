# Research: Przeniesienie przełącznika Hot Seat z sidebaru nad okno czatu
Data: 2026-07-18
Stack: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS

## Obszar problemu
- [_tester/_base/.silnik/src/app/page.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/page.tsx) - zarządza stanem Hot Seat (`useHotSeat`) i spina komponenty.
- [_tester/_base/.silnik/src/components/sidebar/CthulhuSidebar.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/sidebar/CthulhuSidebar.tsx) - obecnie renderuje `<PlayerSwitcher>` w sidebarze.
- [_tester/_base/.silnik/src/components/chat/chat-window/index.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/chat-window/index.tsx) - pośredniczy w przekazywaniu stanu/callbacków do wejścia wiadomości.
- [_tester/_base/.silnik/src/components/chat/chat-window/components/message-input.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/chat/chat-window/components/message-input.tsx) - renderuje wiersz "Tura" nad polem tekstowym z deklaracjami i oczekującymi graczami.

## Zależności
- Stan Hot Seat jest kontrolowany przez hook `useHotSeat` z [player-switcher.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/player-switcher.tsx).
- Callback `handleSwitchPlayer` w `page.tsx` przełącza indeks gracza oraz ustawia jego postać jako aktywną w UI (`charMgmt.setActiveCharacter`).

## Istniejące testy
- Pokrycie testami integracyjnymi znajduje się w katalogu `tests/` oraz scenariuszach testowych `_tester/`. Dowolne zmiany w zachowaniu przełącznika Hot Seat będą wymagały weryfikacji manualnej oraz automatycznej (`npm run build`).

## Ryzyka i uwagi
- Usunięcie widgetu z bocznego paska zwolni cenne miejsce w sidebarze.
- Zintegrowanie przełącznika w wierszu `TURA` w `message-input.tsx` sprawi, że kliknięcie na nazwę gracza, który jeszcze nie napisał deklaracji (lub już napisał) przełączy na niego aktywną sesję pisania.
- Wyłączenie trybu Hot Seat (dotychczasowy przycisk `✕`) można dodać obok nagłówka "Tura" lub jako mały przycisk w wierszu tury.

## Rekomendowany następny krok
- Proponuję przejść do etapu planowania (`/dev-2-plan`) w celu opracowania precyzyjnego diffu kodu dla wdrożenia interaktywnego przełączania bezpośrednio nad oknem czatu.
