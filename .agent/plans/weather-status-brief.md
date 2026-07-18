## Brief: Pogoda na pasku statusu
**Co**: Dodanie informacji o pogodzie na górnym pasku statusu (data, czas, księżyc).
**Jak**: Przekazanie `adventureDescription` z głównego stanu przygody do `ChatHeader` i dalej do `CampaignClock`, który już wspiera parsowanie i wyświetlanie pogody (ikony + tekst).
**Pliki**: 
- `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx`
- `_tester/_base/.silnik/src/components/chat/chat-window/components/chat-header.tsx`
**Test**: `npm test` oraz manualne sprawdzenie po załadowaniu scenariusza.
**Ryzyko**: Niskie - komponenty mają już częściową obsługę, wymagane jest głównie spięcie przepływu danych.
