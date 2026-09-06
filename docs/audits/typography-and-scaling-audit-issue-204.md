# Raport z audytu typografii i skalowalności UI (Ekrany 16:9 oraz Apple Retina/Studio Display)

- **Projekt:** Strażnik Tajemnic AI
- **Zgłoszenie:** GitHub Issue [#204](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/204)
- **Data audytu:** 2026-09-06
- **Architektura docelowa:** Tylko ekrany desktopowe 16:9 (FHD 1080p, QHD 1440p, 4K UHD 2160p) oraz monitory Apple (MacBook Pro 14"/16" Retina, Studio Display 5K, Pro Display XDR 6K). Brak urządzeń mobilnych.

---

## 1. Streszczenie wykonawcze (Executive Summary)

Na monitorach 4K oraz ekranach Apple o wysokiej gęstości pikseli (Retina / Studio Display) interfejs aplikacji cierpi na **krytyczny spadek czytelności w modalach, dialogach i instrukcjach**. 

Główną przyczyną jest rozjazd pomiędzy klimatyczną typografią narracyjną (szeryfowy krój *Cormorant Garamond* o cienkich szeryfach) a techniczną warstwą interfejsu (modale, formularze, opisy statusów), w połączeniu z:
1. Arbitralnymi klasami mikrofontów: `text-[10px]` (ponad 90 wystąpień) i `text-[11px]` (ponad 40 wystąpień).
2. Sztywną, stałą jednostką bazową (`html { font-size: 16px }`), która na fizycznym ekranie 4K 16:9 renderuje glify o ułamkowej wielkości optycznej.
3. Niskim kontrastem ciemnego stylu Dark Art Déco: teksty wyciszone `text-muted-foreground/60` lub `text-brass/70` na tle ciemnych paneli (`#120f0b`) stają się zamazane i niewidoczne z normalnej odległości roboczej.

---

## 2. Inwentaryzacja obecnych krojów pisma (Font Inventory)

W `src/app/layout.tsx` ładowane są 4 rodziny Google Fonts:
1. **Cinzel** (`font-display`): krój nagłówkowy kapitałowy (all-caps) w stylu rzymsko-déco. Doskonały do tytułów, nazw sekcji i odznak.
2. **Cinzel Decorative** (`font-display-decorative`): krój ozdobny tytułowy. Stosowany na ekranie powitalnym.
3. **Cormorant Garamond** (`font-serif`): domyślny font całego `body`. Świetny do długiej narracji fabularnej (akapit 18-20px), ale **nieodpowiedni do małych etykiet UI i instrukcji w modalach** (cienkie szeryfy znikają przy skalowaniu).
4. **Special Elite** (`font-special-elite` / `font-mono`): krój maszyny do pisania. Klimatyczny w handoutach, raportach i dacie gry (*Anno Domini*), lecz przy wielkości poniżej 13px staje się zaszumiony i trudny w odbiorze.

**Luka architektoniczna:** Brak czystego, bezszeryfowego kroju systemowego (`sans-serif` np. Inter / SF Pro) dla warstwy czysto operacyjnej (przyciski pomocnicze, opisy techniczne, noty prawne, komunikaty błędów).

---

## 3. Matryca rozdzielczości docelowych (Target Display Matrix)

Aplikacja jest projektowana wyłącznie na ekrany panoramiczne (16:9) oraz ekosystem Apple:

| Środowisko / Ekran | Rozdzielczość fizyczna | Rozdzielczość logiczna (CSS viewport) | DPI / Skalowanie | Stan obecny UI | Wymagana korekta |
|---|---|---|---|---|---|
| **FHD 1080p (Standard)** | 1920 x 1080 | 1920 x 1080 | 1x (96-100 DPI) | Czytelny, modal poprawny | Baza referencyjna (1rem = 16px) |
| **QHD 1440p (27")** | 2560 x 1440 | 2560 x 1440 | 1x (~108 DPI) | Lekko za drobny | Skalowanie bazy 1.08x - 1.12x |
| **4K UHD (32"-43" 16:9)** | 3840 x 2160 | 3840 x 2160 (lub skalowane) | 1x - 1.5x (~140-160 DPI) | **Krytycznie mały** (zrzut z issue #204) | Skalowanie bazy 1.25x - 1.35x + szersze modale |
| **MacBook Pro 14"/16"** | 3024x1964 / 3456x2234 | 1512x982 / 1728x1117 | 2x Retina | Drobny w modalach | Optymalizacja paddingów i min. 13px dla etykiet |
| **Apple Studio Display 27"** | 5120 x 2880 (5K) | 2560 x 1440 (Pixel-doubled @2x) | 2x (218 DPI) | Za drobne detale przy 2560px | Skalowanie bazy 1.15x dla ekranów 5K |
| **Pro Display XDR 32"** | 6016 x 3384 (6K) | 3008 x 1692 (Pixel-doubled @2x) | 2x (218 DPI) | Za drobne opisy | Skalowanie bazy 1.25x |

---

## 4. Analiza zrzutu ekranu 4K (`RulebookModal`)

W oknie ładowania podręcznika CoC 7E (`RulebookModal.tsx`) zidentyfikowano:
1. **Nagłówek sekcji źródeł:** `text-xs font-display uppercase` (w `Cinzel` przy małym rozmiarze litery zlewają się w cienkie kreski).
2. **Opis źródeł:** `text-xs text-muted-foreground` w kroju Cormorant Garamond. Na monitorze 4K linie liter mają grubość zaledwie 1 piksela fizycznego.
3. **Paski pobierania (Black Monk / DriveThruRPG):** Przyciski z `text-xs` i cienkimi ramkami `border-brass/30`.
4. **Disclaimer prawny na samym dole:** `text-[10px] text-muted-foreground/60 italic`. W połączeniu z 60% przezroczystością na ciemnym tle tekst jest nie do odczytania bez lupy systemowej.
5. **Skala modalu:** Przy `size="wide"` (`w-[80vw] h-[78vh]`) kontener zajmuje dużą powierzchnię, ale treść wewnętrzna skupiona jest w wąskim pionowym pasku o miniaturowych fontach.

---

## 5. Zidentyfikowane długi typograficzne w kodzie

1. **Plaga klas `text-[10px]` i `text-[11px]`:**
   - 95 wystąpień `text-[10px]` w komponentach (m.in. `RulebookModal`, `language-selection-modal`, `inspection-lightbox-modal`, `combat-defense-dialog`, `chase-dialog`, `session-journal`).
   - 67 wystąpień `text-[11px]`.
   - Klasy te omijają centralną konfigurację Tailwind (`tailwind.config.ts`) i uniemożliwiają globalne zarządzanie skalą.
2. **Cormorant Garamond jako globalny fallback:**
   - Brak separacji pomiędzy tekstem fabularnym (klimat RPG) a interfejsem użytkownika (UI / funkcjonalność).
3. **Brak fluid-scalingu w `html`:**
   - W `globals.css` brak reguł skalowania bazowego `font-size` zależnego od viewportu (`clamp()` lub breakpointy `@media (min-width: 1921px)`).

---

## 6. Rekomendowany plan standaryzacji (Roadmapa naprawcza)

### Krok 1: Wprowadzenie adaptacyjnego skalowania bazy (Fluid Root Typography)
W `globals.css` ustalić dynamiczną bazę rem dla ekranów desktopowych 16:9 i wysokich rozdzielczości:
```css
/* Baza dla standardowego FHD (1080p) */
html {
  font-size: 16px;
}

/* Duże ekrany QHD oraz MacBooki 16" */
@media (min-width: 2000px) {
  html {
    font-size: 17.5px;
  }
}

/* Ekrany 4K UHD oraz Apple Studio Display / Pro Display XDR */
@media (min-width: 3000px) {
  html {
    font-size: 19.5px;
  }
}
```
*Dzięki temu wszystkie komponenty oparte na `rem` (Tailwind `text-xs`, `text-sm`, `p-4`, `h-9`) automatycznie zyskają proporcjonalną wielkość na 4K.*

### Krok 2: Podział ról typograficznych (Typographic Roles)
1. **Krój narracyjny (`font-serif` - Cormorant Garamond):** Zarezerwowany wyłącznie dla:
   - Wypowiedzi Mistrza Gry i graczy w czacie (min. 17-18px).
   - Treści fabularnych ksiąg, listów i cytatów.
2. **Krój nagłówkowy (`font-display` - Cinzel):**
   - Tytuły modali, nagłówki kart, kluczowe wskaźniki (min. 14px dla uppercase).
3. **Krój maszynowy (`font-special-elite`):**
   - Daty diegetyczne, pieczęcie, telegramy, metadane zapisu.
4. **Krój interfejsowy / operacyjny (`font-sans` - systemowy UI stack / Inter):**
   - Wprowadzić dla instrukcji w modalach, disclaimerów prawnych, podpowiedzi formularzy i etykiet statusowych. Zapewnia 100% ostrość glifów przy małych rozmiarach.

### Krok 3: Twarde reguły minimalnych rozmiarów i likwidacja `text-[10px]`
- **Zasada twarda:** Żaden tekst w aplikacji nie może mieć rozmiaru mniejszego niż `text-xs` (definiowanego centralnie w `tailwind.config.ts` jako minimum 12-13px dla sans i 14px dla szeryfów).
- Zastąpić wszystkie instancje `text-[10px]` i `text-[11px]` semantycznymi klasami `text-xs` lub `text-sm`.

### Krok 4: Wzmocnienie kontrastu
- Znieść podwójne wygaszanie: zakaz łączenia `text-xs` z `text-muted-foreground/60`.
- Ustalenie minimalnego poziomu krycia dla tekstów pomocniczych: min. `text-muted-foreground` (pełna jasność `#b3a892`) lub `text-brass/85`.
