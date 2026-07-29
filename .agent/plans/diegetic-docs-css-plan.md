## Plan: Diegetic Docs CSS (Bilety i Notatniki)
Data: 2026-07-29
Złożoność: Prosta

### Problem
Komponent `diegetic-document-viewer.tsx` posiada logikę renderowania dla paszportów, wycinków z gazet czy policyjnych akt, ale zapomina o nowo dodanych typach: biletach (`ticket`) i kartkach z dziennika (`journal_page`). Trafiają one do wizualizacji domyślnej jako list ze znaczkiem.

### Rozwiązanie
Dodamy dwa nowe bloki warunkowe dla `docType === 'ticket'` oraz `docType === 'journal_page'` z dedykowanymi klasami Tailwind:
- **Bilet**: Podzielony poziomo (perforacja w CSS), z wyraźnym nagłówkiem "Bilet Wstępu / Wejściówka" i grubą, numeryczną lub stylizowaną czcionką.
- **Notatnik**: Kawałek pożółkłego papieru z poziomą liniaturą (wzorowaną na zeszytach) wygenerowaną przy pomocy gradientu liniowego, pismem naśladującym odręczne.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/diegetic-document-viewer.tsx` | Dodanie dwóch bloków `if`, czysty UI/CSS. | Niskie |

### Fazy implementacji

**Faza 1: UI Biletów i Kartek**
- [ ] Dodanie `if (docType === 'ticket')` ze specjalnym układem graficznym (Tailwind).
- [ ] Dodanie `if (docType === 'journal_page')` z tłem naśladującym zeszyt z liniaturą.
- Weryfikacja: Kompilacja komponentu bez błędów w terminalu TypeScript.

### Weryfikacja końcowa
`npm run build` by sprawdzić, czy nie było pomyłek TS.
Testy jednostkowe parserów nadal będą świecić na zielono.

### Co może się zepsuć
Nie ma wpływu na logikę silnika. W najgorszym razie komponent rozjedzie się wizualnie na mniejszych ekranach, jeśli nie zabezpieczymy go poprzez `max-w-full` lub `overflow-hidden`.
