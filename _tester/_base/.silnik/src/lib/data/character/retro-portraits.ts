export interface RetroPortraitArchetype {
  id: string;
  titlePl: string;
  titleEn: string;
  svgPath: string;
  descriptionPl: string;
  descriptionEn: string;
}

export const RETRO_PORTRAITS: RetroPortraitArchetype[] = [
  {
    id: 'detective',
    titlePl: 'Detektyw',
    titleEn: 'Detective',
    svgPath: '/portraits/retro-svg/detective.svg',
    descriptionPl: 'Kapelusz fedora, prochowiec i lupa w mroku miejskich zaułków.',
    descriptionEn: 'Fedora hat, trench coat, and magnifying glass in shadowy alleys.',
  },
  {
    id: 'journalist',
    titlePl: 'Dziennikarz',
    titleEn: 'Journalist',
    svgPath: '/portraits/retro-svg/journalist.svg',
    descriptionPl: 'Karta prasowa za wstążką kapelusza, notes i błysk aparatu.',
    descriptionEn: 'Press pass in hat band, reporter notebook, and vintage flash camera.',
  },
  {
    id: 'doctor',
    titlePl: 'Lekarz',
    titleEn: 'Physician',
    svgPath: '/portraits/retro-svg/doctor.svg',
    descriptionPl: 'Okrągłe okulary, stetoskop i skórzana torba medyczna.',
    descriptionEn: 'Round spectacles, physician stethoscope, and leather medical bag.',
  },
  {
    id: 'scientist',
    titlePl: 'Naukowiec',
    titleEn: 'Scientist',
    svgPath: '/portraits/retro-svg/scientist.svg',
    descriptionPl: 'Profesorski tweed, mosiężny mikroskop i chemiczna retorta.',
    descriptionEn: 'Professorial tweed, brass monocular microscope, and chemical retort.',
  },
  {
    id: 'author',
    titlePl: 'Pisarz',
    titleEn: 'Author',
    svgPath: '/portraits/retro-svg/author.svg',
    descriptionPl: 'Maszyna do pisania, kałamarz ze stalówką i zamyślone spojrzenie.',
    descriptionEn: 'Vintage typewriter, quill with inkwell, and contemplative gaze.',
  },
  {
    id: 'artist',
    titlePl: 'Artysta',
    titleEn: 'Artist',
    svgPath: '/portraits/retro-svg/artist.svg',
    descriptionPl: 'Paryski beret, paleta malarska i ekspresyjne pędzle.',
    descriptionEn: 'Bohemian beret, artist palette, and expressive paintbrushes.',
  },
  {
    id: 'clergy',
    titlePl: 'Duchowny',
    titleEn: 'Clergy',
    svgPath: '/portraits/retro-svg/clergy.svg',
    descriptionPl: 'Koloratka, mosiężny krzyż i brewiarz na tle gotyckich łuków.',
    descriptionEn: 'Clerical collar, brass pectoral cross, and scripture in gothic arches.',
  },
  {
    id: 'drifter',
    titlePl: 'Włóczęga',
    titleEn: 'Drifter',
    svgPath: '/portraits/retro-svg/drifter.svg',
    descriptionPl: 'Zawadiacki kaszkiet, tobołek na kiju i tory kolejowe ku horyzontowi.',
    descriptionEn: 'Newsboy cap, bindle sack on walking stick, and vanishing train tracks.',
  },
  {
    id: 'antiquarian',
    titlePl: 'Antykwariusz',
    titleEn: 'Antiquarian',
    svgPath: '/portraits/retro-svg/antiquarian.svg',
    descriptionPl: 'Lupa jubilerska w oku, astrolabium i opasłe tomy starożytności.',
    descriptionEn: 'Jeweler loupe monocle, celestial astrolabe, and ancient folios.',
  },
  {
    id: 'soldier',
    titlePl: 'Weteran',
    titleEn: 'Veteran',
    svgPath: '/portraits/retro-svg/soldier.svg',
    descriptionPl: 'Stalowy hełm M1917, płaszcz wojskowy i wstęga waleczności.',
    descriptionEn: 'M1917 steel helmet, military trench coat, and ribbon of valor.',
  },
  {
    id: 'lawyer',
    titlePl: 'Prawnik',
    titleEn: 'Lawyer',
    svgPath: '/portraits/retro-svg/lawyer.svg',
    descriptionPl: 'Garnitur w prążki, dewizka zegarka, waga Temidy i aktówka.',
    descriptionEn: 'Pinstripe suit, pocket watch chain, scales of justice, and briefcase.',
  },
  {
    id: 'occultist',
    titlePl: 'Okultysta',
    titleEn: 'Occultist',
    svgPath: '/portraits/retro-svg/occultist.svg',
    descriptionPl: 'Cień kaptura, kapiąca świeca, grimoire i kryształowe wahadło.',
    descriptionEn: 'Shadowed hood, melting candle, arcane grimoire, and crystal pendulum.',
  },
];

