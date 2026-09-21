import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIRS = [
  path.resolve(__dirname, '../public/portraits/retro-svg'),
  path.resolve(__dirname, '../../../../public/portraits/retro-svg'),
];

// Dark Art Déco Frame Base
function generateArtDecoFrame(title) {
  return `
  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg-grad)" />
  <rect width="512" height="512" fill="url(#hatch)" opacity="0.15" />

  <!-- Outer Art Déco Border -->
  <rect x="20" y="20" width="472" height="472" fill="none" stroke="url(#brass-grad)" stroke-width="2" />
  <rect x="28" y="28" width="456" height="456" fill="none" stroke="#8c6f17" stroke-width="1" stroke-dasharray="8 4" opacity="0.6" />
  <rect x="36" y="36" width="440" height="440" fill="none" stroke="url(#brass-grad)" stroke-width="1.5" />

  <!-- Corner Chevrons -->
  <!-- Top Left -->
  <path d="M 20 50 L 50 20 M 20 65 L 65 20 M 20 80 L 80 20" stroke="url(#brass-grad)" stroke-width="1.5" fill="none" />
  <polygon points="36,36 56,36 36,56" fill="#c9a227" opacity="0.3" />
  <rect x="34" y="34" width="6" height="6" fill="#fae084" />

  <!-- Top Right -->
  <path d="M 492 50 L 462 20 M 492 65 L 447 20 M 492 80 L 432 20" stroke="url(#brass-grad)" stroke-width="1.5" fill="none" />
  <polygon points="476,36 456,36 476,56" fill="#c9a227" opacity="0.3" />
  <rect x="472" y="34" width="6" height="6" fill="#fae084" />

  <!-- Bottom Left -->
  <path d="M 20 462 L 50 492 M 20 447 L 65 492 M 20 432 L 80 492" stroke="url(#brass-grad)" stroke-width="1.5" fill="none" />
  <polygon points="36,476 56,476 36,456" fill="#c9a227" opacity="0.3" />
  <rect x="34" y="472" width="6" height="6" fill="#fae084" />

  <!-- Bottom Right -->
  <path d="M 492 462 L 462 492 M 492 447 L 447 492 M 492 432 L 432 492" stroke="url(#brass-grad)" stroke-width="1.5" fill="none" />
  <polygon points="476,476 456,476 476,456" fill="#c9a227" opacity="0.3" />
  <rect x="472" y="472" width="6" height="6" fill="#fae084" />

  <!-- Top Sunburst Crest -->
  <path d="M 236 36 L 256 16 L 276 36 Z" fill="url(#brass-grad)" />
  <circle cx="256" cy="30" r="4" fill="#fae084" />
  <line x1="200" y1="36" x2="312" y2="36" stroke="url(#brass-grad)" stroke-width="2" />
  <line x1="220" y1="28" x2="292" y2="28" stroke="#fae084" stroke-width="1" />

  <!-- Inner Cameo Circle -->
  <circle cx="256" cy="235" r="162" fill="#070c0b" stroke="url(#brass-grad)" stroke-width="3" />
  <circle cx="256" cy="235" r="154" fill="none" stroke="#8c6f17" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />
  <circle cx="256" cy="235" r="150" fill="url(#inner-glow)" opacity="0.6" />

  <!-- Bottom Nameplate Cartouche -->
  <g transform="translate(0, 420)">
    <path d="M 130 0 L 382 0 L 396 22 L 382 44 L 130 44 L 116 22 Z" fill="#091210" stroke="url(#brass-grad)" stroke-width="2" />
    <path d="M 136 6 L 376 6 L 386 22 L 376 38 L 136 38 L 126 22 Z" fill="none" stroke="#c9a227" stroke-width="1" opacity="0.5" />
    <circle cx="126" cy="22" r="3" fill="#fae084" />
    <circle cx="386" cy="22" r="3" fill="#fae084" />
    <text x="256" y="27" text-anchor="middle" font-family="'Cinzel', 'Playfair Display', 'Georgia', serif" font-size="14" font-weight="bold" fill="#fae084" letter-spacing="4" text-transform="uppercase">${title}</text>
  </g>
`;
}

