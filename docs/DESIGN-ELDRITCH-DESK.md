# Strażnik Tajemnic AI - Design System: Eldritch Investigator Desk (Skeuomorphic Noir)

## 1. Filozofia i Architektura Wizualna
- **Główny paradygmat:** Aplikacja nie jest płaskim "programem SaaS", lecz **fizycznym Biurkiem Badacza Tajemnic z 1925 roku**. Każdy panel, przycisk i widok odpowiada namacalnemu rekwizytowi śledczemu.
- **Połączenie mechaniki z klimatem:**
  - Wszystkie 31 węzłów nawigacji (`docs/NAVIGATION_MAP.md`) i modali zachowują swoje identyfikatory, propsy i hooki.
  - Zamiast płaskich ramek Tailwind: bogate tekstury wiekowego drewna, garbowanej skóry, pożółkłego pergaminu, mosiężnych okuć i zielono-opalizującej poświaty runicznej ("Kolor z przestworzy").
  - 100% symetria i18n (`messages/pl.json` i `messages/en.json`) – brak hardcoded strings w rekwizytach.

---

## 2. Paleta Barw i Tokeny Stylistyczne

| Token | Wartość Hex / HSL | Fizyczny Rekwizyt / Znaczenie w Grze |
|---|---|---|
| `--desk-oak` | `#0b0e0c` / `220 18% 5%` | Blat biurka z ciemnego dębu, ciemność gabinetu noir |
| `--leather-binder` | `#1c1611` / `30 24% 9%` | Skórzana oprawa kroniki, tło bocznego panelu (Sidebar) |
| `--parchment-sheet` | `#d8ceb5` / `42 33% 78%` | Fiszka, telegram, karta postaci, pole maszynopisu |
| `--parchment-ink` | `#16130f` / `34 20% 7%` | Ciemny tusz maszynowy na pergaminie |
| `--brass-tarnished`| `#9e814d` / `38 35% 46%` | Postarzany mosiądz: okucia, klamry, nity, kompas |
| `--brass-bright`   | `#c9a227` / `45 68% 47%` | Aktywne obramowania, podświetlenia selekcji |
| `--eldritch-glow`  | `#1fe0a3` / `161 76% 50%`| Opalizująca ektoplazma / Kolor z przestworzy, aktywny focus, sukces krytyczny |
| `--eldritch-dim`   | `#0d9488` / `174 84% 32%`| Szmaragdowa lampa bankierska, statusy stabilne |
| `--wax-seal`       | `#7e2b1e` / `8 61% 31%`  | Czerwony lak woskowy: główny przycisk startu / rzutu |
| `--sanity-blood`   | `#b3322c` / `3 61% 44%`  | Utrata poczytalności, fobie, rany krytyczne |

---

## 3. Mapowanie Rzeczywistych Ekranów Aplikacji

### A. Ekran Startowy (`WelcomeScreen` & `start-mode-cards.tsx`)
- **Tło ekranu:** Blat z ciemnego dębu z rozłożoną, pożółkłą mapą Hrabstwa Essex / Doliny Miskatonic. W centrum opalizujący obłok eterycznego dymu.
- **Cytat wprowadzający (`WELCOME_QUOTES`):** Stylizowany na otwarty starożytny grimuar lub dziennik polowy z postrzępionymi kartkami. Tekst pojawia się z dźwiękiem maszyny do pisania.
- **Karta "Wznów sesję" (`ResumeCard`):** Skórzana teczka akt z mosiężnym klipsem i stemplem "Aktywne śledztwo" oraz datą ostatniego wpisu.
- **Wybór trybu gry (`StartModeCards`):**
  - **Szybka przygoda (`btn-quick-setup`):** Pudełko podróżne badacza z mosiężną tabliczką, gotowe do natychmiastowego otwarcia.
  - **Ręczna konfiguracja (`btn-manual-setup`):** Zestaw przyrządów pomiarowych, lupa śledcza i kompas rozłożone na biurku.

