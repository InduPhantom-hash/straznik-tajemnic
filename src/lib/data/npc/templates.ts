// Szablony statystyk CoC7 dla różnych typów NPC (4 szablony).
// 1 source of truth - używane w npc-manager.tsx (NPCForm.applyTemplate + generateRandomNPC).

export const NPC_TEMPLATES = {
  ordinary_citizen: {
    name: 'Zwykły mieszkaniec',
    stats: {
      str: 45,
      dex: 50,
      con: 50,
      app: 50,
      pow: 50,
      edu: 50,
      siz: 50,
      int: 50,
      luck: 50,
    },
    skills: { Gadanina: 25, Spostrzegawczość: 25, 'Język Ojczysty': 50 },
  },
  cultist: {
    name: 'Kultysta',
    stats: {
      str: 50,
      dex: 55,
      con: 55,
      app: 45,
      pow: 65,
      edu: 40,
      siz: 50,
      int: 55,
      luck: 45,
    },
    skills: {
      Okultyzm: 40,
      'Mity Cthulhu': 30,
      Zastraszanie: 35,
      Spostrzegawczość: 30,
    },
  },
  researcher: {
    name: 'Badacz',
    stats: {
      str: 45,
      dex: 50,
      con: 50,
      app: 50,
      pow: 60,
      edu: 80,
      siz: 50,
      int: 75,
      luck: 50,
    },
    skills: {
      'Korzystanie z Bibliotek': 60,
      Nauka: 50,
      Spostrzegawczość: 50,
      'Język Obcy': 40,
    },
  },
  monster: {
    name: 'Potwór',
    stats: {
      str: 65,
      dex: 55,
      con: 70,
      app: 20,
      pow: 60,
      edu: 10,
      siz: 60,
      int: 30,
      luck: 40,
    },
    skills: { 'Walka Wręcz': 60, Spostrzegawczość: 40, Ukrywanie: 35 },
  },
} as const;

export type NpcTemplateKey = keyof typeof NPC_TEMPLATES;
export type NpcTemplate = (typeof NPC_TEMPLATES)[NpcTemplateKey];