const DEFS = `
  <defs>
    <radialGradient id="bg-grad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#182422" />
      <stop offset="60%" stop-color="#0e1514" />
      <stop offset="100%" stop-color="#050807" />
    </radialGradient>
    <radialGradient id="inner-glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.25" />
      <stop offset="60%" stop-color="#083832" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="brass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fae084" />
      <stop offset="35%" stop-color="#c9a227" />
      <stop offset="70%" stop-color="#e5c158" />
      <stop offset="100%" stop-color="#7a5f11" />
    </linearGradient>
    <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#c9a227" stroke-width="0.8" />
    </pattern>
    <clipPath id="cameo-clip">
      <circle cx="256" cy="235" r="150" />
    </clipPath>
  </defs>
`;

const ARCHETYPES = [
  {
    id: 'detective',
    title: 'Detektyw',
    renderArt: () => `
      <!-- Streetlamp in background fog -->
      <path d="M 180 120 L 195 120 L 190 280 L 185 280 Z" fill="#2d3b37" opacity="0.4" />
      <circle cx="187" cy="118" r="8" fill="#fae084" opacity="0.5" />
      <line x1="187" y1="126" x2="160" y2="260" stroke="#fae084" stroke-width="1" opacity="0.2" />

      <!-- Detective Bust Silhouette -->
      <!-- Fedora Hat -->
      <path d="M 190 170 Q 256 142 322 170 Q 338 174 346 182 Q 310 178 256 178 Q 202 178 166 182 Q 174 174 190 170 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 210 168 Q 218 132 256 130 Q 294 132 302 168 Q 280 162 256 162 Q 232 162 210 168 Z" fill="#0c1412" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 211 162 Q 256 156 301 162" stroke="#fae084" stroke-width="2.5" />

      <!-- Head & Collar Shading -->
      <path d="M 226 178 L 226 215 Q 256 238 286 215 L 286 178 Z" fill="#090e0d" />
      <!-- Shadow across eyes -->
      <path d="M 220 182 L 292 182 L 286 198 L 226 198 Z" fill="#040606" />

      <!-- Trench Coat & Lapels -->
      <path d="M 170 340 L 195 240 L 225 245 L 245 280 L 256 240 L 267 280 L 287 245 L 317 240 L 342 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Left Lapel -->
      <path d="M 195 240 L 235 295 L 256 260 L 242 230 Z" fill="#15211e" stroke="#fae084" stroke-width="1.5" />
      <!-- Right Lapel -->
      <path d="M 317 240 L 277 295 L 256 260 L 270 230 Z" fill="#15211e" stroke="#fae084" stroke-width="1.5" />
      <!-- Tie -->
      <polygon points="253,260 259,260 262,310 256,320 250,310" fill="#c9a227" stroke="#fae084" stroke-width="1" />

      <!-- Magnifying Glass -->
      <circle cx="310" cy="270" r="32" fill="#0d9488" fill-opacity="0.15" stroke="url(#brass-grad)" stroke-width="3" />
      <line x1="332" y1="292" x2="368" y2="332" stroke="url(#brass-grad)" stroke-width="5" stroke-linecap="round" />
      <!-- Lens reflection -->
      <path d="M 292 256 A 24 24 0 0 1 328 256" stroke="#fae084" stroke-width="1.5" fill="none" />
    `,
  },
  {
    id: 'journalist',
    title: 'Dziennikarz',
    renderArt: () => `
      <!-- Press Fedora with Card -->
      <path d="M 190 170 Q 256 142 322 170 Q 338 174 346 182 Q 310 178 256 178 Q 202 178 166 182 Q 174 174 190 170 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 210 168 Q 218 132 256 130 Q 294 132 302 168 Q 280 162 256 162 Q 232 162 210 168 Z" fill="#0c1412" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Press Card tucked into ribbon -->
      <rect x="282" y="145" width="22" height="18" transform="rotate(15 282 145)" fill="#fae084" stroke="#090e0d" stroke-width="1" />
      <text x="287" y="158" transform="rotate(15 282 145)" font-family="sans-serif" font-size="5" font-weight="bold" fill="#000">PRESS</text>

      <!-- Head & Coat -->
      <path d="M 226 178 L 226 215 Q 256 238 286 215 L 286 178 Z" fill="#090e0d" />
      <path d="M 175 340 L 205 240 L 256 260 L 307 240 L 337 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />

      <!-- Vintage Flash Camera on Left -->
      <rect x="160" y="240" width="46" height="34" rx="3" fill="#182422" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="183" cy="257" r="10" fill="#070c0b" stroke="#fae084" stroke-width="1.5" />
      <!-- Camera Dish Reflector -->
      <circle cx="150" cy="215" r="20" fill="none" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="150" cy="215" r="5" fill="#fae084" />
      <line x1="150" y1="235" x2="165" y2="242" stroke="url(#brass-grad)" stroke-width="2" />

      <!-- Reporter Notebook & Pencil on Right -->
      <rect x="305" y="250" width="36" height="52" rx="2" fill="#141f1c" stroke="url(#brass-grad)" stroke-width="2" transform="rotate(-10 305 250)" />
      <line x1="310" y1="262" x2="334" y2="258" stroke="#fae084" stroke-width="1" />
      <line x1="312" y1="272" x2="336" y2="268" stroke="#fae084" stroke-width="1" />
      <line x1="314" y1="282" x2="338" y2="278" stroke="#fae084" stroke-width="1" />
      <!-- Pencil -->
      <line x1="345" y1="235" x2="325" y2="295" stroke="#fae084" stroke-width="3" stroke-linecap="round" />
    `,
  },
  {
    id: 'doctor',
    title: 'Lekarz',
    renderArt: () => `
      <!-- Head with 1920s Round Spectacles -->
      <circle cx="256" cy="180" r="32" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Horn-rimmed spectacles -->
      <circle cx="244" cy="178" r="9" fill="none" stroke="#fae084" stroke-width="2" />
      <circle cx="268" cy="178" r="9" fill="none" stroke="#fae084" stroke-width="2" />
      <line x1="253" y1="178" x2="259" y2="178" stroke="#fae084" stroke-width="2" />

      <!-- Head mirror reflector -->
      <circle cx="230" cy="148" r="14" fill="#182422" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="230" cy="148" r="4" fill="#fae084" />
      <path d="M 230 148 L 270 154" stroke="#fae084" stroke-width="1.5" />

      <!-- Physician Suit & Stethoscope -->
      <path d="M 170 340 L 200 220 L 256 240 L 312 220 L 342 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Stethoscope Tubes -->
      <path d="M 235 210 Q 220 280 256 300 Q 292 280 277 210" fill="none" stroke="#c9a227" stroke-width="3" />
      <circle cx="256" cy="302" r="10" fill="#fae084" stroke="#090e0d" stroke-width="2" />

      <!-- Gladstone Medical Bag -->
      <rect x="295" y="275" width="55" height="42" rx="4" fill="#1c120c" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 315 275 Q 322 260 330 275" fill="none" stroke="url(#brass-grad)" stroke-width="3" />
      <!-- Red / Brass Cross on bag -->
      <path d="M 322 288 L 322 304 M 314 296 L 330 296" stroke="#c9a227" stroke-width="3" />
    `,
  },
  {
    id: 'scientist',
    title: 'Naukowiec',
    renderArt: () => `
      <!-- Academic Cap / Hair & Spectacles -->
      <path d="M 224 165 Q 256 130 288 165 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="1.5" />
      <circle cx="256" cy="185" r="30" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="245" cy="184" r="8" fill="none" stroke="#fae084" stroke-width="2" />
      <circle cx="267" cy="184" r="8" fill="none" stroke="#fae084" stroke-width="2" />
      <line x1="253" y1="184" x2="259" y2="184" stroke="#fae084" stroke-width="2" />

      <!-- Tweed Suit with Bowtie -->
      <path d="M 175 340 L 205 230 L 256 250 L 307 230 L 337 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Bowtie -->
      <polygon points="244,244 268,252 268,244 244,252" fill="#c9a227" stroke="#fae084" stroke-width="1" />
      <circle cx="256" cy="248" r="3" fill="#fae084" />

      <!-- Brass Monocular Microscope on Right -->
      <path d="M 315 220 L 330 255 L 320 260 L 305 225 Z" fill="#c9a227" stroke="#fae084" stroke-width="1.5" />
      <circle cx="328" cy="285" r="16" fill="none" stroke="url(#brass-grad)" stroke-width="2" />
      <rect x="310" y="300" width="36" height="8" fill="#182422" stroke="url(#brass-grad)" stroke-width="1.5" />

      <!-- Chemical Flask / Retort on Left -->
      <path d="M 185 240 L 195 240 L 193 265 L 210 295 A 16 16 0 0 1 170 295 L 187 265 Z" fill="#0d9488" fill-opacity="0.3" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Rising bubbles / vapor -->
      <circle cx="190" cy="275" r="3" fill="#fae084" opacity="0.8" />
      <circle cx="195" cy="255" r="2" fill="#fae084" opacity="0.6" />
      <circle cx="188" cy="230" r="1.5" fill="#fae084" opacity="0.4" />
    `,
  },
  {
    id: 'author',
    title: 'Pisarz',
    renderArt: () => `
      <!-- Author Contemplative Silhouette -->
      <circle cx="256" cy="175" r="32" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Disheveled hair -->
      <path d="M 226 165 Q 230 135 256 138 Q 282 135 286 165 Q 266 150 226 165 Z" fill="#040606" stroke="#fae084" stroke-width="1" />

      <!-- Vest & Rolled Sleeves -->
      <path d="M 180 340 L 210 225 L 256 245 L 302 225 L 332 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Open Collar -->
      <polygon points="256,245 246,225 266,225" fill="#182422" stroke="#fae084" stroke-width="1" />

      <!-- Vintage 1920s Typewriter Center-Front -->
      <path d="M 200 320 L 312 320 L 322 340 L 190 340 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Typewriter Paper Carriage & Rolled Sheet -->
      <rect x="215" y="275" width="82" height="40" rx="2" fill="#fae084" fill-opacity="0.85" stroke="#090e0d" stroke-width="1.5" />
      <!-- Type lines on paper -->
      <line x1="225" y1="285" x2="275" y2="285" stroke="#090e0d" stroke-width="1.5" />
      <line x1="225" y1="293" x2="285" y2="293" stroke="#090e0d" stroke-width="1.5" />
      <line x1="225" y1="301" x2="265" y2="301" stroke="#090e0d" stroke-width="1.5" />

      <!-- Quill & Inkwell on Left -->
      <path d="M 160 300 Q 155 260 175 235 Q 170 270 162 300 Z" fill="#fae084" stroke="url(#brass-grad)" stroke-width="1.5" />
      <rect x="154" y="300" width="16" height="14" fill="#050807" stroke="url(#brass-grad)" stroke-width="1.5" />
    `,
  },
  {
    id: 'artist',
    title: 'Artysta',
    renderArt: () => `
      <!-- French Beret Tilted -->
      <path d="M 205 160 Q 256 125 305 150 Q 315 165 295 172 Q 256 165 210 172 Q 198 168 205 160 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="260" cy="132" r="3" fill="#fae084" />
      <circle cx="256" cy="185" r="30" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />

      <!-- Smock / Artist Coat & Scarf -->
      <path d="M 175 340 L 205 230 L 256 250 L 307 230 L 337 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Bohemian Flowing Scarf -->
      <path d="M 245 230 Q 256 265 240 310 M 255 230 Q 266 265 255 315" stroke="#fae084" stroke-width="2" fill="none" />

      <!-- Painter's Palette with Thumbhole on Left -->
      <path d="M 165 260 C 145 280 150 325 190 320 C 215 315 220 285 200 270 C 185 260 175 250 165 260 Z" fill="#a3821a" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="195" cy="285" r="6" fill="#070c0b" stroke="#fae084" stroke-width="1" />
      <!-- Paint Dollops on Palette -->
      <circle cx="165" cy="280" r="3.5" fill="#fae084" />
      <circle cx="172" cy="298" r="3.5" fill="#0d9488" />
      <circle cx="188" cy="308" r="3.5" fill="#c9a227" />

      <!-- Paintbrushes on Right -->
      <line x1="300" y1="320" x2="340" y2="240" stroke="url(#brass-grad)" stroke-width="3" />
      <path d="M 338 244 L 344 232 L 346 244 Z" fill="#fae084" />
    `,
  },
  {
    id: 'clergy',
    title: 'Duchowny',
    renderArt: () => `
      <!-- Gothic Cathedral Arch in background -->
      <path d="M 210 260 L 210 140 Q 256 80 302 140 L 302 260 Z" fill="none" stroke="#253530" stroke-width="2" opacity="0.4" />
      <path d="M 230 260 L 230 160 Q 256 120 282 160 L 282 260 Z" fill="none" stroke="#fae084" stroke-width="1" opacity="0.3" />

      <!-- Clergyman Head -->
      <circle cx="256" cy="180" r="30" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />

      <!-- Cassock & White Roman Collar -->
      <path d="M 175 340 L 210 220 L 256 230 L 302 220 L 337 340 Z" fill="#070b0a" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- White Collar Tab -->
      <rect x="250" y="222" width="12" height="12" fill="#fae084" stroke="#000" stroke-width="1" />

      <!-- Celtic / Ornate Brass Pectoral Cross -->
      <circle cx="256" cy="275" r="14" fill="none" stroke="#fae084" stroke-width="1.5" />
      <path d="M 256 250 L 256 300 M 240 268 L 272 268" stroke="url(#brass-grad)" stroke-width="4" stroke-linecap="square" />

      <!-- Breviary / Holy Scripture with Ribbon Bookmark -->
      <rect x="285" y="275" width="45" height="55" rx="3" fill="#141c19" stroke="url(#brass-grad)" stroke-width="2" transform="rotate(-8 285 275)" />
      <line x1="305" y1="272" x2="310" y2="335" stroke="#fae084" stroke-width="2" />
    `,
  },
  {
    id: 'drifter',
    title: 'Włóczęga',
    renderArt: () => `
      <!-- Distant Railroad Tracks Vanishing -->
      <line x1="210" y1="280" x2="256" y2="210" stroke="#fae084" stroke-width="1.5" opacity="0.3" />
      <line x1="302" y1="280" x2="256" y2="210" stroke="#fae084" stroke-width="1.5" opacity="0.3" />
      <line x1="230" y1="250" x2="282" y2="250" stroke="#c9a227" stroke-width="1.5" opacity="0.4" />
      <line x1="220" y1="265" x2="292" y2="265" stroke="#c9a227" stroke-width="1.5" opacity="0.4" />

      <!-- Newsboy / Slouch Cap -->
      <path d="M 200 170 Q 256 135 312 170 Q 330 175 320 182 Q 256 172 190 182 Q 185 175 200 170 Z" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="256" cy="185" r="28" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="1.5" />
      <!-- Stubble / Scruffy beard texture -->
      <path d="M 235 195 Q 256 225 277 195" fill="none" stroke="#fae084" stroke-width="1" stroke-dasharray="2 2" />

      <!-- Patchwork Overcoat -->
      <path d="M 170 340 L 205 230 L 256 250 L 307 230 L 342 340 Z" fill="#0d1413" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Patches -->
      <rect x="195" y="270" width="20" height="22" fill="#182420" stroke="#fae084" stroke-width="1" stroke-dasharray="2 2" />
      <rect x="295" y="285" width="22" height="18" fill="#182420" stroke="#fae084" stroke-width="1" stroke-dasharray="2 2" />

      <!-- Walking Stick with Bindle (Hobo Sack) -->
      <line x1="140" y1="330" x2="280" y2="180" stroke="url(#brass-grad)" stroke-width="4" stroke-linecap="round" />
      <circle cx="210" cy="235" r="22" fill="#1f2c28" stroke="#fae084" stroke-width="2" />
      <path d="M 205 215 Q 210 205 218 215" fill="none" stroke="#fae084" stroke-width="2" />
    `,
  },
  {
    id: 'antiquarian',
    title: 'Antykwariusz',
    renderArt: () => `
      <!-- Ancient Folio & Dusty Shelves Silhouette -->
      <path d="M 170 140 L 170 240 M 150 140 L 150 240" stroke="#253530" stroke-width="2" opacity="0.3" />

      <!-- Antiquarian Bust -->
      <circle cx="256" cy="180" r="30" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Jeweler's Monocle / Loupe on Right Eye -->
      <circle cx="268" cy="178" r="9" fill="#0d9488" fill-opacity="0.3" stroke="#fae084" stroke-width="2" />
      <path d="M 276 178 Q 295 190 290 220" fill="none" stroke="#fae084" stroke-width="1.5" />

      <!-- Velvet Smoking Jacket / Tweed Waistcoat -->
      <path d="M 175 340 L 205 230 L 256 250 L 307 230 L 337 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />

      <!-- Celestial Astrolabe / Ornate Clockwork Gears on Left -->
      <circle cx="195" cy="275" r="28" fill="none" stroke="url(#brass-grad)" stroke-width="2" />
      <circle cx="195" cy="275" r="18" fill="none" stroke="#fae084" stroke-width="1" stroke-dasharray="3 3" />
      <line x1="195" y1="247" x2="195" y2="303" stroke="url(#brass-grad)" stroke-width="1.5" />
      <line x1="167" y1="275" x2="223" y2="275" stroke="url(#brass-grad)" stroke-width="1.5" />

      <!-- Ancient Tome with Brass Corner Mounts on Right -->
      <rect x="290" y="260" width="46" height="60" rx="3" fill="#1b120c" stroke="url(#brass-grad)" stroke-width="2" transform="rotate(10 290 260)" />
      <polygon points="290,260 302,260 290,272" fill="#fae084" />
      <polygon points="334,268 334,280 322,268" fill="#fae084" />
    `,
  },
  {
    id: 'soldier',
    title: 'Weteran',
    renderArt: () => `
      <!-- Barbed wire & Searchlight in trench fog -->
      <line x1="130" y1="230" x2="190" y2="220" stroke="#fae084" stroke-width="1" opacity="0.3" />
      <path d="M 150 227 L 155 223 M 170 224 L 175 220" stroke="#fae084" stroke-width="2" opacity="0.4" />

      <!-- M1917 Brodie Steel Helmet Silhouette -->
      <ellipse cx="256" cy="165" rx="55" ry="16" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 215 165 Q 220 135 256 135 Q 292 135 297 165 Z" fill="#0f1816" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Chin strap -->
      <path d="M 215 168 Q 235 210 256 215 Q 277 210 297 168" fill="none" stroke="#c9a227" stroke-width="1.5" />

      <!-- Rugged Head & Jawline -->
      <circle cx="256" cy="185" r="28" fill="#090e0d" />

      <!-- Military Trench Coat & Epaulettes -->
      <path d="M 165 340 L 195 230 L 256 250 L 317 230 L 347 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Epaulettes (Pojedyncze naramienniki z guzikami) -->
      <rect x="188" y="230" width="28" height="10" rx="2" fill="#c9a227" stroke="#fae084" stroke-width="1" transform="rotate(-15 188 230)" />
      <rect x="296" y="222" width="28" height="10" rx="2" fill="#c9a227" stroke="#fae084" stroke-width="1" transform="rotate(15 296 222)" />

      <!-- Medal of Valor Ribbon / Cross on Chest -->
      <rect x="225" y="260" width="16" height="10" fill="#fae084" stroke="#090e0d" stroke-width="1" />
      <polygon points="233,270 228,285 233,282 238,285" fill="#c9a227" stroke="#fae084" stroke-width="1" />

      <!-- Trench Trench-Gun / Service Bayonet on Shoulder -->
      <line x1="335" y1="330" x2="310" y2="190" stroke="url(#brass-grad)" stroke-width="4" stroke-linecap="round" />
    `,
  },
  {
    id: 'lawyer',
    title: 'Prawnik',
    renderArt: () => `
      <!-- Classical Courthouse Columns in Background -->
      <line x1="170" y1="130" x2="170" y2="240" stroke="#253530" stroke-width="3" opacity="0.3" />
      <line x1="190" y1="130" x2="190" y2="240" stroke="#253530" stroke-width="3" opacity="0.3" />
      <line x1="322" y1="130" x2="322" y2="240" stroke="#253530" stroke-width="3" opacity="0.3" />
      <line x1="342" y1="130" x2="342" y2="240" stroke="#253530" stroke-width="3" opacity="0.3" />

      <!-- Slicked 1920s Hair & Sharp Head -->
      <circle cx="256" cy="180" r="30" fill="#090e0d" stroke="url(#brass-grad)" stroke-width="2" />
      <path d="M 228 170 Q 256 142 284 170 Q 275 152 256 150 Q 235 152 228 170 Z" fill="#fae084" opacity="0.7" />

      <!-- Three-Piece Pinstripe Suit -->
      <path d="M 175 340 L 205 225 L 256 245 L 307 225 L 337 340 Z" fill="#0e1715" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Pinstripes -->
      <line x1="205" y1="260" x2="200" y2="340" stroke="#fae084" stroke-width="0.8" opacity="0.4" />
      <line x1="225" y1="260" x2="220" y2="340" stroke="#fae084" stroke-width="0.8" opacity="0.4" />
      <line x1="287" y1="260" x2="292" y2="340" stroke="#fae084" stroke-width="0.8" opacity="0.4" />
      <line x1="307" y1="260" x2="312" y2="340" stroke="#fae084" stroke-width="0.8" opacity="0.4" />

      <!-- Gold Pocket Watch Chain across vest -->
      <path d="M 235 285 Q 256 300 277 285" fill="none" stroke="#fae084" stroke-width="2" stroke-dasharray="3 2" />

      <!-- Scales of Justice (Waga Temidy) on Left -->
      <line x1="160" y1="240" x2="200" y2="240" stroke="url(#brass-grad)" stroke-width="2" />
      <line x1="180" y1="230" x2="180" y2="290" stroke="url(#brass-grad)" stroke-width="2.5" />
      <!-- Left Pan -->
      <line x1="160" y1="240" x2="152" y2="265" stroke="#fae084" stroke-width="1" />
      <line x1="160" y1="240" x2="168" y2="265" stroke="#fae084" stroke-width="1" />
      <path d="M 150 265 Q 160 272 170 265 Z" fill="#c9a227" stroke="#fae084" stroke-width="1" />
      <!-- Right Pan -->
      <line x1="200" y1="240" x2="192" y2="265" stroke="#fae084" stroke-width="1" />
      <line x1="200" y1="240" x2="208" y2="265" stroke="#fae084" stroke-width="1" />
      <path d="M 190 265 Q 200 272 210 265 Z" fill="#c9a227" stroke="#fae084" stroke-width="1" />

      <!-- Leather Legal Briefcase on Right -->
      <rect x="295" y="270" width="48" height="38" rx="3" fill="#1b120c" stroke="url(#brass-grad)" stroke-width="2" />
      <line x1="295" y1="282" x2="343" y2="282" stroke="#fae084" stroke-width="1.5" />
      <circle cx="319" cy="282" r="3" fill="#fae084" />
    `,
  },
  {
    id: 'occultist',
    title: 'Okultysta',
    renderArt: () => `
      <!-- Occultist Hooded or Shadowed Bust -->
      <path d="M 215 155 Q 256 125 297 155 Q 312 215 292 245 L 220 245 Q 200 215 215 155 Z" fill="#070b0a" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Piercing glowing eyes in shadow -->
      <circle cx="244" cy="185" r="3" fill="#fae084" />
      <circle cx="268" cy="185" r="3" fill="#fae084" />

      <!-- Ritual Robe with Embroidered Runes -->
      <path d="M 165 340 L 205 235 L 256 255 L 307 235 L 347 340 Z" fill="#0a100f" stroke="url(#brass-grad)" stroke-width="2" />
      <!-- Embroidered border symbols -->
      <path d="M 256 255 L 256 340" stroke="#c9a227" stroke-width="2" stroke-dasharray="4 6" />

      <!-- Melting Candle & Skull / Brass Holder on Left -->
      <rect x="180" y="270" width="12" height="30" fill="#fae084" fill-opacity="0.8" stroke="#000" stroke-width="1" />
      <!-- Dripping wax -->
      <path d="M 178 280 Q 180 290 178 295 M 192 278 Q 194 288 192 292" stroke="#fae084" stroke-width="2" />
      <!-- Flame -->
      <path d="M 186 270 Q 181 255 186 245 Q 191 255 186 270 Z" fill="#fae084" stroke="#e5c158" stroke-width="1" />
      <circle cx="186" cy="255" r="8" fill="#fae084" opacity="0.3" />

      <!-- Grimoire with Arcane Eye on Right -->
      <rect x="290" y="260" width="46" height="58" rx="3" fill="#140f1a" stroke="url(#brass-grad)" stroke-width="2" transform="rotate(8 290 260)" />
      <!-- Arcane Eye of Cthulhu / Elder Sign -->
      <path d="M 302 288 Q 315 278 328 288 Q 315 298 302 288 Z" fill="none" stroke="#fae084" stroke-width="1.5" />
      <circle cx="315" cy="288" r="3" fill="#fae084" />

      <!-- Crystal Pendulum on Chain -->
      <path d="M 235 240 Q 245 285 242 305" fill="none" stroke="#fae084" stroke-width="1" stroke-dasharray="2 2" />
      <polygon points="242,305 238,318 246,318" fill="#0d9488" stroke="#fae084" stroke-width="1" />
    `,
  },
];

for (const arch of ARCHETYPES) {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" id="retro-svg-${arch.id}" data-archetype="${arch.id}">
  ${DEFS}
  ${generateArtDecoFrame(arch.title)}
  <g clip-path="url(#cameo-clip)">
    ${arch.renderArt()}
  </g>
</svg>
`;

  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${arch.id}.svg`);
    fs.writeFileSync(filePath, svgContent, 'utf-8');
    console.log(`Generated: ${filePath}`);
  }
}

console.log('Successfully generated all 12 retro-rycin Dark Art Déco SVGs!');
