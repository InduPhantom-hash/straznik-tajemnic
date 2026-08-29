import type { AdventureContext } from '@/lib/adventures-data';
import type { PredefinedCharacter } from './predefined-characters';

type Locale = string;

type AdventureTranslation = Pick<
  AdventureContext,
  | 'title'
  | 'eraLabel'
  | 'location'
  | 'country'
  | 'themes'
  | 'suggestedOccupations'
  | 'hook'
  | 'description'
  | 'source'
  | 'externalLinks'
>;

const EN_ADVENTURES: Record<string, AdventureTranslation> = {
  'cien-nad-prabutami': {
    title: "Shadow over Prabuty: Father Klimuszko's Vision",
    eraLabel: "People's Poland - 1970s",
    location: 'Warsaw - Elbląg - Prabuty',
    country: 'Poland',
    themes: ['Clairvoyance', 'Security Service', 'War trauma', 'Four dimensions'],
    suggestedOccupations: ['Journalist', 'Parapsychologist', 'Exorcist', 'Militia officer'],
    hook: "Investigating Father Klimuszko's phenomena leads the investigators to secret Security Service files and a dimensional anomaly in Prabuty.",
    description: 'The investigators are recruited by Helena Krawczyk, producer of the television programme "Signals from the Unknown", after the International Psychotronics Congress in Prague. Their task is to verify the extraordinary phenomena surrounding Father Klimuszko, a Franciscan friar from Elbląg.',
    source: 'Strefa 11 / Beyond Belief',
    externalLinks: [
      { label: 'Wikipedia (Beyond Belief)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Beyond Belief)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Official Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  'tajemnica-pendnika-lagiewki': {
    title: 'The Drive Mystery: A Brilliant Inventor from Kowary',
    eraLabel: '1990s',
    location: 'Kowary - Karkonosze Mountains',
    country: 'Poland',
    themes: ['Brilliant invention', 'Kinetic absorber', 'Secret AOR agents', 'Mi-Go technology'],
    suggestedOccupations: ['Engineer', 'Investigative journalist', 'Test driver', 'Physicist'],
    hook: "Łągiewka's bumper eliminates collision forces, but his Drive breaks the laws of physics using Mi-Go technology from the Mountains of Madness.",
    description: "The investigators uncover the discoveries of Lucjan Łągiewka from Kowary, whose kinetic bumpers eliminate overload. When he builds an inertia engine that works in a vacuum, AOR agents arrive at his workshop.",
    source: 'Strefa 11 / Beyond Belief',
    externalLinks: [
      { label: 'Wikipedia (Beyond Belief)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Beyond Belief)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Official Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  'tajemnica-dzieci-z-traszyna': {
    title: 'The Children of Traszyn: The Key and the Inverted Cross',
    eraLabel: '1990s (Y2K)',
    location: 'Traszyn, near Lublin',
    country: 'Poland',
    themes: ['Seance with a book and a key', 'Night paralysis', 'Poltergeist', 'Exorcisms'],
    suggestedOccupations: ['Psychologist', 'Ethnographer', 'Dowser / bioenergy therapist', 'Forester'],
    hook: 'In 1983, three children summoned a spirit in a barn. Sixteen years later it returns with a lightning strike and a scorched inverted cross.',
    description: 'An exorcist and bioenergy therapist, Tomasz Nowicki, summons the investigators to Traszyn. Sixteen years after a youthful seance with a book and a key, the entity returns and brings night paralysis with it.',
    source: 'Strefa 11 / Beyond Belief',
    externalLinks: [
      { label: 'Wikipedia (Beyond Belief)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Beyond Belief)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Official Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  'przybysz-z-matriksa-glogow': {
    title: 'The Visitor from the Matrix: Prophecy and the Głogów Phenomenon',
    eraLabel: 'Turn of the Millennium',
    location: 'Głogów - Legnica',
    country: 'Poland',
    themes: ['VHS signal', 'Time anomaly', 'Broadcasts from the future', 'Fortress tunnels'],
    suggestedOccupations: ['Y2K programmer', 'TV journalist', 'Radio amateur', 'Detective'],
    hook: 'A radio amateur records broadcasts from the future and a disrupted signal from the night of 14 November. An entity beneath the fortress manipulates time.',
    description: 'The investigators come to Głogów after a series of phenomena recorded on VHS tapes. Witnesses report night flashes, memory gaps and broadcasts from the future; the investigation leads beneath Głogów Fortress.',
    source: 'Strefa 11 / Beyond Belief',
    externalLinks: [
      { label: 'Wikipedia (Beyond Belief)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Beyond Belief)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Official Player.pl TVN', url: 'https://player.pl' },
    ],
  },
};

const EN_CHARACTER_OCCUPATIONS: Record<string, string> = {
  strefa11_tomasz_nowicki: 'Investigative Journalist / Host',
  strefa11_helena_krawczyk: 'Television Producer',
  strefa11_barbara_zawadzka: 'Ethnographer / Parapsychologist',
  strefa11_ryszard_klucznik: 'Former Security Service Officer / Protection Specialist',
  pednik_inzynier: 'Mechanical Engineer',
  pednik_kierowca: 'Test Driver',
  pednik_dziennikarka: 'Investigative Journalist',
  pednik_fizyk: 'Physicist',
  traszyn_egzorcysta: 'Exorcist',
  traszyn_terapeuta: 'Bioenergy Therapist',
  traszyn_psycholog: 'Psychologist',
  traszyn_etnografka: 'Ethnographer',
  glogow_detektyw: 'Private Detective',
  glogow_haker: 'Hacker',
  glogow_psychiatra: 'Psychiatrist',
  glogow_ufolog: 'Ufologist',
};

export function localizeStrefa11Adventure(
  adventure: AdventureContext,
  locale: Locale
): AdventureContext {
  const translation = locale === 'en' ? EN_ADVENTURES[adventure.id] : undefined;
  return translation ? { ...adventure, ...translation } : adventure;
}

export function localizeStrefa11Character(
  character: PredefinedCharacter,
  locale: Locale
): PredefinedCharacter {
  if (locale !== 'en') return character;
  const occupation = locale === 'en' ? EN_CHARACTER_OCCUPATIONS[character.id] : undefined;
  // The ID is retained solely as display provenance. It lets CharacterSheet
  // select dictionary text without altering the persisted rules data.
  return { ...character, ...(occupation ? { occupation } : {}), sourcePresetId: character.id };
}
