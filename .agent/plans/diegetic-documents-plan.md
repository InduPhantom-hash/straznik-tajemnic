## Plan: System Renderowania Diegetycznych Rekwizytów (Legitymacje, Listy, Akta, Pisma)
Data: 2026-07-22  
Złożoność: Średnia  

### Problem
Przedmioty typu `document`, `artifact` oraz `occult` w ekwipunku postaci renderują się w podglądzie (`EquipmentDetailDialog`) jako jednolity, generyczny prostokąt papieru `#ebdfc6`. Brak im realistycznego wyglądu charakterystycznego dla rekwizytów epoki (legitymacji prasowej z fotografią postaci, koperty z listem i znaczkiem, teczki akt policyjnych ze sznurkiem i pieczęcią, czy pisma rządowego).

### Rozwiązanie
1. **Rozszerzenie typowania (`EquipmentItem`)**: Dodanie opcjonalnego pola `documentType?: 'press_pass' | 'id_card' | 'evidence_envelope' | 'letter' | 'newspaper' | 'official_document' | 'journal_page'` z funkcją heurytyczną określającą typ na podstawie nazwy i opisu.
2. **Nowy komponent visual-prop (`DiegeticDocumentViewer.tsx`)**: Komponent renderujący dedykowane układy HTML/CSS w klimacie Dark Art Déco / Vintage 1920s:
   - **Legitymacja prasowa / ID**: Zdjęcie badacza z `character.portraitUrl`, pieczęć redakcji, podpis, numer legitymacji.
   - **Koperta na dowody**: Teczka policyjna *Departament Policji w Bostonie/Arkham*, numer sprawy, lista zawartości, plamy/adnotacje.
   - **List osobisty**: Papeteria epoki, znaczek pocztowy, stempel miejski, charakterystyczny krój pisma.
   - **Oficjalne pismo**: Nagłówek instytucji państwowej, godło, ślepa pieczęć, podział na sekcje.
3. **Integracja z `EquipmentDetailDialog.tsx`**: Użycie nowego komponentu przy przeglądaniu czytelnych dokumentów w ekwipunku.

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `src/lib/types.ts` | Dodanie `DocumentType` oraz pola `documentType` do `EquipmentItem` | Niskie |
| `src/lib/acquired-equipment.ts` | Inferencja `documentType` podczas wyciągania przedmiotów z narracji | Niskie |
| `src/components/ui/diegetic-document-viewer.tsx` [NEW] | Stworzenie komponentu renderującego realistyczne układy rekwizytów | Niskie |
| `src/components/ui/equipment-detail-dialog.tsx` | Podpięcie `DiegeticDocumentViewer` w miejsce generycznego podglądu | Niskie |
| `src/app/api/equipment/read-item/route.ts` | Wzbogacenie promptu o pomocnicze parsowanie nagłówków i numerów spraw | Niskie |

---

### Fazy implementacji

**Faza 1: Typowanie i Inferencja Sub-typów**
- [ ] Rozszerzenie `EquipmentItem` o `documentType` w `src/lib/types.ts`.
- [ ] Stworzenie funkcji `inferDocumentType(item)` w `src/lib/acquired-equipment.ts` określającej podtyp dokumentu.
- Weryfikacja: Statyczne typowanie `npx tsc --noEmit`.

**Faza 2: Komponent `DiegeticDocumentViewer`**
- [ ] Utworzenie `src/components/ui/diegetic-document-viewer.tsx` z wariantami:
  - `press_pass`: Ramka kartonowa z portretem z `character.portraitUrl`, pieczęcią redakcji i numerem.
  - `evidence_envelope`: Teczka policyjna z formularzem policyjnym i pieczęciami.
  - `letter`: Papeteria epoki ze znaczkiem i pieczęcią pocztową.
  - `official_document`: Papier urzędowy ze stymulowaną ślepą pieczęcią.
  - `generic`: Szablon fallback dla pozostałych pism.
- Weryfikacja: Renderowanie testowych dokumentów bez błędów.

**Faza 3: Integracja w `EquipmentDetailDialog`**
- [ ] Zamiana dotychczasowego prostego div-a `#ebdfc6` na `<DiegeticDocumentViewer item={item} character={character} />`.
- [ ] Przetestowanie odczytu treści i aktualizacji stanu.
- Weryfikacja: Przegląd w ekwipunku postaci.

---

### Weryfikacja końcowa

```bash
npx tsc --noEmit
npm test -- src/components/ui/equipment-detail-dialog.test.tsx
```

---

### Co może się zepsuć
- **Brak portretu postaci**: Jeśli badacz nie ma `portraitUrl`, legitymacja prasowa / dowód powinien płynnie wyrenderować stylizowany sylwetkowy placeholder z epoki.
- **Backward compatibility**: Dokumenty wygenerowane we wcześniejszych sesjach nie posiadają `documentType` – funkcja `inferDocumentType` automatycznie określi ich typ w locie.
