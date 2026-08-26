# Manual spójności epok

Status: Faza 1 - struktura i trzy profile przykładowe do zatwierdzenia  
Wersja kontraktu: 1  
Wersja reguł: 1.0.0

## 1. Cel

Ten manual określa, jak aplikacja dobiera realia historyczne, treść narracji i assety. Kod jest źródłem stanu gry. Model AI opisuje świat, ale nie decyduje, czy technologia, przedmiot albo asset jest dostępny w danym roku.

Manual ma dwie warstwy:

1. Ten dokument opisuje zasady dla człowieka.
2. Rejestr w `src/lib/era/` przechowuje reguły używane przez kod.

Zmiana zasad wymaga aktualizacji obu warstw i podniesienia `rulesVersion`.

## 2. Kanoniczny kontekst epoki

Każda operacja dotycząca świata gry otrzymuje jeden `ResolvedEraContext`:

```ts
interface ResolvedEraContext {
  schemaVersion: 1;
  sceneDate: string | null;
  effectiveYear: number;
  countryCode: string;
  regionProfile: 'PL' | 'US' | 'GB' | 'GLOBAL';
  source: 'scene-time' | 'scenario-range' | 'user-selection' | 'custom-profile';
  rulesVersion: string;
  customProfileId?: string;
}
```

Kolejność wyboru roku:

1. Aktualny rok zegara sceny.
2. Pierwszy rok zakresu scenariusza.
3. Jawny wybór użytkownika.
4. Rok z jawnego profilu custom.

Pola `era` i `eraLabel` służą tylko do prezentacji oraz zgodności ze starymi zapisami. Nie wolno na ich podstawie wybierać postaci, przedmiotów, promptów ani obrazów.

Brak roku jest błędem wymagającym decyzji użytkownika. Aplikacja nie może domyślnie przejść do 1920 roku.

## 3. Rok i region

Rok określa wspólny rdzeń technologiczny. Region nakłada lokalne realia.

Pierwsza wersja obsługuje zatwierdzone nakładki:

- `PL` - Polska;
- `US` - Stany Zjednoczone;
- `GB` - Wielka Brytania;
- `GLOBAL` - neutralny fallback.

Fallback `GLOBAL` może korzystać tylko z reguł wspólnych i zatwierdzonych. Nie może wymyślać lokalnych marek, urzędów, mundurów, numerów telefonów ani nazw instytucji.

Nieznany kraj zachowuje swój kod ISO, jeśli aplikacja go posiada, ale korzysta z nakładki `GLOBAL`. Nieznana nazwa bez kodu otrzymuje kod `ZZ`.

## 4. Dostępność i wyjątki

Każdy przedmiot, technologia, typ stroju i asset używa przedziału:

```ts
interface EraAvailabilityWindow {
  validFrom: number;
  validTo: number;
  regions?: Array<'PL' | 'US' | 'GB' | 'GLOBAL'>;
}
```

Przedział jest domknięty. Element jest dostępny w latach `validFrom` i `validTo`.

Element spoza przedziału nie trafia do aktywnego stanu gry. Kod blokuje go przed generacją obrazu i przed dodaniem do ekwipunku.

Dozwolone wyjątki:

- `mythos` - przedmiot lub zjawisko nadnaturalne świadomie łamie realia;
- `time-anomaly` - scenariusz świadomie wprowadza obiekt z innego czasu.

Wyjątek musi zawierać scenariusz, zakres lat i uzasadnienie. Sam tekst narracji albo nietypowy prompt nie tworzy wyjątku.

## 5. Zakres informacji w profilu

Każdy profil okresu i regionu opisuje:

1. Technologię i zasilanie.
2. Łączność.
3. Transport i pojazdy.
4. Broń i dostępność specjalistycznego sprzętu.
5. Ubiór, fryzury i materiały.
6. Zawody i przedmioty osobiste.
7. Architekturę, wnętrza, ogrzewanie i oświetlenie.
8. Media, dokumenty i handouty.
9. Ceny, walutę i dostępność towarów.
10. Instytucje, język i zwyczaje społeczne.
11. Kierunek wizualny portretów, lokacji, scen i przedmiotów.
12. Listę elementów zakazanych.

Profil nie jest encyklopedią. Ma dostarczać kilka konkretnych reguł potrzebnych do bieżącej sceny.

## 6. Pochodzenie i zatwierdzanie reguł

Każdy profil zawiera:

- źródło i link, jeśli jest dostępny;
- rodzaj źródła: pierwotne, wtórne albo wewnętrzne;
- status weryfikacji źródła;
- poziom pewności: niski, średni albo wysoki;
- status profilu: draft, approved, rejected albo quarantined.

Kod produkcyjny może automatycznie stosować wyłącznie profil `approved`. Profil `draft` służy do przeglądu. Brak zweryfikowanego źródła blokuje zmianę statusu na `approved`.

Informacja historyczna, decyzja projektowa i wyjątek Mythos muszą pozostać osobnymi wpisami.

## 7. Zasady według rodzaju treści

### 7.1 Narracja

- Narracja otrzymuje rok i region, a nie ogólną etykietę epoki.
- Opis lokacji dobiera oświetlenie, ogrzewanie i łączność z aktywnego profilu.
- Przykłady z lat 20. nie mogą trafiać do innych okresów jako reguła ogólna.
- Model nie może sam zatwierdzić technologii spoza rejestru.

