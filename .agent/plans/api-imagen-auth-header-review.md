# Plan Review: Autoryzacja w żądaniach /api/imagen

Data: 2026-07-18

### Ocena ogólna
🟢 Zielony — Plan jest prosty, precyzyjny, kompletny i bezpieczny w realizacji.

### Znalezione problemy

**Krytyczne** (blokują implementację):
- brak

**Ostrzeżenia** (warto adresować):
- brak

**Obserwacje** (do rozważenia):
- Zweryfikowano również pliki `useChat.ts` oraz `useGameStart.ts` korzystające z funkcji pomocniczej `fetchWithRetry`. Funkcja ta wewnętrznie poprawnie wywołuje `fetchWithApiKeys`, więc te pliki nie wymagają żadnych modyfikacji.

### Rekomendacja
implementuj
