# Dowody techniczne

- `era-jest.log`: 49 testów / 11 zestawów, pierwotny HEAD raportu.
- `era-probes.json` i `era-probes.cjs`: wykonywane funkcje źródłowe; 14 przypadków i 112 punktów granicznych. Skrypt używa lokalnych ścieżek runtime, nie modelu.
- `era-browser-results.json`: próba na istniejącym 4050; problemy JS/CSS. `era-selector-en.png` obejrzano.
- `era-fresh-browser-results.json`: selektor PL/EN na kopii 4057. `era-fresh-selector-pl.png` i `era-fresh-selector-en.png` obejrzano.
- `era-custom-results.json`: brak roku/kraju oraz zapis 1943/PL w formularzu własnym. `era-custom-pl.png` i `era-custom-en.png` obejrzano.
- Skrypty `.cjs` pokazują izolację przeglądarki, atrapy i zakres blokowanej sieci. Przepisanie portu nie jest dowodem, że testowano dany port; obowiązują wyniki i opis raportu.
- `source-inventory.json`: nazwy i rozmiary 4391 plików materiałów; brak ich treści.
- `era-import-results.json` i `era-import.cjs`: nieudana próba po wznowieniu; wszystkie przypadki zakończyły się przed wejściem do aplikacji. Brak pozytywnego dowodu importu. Pierwsza próba zawiesiła się bez końcowego JSON, druga zachowała błędy połączenia.

Pierwotny HEAD: `0a3c2be081d137caf0d9ee8abdb6427946d18573`. Kopia 4057 korzysta ze źródeł tego przebiegu, nie z aktualizowanej później gałęzi. Atrapa statusu podręcznika nie potwierdza działania RAG. Skrypty przeglądarkowe nie uruchamiają serwera samodzielnie i nie korzystają z profilu użytkownika.

Po wznowieniu, HEAD `52a5f5081487dbd1f48fef0dbfb10c3b09fe3704`: bezpośrednie `tsc --noEmit --incremental false` zakończyło się kodem 0 bez diagnostyk; mapa nawigacji PASS, bramka PR SKIP, słowniki 5521/5521 PASS. Są to wyniki ponownej kontroli, nie zmiana wcześniejszego logu.
