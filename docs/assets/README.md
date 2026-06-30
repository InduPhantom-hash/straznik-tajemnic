# Grafiki

Zrzuty ekranu i grafiki promocyjne używane w `README.md` i materiałach marketingowych.

## Grafiki promocyjne (gotowe, wyrenderowane)

Wyrenderowane z `Strażnik Tajemnic design system` (Claude Design), natywna rozdzielczość:

| Plik                      | Format | Zastosowanie                |
| ------------------------- | ------ | --------------------------- |
| `01-story-1080x1920.png`  | 9:16   | Story / Reels / TikTok      |
| `02-post-1080x1350.png`   | 4:5    | Post na Instagram (portret) |
| `03-square-1080x1080.png` | 1:1    | Post kwadratowy             |
| `04-og-1200x630.png`      | OG     | Podgląd linku / og:image    |
| `05-youtube-1280x720.png` | 16:9   | Miniatura YouTube           |
| `06-banner-1500x500.png`  | baner  | Nagłówek profilu / README   |

Branding: „Strażnik Tajemnic" + Oko Horusa 𓂀, ciemna baza + złoto art-deco + emerald.

### Regeneracja

Źródło: `Grafiki Promocyjne.dc.html` (6 kart `.dc-card`). Render przez headless Chrome
(skrypt wycina każdą kartę, dorzuca font hieroglifów dla Oka, robi zrzut w natywnej
rozdzielczości). Ikony aplikacji powstają osobno przez `desktop/make-icon.sh` (`oko` / `wir`).
