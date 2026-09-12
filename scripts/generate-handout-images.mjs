import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from '../_tester/_base/.silnik/node_modules/sharp/dist/index.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const HANDOUTS_DIR = path.resolve(ROOT_DIR, '_tester/_base/.silnik/public/handouts');

const HANDOUT_IMAGES = [
  {
    filePath: 'cien-nad-prabutami/clue-photo-prabuty.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="40%" stop-color="#2a241e" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0b0907" stop-opacity="0.95"/>
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="#1b1713"/>
      <!-- Photo frame -->
      <rect x="40" y="30" width="720" height="540" fill="#2d261e" stroke="#3d3429" stroke-width="6"/>
      <rect x="56" y="46" width="688" height="508" fill="#14110e"/>
      <!-- Ruined cathedral arches silhouette -->
      <path d="M 120 480 L 120 220 C 120 120, 260 80, 260 80 C 260 80, 400 120, 400 220 L 400 480 Z" fill="#211d17" stroke="#3d3429" stroke-width="3"/>
      <path d="M 400 480 L 400 260 C 400 160, 520 120, 520 120 C 520 120, 640 160, 640 260 L 640 480 Z" fill="#1d1914" stroke="#352e25" stroke-width="3"/>
      <path d="M 190 480 L 190 280 C 190 220, 260 180, 260 180 C 260 180, 330 220, 330 280 L 330 480 Z" fill="#0d0b09"/>
      <!-- Strange ethereal beam -->
      <polygon points="260,80 210,480 310,480" fill="#524638" opacity="0.25"/>
      <rect width="800" height="600" fill="url(#vignette)"/>
      <!-- Handwritten note at bottom -->
      <rect x="80" y="460" width="640" height="70" fill="#1f1a14" opacity="0.9" rx="4"/>
      <text x="100" y="488" font-family="Courier New, monospace" font-size="14" font-weight="bold" fill="#c4b097">PRABUTY, 1947. RUINY KOSCIOLA SW. WOJCIECHA</text>
      <text x="100" y="512" font-family="Georgia, serif" font-style="italic" font-size="13" fill="#a89278">„To nie swiatlo sloneczne przenikalo przez sklepienie...” – o. Czeslaw Klimuszko</text>
    </svg>`
  },
  {
    filePath: 'cien-nad-prabutami/clue-sb-file-klin.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#3a3022"/>
      <rect x="40" y="30" width="720" height="540" fill="#4d412e" stroke="#2b2318" stroke-width="4" rx="6"/>
      <rect x="60" y="50" width="680" height="500" fill="#574934" stroke="#6b5b42" stroke-width="2"/>
      <rect x="360" y="20" width="80" height="30" fill="#8c8577" rx="3"/>
      <rect x="480" y="80" width="220" height="70" fill="none" stroke="#992222" stroke-width="4" rx="4" transform="rotate(-5, 590, 115)"/>
      <text x="590" y="115" font-family="Impact, Arial Black" font-size="24" fill="#aa2828" text-anchor="middle" transform="rotate(-5, 590, 115)">SCISLE TAJNE</text>
      <text x="590" y="135" font-family="Courier New, monospace" font-size="12" font-weight="bold" fill="#aa2828" text-anchor="middle" transform="rotate(-5, 590, 115)">EGZ. POJEDYNCZY</text>
      <text x="100" y="120" font-family="Courier New, monospace" font-size="16" font-weight="bold" fill="#d6c6ac">MINISTERSTWO SPRAW WEWNETRZNYCH</text>
      <text x="100" y="145" font-family="Courier New, monospace" font-size="14" fill="#baa88d">DEPARTAMENT IV • WYDZIAL III W ELBLAGU</text>
      <line x1="100" y1="165" x2="700" y2="165" stroke="#3d3222" stroke-width="2"/>
      <text x="100" y="215" font-family="Courier New, monospace" font-size="22" font-weight="bold" fill="#f0dfc8">SPRAWA OPERACYJNEGO ROZPRACOWANIA</text>
      <text x="100" y="255" font-family="Courier New, monospace" font-size="28" font-weight="bold" fill="#e65555">KRYPTONIM: „KLIN”</text>
      <text x="100" y="295" font-family="Courier New, monospace" font-size="14" fill="#baa88d">Nr rej. MSW-IV-8492/73 • T. II, k. 148-152</text>
      <rect x="95" y="320" width="610" height="190" fill="#473a27" stroke="#382e1e" stroke-width="1" rx="4"/>
      <text x="115" y="350" font-family="Courier New, monospace" font-size="13" fill="#dfcfb8">NOTATKA SLUZBOWA z podsluchu celi o. Cz. Klimuszki:</text>
      <text x="115" y="380" font-family="Courier New, monospace" font-size="12" fill="#c4b39b">1. Zarejestrowano niewytlumaczalne wahania napiecia w sieci 220V.</text>
      <text x="115" y="405" font-family="Courier New, monospace" font-size="12" fill="#c4b39b">2. Figuranta wizytowali nieustaleni obywatele z rejonu Prabut.</text>
      <text x="115" y="430" font-family="Courier New, monospace" font-size="12" fill="#c4b39b">3. Wypowiedzi figuranta wskazuja na wglad w zjawiska pozaczasowe.</text>
      <text x="115" y="475" font-family="Courier New, monospace" font-size="12" font-style="italic" fill="#a8957c">Podpisal: Kpt. Z. Trzcinski, Wydz. IV KWMO Elblag</text>
    </svg>`
  },
  {
    filePath: 'cien-nad-prabutami/clue-herbal-recipe-152.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#201a13"/>
      <rect x="50" y="30" width="700" height="540" fill="#382e21" stroke="#241d14" stroke-width="4" rx="4"/>
      <rect x="65" y="45" width="670" height="510" fill="#443727" stroke="#524330" stroke-width="1"/>
      <text x="400" y="95" font-family="Georgia, serif" font-size="22" font-style="italic" font-weight="bold" fill="#e6d4b8" text-anchor="middle">Zapiski zielarskie o. Czeslawa Klimuszki</text>
      <text x="400" y="125" font-family="Courier New, monospace" font-size="14" fill="#a89578" text-anchor="middle">Elblag – Klasztor Franciszkanow • Receptura Nr 152</text>
      <line x1="120" y1="145" x2="680" y2="145" stroke="#5c4c36" stroke-width="2"/>
      <text x="120" y="185" font-family="Georgia, serif" font-size="15" fill="#f0e2cd">1. Melissae Folium (Lisc melisy) – 50g</text>
      <text x="120" y="215" font-family="Georgia, serif" font-size="15" fill="#f0e2cd">2. Valerianae Radix (Kozlek lekarski) – 50g</text>
      <text x="120" y="245" font-family="Georgia, serif" font-size="15" fill="#f0e2cd">3. Hyperici Herba (Dziurawiec zwyczajny) – 25g</text>
      <text x="120" y="275" font-family="Georgia, serif" font-size="15" fill="#f0e2cd">4. Ruta Graveolens (Ruta zwyczajna z ziemi prabuckiej) – 10g</text>
      <rect x="110" y="320" width="580" height="190" fill="#382c1d" stroke="#695337" stroke-width="1" rx="4"/>
      <text x="130" y="355" font-family="Georgia, serif" font-style="italic" font-size="16" fill="#e0cbaf">Dopisek odreczny piorem:</text>
      <text x="130" y="390" font-family="Georgia, serif" font-style="italic" font-size="14" fill="#d1bba0">„Ziol tych uzywac tylko wowczas, gdy sen maca wizje nie z tej ziemi.</text>
      <text x="130" y="415" font-family="Georgia, serif" font-style="italic" font-size="14" fill="#d1bba0">Gdy cienie pod sklepieniem w Prabutach poczna przemawiac ludzkim</text>
      <text x="130" y="440" font-family="Georgia, serif" font-style="italic" font-size="14" fill="#d1bba0">jezykiem – pic napar o zmierzchu, by uciszyc glosy czwartego wymiaru.”</text>
      <text x="500" y="485" font-family="Georgia, serif" font-style="italic" font-size="14" fill="#bfa586">+ o. Cz. Klimuszko</text>
    </svg>`
  },
  {
    filePath: 'tajemnica-pendnika-lagiewki/clue-mi-go-cylinder-notes.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#0c1e36"/>
      <rect x="30" y="30" width="740" height="540" fill="#0f2647" stroke="#1d447a" stroke-width="4"/>
      <path d="M 50 100 H 750 M 50 200 H 750 M 50 300 H 750 M 50 400 H 750 M 50 500 H 750" stroke="#163763" stroke-width="1"/>
      <path d="M 150 50 V 550 M 250 50 V 550 M 350 50 V 550 M 450 50 V 550 M 550 50 V 550 M 650 50 V 550" stroke="#163763" stroke-width="1"/>
      <circle cx="280" cy="270" r="130" fill="none" stroke="#68b4ff" stroke-width="3"/>
      <circle cx="280" cy="270" r="90" fill="none" stroke="#4898ec" stroke-width="2" stroke-dasharray="6,4"/>
      <circle cx="280" cy="270" r="40" fill="#1b4578" stroke="#90caff" stroke-width="3"/>
      <line x1="280" y1="270" x2="420" y2="180" stroke="#ffaa44" stroke-width="3"/>
      <polygon points="420,180 405,190 410,175" fill="#ffaa44"/>
      <line x1="280" y1="270" x2="160" y2="380" stroke="#ffaa44" stroke-width="3"/>
      <polygon points="160,380 175,370 170,385" fill="#ffaa44"/>
      <path d="M 420 180 Q 560 210, 680 160" fill="none" stroke="#77eeaa" stroke-width="2" stroke-dasharray="4,4"/>
      <path d="M 160 380 Q 300 450, 680 160" fill="none" stroke="#77eeaa" stroke-width="2" stroke-dasharray="4,4"/>
      <circle cx="680" cy="160" r="8" fill="#ee5555"/>
      <text x="695" y="165" font-family="Courier New, monospace" font-size="12" fill="#ff8888">PUNKT REZONANSU (POZA R3)</text>
      <rect x="420" y="380" width="330" height="170" fill="#0a182c" stroke="#275694" stroke-width="2"/>
      <text x="435" y="410" font-family="Courier New, monospace" font-size="14" font-weight="bold" fill="#88c2ff">ZAKLAD DOSWIADCZALNY KOWARY</text>
      <text x="435" y="435" font-family="Courier New, monospace" font-size="12" fill="#c5e1ff">PROJEKT: PEDNIK KINETYCZNY (MODEL IV)</text>
      <text x="435" y="460" font-family="Courier New, monospace" font-size="11" fill="#8ab6e6">Materialy: Wirnik bezwladnosciowy Lagiewki</text>
      <text x="435" y="485" font-family="Courier New, monospace" font-size="11" fill="#8ab6e6">Przelozenie nieliniowe: k=cos(wt) / r^0</text>
      <text x="435" y="525" font-family="Courier New, monospace" font-size="11" fill="#e6aa68">UWAGA: Rozproszenie pedu przeczy prawu Newtona</text>
    </svg>`
  },
  {
    filePath: 'tajemnica-pendnika-lagiewki/clue-aor-classified-file.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#1e2226"/>
      <rect x="50" y="30" width="700" height="540" fill="#2b3138" stroke="#16191c" stroke-width="4"/>
      <rect x="70" y="50" width="660" height="500" fill="#353c45" stroke="#48525e" stroke-width="1"/>
      <rect x="450" y="80" width="220" height="65" fill="none" stroke="#cc3333" stroke-width="3" rx="4" transform="rotate(3, 560, 110)"/>
      <text x="560" y="115" font-family="Arial Black, Impact" font-size="20" fill="#dd4444" text-anchor="middle" transform="rotate(3, 560, 110)">ZASTRZEZONE / AOR</text>
      <text x="560" y="135" font-family="Courier New, monospace" font-size="11" font-weight="bold" fill="#dd4444" text-anchor="middle" transform="rotate(3, 560, 110)">DO RAK WLASNYCH</text>
      <text x="110" y="100" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#e0e6ed">AGENCJA OCENY RYZYKA TECHNOLOGICZNEGO</text>
      <text x="110" y="125" font-family="Arial, sans-serif" font-size="13" fill="#a0abb8">Zespol Nadzoru Projektow Strategicznych • Warszawa / Wroclaw</text>
      <line x1="110" y1="150" x2="680" y2="150" stroke="#4f5b69" stroke-width="2"/>
      <text x="110" y="195" font-family="Courier New, monospace" font-size="15" font-weight="bold" fill="#f5f7fa">DOTYCZY: WSTRZYMANIE PUBLICZNYCH PROB W KOWARACH</text>
      <rect x="100" y="220" width="600" height="290" fill="#292e35" stroke="#1e2226" stroke-width="1" rx="4"/>
      <text x="120" y="255" font-family="Courier New, monospace" font-size="13" fill="#d2dae2">Meldunek z inspekcji poligonowej z dn. 22.05.1996:</text>
      <text x="120" y="290" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">1. Urzadzenie absorbujace energie (zderzak Lagiewki zamontowany</text>
      <text x="140" y="315" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">w pojezdzie Fiat 126p) wykazuje cechy anomalii fizycznej.</text>
      <text x="120" y="345" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">2. Zderzenie czolowe z bariera przy 50 km/h nie wywolalo przeciazen,</text>
      <text x="140" y="370" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">lecz zarejestrowano impuls grawitacyjny w promieniu 40 metrow.</text>
      <text x="120" y="400" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">3. Nakazuje sie natychmiastowe zamrozenie pokazow medialnych</text>
      <text x="140" y="425" font-family="Courier New, monospace" font-size="12" fill="#a8b5c4">i zabezpieczenie prototypu wirnika przed dostepem osob trzecich.</text>
      <text x="120" y="475" font-family="Courier New, monospace" font-size="12" font-weight="bold" fill="#e88888">Decyzja: Klauzula milczenia do odwolania.</text>
    </svg>`
  },
  {
    filePath: 'tajemnica-dzieci-z-traszyna/clue-dry-cross-barn.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#14110f"/>
      <rect x="160" y="40" width="480" height="520" fill="#d6ccb8" stroke="#8a806d" stroke-width="2" rx="4"/>
      <rect x="195" y="70" width="410" height="410" fill="#1f1813"/>
      <line x1="195" y1="140" x2="605" y2="140" stroke="#33271e" stroke-width="4"/>
      <line x1="195" y1="210" x2="605" y2="210" stroke="#33271e" stroke-width="4"/>
      <line x1="195" y1="280" x2="605" y2="280" stroke="#33271e" stroke-width="4"/>
      <line x1="195" y1="350" x2="605" y2="350" stroke="#33271e" stroke-width="4"/>
      <line x1="195" y1="420" x2="605" y2="420" stroke="#33271e" stroke-width="4"/>
      <rect x="385" y="120" width="30" height="300" fill="#080706" rx="2"/>
      <rect x="300" y="320" width="200" height="30" fill="#080706" rx="2"/>
      <ellipse cx="400" cy="270" rx="140" ry="160" fill="#471e11" opacity="0.35"/>
      <text x="400" y="520" font-family="Courier New, monospace" font-size="16" font-weight="bold" fill="#3a3024" text-anchor="middle">Stodola w Traszynie • sierpien 1983</text>
    </svg>`
  },
  {
    filePath: 'tajemnica-dzieci-z-traszyna/clue-key-book-apparatus.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#1c1612"/>
      <rect x="50" y="30" width="700" height="540" fill="#382d24" stroke="#241c16" stroke-width="4" rx="6"/>
      <text x="400" y="80" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#d9c3a9" text-anchor="middle">Szkic dzieciecego seansu: Ksiazeczka i Klucz</text>
      <polygon points="260,260 400,290 400,430 260,390" fill="#241d17" stroke="#8c775d" stroke-width="2"/>
      <polygon points="540,260 400,290 400,430 540,390" fill="#28201a" stroke="#8c775d" stroke-width="2"/>
      <line x1="400" y1="160" x2="400" y2="350" stroke="#c0a680" stroke-width="8" stroke-linecap="round"/>
      <circle cx="400" cy="150" r="30" fill="none" stroke="#c0a680" stroke-width="7"/>
      <line x1="330" y1="150" x2="370" y2="150" stroke="#e0caa8" stroke-width="5" stroke-linecap="round"/>
      <line x1="470" y1="150" x2="430" y2="150" stroke="#e0caa8" stroke-width="5" stroke-linecap="round"/>
      <path d="M 360 115 A 45 45 0 0 1 440 115" fill="none" stroke="#ff7755" stroke-width="3" stroke-dasharray="4,3"/>
      <text x="400" y="105" font-family="Courier New, monospace" font-size="12" fill="#ff9977" text-anchor="middle">OBROT SAMOCZYNNY</text>
      <rect x="100" y="450" width="600" height="90" fill="#2d231b" stroke="#4a3b2e" stroke-width="1" rx="4"/>
      <text x="120" y="480" font-family="Georgia, serif" font-size="14" font-style="italic" fill="#c4b097">„Trzymalismy klucz tylko na koncach palcow wskazujacych. Gdy padlo pytanie,</text>
      <text x="120" y="505" font-family="Georgia, serif" font-style="italic" fill="#c4b097">klucz przechylil ksiazke z cala sila ku ziemi, a w stodole zgasly wszystkie swiece.”</text>
    </svg>`
  },
  {
    filePath: 'przybysz-z-matriksa-glogow/clue-vhs-tape-glogow.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#05080c"/>
      <rect x="40" y="30" width="720" height="540" fill="#091018" stroke="#182c40" stroke-width="6" rx="20"/>
      <circle cx="400" cy="270" r="90" fill="#14362a" opacity="0.6"/>
      <path d="M 330 420 C 330 340, 470 340, 470 420 Z" fill="#0f2920" opacity="0.7"/>
      <line x1="80" y1="220" x2="720" y2="220" stroke="#00ffff" stroke-width="3" opacity="0.5"/>
      <line x1="75" y1="222" x2="715" y2="222" stroke="#ff0055" stroke-width="3" opacity="0.5"/>
      <line x1="80" y1="360" x2="720" y2="360" stroke="#00ff88" stroke-width="2" opacity="0.6"/>
      <text x="80" y="90" font-family="Courier New, monospace" font-size="24" font-weight="bold" fill="#00ffaa">PLAY ▶ 14.11.2001</text>
      <text x="560" y="90" font-family="Courier New, monospace" font-size="24" font-weight="bold" fill="#00ffaa">03:42:19</text>
      <rect x="120" y="470" width="560" height="60" fill="#000000" opacity="0.75" rx="4"/>
      <text x="400" y="508" font-family="Courier New, monospace" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">„SYSTEM GLOGOW WYKRYL ZMIANE POLA...”</text>
    </svg>`
  },
  {
    filePath: 'przybysz-z-matriksa-glogow/clue-military-bunker-map.webp',
    svg: `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#13171a"/>
      <rect x="30" y="30" width="740" height="540" fill="#1b2126" stroke="#2c363f" stroke-width="4"/>
      <path d="M 50 120 H 750 M 50 240 H 750 M 50 360 H 750 M 50 480 H 750" stroke="#252d33" stroke-width="1"/>
      <path d="M 170 50 V 550 M 310 50 V 550 M 450 50 V 550 M 590 50 V 550" stroke="#252d33" stroke-width="1"/>
      <path d="M 50 180 Q 250 220, 450 160 T 750 200" fill="none" stroke="#2e4c63" stroke-width="26"/>
      <text x="240" y="200" font-family="Arial, sans-serif" font-size="12" fill="#679ac2">RZEKA ODRA</text>
      <rect x="220" y="280" width="340" height="180" fill="#242b30" stroke="#4f606e" stroke-width="3"/>
      <text x="390" y="310" font-family="Courier New, monospace" font-size="14" font-weight="bold" fill="#adc5d9" text-anchor="middle">TWIERDZA GLOGOW • KAZAMATY SEKTOR X-11</text>
      <path d="M 390 330 Q 370 240, 320 180" fill="none" stroke="#e03e3e" stroke-width="4" stroke-dasharray="6,4"/>
      <polygon points="320,180 325,195 335,185" fill="#e03e3e"/>
      <text x="395" y="240" font-family="Courier New, monospace" font-size="12" font-weight="bold" fill="#ff6666">ZALANY TUNEL POD DNEM ODRY</text>
      <rect x="520" y="420" width="220" height="120" fill="#161b1e" stroke="#8a2e2e" stroke-width="2"/>
      <text x="535" y="445" font-family="Courier New, monospace" font-size="11" font-weight="bold" fill="#dd5555">SZTAB GENERALNY WP</text>
      <text x="535" y="465" font-family="Courier New, monospace" font-size="10" fill="#a68585">OBIEKT SPECJALNY NR 11</text>
      <text x="535" y="485" font-family="Courier New, monospace" font-size="10" fill="#a68585">DATA ARCHIWIZACJI: 2001</text>
      <text x="535" y="515" font-family="Courier New, monospace" font-size="11" font-weight="bold" fill="#ff4444">WEJSCIE SUROWO WZBRONIONE</text>
    </svg>`
  }
];

async function main() {
  console.log('🎨 Generowanie 9 dedykowanych ilustracji WebP dla Strefy 11...');

  for (const item of HANDOUT_IMAGES) {
    const targetPath = path.join(HANDOUTS_DIR, item.filePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    await sharp(Buffer.from(item.svg))
      .webp({ quality: 90 })
      .toFile(targetPath);

    const stats = fs.statSync(targetPath);
    console.log(`✅ Zapisano WebP: ${item.filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  console.log('✨ Sukces: Wszystkie 9 handoutow WebP zostaly wygenerowane.');
}

main().catch(console.error);
