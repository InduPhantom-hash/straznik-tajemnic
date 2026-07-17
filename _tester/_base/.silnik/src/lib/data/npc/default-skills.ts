// Domyślne umiejętności CoC7 dla NPC (28 wpisów).
// 1 source of truth - używane w npc-manager.tsx i potencjalnie w future generatorach.

export const DEFAULT_SKILLS = {
  Gadanina: 5,
  Perswazja: 10,
  'Urok Osobisty': 15,
  Zastraszanie: 15,
  Psychologia: 10,
  'Walka Wręcz': 50,
  Unik: 0,
  Spostrzegawczość: 25,
  Nasłuchiwanie: 20,
  Tropienie: 10,
  Ukrywanie: 20,
  Mechanika: 10,
  Elektryka: 10,
  Ślusarstwo: 1,
  'Korzystanie z Bibliotek': 20,
  Historia: 5,
  Nauka: 1,
  'Język Ojczysty': 0,
  'Język Obcy': 1,
  Medycyna: 1,
  'Pierwsza Pomoc': 30,
  'Mity Cthulhu': 0,
  Okultyzm: 5,
  'Broń Palna': 20,
  'Broń Palna (Krótka)': 20,
  'Broń Palna (Karabin/Strzelba)': 25,
} as const;

export type DefaultSkillName = keyof typeof DEFAULT_SKILLS;
