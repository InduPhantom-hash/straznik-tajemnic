## Brief: Integracja trybów startu (Etap 0.5)
**Co**: Naprawa niedziałającego przycisku "Szybka Przygoda" na czystym Ekranie Startowym.
**Jak**: Zaktualizowanie typowania Props dla `ChatWindow` i przekazanie wywołania funkcji `handleQuickStartOnboarding` bezpośrednio z głównego rutera `page.tsx`.
**Pliki**: `types.ts` (w chat-window), `page.tsx`.
**Test**: Uruchomienie `npm run test` na testach E2E, by zweryfikować czy modal otwiera się poprawnie i czy struktury danych odpowiadają asercjom.
**Ryzyko**: Bardzo niskie - to operacja na typach i przypisanie atrybutu (React).
