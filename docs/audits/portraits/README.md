# Audyt portretów predefiniowanych postaci

Data baseline: 2026-09-01.

## Wynik maszynowy

- Aktywne presety: 46.
- Presety uniwersalne: 30.
- Presety Strefy 11: 16.
- Pliki WebP: 70.
- Pliki obecnie referencjonowane: 46.
- Brakujące pliki: 0.
- Jeden plik używany przez więcej niż jedną aktywną postać: 0.
- Pliki bez aktywnej referencji: 24.
- Pary identycznych plików po SHA-256: 4.

Identyczne pary:

- `barbara-zawadzka.webp` i `barbara_zawadzka.webp`
- `helena-krawczyk.webp` i `helena_krawczyk.webp`
- `ryszard-kaczmarek.webp` i `ryszard_kaczmarek.webp`
- `tomasz-nowicki.webp` i `tomasz_nowicki.webp`

Nie usuwać żadnego z 24 plików przed zatwierdzeniem remapów i ponownym skanem referencji.

## Arkusze

- `all-portraits-contact-sheet.webp` - wszystkie 70 plików.
- `strefa11-current-vs-name-match.webp` - po lewej obecne przypisanie, po prawej dedykowany plik zgodny z nazwą postaci.

## Presety uniwersalne

Wstępna decyzja po odczycie arkusza:

- `keep`: Arthur Pendleton, Beatrice Vance, Archibald Blackwood, Cordelia Ashford, Ronald Shaw, Alexandra Croft, Alistair Sterling, Edith Cavell, Thomas O'Brien, Margaret Sullivan, William Dyer, Dorothy Updike, Gerald Grant, Agnes Mason, Henry Whitman, Evelyn Sterling, David Miller, Chloe Vance, Eric Carter, Elena Rostova, Marcus Vance, Jessica Cross, Christian Cole, Maya Patel, Vivienne Moreau, Iris Blackwell, Victor Crowley i Seraphina Marsh.
- `regenerate` po v0.9.4: Nathaniel Ward - odstający kadr całej sceny i ozdobna rama; Silas Thorne - zbyt jawna stylizacja okultystyczna względem neutralnego portretu dokumentalnego.

Decyzje są wizualnym baseline, nie zgodą na wygenerowanie lub podmianę assetu.

## Strefa 11 - remapy do akceptacji PO

| Postać | Obecny plik | Proponowany plik | Decyzja |
|---|---|---|---|
| Tomasz Nowicki | `tadeusz-krawiec.webp` | nowy portret PRL 1973-1974 | `regenerate` |
| Helena Krawczyk | `ewa-nowak.webp` | nowy portret PRL 1973-1974 | `regenerate` |
| Dr Barbara Zawadzka | `magdalena-koper.webp` | nowy portret PRL 1973-1974 | `regenerate` |
| Ryszard Kaczmarek | `marek-dabrowski.webp` | nowy portret PRL 1973-1974 | `regenerate` |
| Inż. Marek Kamiński | `jerzy-kossak.webp` | `marek_kaminski.webp` | `remap` |
| Tomasz Wójcik | `wiktor-lesniewski.webp` | `tomasz_wojcik.webp` | `remap` |
| Anna Dąbrowska | `alicja-rudzka.webp` | `anna_dabrowska.webp` | `remap` |
| Dr Ewa Wiśniewska | `krystyna-mroczek.webp` | `ewa_wisniewska.webp` | `remap` |
| Ksiądz Jan Kaczmarek | `stanislaw-wilczek.webp` | `jan_kaczmarek.webp` | `remap` |
| Andrzej Zalewski | `piotr-wolski.webp` | `andrzej_zalewski.webp` | `remap` |
| Marta Kamińska | `janina-rozycka.webp` | `marta_kaminska.webp` | `remap` |
| Zofia Sadowska | `danuta-kwiecien.webp` | `zofia_sadowska.webp` | `remap` |
| Artur Majchrzak | `antoni-lis.webp` | `artur_majchrzak.webp` | `remap` |
| Piotr Wójcicki | `krzysztof-boruta.webp` | `piotr_wojcicki.webp` | `remap` |
| Dr Krystyna Zawada | `zofia-mierzejewska.webp` | `krystyna_zawada.webp` | `remap` |
| Karolina Maj | `irena-bielska.webp` | `karolina_maj.webp` | `remap` |

Dwanaście proponowanych remapów ma istniejące pliki. Cztery portrety do `Cienia nad Prabutami` jeszcze nie istnieją w zatwierdzonej wersji z lat 70. Cztery wybrane nazwy z myślnikiem mają identyczny odpowiednik z podkreśleniem, ale te kopie nie rozwiązują błędu epoki.

## Decyzja historyczna Strefy 11

`Cień nad Prabutami` rozgrywa się w całości zimą 1973-1974. Postacie nie są podróżnikami z przyszłości. Tomasz Nowicki, Helena Krawczyk, Barbara Zawadzka i Ryszard Kaczmarek wymagają nowych biografii, wyposażenia i portretów zgodnych z PRL 1973-1974. Ich wcześniejsze propozycje `remap` tracą ważność i otrzymują decyzję `regenerate`.

## Bramka zmiany

Remapy można wdrożyć dopiero po zaakceptowaniu przez PO arkusza `strefa11-current-vs-name-match.webp`. Regeneracje wymagają osobnej akceptacji promptu i finalnego obrazu.
