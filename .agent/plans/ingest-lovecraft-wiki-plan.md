# Plan: Integracja Bazy Wiedzy Fandom Lovecraft Wiki & Aktualizacje Informacyjno-Prawne w UI

**Data:** 2026-07-26  
**Złożoność:** Średnia (skrypt ingestu Node.js + aktualizacja interfejsu Encyklopedii oraz stopki prawnej w UI)

---

### Problem
Aplikacja potrzebuje ogromnej, ustrukturyzowanej bazy encyklopedycznej Mitów Cthulhu z wyekstrahowanego pliku Fandom Wiki (`wiki-lovecraft_pages_current.xml.7z`), ale musi w interfejsie użytkownika (UI) w sposób przejrzysty prezentować noty prawne o licencji **Creative Commons Attribution-ShareAlike (CC-BY-SA 3.0/4.0)** oraz rozróżniać materiały z **Domeny Publicznej (Public Domain)**, tak aby użytkownik wiedział skąd pochodzi wiedza.

---

### Rozwiązanie
1. **Skrypt Ingestu (`scripts/ingest-lovecraft-wiki.mjs`):** Stworzenie skryptu automatycznie wyciągającego 7,663 artykuły z rozpakowanego pliku XML (`/Volumes/Karta/Zew - materiały/wiki-lovecraft_pages_current.xml.7z`), oczyszczającego znacznik MediaWiki do czystego tekstu i generującego zunifikowane pliki `dictionary_wiki.json` i `manifest.json` dla epoki/bazy `lovecraft-mythos`.
2. **Aktualizacja UI Encyklopedii (`EpochWikiTab.tsx`):**
   - Dodanie możliwości przełączania się między encyklopedią Epoki (PL 1990-2000) a **Encyklopedią Mitów Cthulhu (`lovecraft-mythos`)**.
   - Dodanie w panelu bocznym oraz w stopce podglądu artykułu widocznego oznaczenia prawnego: **Badge CC-BY-SA 3.0 / 4.0** z linkiem/uznaniem autorstwa społeczności Fandom.
   - Dodanie wyróżnika dla haseł bezpośrednio stworzonych przez H.P. Lovecrafta (**Badge: Domena Publiczna**).
3. **Aktualizacja Ogólnych Informacji Prawnych (`NOTICE` & Modal Ustawień):**
   - Dopisanie sekcji dotyczącej wykorzystania bazy Fandom Lovecraft Wiki na licencji CC-BY-SA w pliku [NOTICE](file:///Volumes/Karta/Developer/straznik-tajemnic/NOTICE).

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|---|---|---|
| `scripts/ingest-lovecraft-wiki.mjs` | **[NEW]** Skrypt Node.js ekstrahujący MediaWiki XML do `data/epochs/lovecraft-mythos/` | Niskie |
| `data/epochs/lovecraft-mythos/dictionary_wiki.json` | **[NEW]** Wygenerowany słownik 7000+ haseł Mitów Cthulhu | Niskie |
| `data/epochs/lovecraft-mythos/manifest.json` | **[NEW]** Manifest bazy danych `lovecraft-mythos` | Niskie |
| `src/components/help-modal/EpochWikiTab.tsx` | Obsługa selektora bazy wiedzy (Epoka vs Mity Cthulhu) + ramka z notą CC-BY-SA & Attribution | Niskie |
| `NOTICE` | Uzupełnienie zapisów o wykorzystaniu Fandom Wiki na licencji CC-BY-SA | Niskie |

---

### Fazy implementacji

#### Faza 1: Skrypt Parser-Ingestu MediaWiki XML
- [ ] Utworzenie `scripts/ingest-lovecraft-wiki.mjs` czytającego plik `.7z` / `.xml` przez `bsdtar`.
- [ ] Wyczyszczenie Wikitekstu (usuwanie `{{Infobox}}`, `[[...]]`, tagów HTML, odrzucenie przekierowań `#REDIRECT`).
- [ ] Kategoryzacja haseł (Wielcy Przedwieczni, Mitologia, Księgi, Opowiadania, Postacie, Lokacje).
- [ ] Wygenerowanie `manifest.json` oraz `dictionary_wiki.json` w `data/epochs/lovecraft-mythos/` oraz kopiowanie do `public/data/epochs/lovecraft-mythos/`.
- **Weryfikacja:** Uruchomienie `node scripts/ingest-lovecraft-wiki.mjs` i sprawdzenie czy wygenerowano sprawne pliki JSON.

#### Faza 2: Modyfikacja UI Encyklopedii (EpochWikiTab.tsx)
- [ ] Dodanie przełącznika słowników: **[🇵🇱 Polska 1990-2000]** vs **[🐙 Mity Cthulhu (Fandom Wiki)]**.
- [ ] Renderowanie przy każdym haśle noty prawnej:
  - Dla Mitów: *"Baza wiedzy na licencji Creative Commons Attribution-ShareAlike (CC-BY-SA 3.0). Autorzy: społeczność The H.P. Lovecraft Wiki (Fandom)."*
  - Oznaczenie badge'em haseł Domena Publiczna (Lovecraft).
- [ ] Zapewnienie pełnej responsywności i ładnego stylu Art Déco / Dark Mode.
- **Weryfikacja:** Przegląd komendą `npx tsc --noEmit`.

#### Faza 3: Uzupełnienie dokumentacji prawnej (NOTICE)
- [ ] Aktualizacja [NOTICE](file:///Volumes/Karta/Developer/straznik-tajemnic/NOTICE) o sekcję Fandom Wiki & CC-BY-SA.
- **Weryfikacja:** Sprawdzenie spójności zapisów licencyjnych.

---

### Weryfikacja końcowa
1. `node scripts/ingest-lovecraft-wiki.mjs`
2. `npx tsc --noEmit`
3. `npm test`

---

### Co może się zepsuć
- **Rozmiar JSON:** Duża liczba haseł może spowodować, że plik `dictionary_wiki.json` będzie ważył 10-15 MB. Skrypt przefiltruje tylko najistotniejsze hasła (odrzuci puste stuby i fanowskie fanfiki, redukując wagę do optymalnych 3-5 MB).
