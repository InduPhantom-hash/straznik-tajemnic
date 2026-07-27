## Plan: Redesign Ekwipunku & Dokumentów (Sesja 2)
Data: 2026-07-27
Złożoność: Średnia

### Problem
Modal detali ekwipunku (`EquipmentDetailDialog`) korzysta ze standardowych rozmiarów Tailwind (`max-w-5xl`) i płaskiego designu, przez co nie pasuje do immersyjnego stylu cRPG wprowadzonego w Dzienniku Sesji. Dokumenty rozciągają się w oknie, a kafelki na liście ekwipunku są zbyt surowe.

### Rozwiązanie
Zwiększymy rozmiar modalu Ekwipunku do 85-90vw/vh, naśladując styl Dziennika (ciemne, rozmyte tło, mosiężne ramki). Komponent renderujący dokumenty (`DiegeticDocumentViewer`) otrzyma wewnętrzny limiter szerokości, by gazety czy dowody tożsamości zachowały poprawne, realistyczne proporcje na dużych ekranach. Wzbogacimy też wyświetlanie kafelków w Karcie Postaci.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/equipment-detail-dialog.tsx` | Zmiana rozmiaru na ~85vw/85vh, dodanie tła backdrop-blur, ramek border-amber-900/60, stylizacja na stare drewno i mosiądz. | Niskie |
| `src/components/ui/predefined-characters-selector.tsx` | Poprawa estetyki kafelków na liście ekwipunku (ciemne tło, obrys mosiężny, winietki w stylu retro). | Niskie |
| `src/components/ui/diegetic-document-viewer.tsx` | Dodanie max-width do głównego kontenera i wycentrowanie (`max-w-4xl mx-auto`), by dokumenty wyglądały realistycznie w wielkim oknie ekwipunku. | Niskie |

### Fazy implementacji

**Faza 1: Rozszerzenie Modalu Ekwipunku**
- [ ] Zmiana klas kontenera w `equipment-detail-dialog.tsx` na pełnoekranowy modal (wzorowany na Dzienniku Sesji).
- [ ] Zastosowanie mosiężnych ramek i klimatycznego tła.
- Weryfikacja: Modal wypełnia większość ekranu i wygląda jak interfejs cRPG.

**Faza 2: Immersyjny widok dokumentów (Diegetic Document Viewer)**
- [ ] Zmiana logiki wyświetlania wewnątrz `EquipmentDetailDialog` tak, aby `DiegeticDocumentViewer` był wycentrowany i miał narzuconą maksymalną szerokość (by tekst listu nie miał 2000px szerokości).
- [ ] Dodanie estetycznych cieni i paddingów.
- Weryfikacja: Dokument otwiera się czytelnie bez względu na rozdzielczość ekranu.

**Faza 3: Szlif kafelków Ekwipunku na Karcie Postaci**
- [ ] Refaktor `predefined-characters-selector.tsx` w sekcji mapującej ekwipunek - dodanie "winietek" na wzór Dziennika.
- Weryfikacja: Lista Ekwipunku jest spójna wizualnie zresztą Karty Postaci.

### Weryfikacja końcowa
- `npm run build`
- Ręczne otworzenie Karty Postaci, wejście w ekwipunek i podgląd gazety / notatki.

### Co może się zepsuć
- Jeśli gracz użyje modalu na bardzo wąskim telefonie, 85vw może nie wystarczyć na układ szpaltowy gazety. Zabezpieczenie: responsywne paddingi.