/**
 * Precyzyjne mapowanie ponad 50 zawodów CoC 7e na 12 archetypów rycin SVG
 */
const OCCUPATION_MAP: Record<string, string> = {
  // 1. Detektyw
  detective: 'detective',
  police_detective: 'detective',
  police_officer: 'detective',
  private_investigator: 'detective',
  agency_detective: 'detective',
  federal_agent: 'detective',
  spy: 'detective',
  bounty_hunter: 'detective',
  forensic_specialist: 'detective',
  criminal: 'detective',
  gangster: 'detective',

  // 2. Dziennikarz
  journalist: 'journalist',
  foreign_correspondent: 'journalist',
  photographer: 'journalist',
  editor: 'journalist',

  // 3. Lekarz
  doctor: 'doctor',
  nurse: 'doctor',
  alienist: 'doctor',
  pharmacist: 'doctor',
  psychiatrist: 'doctor',
  psychologist: 'doctor',
  hospital_orderly: 'doctor',
  asylum_attendant: 'doctor',
  undertaker: 'doctor',

  // 4. Naukowiec
  scientist: 'scientist',
  professor: 'scientist',
  academic: 'scientist',
  engineer: 'scientist',
  archaeologist: 'scientist',
  architect: 'scientist',
  lab_assistant: 'scientist',
  student: 'scientist',
  hacker: 'scientist',

  // 5. Pisarz
  author: 'author',
  librarian: 'author',
  bookseller: 'author',
  clerk: 'author',
  secretary: 'author',

  // 6. Artysta
  artist: 'artist',
  entertainer: 'artist',
  actor: 'artist',
  musician: 'artist',
  artisan: 'artist',
  designer: 'artist',

  // 7. Duchowny
  clergy: 'clergy',
  missionary: 'clergy',
  fanatic: 'clergy',
  deprogrammer: 'clergy',

  // 8. Włóczęga
  drifter: 'drifter',
  hobo: 'drifter',
  sailor: 'drifter',
  prospector: 'drifter',
  trapper: 'drifter',
  laborer: 'drifter',
  diver: 'drifter',
  explorer: 'drifter',
  bartender: 'drifter',
  waiter: 'drifter',
  driver: 'drifter',
  mechanic: 'drifter',
  shopkeeper: 'drifter',
  firefighter: 'drifter',

  // 9. Antykwariusz
  antiquarian: 'antiquarian',
  antique_dealer: 'antiquarian',
  curator: 'antiquarian',

  // 10. Żołnierz
  soldier: 'soldier',
  military: 'soldier',
  military_officer: 'soldier',
  pilot: 'soldier',
  athlete: 'soldier',
  boxer: 'soldier',
  stuntman: 'soldier',
  big_game_hunter: 'soldier',
  mountain_climber: 'soldier',
  cowboy: 'soldier',

  // 11. Prawnik
  lawyer: 'lawyer',
  judge: 'lawyer',
  public_official: 'lawyer',
  accountant: 'lawyer',
  dilettante: 'lawyer',
  gentleman_lady: 'lawyer',
  wealthy_hobbyist: 'lawyer',
  butler: 'lawyer',
  gambler: 'lawyer',
  salesman: 'lawyer',
  union_organizer: 'lawyer',

  // 12. Okultysta
  occultist: 'occultist',
  parapsychologist: 'occultist',
  cult_leader: 'occultist',
  tribe_member: 'occultist',
  zookeeper: 'occultist',
  animal_trainer: 'occultist',
  sex_worker: 'occultist',
};

/**
 * Zwraca dopasowaną rycinę SVG dla danego zawodu
 */
export function getRetroPortraitForOccupation(occupationId?: string | null): RetroPortraitArchetype {
  if (!occupationId) {
    return RETRO_PORTRAITS[0]; // detective fallback
  }

  const normalizedId = occupationId.toLowerCase().trim().replace(/[-\s]+/g, '_');
  const archetypeId = OCCUPATION_MAP[normalizedId] || OCCUPATION_MAP[occupationId] || 'detective';
  const found = RETRO_PORTRAITS.find((p) => p.id === archetypeId);

  return found || RETRO_PORTRAITS[0];
}

/**
 * Sprawdza, czy URL portretu to retro-rycina SVG
 */
export function isRetroPortraitUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('/portraits/retro-svg/') && url.endsWith('.svg');
}
