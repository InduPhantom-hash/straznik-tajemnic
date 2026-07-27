## Brief: Przesyłanie characterId w trybie Hot Seat (AcquiredItemCard)
**Co**: Naprawa przypisywania zdobytego przedmiotu do właściwej postaci w trybie Hot Seat.
**Jak**: Rozszerzenie sygnatur TS o opcjonalny parametr `characterId` w interfejsie i przekazanie go przez funkcję opakowującą z karty wiadomości do głównego hooka używanego w aplikacji.
**Pliki**: 
- `types.ts` (w chat-window)
- `message-card.tsx`
**Test**: Sprawdzenie działania TS na ścieżce prop-drillingu.
**Ryzyko**: Bardzo niskie (zmiana polega tylko na przekazaniu już zdefiniowanego stanu).