### 7.2 Postacie i portrety

- Postać predefiniowana ma scenariusz, rok, region oraz zatwierdzony asset.
- Ubiór, fryzura i rekwizyty portretu muszą mieścić się w przedziale assetu.
- Postać tworzona podczas gry dziedziczy aktualny `ResolvedEraContext`.
- Brak kontekstu blokuje generację portretu.

### 7.3 Przedmioty

- Dostępność jest sprawdzana przed dodaniem do ekwipunku.
- Przedmiot predefiniowany używa zatwierdzonego assetu katalogowego.
- Przedmiot zdobyty podczas sesji może dostać asset dynamiczny.
- Prompt obrazu nie zastępuje walidacji dostępności.

### 7.4 Lokacje i sceny

- Lokacja dziedziczy rok i region sceny.
- Budynki historyczne mogą zachować starsze elementy, lecz aktualne instalacje wynikają z roku sceny.
- Obecność reliktu z przeszłości nie zmienia całej sceny w starszą epokę.

### 7.5 Handouty i dokumenty

- Data dokumentu pochodzi z czasu sceny albo jawnej daty fabularnej.
- Typ papieru, druk, język urzędowy, gazeta i instytucja pochodzą z profilu regionalnego.
- Arkham, rok 1928 i Western Union nie są wartościami domyślnymi.

### 7.6 Cache i zapis gry

- Fingerprint epoki zawiera rok, kraj, nakładkę regionalną i wersję reguł.
- Asset z innym fingerprintem nie może zostać ponownie użyty bez walidacji.
- Dynamiczny asset zapisuje kontekst powstania, ale nie trafia automatycznie do katalogu wspólnego.

## 8. Profile przykładowe

Poniższe profile mają status `draft`. Opisują docelowy format, ale wymagają uzupełnienia źródeł i zatwierdzenia przed użyciem produkcyjnym.

### 8.1 USA, rok 1920

- Zakres: 1920-1929.
- Łączność: telefon stacjonarny, telegram, list.
- Transport: pociąg, samochód z epoki, statek parowy.
- Media: gazeta drukowana, telegram, maszynopis.
- Obraz: materiały, kroje i fotografia właściwe dla początku lat 20.
- Zakazane: telefon komórkowy, smartfon, powerbank, komputer osobisty.
- Status źródeł: do uzupełnienia.
- Status profilu: draft.

### 8.2 Polska, rok 1973

- Zakres: 1973-1974.
- Łączność: telefon stacjonarny, telegram, list.
- Transport: kolej, PKS, samochód z epoki PRL.
- Media: prasa drukowana, legitymacja, maszynopis urzędowy.
- Instytucje: milicja, zakład pracy, urząd państwowy.
- Obraz: analogowa fotografia oraz polskie rekwizyty regionalne.
- Zakazane: telefon komórkowy, smartfon, powerbank, internet, laptop.
- Status źródeł: do uzupełnienia.
- Status profilu: draft.

### 8.3 Polska, rok 2001

- Zakres: 2000-2006.
- Łączność: telefon stacjonarny, telefon komórkowy z klawiaturą, SMS i internet modemowy.
- Technologia: kineskopowy monitor, VHS, dyskietka, aparat analogowy lub wczesny cyfrowy.
- Transport: samochód z przełomu lat 90. i 2000., kolej i autobus.
- Media: gazeta, kaseta VHS, wydruk komputerowy.
- Obraz: wczesna fotografia cyfrowa lub analogowa, bez współczesnych urządzeń dotykowych.
- Zakazane: smartfon, iPhone, powerbank, tablet i współczesny ultrabook.
- Status źródeł: do uzupełnienia.
- Status profilu: draft.

## 9. Profile przyszłości i custom

Rejestr podstawowy obejmuje lata do 2026. Późniejszy rok wymaga jawnego profilu custom zawierającego:

- identyfikator;
- rok i region;
- własną wersję reguł;
- dostępne i zakazane technologie;
- kierunek wizualny;
- źródło założeń albo oznaczenie fikcji projektowej.

Profil custom nie może dziedziczyć zasad 1920 ani współczesności przez brak danych.

## 10. Checklista publikacji profilu

Profil można oznaczyć jako `approved`, gdy:

- ma pełny zakres `validFrom` i `validTo`;
- ma region albo świadomie używa `GLOBAL`;
- opisuje wszystkie wymagane kategorie;
- każda istotna reguła ma zweryfikowane źródło;
- lista zakazów nie przeczy liście dostępnych elementów;
- testy granic przedziału przechodzą;
- użytkownik zatwierdził treść profilu;
- wersja reguł została podniesiona, jeśli zmiana wpływa na cache lub zapis gry.

## 11. Checklista nowej funkcji aplikacji

Każda nowa funkcja tworząca narrację, postać, przedmiot, lokację, dokument albo obraz musi:

1. Przyjąć `ResolvedEraContext`.
2. Nie odczytywać bezpośrednio `era` ani `eraLabel`.
3. Sprawdzić dostępność elementu przed zmianą stanu.
4. Obsłużyć jawny brak roku.
5. Zapisać fingerprint epoki przy assetach i danych zależnych od realiów.
6. Mieć test co najmniej dla 1920 USA, 1973 Polska i 2001 Polska.
