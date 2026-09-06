# Design System Dark Art Déco 1920s

Dokument określa kanon wizualny i zasady stylizacji interfejsu aplikacji **Strażnik Tajemnic AI** (zgodnie z Issue #165).

---

## 1. Filozofia Stylu & Klimat

Interfejs łączy historyczny styl lat 20. XX wieku (złoty wiek Art Déco, drewniane biurka detektywistyczne, mosiężne okucia, pożółkły papier akt śledczych) z mrocznym, kosmicznym horrorem Lovecrafta i mechaniką Call of Cthulhu 7e RAW:

- **Baza kolorystyczna:** Głęboka, ciepła czerń węgla drzewnego (`--background: #0a0c0f`), ciemne mahoniowe i dębowe panele (`--card: #16130f`), przyciemnione pola wejściowe (`--input: #1f1a14`).
- **Akcenty Déco (Mosiądz i Złoto):** Zamiast jaskrawych kolorów nowoczesnych UI stosujemy mosiądz (`--brass: #c9a227`) oraz postarzane złoto (`--gold: #b8860b`).
- **Kolor Marki (Lovecraft Emerald):** Szmaragdowa zieleń Cthulhu (`--primary: #0d9488`) dla kluczowych akcji i aktywnych elementów.
- **Krew i Zagłada (Destructive):** Karminowa, bordowa czerwień (`--destructive: #b3322c`) dla utraty Poczytalności, obrażeń i zagrożeń.

---

## 2. Tokeny Semantyczne (Tailwind)

Każdy komponent interfejsu musi korzystać ze słownika tokenów semantycznych zdefiniowanych w `tailwind.config.ts` i `globals.css`:

| Rola w UI | Dozwolona klasa Tailwind | Zakazana klasa (Modern Flat) |
|---|---|---|
| Tło okna / ekranu | `bg-background` | `bg-slate-900`, `bg-gray-950` |
| Panele, karty, modale | `bg-card`, `text-card-foreground` | `bg-zinc-900`, `bg-stone-900` |
| Pola formularzy, inputy | `bg-input`, `border-brass/30` | `bg-gray-800`, `border-gray-700` |
| Tekst główny | `text-foreground` | `text-white`, `text-gray-100` |
| Tekst drugorzędny / wyciszony | `text-muted-foreground` | `text-gray-400`, `text-slate-400` |
| Ramki i separatory | `border-border`, `border-brass/20` | `border-gray-800`, `border-zinc-700` |
| Akcenty ozdobne i krawędzie | `text-brass`, `border-brass`, `bg-brass/10` | `text-amber-400`, `bg-amber-950` |
| Wyciszony stan zablokowany | `text-muted-foreground`, `border-border/60` | `text-zinc-500`, `border-zinc-800` |
| Status New / Aktywny | `bg-primary text-primary-foreground` | `bg-emerald-500 text-black` |
| Zaokrąglenia rogów | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full` | `rounded-xl`, `rounded-2xl`, `rounded-3xl` |

---

## 3. Geometria Art Déco

- **Rogi:** Zakaz miękkich, obłych rogów typowych dla aplikacji mobilnych z 2024 roku (`rounded-2xl`, `rounded-3xl`, `rounded-xl`).
- **Ścięte narożniki:** Klasa `.deco-corners` lub precyzyjne zaokrąglenia geometryczne (`rounded-md`, `rounded-lg`).
- **Ramki:** Podwójne linie, cienkie złote podziały (`border-brass/30`), linie ze zmiennym gradientem (`via-brass/40 to-transparent`).
- **Cienie:** Cienie atmosferyczne i głębokie: `shadow-deco`, `shadow-glow-brass`.

---

## 4. Typografia

1. **Nagłówki i Tytuły Wyświetlacza:** `font-display` (`Cinzel`), `font-display-decorative` (`Cinzel Decorative`).
2. **Klimat Maszynopisu / Dokumentów Śledczych:** `font-special-elite` / `font-mono` (`Special Elite`).
3. **Teksty Księgowe i Powieściowe:** `font-serif` (`Cormorant Garamond`).
4. **Czytelne Etykiety Systemowe:** `font-sans` (`Inter`).

---

## 5. Automatyczna Weryfikacja Linterem

Weryfikacja zgodności z Design Systemem odbywa się za pomocą skryptu:

```bash
# Skan całego projektu:
npm run audit:art-deco

# Skan konkretnego pliku:
node scripts/audit-art-deco.mjs src/components/sidebar/CthulhuSidebar.tsx
```

Skrypt ten jest zintegrowany z bramką jakościową i wyłapuje relikty szarości, nowoczesnych zaokrągleń oraz niespójnych kolorów.
