## Brief: Encyklopedia Aplikacji i Przewodnik Gracza (Pomoc)

**Co**: Dodanie przycisku "Pomoc" w Sidebarze otwierającego modal z encyklopedią funkcji aplikacji, opisem działania AI Strażnika Tajemnic oraz poradnikiem "Jak być dobrym graczem RPG" i protipami prowadzenia konwersacji z czatem.
**Jak**: Dedykowany modal `AppHelpModal.tsx` z 3 zakładkami oparty na ustrukturyzowanych danych z `app-help-data.ts`.
**Pliki**: `src/lib/data/app-help-data.ts` [NEW], `src/components/ui/app-help-modal.tsx` [NEW], `src/components/sidebar/CthulhuSidebar.tsx` [MODIFY].
**Test**: `npx tsc --noEmit` oraz weryfikacja interakcji z sidebarem.
**Ryzyko**: Bardzo niskie (brak mutacji stanu gry).
