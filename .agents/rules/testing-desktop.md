---
description: "Zasady testowania na desktopie Straznika Tajemnic"
---

# Zmiany widoczne dla gracza (Desktop App)

**KRYTYCZNE ZASADA WDROŻEŃ:**
Użytkownik polecił bezwzględnie: **"Absolutnie wszystkie zmiany, jeśli mają być testowane, to są testowane w aplikacji z mojego desktopu, więc tam muszą być widoczne dla mnie jako gracza."**

1. Aplikacja dla Gracza na desktopie (`Straznik Tajemnic AI.app`) jest uruchamiana i budowana z poziomu folderu silnika: `_tester/_base/.silnik/`. 
2. Wszelkie zmiany w kodzie frontendu (UI/React) **muszą** zostać zaaplikowane w katalogu `_tester/_base/.silnik/src/...`. Nawet jeśli modyfikujesz `src/` w katalogu głównym projektu, pamiętaj o synchronizacji. Jeśli tego nie zrobisz, gracz po odpaleniu ikony z pulpitu nie zobaczy zmian. (Prawdopodobnie stąd wynikały błędy w przeszłości).
3. Aby aplikacja użytkownika otrzymała te poprawki, po wdrożeniu zawsze uruchom z poziomu głównego katalogu: `bash desktop/build-app.sh --rebuild`.