### B. Panel Ręcznego Przygotowania Gry (`manual-setup-panel.tsx`)
- **Forma wizualna:** Rozłożony duży segregator śledczy (Dossier Binder) z 5 metalowymi zakładkami:
  1. **Krok 1 (Tryb Solo / Duet):** Drewniane tabliczki z portretami (pojedyncza odznaka lub dwie spięte karty).
  2. **Krok 2 (Przygoda):** Pożółkła mapa z mosiężnym kompasem wskazującym lokację (Innsmouth, Arkham, Strefa 11).
  3. **Krok 3 (Postać / Badacz):** Teczka personalna ze zdjęciem sepiowym przypiętym metalowym spinaczem.
  4. **Krok 4 (Sesja Zero):** Kamienna tabliczka z wyrytymi runami eldritch i kołami zębatymi tajemnicy.
  5. **Krok 5 (Rozpocznij Grę):** Duża, wypukła pieczęć lakowa z symbolem Cthulhu – kliknięcie powoduje "odciśnięcie" pieczęci i przejście do gry.

### C. Główny Ekran Gry (`ChatLayout` & `ChatWindow`)
- **Pasek Górny (`ChatHeader`):**
  - Mosiężna listwa na szczycie biurka.
  - Pulsujący hieroglif / Oko Horusa w kolorze szmaragdowej lampy (`#1fe0a3`).
  - Zegar Kampanii (`CampaignClock`): stary zegarek kieszonkowy z cyframi rzymskimi i tykającą wskazówką.
  - Pineska Lokacji (`currentLocation · region`): wytłoczony mosiężny szyld hotelowy/uliczny.
- **Strumień Narracji (`ScrollArea` & `MessageCard`):**
  - **Opisy MG:** Formatowane jak stronice klasycznej powieści grozy (czcionka szeryfowa, lekko poszarpana lewa krawędź papieru).
  - **Rzuty kośćmi (`RollTestModal` / Tacka testu):** Kościane lub mosiężne kostki K100 toczące się po zielonym suknie tacki; pieczęć sukcesu/porażki woskiem.
  - **Ilustracje scen (`ImageLightbox`):** Formatowane jako sepiowe fotografie z lat 20. z białym, zniszczonym obramowaniem i odręcznym podpisem.
- **Pole Wprowadzania Akcji (`MessageInput`):**
  - Kasetka maszyny do pisania Underwood/Remington.
  - Papierowa rolka jako tło pola tekstowego (`#d8ceb5` z czarnym tuszem).
  - Przycisk wysłania: mosiężna dźwignia powrotu karetki telegrafu.
  - Detektor anachronizmów: czerwony stempel cenzorski z epoki.

### D. Panel Boczny (`CthulhuSidebar.tsx`)
- **Wizualna tożsamość:** Pionowy skórzany organizer przybornika po prawej stronie ekranu.
- **Karta Badacza (`CharacterDialog` / `CharacterSheet`):**
  - Mini-dossier: wskaźnik Poczytalności (SAN) jako manometr lub flakon z mętnym płynem, punkty Magii (MP) jako ametystowy kryształ, punkty Życia (HP) jako fiolka z krwią.
- **Przyciski funkcyjne (Quick Actions):**
  - *Dziennik i Trop:* Skórzany notatnik z ołówkiem.
  - *Ekwipunek:* Otwierana mosiężna walizka z przegródkami na rekwizyty z lat 20.
  - *Klucze API / Opcje:* Skrzynka z bezpiecznikami i kablami radiowymi.
  - *Audio / Muzyka:* Miniaturowa tubka gramofonowa (dla Spotify/muzyki klimatycznej) i projektor 16mm (dla efektów tła).

---

## 4. Wytyczne Techniczne Wdrożenia (Implementation Guidelines)
- **Kompatybilność z Tailwind:**
  - Rozszerzenie `tailwind.config.ts` o paletę `desk`, `leather`, `parchment`, `eldritch`, `brass-patina`.
  - Warstwa stylów w `globals.css`: dodanie klas `.desk-texture`, `.leather-panel`, `.parchment-card`, `.wax-seal-btn`.
- **Wydajność i lekkość assetów:**
  - Tekstury tła jako silnie skompresowane WebP (np. `desk-wood.webp`, `parchment-pattern.webp`).
  - Efekty poświaty i run realizowane za pomocą wektorów SVG i radialnych gradientów CSS zamiast ciężkich grafik rastrowych.
- **Bezpieczeństwo logiki i rejestru nawigacji:**
  - Stylizacje nie zmieniają atrybutów `data-testid`, nazw tras w `navigation-registry.json` ani sygnatur metod w komponentach.
