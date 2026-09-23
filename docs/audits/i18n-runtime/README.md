# Audyt Zachowania Runtime Przełącznika Języków (PL/EN) i Integralności Sesji (Issue #80)

> **Status audytu:** Zrealizowany (Zgodny z Issue #80 i Epic #2)  
> **Data:** Wrzesień 2026  
> **Projekt:** Strażnik Tajemnic AI (Call of Cthulhu 7e RAW)  
> **Wersja bazowa:** v0.9.5  
> **Rygor architektoniczny:** Session-Bound Single Source of Truth (SSOT), 100% symetria słowników PL/EN (6512 kluczy), Zero-Effort Immersion & Diegetic Continuity

---

## 1. Wprowadzenie i Cel Audytu

Celem niniejszego audytu jest formalna weryfikacja zachowania aplikacji **Strażnik Tajemnic AI** przy dynamicznej zmianie języka interfejsu (PL <-> EN), audyt granic spójności sesji RPG, analiza odporności formularza Kreatora Badacza, zbadanie wpływu locale na prompt systemowy aktywnego czatu Mistrza Gry oraz eliminacja potencjalnych anomalii hydratacji Next.js związanych ze słownikami `next-intl`.

Aplikacja wspiera pełną dwujęzyczność (język polski i angielski) z zachowaniem restrykcyjnych reguł Call of Cthulhu 7e RAW. Każda sesja generuje rozległą historię dialogów, wycinki handoutów, portrety, karty postaci oraz wpisy do Dziennika Badacza. 

### Kluczowa Decyzja Architektoniczna i Kierunek Produktowy (PO Alignment)
W toku konsultacji z Product Ownerem (Jakub Orłowski) ustalono:
1. **Powitalny Ekran Wyboru Języka (`LanguageSelectionModal`) pozostaje Jedynym Źródłem Prawdy (SSOT):**  
   Dotychczasowy modal wyboru języka i systemu miar uruchamiany na starcie aplikacji działa w 100% stabilnie i odpowiada na potrzeby gracza.
2. **Odrzucenie inwazyjnego Hot-Swapa w locie podczas aktywnej gry:**  
   Strażnik Tajemnic jest grą o głębokiej immersji fabularnej. Dynamiczne przełączanie języka w trakcie trwającej sesji (np. z bocznego paska czy menu ustawień) jest **niepożądane produktowo i diegetycznie**, ponieważ prowadzi do rozbicia narracji (Bilingual Dialogue Split) i zanieczyszczenia kontekstu modelu LLM. Wybór języka ma charakter sesyjny (**Session-Bound Locale**).
3. **Zapis gry (`save.json`) jako kotwica językowa:**  
   Wczytanie zapisu gry utworzonego w danym języku musi automatycznie dostroić interfejs aplikacji do języka tego zapisu, gwarantując pełną spójność historii i dalszych odpowiedzi Mistrza Gry.

---

## 2. Inwentaryzacja Architektury i Przepływu Danych i18n

Przeprowadzono analizę statyczną i dynamiczną mechanizmów internacjonalizacji w silniku aplikacji (`_tester/_base/.silnik/src/`).

### 2.1. Topologia Tras i Middleware

```
[Żądanie HTTP / Otwarcie Okna]
        │
        ▼
[src/middleware.ts (next-intl/middleware)]
        ├─► Przypisanie / weryfikacja nagłówka trace ID (x-trace-id)
        ├─► Rozstrzygnięcie locale: cookie NEXT_LOCALE lub domyślne 'pl'
        ├─► Wstrzyknięcie nagłówka: x-next-intl-locale
        └─► Przekierowanie do segmentu trasy: /[locale]/...
                │
                ▼
        [src/app/layout.tsx (RootLayout)]
                ├─► Odczyt x-next-intl-locale z nagłówków
                ├─► <html lang={locale} suppressHydrationWarning>
                └─► Montaż globalnych dostawców
                        │
                        ▼
                [src/app/[locale]/layout.tsx (LocaleLayout)]
                        ├─► Weryfikacja: routing.locales.includes(locale)
                        ├─► setRequestLocale(locale)
                        ├─► await getMessages() (Słownik JSON: 6512 kluczy)
                        └─► <NextIntlClientProvider locale={locale} messages={messages}>
                                │
                                ▼
                        [Strona / Widok Gry (src/app/[locale]/page.tsx)]
```

### 2.2. Stan Symetrii Słowników
Weryfikacja skryptem `npm run i18n:check` wykazuje pełną, 100% symetrię drzew kluczy:
- `messages/pl.json`: **6512 kluczy**
- `messages/en.json`: **6512 kluczy**
- Brak brakujących tłumaczeń (`MISSING_MESSAGE` count = 0 na wszystkich głównych trasach).

---

## 3. Szczegółowa Analiza 4 Obszarów Audytu

### 3.1. Obszar 1: Zachowanie Stanu Formularza w Kreatorze Badacza (`character-wizard.tsx`)

#### Stan Faktyczny
- Kreator postaci (`CharacterWizardV2`) zarządza rozbudowanym stanem: 8 cech podstawowych (STR, CON, SIZ, DEX, APP, INT, POW, EDU), cechy pochodne (HP, MP, SAN, Ruch, Budowa), wybór profesji, pula punktów zawodowych i zainteresowań, ekwipunek oraz dane biograficzne (imię, wiek, wygląd, ideologia, ważne miejsca i osoby).
- Wszystkie te dane przechowywane są wyłącznie w ulotnej pamięci komponentu React (`useState`).
- Plik `character-wizard.tsx` nie korzysta obecnie z `localStorage` ani `sessionStorage`.

#### Analiza Podatności na Zmianę Języka / Odświeżenie
1. **Utrata Danych po Przeładowaniu:** Jeśli gracz w trakcie wypełniania 5-krokowego kreatora zmieni język w adresie URL (np. wpisując `/en` zamiast `/pl`) lub nieumyślnie odświeży stronę (skrót Cmd+R / F5), następuje pełny unmount komponentu. Cały dotychczasowy postęp (wylosowane rzuty kośćmi, rozdysponowane punkty i opisy) ulega bezpowrotnemu skasowaniu.
2. **Klucze Domenowe CoC 7e RAW a Lokalizacja:**  
   W kodzie `character-wizard.tsx` nazwy umiejętności (`BASE_SKILLS`) oraz profesji (`OCCUPATIONS`) są zdefiniowane po polsku jako kanoniczne klucze domenowe:
   ```typescript
   // character-wizard.tsx:94-98
   // Nazwy umiejętności są kluczami danych aplikacji (BASE_SKILLS/OCCUPATIONS w
   // lib/data/character) i pozostają po polsku niezależnie od locale UI.
   ```
   Interfejs użytkownika tłumaczy te etykiety na język angielski wyłącznie w warstwie prezentacji za pomocą hooka `useTranslations('skills')`. Dzięki temu struktura danych postaci jest odporna na błędy parsowania mechanik d100 i zachowuje pełną spójność niezależnie od wybranego języka interfejsu.

#### Wnioski i Rekomendacja (TASK-I18N-01)
Wdrożyć lekki hook persystencji szkicu w `sessionStorage` (`useWizardDraft`). Stan formularza powinien być automatycznie serializowany przy każdej zmianie kroku. W przypadku przeładowania strony lub zmiany segmentu językowego w URL, Kreator wykrywa obecność szkicu i pozwala graczowi na kontynuację bez konieczności ponownego losowania cech.

---

### 3.2. Obszar 2: Wpływ Zmiany Języka na Prompt Systemowy Aktywnego Czat MG

#### Stan Faktyczny
- Generator promptu Mistrza Gry (`getGameMasterPrompt` w `prompts-generator.ts`) przyjmuje parametr `locale: 'pl' | 'en'`.
- Na podstawie `locale` generowane są kluczowe dyrektywy:
  - **ROLE LOCK:** `SECURE INSTRUCTIONS` (You are the Keeper of Secrets...) vs `DRUGA PAMIĘĆ` (Jesteś Strażnikiem Tajemnic...).
  - **Zasada Kompletności:** `COMPLETENESS RULE` vs `ZASADA KOMPLETNOŚCI`.
  - **Przewodnik Stylu Lovecrafta:** `getLovecraftStylePrompt(locale, measurementSystem)` dostosowujący słownictwo i metaforykę grozy kosmicznej oraz jednostki (metryczne vs imperialne).
  - **Session Zero:** Instrukcje kalibracji wrażliwości i stylu narracji.
- W potoku czatu (`run-chat-pipeline.ts:324`) prompt budowany jest per-żądanie:
  ```typescript
  const systemPrompt = getGameMasterPrompt(aiSettings, locale);
  ```

#### Analiza Skutków Dynamicznej Zmiany Języka "W Locie"
Gdyby aplikacja zezwalała na przełączanie języka w trakcie toczącej się rozgrywki:
1. **Bilingual Dialogue Split (Rozbicie Dwujęzyczne):**  
   Wiadomości dotychczasowe (`chat.messages`) znajdujące się w historii kontekstu pozostałyby w języku pierwotnym (np. polskim). Nowe zapytanie przesłałoby prompt systemowy w języku angielskim wraz z historią po polsku.
2. **Degradacja Spójności LLM:**  
   Modele językowe (np. Gemini 2.5 Flash / Pro) przy nagłej zmianie języka dyrektyw systemowych mają tendencję do:
   - Halucynowania nazw własnych i poszlak (tłumaczenie nazwisk NPC i lokacji w locie),
   - Utraty pamięci o wcześniej odkrytych wskazówkach z Dziennika Sesji,
   - Generowania odpowiedzi hybrydowych (częściowo po angielsku, częściowo po polsku).

#### Wnioski i Potwierdzenie Założenia PO
Brak przełącznika języka w bocznej belce nawigacji i oknie czatu jest **świadomym i pożądanym zabezpieczeniem architektonicznym**. Sesja prowadzona jest hermetycznie w wybranym języku. Zmiana języka wymaga rozpoczęcia nowej przygody lub wczytania innego zapisu.

---

### 3.3. Obszar 3: Integralność i Zgodność Zapisu Gry (`FullGameSave` / `save.json`)

#### Stan Faktyczny
W pliku `src/lib/full-game-save-manager.ts` zdefiniowano interfejs `FullGameSave`. Zawiera on m.in. metadane sesji, historię wiadomości, obrazy, stan postaci, konfigurację hot-seat, tablicę śledczą oraz stan reguł CoC 7e.

```typescript
export interface FullGameSave {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  // ... brak jawnego pola locale!
  messages: Message[];
  gameSettings: { aiSettings: AISettings };
  characters: Character[];
  // ...
}
```

#### Zidentyfikowana Luka Integralności
1. **Brak Deklaracji Języka w Zapisie:** W strukturze `FullGameSave` brakuje pola `locale`.
2. **Scenariusz Błędu:**
   - Gracz rozpoczyna grę po angielsku (`/en`), generuje 30 wiadomości i zapisuje stan gry do pliku `save-london-fog.json`.
   - Następnego dnia gracz uruchamia aplikację na nowym urządzeniu / po resecie cookies i wybiera język polski (`/pl`).
   - Gracz wczytuje `save-london-fog.json`.
   - **Skutek:** UI aplikacji, menu i etykiety renderują się po polsku, natomiast historia czatu, notatki i portrety są po angielsku. Kolejne zapytanie do `/api/chat` wysyła `locale: 'pl'`, przez co Mistrz Gry zaczyna odpowiadać po polsku na angielskie kwestie badacza.

#### Wnioski i Rekomendacja (TASK-I18N-02)
1. Rozszerzyć interfejs `FullGameSave` o opcjonalne pole `locale?: 'pl' | 'en'`.
2. Przy tworzeniu zapisu (`createFullSave`) zawsze zapisywać aktualne `locale` sesji.
3. W hooku `useFullSave.ts` w funkcji `handleLoadFullSave`:
   - Jeśli wczytywany zapis zawiera `save.locale` i różni się ono od bieżącego `currentLocale`:
   - Aplikacja automatycznie aktualizuje `localStorage.setItem('language_selected', save.locale)` i wywołuje `router.replace(pathname, { locale: save.locale })`.
   - Zapewnia to natychmiastową, 100% spójność językową wczytanej przygody.

---

### 3.4. Obszar 4: Eliminacja Błędów Hydratacji Next.js i Analiza Słowników

#### Stan Faktyczny
Aplikacja korzysta z biblioteki `next-intl` w architekturze Next.js App Router:
- `src/app/layout.tsx` (RootLayout):
  ```typescript
  const h = await headers();
  const locale =
    h.get('x-next-intl-locale') ??
    (await cookies()).get('NEXT_LOCALE')?.value ??
    'pl';

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className="font-serif" suppressHydrationWarning>
        <PHProvider>
          {children}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  );
  ```
- `src/app/[locale]/layout.tsx` (LocaleLayout):
  ```typescript
  export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const messages = await getMessages();

    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PHProvider>
          {children}
          <DesktopUpdateNotifier />
          <Toaster />
        </PHProvider>
      </NextIntlClientProvider>
    );
  }
  ```

#### Zidentyfikowane Anomalie Architektoniczne
1. **Podwójny Montaż Dostawców (`PHProvider` i `Toaster`):**  
   Komponenty `<PHProvider>` oraz `<Toaster />` są renderowane równolegle w `src/app/layout.tsx` ORAZ w `src/app/[locale]/layout.tsx`. Powoduje to zdublowane nasłuchiwanie zdarzeń toastów i zbędną rekurencję w drzewie kontekstu React.
2. **Tłumienie Hydratacji (`suppressHydrationWarning`):**  
   Użycie flagi na `<html>` i `<body>` w `RootLayout` maskuje potencjalne rozjazdy atrybutów między serwerem a klientem. W środowisku produkcyjnym mechanizm middleware (`x-next-intl-locale`) zapewnia deterministyczny nagłówek, jednak duplikacja providerów powinna zostać wyczyszczona.

#### Wnioski i Rekomendacja (TASK-I18N-03)
Usunąć nadmiarowy montaż `<PHProvider>` i `<Toaster />` z `src/app/layout.tsx`, pozostawiając je wyłącznie w `src/app/[locale]/layout.tsx`, gdzie kontekst `locale` i `messages` jest w pełni zainicjalizowany.

---

## 4. Macierz Zadań Wdrożeniowych (Backlog Action Matrix)

Poniższa macierz stanowi kanoniczny plan realizacji zaleceń audytu, przygotowany do rozpisania na niezależne karty GitHub Issues:

| ID Zadania | Nazwa / Zakres Zadania | Komponenty do modyfikacji | Priorytet | Wpływ na gracza / UX |
|---|---|---|---|---|
| **TASK-I18N-01** | **Draft Persistence w Kreatorze Badacza** | `src/components/ui/character-wizard.tsx`, `src/hooks/useWizardDraft.ts` | P2 | Ochrona przed utratą wylosowanych cech i wpisanych danych przy przypadkowym odświeżeniu/zmianie adresu URL. |
| **TASK-I18N-02** | **Pole `locale` w `FullGameSave` i auto-synchronizacja** | `src/lib/full-game-save-manager.ts`, `src/hooks/useFullSave.ts` | P1 | Wczytanie zapisu gry automatycznie przełącza interfejs na właściwy język kampanii; zero rozbicia narracji MG. |
| **TASK-I18N-03** | **Deduplikacja providerów w Layoutach Next.js** | `src/app/layout.tsx`, `src/app/[locale]/layout.tsx` | P3 | Czyste drzewo DOM bez zdublowanych instancji `Toaster` i `PHProvider`; optymalizacja cyklu hydratacji React 19. |

---

## 5. Podsumowanie i Decyzja Odbiorcza

- **Stan obecny:** Mechanizm wyboru języka na starcie aplikacji (`LanguageSelectionModal`) jest w pełni sprawny, stabilny i pozytywnie oceniony przez Product Ownera.
- **Odporność mechanik CoC 7e:** Klucze danych umiejętności i profesji pozostają kanonicznie po polsku, gwarantując niezawodność logiki silnika d100.
- **Rekomendacja końcowa:** Utrzymać model **Session-Bound Locale**. Zrealizować zadania `TASK-I18N-01` i `TASK-I18N-02` w kolejnych iteracjach deweloperskich.
