# Źródła i zakres lektury

Baza: `/Volumes/Karta/Zew - materiały`. Inwentaryzacja na 2026-09-05 obejmuje **4391 plików** (także pliki systemowe i archiwa). Spis maszynowy [source-inventory.json](evidence/source-inventory.json) zawiera tylko ścieżki i rozmiary. Nie jest listą przeczytanych ani zatwierdzonych źródeł.

## Podręczniki, dodatki i duplikaty

W podkatalogu Black Monk jest 8 PDF poza archiwami, czyli 6 unikalnych treści według SHA-256. Są też 13 archiwów ZIP w tym podkatalogu; osobno znajduje się `Narratologia.zip` i archiwa eksportów DeepResearch. Listowanie zawartości ZIP nie oznacza przeczytania zawartych książek.

| Plik / obiekt | Klasyfikacja i zakres lektury | SHA-256 |
|---|---|---|
| `ZewCthulhu_KsiegaStraznika_v.1.3.pdf` | CoC 7e, polska Księga Strażnika, Black Monk. Ekstrakcja tekstu; lektura wybranych partii tworzenia badacza, Majętności, prowadzenia śledztwa i ekwipunku. 490 stron PDF. Obejrzano render s. 206 / PDF 207 | `b463b904d4c2e9d69e08a4268691bed1a3d83e1f157a01e8dce42ef7e6cc795c` |
| `ZewCthulhu_KsiegaStraznika_v.1.3-kopia.pdf` | Identyczny duplikat powyższego, nie drugie wydanie ani niezależne potwierdzenie | ten sam hash |
| `Zew_Cthulhu_7ed._World_War_Cthulhu_Noc_Zagłady.pdf` | Dodatek/scenariusz. Czytane wprowadzenie i założenia, s. 1 / PDF 3 oraz wariant Pulp i kontekst scenariusza s. 3 / PDF 5 | `91f5d435d4e637f77dc63a57f0e02e6998191a197896e538461631c305acf59d` |
| `...Noc_Zagłady (1).pdf` | Identyczny duplikat, nie niezależne źródło | ten sam hash |
| `Pełzająca kontrrewolucja.zip` → `P-KONTRREWOLUCJA_WEB.pdf` | Dodatek/scenariusz; lokalna ekstrakcja wybranego PDF. Czytane wprowadzenie s. 1 / PDF 2: Gdańsk, wiosna 1971, fikcyjny Wydział X i wskazówka dla MG | Nie wyliczano w tym raporcie |
| `Miniporadnik_W_martwym_punkcie.pdf` | Poradnik MG, 17 stron PDF; wprowadzenie PDF 3 i fragmenty o czytelności zagadek PDF 9–10. Nie RAW | `e8f615e08fdd3fd9b2e3c0be8530fd5053d192778068b2488c8a19a849708553` |
| `Miniporadnik_ONI.pdf` | Inwentaryzacja, bez pełnej lektury | `d527cd0c5a284303439e60ac21d86322eed25cec96bf9ea114c98389a1fe1903` |
| `Zew_Cthulhu_7ed._Krakowska_Enigma_(polski_prolog_do_Masek_Nyarlathotepa).pdf` | Inwentaryzacja, bez pełnej lektury | `562da337565caf7d63db966791a947683e8d367bcbbb9ecbf9222dfa125bd8b7` |
| `Zew_Cthulhu_7ed._Trzeba_karmić_ogień.pdf` | Inwentaryzacja, bez pełnej lektury | `7989920363a6e4ea394b2574f641a43a3480199ca5dbaf914c9501a9f7d78312` |

Pełne ścieżki plików PDF są w spisie maszynowym. Nazwy w tabeli zapisano w czytelnej postaci Unicode; system plików może używać dekompozycji znaków. Podręcznika ani renderów jego stron nie przeniesiono do repo (również ze względu na personalizację egzemplarza).

Pozostałe archiwa modułów: Cienie Tatr, Kwiat paproci, Miłość ci wszystko wybaczy?, Mroczna Latarnia, Pisk wizg i Odłamek, Postaci Historyczne, Powrót do R'lyeh, Usłysz Zew Cthulhu, Uwierz w duchy, W czeluściach sklepów, Zestaw 4 przedwojennych map, Horror nad Wartą. Odczytano nazwy zawartości; nie uznano ich za przebadane historycznie. Archiwum map i skanów wymaga osobnej kontroli obrazu/OCR, zanim będzie źródłem tekstowego RAG.

