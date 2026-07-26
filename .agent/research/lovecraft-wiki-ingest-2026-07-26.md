# Research: Integracja Bazy Wiedzy Fandom Lovecraft Wiki (`wiki-lovecraft_pages_current.xml.7z`)

**Data:** 2026-07-26  
**Projekt:** Strażnik Tajemnic AI (`straznik-tajemnic`)  
**Stack:** Next.js 14, React 18, TypeScript, MediaWiki XML parser, Local RAG (Float32 vector store), Node.js (scripts)

---

## 1. Analiza Archiwum Źródłowego (`wiki-lovecraft_pages_current.xml.7z`)

* **Lokalizacja pliku:** `/Volumes/Karta/Zew - materiały/wiki-lovecraft_pages_current.xml.7z`
* **Rozmiar skompresowany:** 6.1 MB (skomprowane metodą 7z)
* **Rozmiar rozpakowany (`lovecraft_pages_current.xml`):** 36.3 MB
* **Format:** MediaWiki XML Export v0.11 (zrzut bazy Fandom `the-h-p-lovecraft.fandom.com`)
* **Liczba rekordów:**
  * Łącznie stron (w tym dyskusje, szablony, pliki): **26,551**
  * Strony z treścią (Główna przestrzeń nazw `ns=0`): **7,663 artykuły**
* **Struktura haseł:**
  * Hasła w czystym Wikitekście (MediaWiki markup) zawierają Infoboksy (`{{Infobox character}}`, `{{Infobox Mythos Book}}`, `{{Infobox story}}`), kategorie (`[[Category:...]]`) oraz linki wewnętrzne.
* **Główne kategorie tematyczne:**
  1. *H. P. Lovecraft works* / *Lovecraft Circle Works* (~900 haseł - pierwotna domena publiczna)
  2. *Great Old Ones* / *Other Supernatural Beings* / *Sapient Species* (~600 haseł - bóstwa i potwory)
  3. *Books* / *Grimoires* (Necronomicon, De Vermis Mysteriis, Unaussprechlichen Kulten itp.)
  4. *Expanded Mythos Works* / *Roleplaying Games* (~3,200 haseł - rozszerzenia późniejsze)

---

## 2. Obszar Problemu i Bezpieczeństwo Prawne (Legal Audit)

1. **Podstawa prawna i licencjonowanie:**
   * **Dzieła H.P. Lovecrafta:** Wszelkie opowiadania, postacie i koncepcje napisane bezpośrednio przez H.P. Lovecrafta należą do **Domeny Publicznej (Public Domain)** (Lovecraft zmarł w 1937 r., minęło >70 lat).
   * **Treść opisów z Fandom Wiki:** Dostępna na licencji **Creative Commons Attribution-ShareAlike (CC-BY-SA 3.0 / 4.0)**.
   * **Wymogi integracji:**
     - **Attribution (Uznanie Autorstwa):** W aplikacji (w zakładce Encyklopedia / Wiki) należy umieścić notę: *"Hasło pochodzi z The H.P. Lovecraft Wiki na licencji CC-BY-SA 3.0/4.0. Źródło: fandom.com"*.
     - **ShareAlike:** Treści encyklopedyczne pozostają open-source na licencji CC-BY-SA.
   * **Zabezpieczenie znaków/praw autorskich firm trzecich:**
     - Artykuły z kategorii *Call of Cthulhu (real world)* lub odnoszące się do zastrzeżonych podręczników Chaosium Inc. powinny zostać przefiltrowane lub pozbawione surowych statystyk mechanicznych RPG.
     - Wszystkie grafiki powinny być pomijane (XML zawiera jedynie nazwy plików, obrazy z Fandomu mają niepewny status prawny - aplikacja wygeneruje własne portrety/ilustracje).

---

## 3. Zależności i Architektura Encyklopedii w Aplikacji

* **Istniejący moduł encyklopedii:**
  * Interfejs UI: `EpochWikiTab.tsx` (`src/components/help-modal/EpochWikiTab.tsx`)
  * Format słownika: `dictionary_wiki.json` i `manifest.json` w `data/epochs/<epoch_id>/` oraz `public/data/epochs/<epoch_id>/`
  * Skrypt ingestu: `ingest-epoch-research.mjs` (`scripts/ingest-epoch-research.mjs`)
* **Wprowadzany moduł Mitów:**
  * Identyfikator epoki/bazy: `lovecraft-mythos`
  * Docelowa ścieżka danych: `data/epochs/lovecraft-mythos/dictionary_wiki.json` i `public/data/epochs/lovecraft-mythos/dictionary_wiki.json`
* **Struktura rekordu wpisu encyklopedycznego:**
```typescript
interface WikiEntry {
  id: string;
  category: string;
  categoryTitle: string;
  term: string;
  shortDefinition: string;
  fullContent: string;
  tags: string[];
  sourceAttribution?: string; // "Cthulhu Fandom Wiki (CC-BY-SA 3.0)"
}
```

---

## 4. Istniejący Pipeline Ingestu i Testy

* **Przetwarzanie danych:**
  Skrypt node `scripts/ingest-epoch-research.mjs` buduje struktury dla bazy danych w `data/epochs/` oraz kseruje je do `public/data/epochs/` na potrzeby klienta Web Next.js.
* **Testy weryfikacyjne:**
  System testów Jest (`npm test`) weryfikuje poprawność wczytywania encyklopedii oraz integrację ze wskaźnikami immersyjnymi i RAG.

---

## 5. Ryzyka i Uwagi

1. **Format Wikitekstu:** Surowy MediaWiki markup z Fandomu zawiera szablony `{{...}}` i tagi `[[...]]`. Parser musi czyścić wikitext do czystego formatu Markdown / plain text, usuwając śmieci konfiguracyjne Fandomu.
2. **Filtrowanie spamu i stron porzuconych:** Z 7,663 haseł z `ns=0`, część to krótkie zalążki (stuby) lub przekierowania (`#REDIRECT`). Parser powienien odrzucać przekierowania oraz artykuły poniżej 150 znaków.
3. **Pojemność pamięci RAM / rozszerzenie pliku JSON:** 7,663 artykułów przetworzonych na czysty tekst da ok. 15-25 MB JSON. Warto podzielić encyklopedię na podkategorie lub przygotować indeks szybkiego wyszukiwania.

---

## 6. Rekomendowany Następny Krok

Przejście do etapu `/dev-2-plan` w celu stworzenia skryptu konwertującego XML `wiki-lovecraft_pages_current.xml.7z` na produkcyjną encyklopedię `lovecraft-mythos` (`dictionary_wiki.json` + `manifest.json`) oraz zintegrowanie jej z UI `EpochWikiTab.tsx`.
