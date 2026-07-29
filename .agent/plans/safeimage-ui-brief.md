## Brief: SafeImage UI
**Co**: Uodpornienie aplikacji na infinite-loopy błędnych obrazków z API Gemini.
**Jak**: Stworzenie komponentu `SafeImage` renderującego ikonę Lucide po błędzie i podmiana nim wszystkich surowych tagów `img` w komponentach UI.
**Pliki**: `safe-image.tsx` [NEW], oraz podmiany w 7 istniejących plikach wizualnych.
**Test**: Pomyślny build kompilatora (`npm run build`) + brak nieskończonych pętli w przeglądarce przy złamanych adresach.
**Ryzyko**: Brak ryzyka, jeśli komponent prawidłowo przekaże `className` do tagu pod spodem.