## Kolekcje historyczne

| Podkatalog DeepResearch_Prompty | PL: prompty / dodatkowe MD | USA: prompty / dodatkowe MD |
|---|---:|---:|
| `1890s-gaslight` | 16 / 0 | 16 / 0 |
| `1920s-classic` | 16 / 0 | 16 / 1235 |
| `1940s-noir` | 16 / 0 | 16 / 0 |
| `1970s-prl-coldwar` | 16 / 0 | 16 / 0 |
| `1990s-2000s` | 16 / 712 | 16 / 0 |
| `modern` | 16 / 0 | 16 / 0 |

Razem 192 prompty i 1947 dodatkowych MD. Liczba nie uwzględnia ponownie zawartości ZIP. Dodatkowy MD może być syntezą, skrawkiem strony albo pustą tabelą; nie jest automatycznie oddzielnym wartościowym źródłem.

Odczyt zakresów promptów wykazał: Gaslight 1880–1899; classic 1920–1929; noir 1939–1949; PRL/cold war 1970–1979; transformacja/Y2K 1990–2005; modern 2020+. W każdym koszyku obejmują prawo, instytucje, społeczeństwo i kulturę oraz komunikację, transport, gospodarkę i wygląd. Zestaw pytań jest szeroki, ale dla 10 koszyków nie ma odpowiedzi.

Przegląd heurystyczny wskazał 189 kandydatów na puste tabele w USA1920 i 99 w PL1990–2005. Ręcznie potwierdzono puste komórki wybranych tabel transportu PL. To **nie** wynik pełnej walidacji wszystkich plików i nie dowód uszkodzenia każdego wskazanego eksportu. Nie wykonywano deduplikacji całej kolekcji MD po treści; sum nie wolno traktować jako liczby niezależnych świadectw.

### Wybrane czytane syntezy i odtwarzalne lokalizatory

Poniższe ścieżki są względne do bazy materiałów. W raporcie korzystano z fragmentów/sekcji, nie deklarowano pełnej weryfikacji wszystkich przypisów. W każdym z tych materiałów syntetyczna narracja i `[cite: n]` wymagają odtworzenia przypisania do oryginalnego źródła.

- USA — technologia, komunikacja, transport: `DeepResearch_Prompty/1920s-classic/USA/09_technologia_transport_i_komunikacja/notebooklm-sources-2026-07-22/Amerykański_przełom_infrastrukturalny_Technologia,_transport_i_komunikacja_w_Stanach_Zjednoczonych_w.md`. Czytane wybrane partie o infrastrukturze i dostępności. Status: synteza historyczna, nie zatwierdzony fakt dla każdej sceny.
- USA — role społeczne: `DeepResearch_Prompty/1920s-classic/USA/05_pozycja_i_prawa_kobiet/notebooklm-sources-2026-07-22/Status_i_Prawa_Kobiet_w_Ameryce_Szalonych_Lat_Dwudziestych_(1920–1929)_Kompendium_Historyczno-Prawne.md`. Czytane wybrane partie i propozycje skutków dla RPG. Status: tezy historyczne wymagające źródeł oraz osobno porady/nowe mechaniki.
- PL — komunikacja: `DeepResearch_Prompty/1990s-2000s/PL/09_technologia_transport_i_komunikacja/notebooklm-sources-2026-07-21/Technologia,_transport_i_komunikacja_w_epoce_transformacji_ustrojowej_w_Polsce_(1990–2005)_Raport_z_.md`. Lokalizatory treści: `Szczęścia`, `Odporność`, `SDI`, `Neostrada`, `2002`; fragmenty o telefonii, internecie i barierach. Status: niezatwierdzona synteza plus propozycje mechaniczne.
- PL — gospodarka: `DeepResearch_Prompty/1990s-2000s/PL/13_gospodarka_ceny_i_koszty_zycia/notebooklm-sources-2026-07-21/Gospodarka,_ceny_i_koszty_życia_w_Polsce_w_latach_1990–2005_Kompendium_historyczno-analityczne_dla_r.md`. Lokalizatory: `2004`, `modem`, `test`; porównano propozycje rutynowych kosztów/testów z Majętnością CoC. Status: niezatwierdzona synteza; nie źródło nowych zasad.
- PL — prasa i informacja: materiał zaczynający się od `Medialny_i_informacyjny_wymiar_transformacji_ustrojowej_w_Polsce_(1990–2005)_Kompendium_historyczno-` w kategorii `12_prasa...`; sprawdzono wybrane twierdzenia i strukturę cytowań. Nie rozstrzygano historyczno-prawnych dat bez źródła pierwotnego.

