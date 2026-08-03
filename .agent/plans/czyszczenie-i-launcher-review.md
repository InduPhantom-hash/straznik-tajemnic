## Plan Review: Czyszczenie i naprawa launchera (BUILD_ID)
Data: 2026-08-03

### Ocena ogólna
🟢 **Zielony** — Plan jest kompletny, precyzyjnie zaadresował przyczynę (Root Cause) w bashu oraz wdrożył izolację zmian Faza 1 (czyszczenie) -> Faza 2 (kod).

### Znalezione problemy

**Krytyczne** (blokują implementację):
- Brak.

**Ostrzeżenia** (warto adresować):
- **Rabbit Hole (Mechanizm weryfikacji BUILD_ID):** Użycie prostego `curl` na HTML pod kątem `buildId` może zawieść, jeśli Next.js zmieni format `__NEXT_DATA__`. 
  → **Sugestia:** Zastosować najbardziej niezawodną metodę sprawdzania przez HTTP: `curl -sf "$URL/_next/static/${DISK_BUILD_ID}/_buildManifest.js" >/dev/null 2>&1`. Jeśli serwer zwróci 404, oznacza to, że nie ma w pamięci obecnego buildu z dysku i wymaga restartu.

**Obserwacje** (do rozważenia):
- Po wyczyszczeniu redundantnych plików z `src/` warto upewnić się, że `git status` pokazuje wyłącznie zatwierdzone modyfikacje biografii w `_tester/_base/.silnik/src/` przed przystąpieniem do Fazy 2.

### Spec Quality Gate
*N/A* (Zmiana jest refaktorem infrastruktury i basha launchera, bez zmian w interfejsie użytkownika UI).

### Rekomendacja
Plan jest gotowy do wykonania. Przejdźmy do implementacji `/dev-4-implement`.
