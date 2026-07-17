#!/bin/zsh
#
# Generuje icon.icns dla aplikacji "Strażnik Tajemnic" w stylu "Biurko Badacza":
# ciemne tlo (#0a0c0f) + "Ikona Oko" (Claude Design) - zielone Oko Horusa w zlotej ramie.
#
# Uzywa Chrome headless do wyrenderowania HTML -> PNG 1024, potem sips + iconutil -> .icns.
# Wszystko systemowe (sips, iconutil) + Chrome (juz zainstalowany). Zero npm deps.
#
# Uzycie: bash make-icon.sh [katalog_wyjsciowy] [wariant]
#   wariant: brak/default -> icon.icns (Oko emerald, glowna gra)
#            reset         -> icon-reset.icns (Oko czerwone, ikona "Reset i graj")

set -e

OUT_DIR="${1:-$(cd "$(dirname "$0")" && pwd)}"
VARIANT="${2:-default}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Wariant kolorystyczny oka (rdzen brandu - Oko - zostaje; rozni sie tylko kolor/poswiata).
EYE_COLOR="#11b3a3"; GLOW_RGB="13,148,136"; ICON_NAME="icon"
if [ "$VARIANT" = "reset" ]; then
  EYE_COLOR="#d9534f"; GLOW_RGB="217,83,79"; ICON_NAME="icon-reset"   # czerwien = sygnal reset
fi

if [ ! -x "$CHROME" ]; then
  echo "  make-icon: brak Chrome - pomijam ikone (uzyta zostanie domyslna)"
  exit 0
fi

# 1. HTML z ikona "Ikona Oko" (Claude Design): zielone Oko Horusa (𓂀) w zlotej
#    ramie art-deco z promieniami. container-type:size => cqmin. Font hieroglifow z Google Fonts.
cat >"$WORK/icon.html" <<'HTML'
<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;width:1024px;height:1024px;background:transparent;}
  .tile{
    position:relative;width:1024px;height:1024px;overflow:hidden;
    container-type:size;border-radius:230px;
    background:radial-gradient(72% 72% at 50% 44%, #1a1610 0%, #0a0c0f 66%, #060708 100%);
  }
  .rays{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 50% 50%, rgba(201,162,39,.17) 0deg 1.6deg, transparent 1.6deg 9deg);}
  .bloom{position:absolute;inset:0;background:radial-gradient(30% 30% at 50% 50%, rgba(__GLOW_RGB__,.5), transparent 70%);}
  .vignette{position:absolute;inset:0;box-shadow:inset 0 0 20cqmin 7cqmin rgba(0,0,0,.72);}
  .frame{position:absolute;inset:7%;border:1cqmin solid rgba(201,162,39,.45);}
  .c{position:absolute;width:9%;height:9%;}
  .eye{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-family:'Noto Sans Egyptian Hieroglyphs',serif;font-size:48cqmin;line-height:1;color:__EYE_COLOR__;
    text-shadow:0 0 7cqmin rgba(__GLOW_RGB__,.9), 0 0 18cqmin rgba(__GLOW_RGB__,.45);}
</style></head>
<body><div class="tile">
  <div class="rays"></div>
  <div class="bloom"></div>
  <div class="vignette"></div>
  <div class="frame"></div>
  <div class="c" style="left:7%;top:7%;border-top:1.6cqmin solid #c9a227;border-left:1.6cqmin solid #c9a227;"></div>
  <div class="c" style="right:7%;top:7%;border-top:1.6cqmin solid #c9a227;border-right:1.6cqmin solid #c9a227;"></div>
  <div class="c" style="left:7%;bottom:7%;border-bottom:1.6cqmin solid #c9a227;border-left:1.6cqmin solid #c9a227;"></div>
  <div class="c" style="right:7%;bottom:7%;border-bottom:1.6cqmin solid #c9a227;border-right:1.6cqmin solid #c9a227;"></div>
  <div class="eye">&#77952;</div>
</div></body></html>
HTML

# Podstaw wariant kolorystyczny (placeholdery ASCII - nie ruszaja reszty HTML).
sed -i '' -e "s|__EYE_COLOR__|$EYE_COLOR|g" -e "s|__GLOW_RGB__|$GLOW_RGB|g" "$WORK/icon.html"

# 2. Render -> PNG 1024 (przezroczyste tlo poza zaokraglonym kafelkiem)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 \
  --default-background-color=00000000 \
  --virtual-time-budget=3000 \
  --screenshot="$WORK/icon.png" --window-size=1024,1024 \
  "file://$WORK/icon.html" >/dev/null 2>&1 || {
    echo "  make-icon: render nie powiodl sie - pomijam ikone"
    exit 0
  }

# 3. Zestaw rozmiarow -> .iconset
ICONSET="$WORK/icon.iconset"
mkdir -p "$ICONSET"
gen() { sips -z "$2" "$2" "$WORK/icon.png" --out "$ICONSET/$1" >/dev/null; }
gen icon_16x16.png 16
gen icon_16x16@2x.png 32
gen icon_32x32.png 32
gen icon_32x32@2x.png 64
gen icon_128x128.png 128
gen icon_128x128@2x.png 256
gen icon_256x256.png 256
gen icon_256x256@2x.png 512
gen icon_512x512.png 512
gen icon_512x512@2x.png 1024

# 4. -> {icon|icon-reset}.icns
iconutil -c icns "$ICONSET" -o "$OUT_DIR/$ICON_NAME.icns"
cp "$WORK/icon.png" "$OUT_DIR/$ICON_NAME.png" 2>/dev/null || true
echo "  make-icon: gotowe -> $OUT_DIR/$ICON_NAME.icns"