Nie tworzono katalogu „potwierdzonych faktów historycznych” z tych syntez. Ich użyteczność oceniono jako materiału do przyszłej redakcji. Wykrycie konfliktu dwóch syntez nie wymaga uznania jednej za prawdziwą.

Doprecyzowanie drugiego przeglądu: syntezy PL komunikacji i gospodarki kończą się listami URL. Numery `[cite:n]` mogą odnosić się do kolejności pozycji, ale audyt nie potwierdził tego mapowania ani treści źródeł. Nie oznaczamy ich jako materiałów całkowicie pozbawionych bibliografii. Dokładne lokalizatory zarzutów mechanicznych: komunikacja linie 131–163 (pieczęcie, Szczęście, test Odporności, generalizacje prowincji), gospodarka linie 125–129 (rutynowy test zasobów i modem). Konflikt zakresu dostępu: komunikacja linia 73 oraz 123 kontra gospodarka linia 127.

## Materiały MG i transkrypty

Inwentaryzacja: `Chaosium` — 279 MD; `Poradniki MG` — 78 MD; `SethSkorkowsky` — 207 MD. Nie oznacza to przeczytania wszystkich transkryptów. Transkrypcje automatyczne mają błędy rozpoznawania nazw i terminów; nie cytowano ich jako literalnych zapisów zasad.

| Plik lokalny | Lektura i użycie |
|---|---|
| `Dead Ends _ Running the Game.md` | Cały krótki transkrypt; argument o ślepych zaułkach i wielu drogach. Źródło w metadanych: [materiał wideo](https://youtube.com/watch?v=Uw-j-vjEAAo), nie odtwarzano wideo |
| `Building Calendars and Tracking Time _ Running the Game.md` | Wybrane partie, w tym okolice linii 140–215; znaczenie czasu kampanii. Nie importowano zasad leczenia D&D |
| `Poradniki MG/Worldbuilding and Lorebuilding - RPG Tutorials _ Game Master_s Guide.md` | Początkowa część i wskazówki o informacji użytecznej w scenie; [link z metadanych](https://youtube.com/watch?v=-ygfUoYPAZw) |
| `SethSkorkowsky/Cthulhu by Gaslight - RPG Review.md` | Początkowa część, identyfikacja wydań i charakter dodatku; [link z metadanych](https://youtube.com/watch?v=vT3UP8VVyvY) |

Linki pochodzą z lokalnych metadanych; audyt nie potwierdza bieżącej dostępności nagrań. Recenzja 7e nie upoważnia do przeniesienia zasad poprzedniej edycji. Materiały innych systemów oznaczono wyłącznie jako warsztat MG.

## Zasada cytowania i klasyfikacji

- RAW: wskazana reguła w książce podstawowej CoC 7e i dokładna strona.
- Zasada dodatku: jawnie nazwany dodatek/wariant; nie staje się domyślnym RAW.
- Porada MG: sugestia prowadzenia, także gdy pochodzi z rozdziału MG książki podstawowej.
- Fakt historyczny: wymaga źródła, zakresu czasu/miejsca i poziomu dostępności; sam prompt albo synteza bez odtworzonych przypisów nie wystarcza.
- Decyzja aplikacji: architektura, komunikaty, fallback, priorytety oraz rekomendacje audytu.

W repo pozostawiono raport, lokalizatory i własne wyniki techniczne. Nie ma kopii podręczników, ich tekstów, stron ani transkryptów.
