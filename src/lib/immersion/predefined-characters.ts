import { Character } from '@/lib/types';

// Baza 24 predefiniowanych postaci zbalansowanych pod mechanikę CoC 7e
export const PREDEFINED_CHARACTERS: Character[] = [
  // ==========================================
  // ARCHETYP: ŚLEDÇZY (investigator)
  // ==========================================
  {
    id: 'pref_tommy_obrien_1920s',
    name: 'Thomas "Tommy" O\'Brien',
    occupation: 'Prywatny Detektyw',
    age: 38,
    gender: 'male',
    portraitUrl: '/api/placeholder-image?text=Thomas+Tommy+OBrien+1920s+Private+Eye&width=512&height=512',
    str: 65, dex: 65, con: 60, app: 55, pow: 65, edu: 60, siz: 65, int: 75, luck: 55,
    hp: 12, maxHp: 12, san: 65, maxSan: 99, mp: 13, maxMp: 13,
    background: 'Były detektyw bostońskiej policji, który odszedł ze służby po odkryciu korupcji na najwyższych szczeblach. Teraz prowadzi jednoosobowe biuro śledcze, przyjmując sprawy, którymi nikt inny nie chce się zająć.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Klimat noir. Szorstki w obyciu, ale ma miękkie serce do sprawiedliwości.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Spostrzegawczość': 70,
      'Psychologia': 60,
      'Broń Palna (Krótka)': 65,
      'Zastraszanie': 55,
      'Prawo': 40,
      'Skradanie': 50,
      'Prowadzenie Samochodu': 50,
      'Walka Wręcz': 55,
      'Nasłuchiwanie': 55,
      'Korzystanie z Bibliotek': 40,
      'Unik': 32
    },
    equipment: [
      { id: 'eq_tommy_gun', name: 'Rewolwer Colt .38', category: 'weapon', description: 'Niezawodny rewolwer detektywistyczny.', modifiers: { damage: '1d10', range: '15 yards' } },
      { id: 'eq_tommy_badge', name: 'Zniszczona odznaka', category: 'personal', description: 'Pamiątka z czasów pracy w policji.' },
      { id: 'eq_tommy_trench', name: 'Prochowiec i kapelusz', category: 'personal' }
    ]
  },
  {
    id: 'pref_margaret_sullivan_1920s',
    name: 'Margaret Sullivan',
    occupation: 'Dziennikarka',
    age: 28,
    gender: 'female',
    portraitUrl: '/api/placeholder-image?text=Margaret+Sullivan+1920s+Journalist&width=512&height=512',
    str: 50, dex: 65, con: 55, app: 65, pow: 70, edu: 70, siz: 55, int: 75, luck: 65,
    hp: 11, maxHp: 11, san: 70, maxSan: 99, mp: 14, maxMp: 14,
    background: 'Reporterka śledcza pisząca dla „Arkham Advertiser”. Specjalizuje się w tropieniu powiązań lokalnych polityków z przestępczym podziemiem. Dociekliwa i nieustraszona, wierzy w uzdrawiającą moc prawdy.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Wyśmienita w rozmowach i badaniu starych archiwów.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Perswazja': 65,
      'Urok Osobisty': 60,
      'Sztuka/Rzemiosło (Pisanie)': 65,
      'Spostrzegawczość': 60,
      'Korzystanie z Bibliotek': 65,
      'Psychologia': 55,
      'Historia': 50,
      'Nasłuchiwanie': 50,
      'Broń Palna (Krótka)': 30,
      'Unik': 32
    },
    equipment: [
      { id: 'eq_margaret_notebook', name: 'Notatnik i ołówek', category: 'tool', description: 'Zapisane setkami wywiadów.' },
      { id: 'eq_margaret_camera', name: 'Aparat małoobrazkowy Kodak', category: 'tool' },
      { id: 'eq_margaret_press', name: 'Legitymacja prasowa', category: 'document' }
    ]
  },

  // ==========================================
  // ARCHETYP: UCZONY (scholar)
  // ==========================================
  {
    id: 'pref_archibald_blackwood_1890s',
    name: 'Prof. Archibald Blackwood',
    occupation: 'Profesor',
    age: 52,
    gender: 'male',
    portraitUrl: '/api/placeholder-image?text=Prof+Archibald+Blackwood+1890s+Professor&width=512&height=512',
    str: 45, dex: 50, con: 50, app: 50, pow: 75, edu: 90, siz: 50, int: 80, luck: 50,
    hp: 10, maxHp: 10, san: 75, maxSan: 99, mp: 15, maxMp: 15,
    background: 'Wykładowca historii starożytnej na Uniwersytecie Miskatonic. Spędził dekady badając zapomniane cywilizacje Mezopotamii. Szanowany badacz, który wierzy, że przeszłość kryje klucze do zrozumienia każdego koszmaru.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Chodząca encyklopedia. Zna martwe języki i stare księgi.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Korzystanie z Bibliotek': 80,
      'Historia': 75,
      'Język Obcy (Łacina)': 60,
      'Język Obcy (Egipskie Hieronimy)': 50,
      'Archeologia': 65,
      'Spostrzegawczość': 50,
      'Psychologia': 50,
      'Nauka (Astronomia)': 40,
      'Okultyzm': 45,
      'Unik': 25
    },
    equipment: [
      { id: 'eq_arch_briefcase', name: 'Skórzana aktówka', category: 'tool', description: 'Pełna notatek i wycinków prasowych.' },
      { id: 'eq_arch_magnifier', name: 'Lupa w mosiężnej oprawie', category: 'tool' },
      { id: 'eq_arch_journal', name: 'Dziennik wykopalisk', category: 'document' }
    ]
  },
  {
    id: 'pref_cordelia_ashford_1890s',
    name: 'Cordelia Ashford',
    occupation: 'Antykwariusz',
    age: 34,
    gender: 'female',
    portraitUrl: '/api/placeholder-image?text=Cordelia+Ashford+1890s+Antiquarian&width=512&height=512',
    str: 50, dex: 60, con: 55, app: 60, pow: 70, edu: 80, siz: 50, int: 75, luck: 60,
    hp: 10, maxHp: 10, san: 70, maxSan: 99, mp: 14, maxMp: 14,
    background: 'Właścicielka małego antykwariatu w Londynie. Specjalizuje się w średniowiecznych manuskryptach oraz rzadkich dziełach okultystycznych. Posiada niezwykły zmysł do wykrywania fałszerstw.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Potrafi odczytać najstarsze pisma i ocenić każdy artefakt.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Korzystanie z Bibliotek': 75,
      'Wycena': 70,
      'Historia': 65,
      'Język Obcy (Sanskryt)': 50,
      'Spostrzegawczość': 60,
      'Sztuka/Rzemiosło (Konserwacja Ksiąg)': 55,
      'Perswazja': 50,
      'Okultyzm': 50,
      'Nasłuchiwanie': 45,
      'Unik': 30
    },
    equipment: [
      { id: 'eq_cord_glasses', name: 'Okulary do czytania', category: 'personal' },
      { id: 'eq_cord_monograph', name: 'Monografia o demonologii', category: 'document' },
      { id: 'eq_cord_keys', name: 'Pęk starych kluczy do archiwum', category: 'personal' }
    ]
  },

  // ==========================================
  // ARCHETYP: CZŁOWIEK CZYNU (action)
  // ==========================================
  {
    id: 'pref_gerald_grant_1920s',
    name: 'Gerald Grant',
    occupation: 'Wojskowy',
    age: 32,
    gender: 'male',
    portraitUrl: '/api/placeholder-image?text=Gerald+Grant+1920s+Veteran&width=512&height=512',
    str: 75, dex: 65, con: 70, app: 50, pow: 60, edu: 55, siz: 70, int: 60, luck: 50,
    hp: 14, maxHp: 14, san: 60, maxSan: 99, mp: 12, maxMp: 12,
    background: 'Weteran I Wojny Światowej, który walczył ve Francji. Po powrocie do kraju nie potrafił odnaleźć się w cywilnym życiu. Pracuje jako ochroniarz oraz instruktor strzelectwa, wciąż prześladowany przez wspomnienia z frontu.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Doskonały w walce, posługiwaniu się bronią palną i przetrwaniu w trudnych warunkach.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Broń Palna (Długa)': 70,
      'Broń Palna (Krótka)': 60,
      'Walka Wręcz': 65,
      'Przetrwanie': 60,
      'Pierwsza Pomoc': 50,
      'Zastraszanie': 55,
      'Spostrzegawczość': 50,
      'Wspinaczka': 45,
      'Skradanie': 40,
      'Unik': 32
    },
    equipment: [
      { id: 'eq_gerald_rifle', name: 'Karabin Springfield M1903', category: 'weapon', description: 'Karabin wojskowy z czasów wojny.', modifiers: { damage: '2d6+4', range: '110 yards' } },
      { id: 'eq_gerald_canteen', name: 'Manierka wojskowa', category: 'tool' },
      { id: 'eq_gerald_medkit', name: 'Apteczka polowa', category: 'medical' }
    ]
  },
  {
    id: 'pref_agnes_mason_1920s',
    name: 'Agnes Mason',
    occupation: 'Pilot',
    age: 26,
    gender: 'female',
    portraitUrl: '/api/placeholder-image?text=Agnes+Mason+1920s+Aviator&width=512&height=512',
    str: 60, dex: 75, con: 65, app: 60, pow: 65, edu: 60, siz: 55, int: 65, luck: 55,
    hp: 12, maxHp: 12, san: 65, maxSan: 99, mp: 13, maxMp: 13,
    background: 'Jedna z pierwszych kobiet-pilotów w Nowej Anglii. Prowadzi firmę wykonującą loty pocztowe i transportowe. Kocha adrenalinę i otwarte przestrzenie. Nigdy nie odmawia podjęcia ryzykownego zlecenia.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Niezwykle zręczna, zna się na maszynach i nawigacji.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Pilotowanie (Samoloty)': 70,
      'Mechanika': 60,
      'Nawigacja': 55,
      'Spostrzegawczość': 60,
      'Elektryka': 45,
      'Strzelanie': 40,
      'Prowadzenie Samochodu': 50,
      'Walka Wręcz': 40,
      'Unik': 37
    },
    equipment: [
      { id: 'eq_agnes_goggles', name: 'Gogle i skórzana pilotka', category: 'personal' },
      { id: 'eq_agnes_wrench', name: 'Klucz francuski', category: 'tool', description: 'Ciężkie narzędzie, może służyć jako broń improwizowana.' },
      { id: 'eq_agnes_map', name: 'Mapy lotnicze regionu', category: 'document' }
    ]
  },

  // ==========================================
  // ARCHETYP: MISTYK (mystic)
  // ==========================================
  {
    id: 'pref_victor_crowley_modern',
    name: 'Victor Crowley',
    occupation: 'Parapsychologist',
    age: 44,
    gender: 'male',
    portraitUrl: '/api/placeholder-image?text=Victor+Crowley+Modern+Ghost+Hunter&width=512&height=512',
    str: 50, dex: 55, con: 55, app: 50, pow: 80, edu: 75, siz: 50, int: 80, luck: 60,
    hp: 10, maxHp: 10, san: 80, maxSan: 99, mp: 16, maxMp: 16,
    background: 'Prywatny badacz zjawisk paranormalnych. Autor kilku książek o nawiedzonych miejscach. Choć sceptyczny wobec tanich sztuczek spirytystycznych, wielokrotnie natknął się na zjawiska, których nauka nie potrafi wyjaśnić.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Niezwykle silna wola. Wiedza o okultyzmie i badaniach terenowych.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Okultyzm': 70,
      'Psychologia': 60,
      'Nauka (Fizyka)': 45,
      'Spostrzegawczość': 60,
      'Korzystanie z Bibliotek': 60,
      'Nasłuchiwanie': 55,
      'Fotografia': 50,
      'Perswazja': 45,
      'Unik': 27
    },
    equipment: [
      { id: 'eq_victor_emf', name: 'Miernik pola elektromagnetycznego', category: 'tool', description: 'Wykrywa anomalie magnetyczne.' },
      { id: 'eq_victor_recorder', name: 'Dyktafon cyfrowy', category: 'tool' },
      { id: 'eq_victor_camera', name: 'Lustrzanka z fleszem', category: 'tool' }
    ]
  },
  {
    id: 'pref_seraphina_marsh_modern',
    name: 'Seraphina Marsh',
    occupation: 'Artysta',
    age: 29,
    gender: 'female',
    portraitUrl: '/api/placeholder-image?text=Seraphina+Marsh+Modern+Medium&width=512&height=512',
    str: 45, dex: 65, con: 50, app: 65, pow: 75, edu: 60, siz: 50, int: 75, luck: 70,
    hp: 10, maxHp: 10, san: 75, maxSan: 99, mp: 15, maxMp: 15,
    background: 'Malarka mieszkająca w klimatycznej dzielnicy bohemy. Twierdzi, że jej surrealistyczne obrazy są inspirowane snami oraz szeptami z innego wymiaru. Posiada niezwykle czułą intuicję i wrażliwość na atmosferę miejsc.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Wysokie Szczęście. Intuicyjna i spostrzegawcza.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Sztuka/Rzemiosło (Malarstwo)': 75,
      'Spostrzegawczość': 65,
      'Psychologia': 60,
      'Nasłuchiwanie': 55,
      'Okultyzm': 50,
      'Urok Osobisty': 55,
      'Historia': 40,
      'Język Obcy (Francuski)': 40,
      'Unik': 32
    },
    equipment: [
      { id: 'eq_sera_sketch', name: 'Szkicownik węglowy', category: 'personal', description: 'Pełen niepokojących, surrealistycznych rysunków.' },
      { id: 'eq_sera_amulet', name: 'Srebrny talizman', category: 'occult', description: 'Pamiątka rodzinna o nieznanym pochodzeniu.' }
    ]
  },

  // ==========================================
  // ARCHETYP: UZDROWICIEL (healer)
  // ==========================================
  {
    id: 'pref_henry_whitman_1920s',
    name: 'Dr Henry Whitman',
    occupation: 'Lekarz',
    age: 41,
    gender: 'male',
    portraitUrl: '/api/placeholder-image?text=Dr+Henry+Whitman+1920s+Physician&width=512&height=512',
    str: 50, dex: 60, con: 60, app: 60, pow: 65, edu: 85, siz: 55, int: 80, luck: 55,
    hp: 11, maxHp: 11, san: 65, maxSan: 99, mp: 13, maxMp: 13,
    background: 'Uznany chirurg ogólny pracujący w szpitalu w Arkham. W czasie wojny służył w szpitalach polowych, gdzie nauczył się operować pod presją czasu i pod ostrzałem. Zawsze opanowany i profesjonalny.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Najlepszy specjalista od leczenia ran fizycznych i znajomości biologii.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Medycyna': 80,
      'Pierwsza Pomoc': 75,
      'Nauka (Biologia)': 65,
      'Nauka (Farmacja)': 55,
      'Psychologia': 55,
      'Spostrzegawczość': 60,
      'Język Obcy (Łacina)': 50,
      'Perswazja': 50,
      'Unik': 30
    },
    equipment: [
      { id: 'eq_henry_bag', name: 'Torba lekarska', category: 'medical', description: 'Zawiera stetoskop, skalpele i podstawowe leki.' },
      { id: 'eq_henry_morphine', name: 'Ampułki z morfiną', category: 'medical', description: 'Do łagodzenia silnego bólu.' },
      { id: 'eq_henry_bandages', name: 'Zestaw sterylnych bandaży', category: 'medical' }
    ]
  },
  {
    id: 'pref_evelyn_sterling_1920s',
    name: 'Dr Evelyn Sterling',
    occupation: 'Lekarz',
    age: 36,
    gender: 'female',
    portraitUrl: '/api/placeholder-image?text=Dr+Evelyn+Sterling+1920s+Psychiatrist&width=512&height=512',
    str: 45, dex: 55, con: 55, app: 65, pow: 70, edu: 80, siz: 50, int: 75, luck: 60,
    hp: 10, maxHp: 10, san: 70, maxSan: 99, mp: 14, maxMp: 14,
    background: 'Psychiatra pracująca w azylu Arkham Sanitarium. Bada przypadki ciężkich psychoz i nietypowych urojeń. Interesuje się nowatorskimi metodami psychoanalizy, starając się zrozumieć najgłębsze zakamarki ludzkiego umysłu.',
    playerName: '',
    isActive: false,
    lastUsed: new Date(),
    notes: 'Kluczowa postać do leczenia utraty Poczytalności (SAN) i analizowania zachowań.',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
    skills: {
      'Psychoanaliza': 75,
      'Psychologia': 70,
      'Medycyna': 60,
      'Pierwsza Pomoc': 55,
      'Nauka (Medycyna Sądowa)': 50,
      'Spostrzegawczość': 55,
      'Urok Osobisty': 50,
      'Korzystanie z Bibliotek': 50,
      'Unik': 27
    },
    equipment: [
      { id: 'eq_evelyn_records', name: 'Akta pacjentów', category: 'document', description: 'Notatki dotyczące nietypowych przypadków schizofrenii.' },
      { id: 'eq_evelyn_sedatives', name: 'Środki uspokajające', category: 'medical' },
      { id: 'eq_evelyn_journal', name: 'Notes z zapiskami snów', category: 'document' }
    ]
  }
];

export function getPredefinedCharactersByEra(era: string): Character[] {
  if (era === 'gaslight') {
    return PREDEFINED_CHARACTERS.filter(c => c.id.includes('1890s'));
  }
  if (era === 'classic') {
    return PREDEFINED_CHARACTERS.filter(c => c.id.includes('1920s'));
  }
  if (era === 'modern') {
    return PREDEFINED_CHARACTERS.filter(c => c.id.includes('modern'));
  }
  return PREDEFINED_CHARACTERS;
}
