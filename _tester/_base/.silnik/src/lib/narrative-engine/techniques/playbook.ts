/**
 * Wewnętrzny Kodeks Technik MG i Scenopisarstwa (GM Technique Playbook)
 *
 * Adaptacja esencji wiedzy Skorkowskiego, Lans Macabre, kognitywistyki grozy
 * oraz kompendium narracji pod d100 Weird Fiction / Call of Cthulhu 7e RAW.
 *
 * @module narrative-engine/techniques/playbook
 */

import type {
  TechniqueDefinition,
  TechniqueId,
  TechniqueCategory,
  SceneState,
  Locale,
} from './types';

export const GM_TECHNIQUES: TechniqueDefinition[] = [
  // ==========================================================================
  // PACING I RYTM
  // ==========================================================================
  {
    id: 'bang_hard_move',
    name: {
      pl: 'Uderzenie Świata (Hard Move / Bang)',
      en: 'World Strike (Hard Move / Bang)',
    },
    category: 'pacing',
    cadence: 3,
    sceneStates: ['tension_spike', 'action'],
    whenToUse: {
      pl: 'Gdy badacze zwlekają, utknęli w impasie decyzyjnym, zignorowali ostrzeżenie lub w teście wystąpiła porażka z bezpośrednim zagrożeniem.',
      en: 'When investigators hesitate, stall at a decision dead end, ignore a warning, or fail a test involving direct danger.',
    },
    directive: {
      pl: 'Świat uderza natychmiast bez pytania o zgodę: narusz status quo, wywołaj nagły incydent, zamknij drogę odwrotu lub postaw badacza w bezpośrednim zagrożeniu. Krótkie zdania, wysoka presja czasu.',
      en: 'The world strikes immediately without asking: shatter the status quo, trigger a sudden incident, cut off escape, or place the investigator in immediate peril. Use punchy sentences and high time pressure.',
    },
    antiPatterns: {
      pl: "Zakaz pasywnego czekania na deklarację ('Nic się nie dzieje, co robisz?') przy eskalacji zagrożenia.",
      en: "Do not wait passively for a player declaration ('Nothing happens, what do you do?') when danger escalates.",
    },
  },
  {
    id: 'soft_move',
    name: {
      pl: 'Zwiastun Zagrożenia (Soft Move)',
      en: 'Impending Threat (Soft Move)',
    },
    category: 'pacing',
    cadence: 2,
    sceneStates: ['investigation', 'dialogue', 'tension_spike'],
    whenToUse: {
      pl: 'W fazie narastania napięcia, przed uderzeniem kryzysu; daje graczowi szansę na reakcję lub zmianę planu.',
      en: 'During tension buildup before a crisis hits; grants the player a chance to react or adjust their plan.',
    },
    directive: {
      pl: 'Zasygnalizuj nadchodzące niebezpieczeństwo lub komplikację poprzez detal w otoczeniu (kroki na schodach, gasnąca lampa naftowa, cień za oknem). Daj badaczowi okno na uprzedzające działanie.',
      en: 'Telegraph approaching danger or complication through environmental cues (footsteps on stairs, flickering oil lamp, shadow past the window). Give the investigator a window to take preemptive action.',
    },
    antiPatterns: {
      pl: 'Zakaz zadawania natychmiastowych obrażeń bez wcześniejszego ostrzeżenia.',
      en: 'Do not deal direct damage or consequences without prior warning.',
    },
  },
  {
    id: 'foreshadowing',
    name: {
      pl: 'Zasiew Niepokoju (Foreshadowing)',
      en: 'Ominous Foreshadowing',
    },
    category: 'pacing',
    cadence: 2,
    sceneStates: ['investigation', 'dialogue'],
    whenToUse: {
      pl: 'W spokojnych scenach wstępnych i ekspozycyjnych; przygotowuje grunt pod późniejszy horror.',
      en: 'In early or calm exposition scenes; lays the groundwork for future cosmic dread.',
    },
    directive: {
      pl: 'Wpleć w tło pozornie niegroźny, lecz niepokojący motyw (dziwne zachowanie ptaków, zniekształcony rysunek dziecka, fragment nekrologu w prasie), który zyska groźny sens w późniejszym akcie.',
      en: "Weave a seemingly innocuous yet unsettling motif into the backdrop (unusual bird behavior, a child's distorted drawing, an obituary fragment) that will take on sinister meaning later.",
    },
    antiPatterns: {
      pl: 'Zakaz zdradzania tajemnicy wprost; motyw musi być organicznym elementem otoczenia.',
      en: 'Do not reveal the core mystery outright; the motif must remain an organic environmental detail.',
    },
  },
  {
    id: 'cut_to_action',
    name: {
      pl: 'Cięcie do Sedna (Cut to Action)',
      en: 'Cut to Action',
    },
    category: 'pacing',
    cadence: 1,
    sceneStates: ['action', 'tension_spike'],
    whenToUse: {
      pl: 'Gdy rutynowa podróż, przygotowania lub jałowa wymiana zdań zaczynają spowalniać tempo akcji.',
      en: 'When routine travel, mundane prep, or idle chatter begins to drag the scene down.',
    },
    directive: {
      pl: 'Odetnij nudne przejścia i formalności; przenieś scenę bezpośrednio do momentu krytycznego, w którym badacz staje przed bezpośrednią decyzją lub przeszkodą. Ogranicz opis otoczenia do 1-2 zdań.',
      en: 'Cut away tedious travel and routine filler; jump directly to the critical moment where the investigator faces an immediate choice or obstacle. Keep scenery description down to 1-2 sentences.',
    },
    antiPatterns: {
      pl: 'Zakaz opisywania nudnej drogi, pakowania walizek czy formalnego kupowania biletów.',
      en: 'Do not describe mundane travel steps, packing luggage, or bureaucratic ticket purchases.',
    },
  },
  {
    id: 'slow_burn',
    name: {
      pl: 'Powolne Odkrywanie (Slow-Burn Investigation)',
      en: 'Slow-Burn Investigation',
    },
    category: 'pacing',
    cadence: 2,
    sceneStates: ['investigation'],
    whenToUse: {
      pl: 'W archiwach, bibliotekach, gabinetach lub opuszczonych domach podczas skrupulatnego badania poszlak.',
      en: 'In archives, libraries, studies, or abandoned estates during meticulous clue examination.',
    },
    directive: {
      pl: 'Buduj nastrój analitycznego niepokoju poprzez warstwy faktów: pożółkłe marginesy, sprzeczne daty w rejestrach, ślady pośpiesznego zacierania dowodów. Pozwól graczowi łączyć kropki.',
      en: 'Build mood through layers of analytical unease: yellowed margins, conflicting ledger dates, traces of rushed cover-ups. Allow the player room to connect the dots.',
    },
    antiPatterns: {
      pl: 'Zakaz natychmiastowego rzucania potwora do biblioteki przed zbadaniem akt.',
      en: 'Do not abruptly spawn a monster into a quiet archive before clues have been examined.',
    },
  },
  {
    id: 'value_charge_shift',
    name: {
      pl: 'Zwrot Wektora Sceny (Value Charge Shift +/-)',
      en: 'Value Charge Shift (+/-)',
    },
    category: 'pacing',
    cadence: 2,
    sceneStates: ['dialogue', 'investigation', 'tension_spike', 'action'],
    whenToUse: {
      pl: 'Gdy scena grozi monotonią emocjonalną, a stan początkowy i końcowy mają ten sam ładunek (np. nadzieja w nadzieję lub strach w strach).',
      en: 'When a scene risks emotional monotony with identical starting and ending charge (e.g. hope to hope or dread to dread).',
    },
    directive: {
      pl: 'Przełam ładunek emocjonalny sceny przed jej zamknięciem (zasada Roberta McKee +/-): jeśli badacz wchodzi z nadzieją na dowód, napotyka rozczarowanie lub złowróżbny trop (-); jeśli tkwi w bezsilności lub lęku, zyskuje nieoczekiwany punkt zaczepienia lub triumf (+). Zakończenie sceny musi zmienić stan poznawczy lub emocjonalny.',
      en: 'Shift the emotional value charge before closing the scene (Robert McKee +/- principle): if the investigator enters hopeful, confront them with setback or ominous cost (-); if cornered in dread or futility, provide an unexpected breakthrough or tactical foothold (+). The scene ending must alter their cognitive or emotional state.',
    },
    antiPatterns: {
      pl: 'Zakaz płaskich scen, które zaczynają się i kończą w identycznym nastroju bez zmiany ładunku.',
      en: 'Do not write flat scenes that open and close on the exact same emotional charge without a shift.',
    },
  },

  // ==========================================================================
  // POSTACIE NPC
  // ==========================================================================
  {
    id: 'agenda_first',
    name: {
      pl: 'Własny Cel NPC (Agenda First)',
      en: 'NPC Hidden Agenda (Agenda First)',
    },
    category: 'npc',
    cadence: 1,
    sceneStates: ['dialogue'],
    whenToUse: {
      pl: 'W każdej interakcji z NPC posiadającym własną tożsamość i pozycję społeczną.',
      en: 'In any interaction with an NPC who possesses an identity and social standing.',
    },
    directive: {
      pl: 'NPC nigdy nie jest encyklopedią czekającą na pytania badacza. Każda jego kwestia wynika z jego własnego celu (ochrona rodziny, ukrycie długu, zdobycie uznania). Rozmawia tylko tak długo, jak służy to jego agendzie.',
      en: 'NPCs are never idle encyclopedias waiting for player questions. Every statement serves their own agenda (protecting family, hiding debt, gaining status). They converse only as long as it serves their interests.',
    },
    antiPatterns: {
      pl: 'Zakaz życzliwego asystenta (positive bias) natychmiastowo streszczającego intrygę.',
      en: 'Do not roleplay helpful assistant NPCs who instantly volunteer vital plot secrets.',
    },
  },
  {
    id: 'social_leverage',
    name: {
      pl: 'Dźwignia Społeczna (Social Leverage)',
      en: 'Social Leverage',
    },
    category: 'npc',
    cadence: 1,
    sceneStates: ['dialogue'],
    whenToUse: {
      pl: 'Gdy badacz żąda cennych informacji, wstępu do zamkniętej strefy lub ryzykownej przysługi od NPC.',
      en: 'When an investigator demands valuable intelligence, restricted access, or a risky favor from an NPC.',
    },
    directive: {
      pl: 'NPC żąda wzajemności: przysługi, pieniędzy, milczenia, ochrony lub ustępstwa. Gracz musi zaoferować dźwignię (przekonujący argument, test umiejętności społecznej, przysługę lub szantaż).',
      en: 'The NPC demands reciprocity: a favor, cash, discretion, protection, or a concession. The player must provide leverage (compelling rationale, social skill roll, favor, or blackmail).',
    },
    antiPatterns: {
      pl: "Zakaz oddawania kluczowych dowodów za zwykłe 'dzień dobry, jestem detektywem'.",
      en: 'Do not surrender vital clues in exchange for a mere polite greeting or badge flash.',
    },
  },
  {
    id: 'distinct_voice',
    name: {
      pl: 'Głos i Tik Behawioralny (Distinct Voice & Mannerism)',
      en: 'Distinct Voice & Mannerism',
    },
    category: 'npc',
    cadence: 1,
    sceneStates: ['dialogue'],
    whenToUse: {
      pl: 'W dialogach z kluczowymi postaciami niezależnymi dla natychmiastowego ugruntowania w epoce.',
      en: 'In dialogues with key NPCs to immediately ground their presence and social stratum.',
    },
    directive: {
      pl: 'Scharakteryzuj NPC przez rytm mowy, dobór słownictwa epoki (gwara uliczna, formalny chłód arystokracji, połamana składnia imigranta) oraz jeden fizyczny tik (polerowanie okularów, unikanie wzroku, nerwowe obracanie sygnetu) zamiast opisu kroju płaszcza.',
      en: 'Characterize the NPC through speech cadence, era vocabulary (street slang, aristocratic frostiness, immigrant syntax), and one physical mannerism (polishing spectacles, avoiding eye contact, twirling a signet ring) instead of describing clothes.',
    },
    antiPatterns: {
      pl: 'Zakaz jednolitego, literackiego tonu dla wszystkich postaci.',
      en: 'Do not give every NPC the same homogenous, eloquent narrator voice.',
    },
  },
  {
    id: 'status_dynamic',
    name: {
      pl: 'Dynamika Statusu (Status Dynamic)',
      en: 'Social Status Dynamic',
    },
    category: 'npc',
    cadence: 1,
    sceneStates: ['dialogue'],
    whenToUse: {
      pl: 'W zderzeniu klas społecznych lat 20. (stróż prawa vs magnat, imigrant vs elitarny klub, robotnik vs właściciel fabryki).',
      en: 'When confronting 1920s class barriers (patrolman vs magnate, immigrant vs elite club, laborer vs factory owner).',
    },
    directive: {
      pl: 'Odzwierciedlaj pozycję społeczną w traktowaniu badacza: protekcjonalność wyższych sfer, nieufność i lęk robotników przed prowokacją, urzędnicza znieczulica. Poziom zamożności (Credit Rating) i reputacja kształtują reakcję rozmówcy.',
      en: 'Reflect rigid class divides: upper-class condescension, working-class distrust of agitators, bureaucratic indifference. Credit Rating and social reputation dictate how the NPC treats the investigator.',
    },
    antiPatterns: {
      pl: 'Zakaz ignorowania hierarchii społecznej lat 20. XX wieku.',
      en: 'Do not ignore the strict class hierarchy and social mores of the 1920s.',
    },
  },
  {
    id: 'prep_situations',
    name: {
      pl: 'Sytuacja zamiast Fabuły (Prep Situations, Not Plots)',
      en: 'Prep Situations, Not Plots',
    },
    category: 'npc',
    cadence: 1,
    sceneStates: ['dialogue', 'investigation', 'tension_spike'],
    whenToUse: {
      pl: 'W każdej sytuacji tarcia interesów NPC lub frakcji; zapobiega liniowemu pchaniu gracza ku z góry zaplanowanym scenom.',
      en: 'In any situation of conflicting NPC or faction interests; prevents railroad pushing towards predetermined scenes.',
    },
    directive: {
      pl: 'Świat reaguje stanem, a nie scenariuszem (zasada The Alexandrian): NPC i frakcje posiadają konkretne cele, zasoby, obawy i sprzeczne interesy. MG symuluje ich dynamiczne wektory i reakcję na działania badacza zamiast sztywnej sekwencji z góry zaplanowanych wydarzeń. Gracz ma pełną swobodę wyboru sojuszy i metod.',
      en: 'The world reacts with state, not a rigid script (The Alexandrian principle): NPCs and factions have distinct motives, assets, fears, and conflicting vectors. The GM simulates their dynamic response to investigator actions rather than forcing predetermined cutscenes. Grant the player total latitude in choosing approaches and alliances.',
    },
    antiPatterns: {
      pl: 'Zakaz z góry narzuconej ścieżki i pchania badacza do konkretnego pokoju/rozmowy wbrew jego deklaracji.',
      en: 'Do not railroad or force the investigator into specific rooms or dialogue outcomes contrary to their declaration.',
    },
  },

  // ==========================================================================
  // INFORMACJA I ŚLEDZTWO
  // ==========================================================================
  {
    id: 'three_clue_rule',
    name: {
      pl: 'Zasada Trzech Poszlak (Three Clue Rule)',
      en: 'Three Clue Rule',
    },
    category: 'investigation',
    cadence: 2,
    sceneStates: ['investigation'],
    whenToUse: {
      pl: 'Przy projektowaniu i ujawnianiu węzłów śledztwa prowadzących ku kolejnej lokacji lub konkluzji.',
      en: 'When structuring and revealing investigative bottlenecks leading to the next location or conclusion.',
    },
    directive: {
      pl: 'Do każdego kluczowego wniosku lub lokacji prowadzą minimum 3 niezależne poszlaki: materialna (przedmiot/dokument), osobowa (zeznanie/plotka) i dedukcyjna (analityczny wniosek ze zbiegu okoliczności). Zapewnij alternatywne ścieżki.',
      en: 'For every essential conclusion or location, provide at least three distinct clues: physical (item/document), witness (testimony/rumor), and deductive (logical correlation of anomalies). Ensure multiple paths.',
    },
    antiPatterns: {
      pl: 'Zakaz pojedynczego chokepointu (jedna poszlaka, bez której fabuła staje w miejscu).',
      en: 'Do not create single-point chokepoints where one missed clue halts the entire mystery.',
    },
  },
  {
    id: 'fail_forward',
    name: {
      pl: 'Poszlaka za Cenę (Fail-Forward Information)',
      en: 'Fail-Forward Information',
    },
    category: 'investigation',
    cadence: 3,
    sceneStates: ['investigation', 'action', 'tension_spike'],
    whenToUse: {
      pl: 'Gdy badacz wykonuje test umiejętności badawczej (Spostrzegawczość, Szukanie, Bibliotekoznawstwo) i wyrzuca porażkę.',
      en: 'When an investigator rolls a failure on an investigative check (Spot Hidden, Library Use, Track).',
    },
    directive: {
      pl: 'Porażka w rzucie nigdy nie zamyka śledztwa; dostarcza poszlakę, lecz obciąża badacza bezpośrednim kosztem: utratą cennego czasu, uszkodzeniem rekwizytu, zaalarmowaniem stróża lub ściągnięciem uwagi wrogich oczu.',
      en: 'A failed roll never stalls an investigation; it delivers the clue but extracts an immediate price: lost time, damaged evidence, an alerted guard, or hostile attention drawn.',
    },
    antiPatterns: {
      pl: "Zakaz martwych porażek typu: 'Rzut nieudany. Nic tu nie znajdujesz. Co robisz?'.",
      en: "Do not issue dead-end failures such as: 'Roll failed. You find nothing. What do you do?'.",
    },
  },
  {
    id: 'cognitive_anchor',
    name: {
      pl: 'Kotwica Poznawcza (Cognitive Anchor)',
      en: 'Cognitive Anchor',
    },
    category: 'investigation',
    cadence: 2,
    sceneStates: ['investigation'],
    whenToUse: {
      pl: 'Przy wprowadzaniu kluczowego rekwizytu, listu, mapy, symbolu lub śladu fizycznego.',
      en: 'When introducing a key prop, letter, map, symbol, or physical trace.',
    },
    directive: {
      pl: 'Zapewnij twarde zakotwiczenie poszlaki w fizycznym świecie: konkretna faktura papieru, monogram lakowy, kaliber łuski, zapach specyficznego tytoniu. Gracz musi być w stanie zacytować ten detal przy dedukcji (Fair Play Mystery).',
      en: 'Anchor the clue firmly in physical reality: paper grain, wax seal monogram, cartridge caliber, distinctive pipe tobacco scent. The player must be able to cite this specific detail during deduction (Fair Play Mystery).',
    },
    antiPatterns: {
      pl: "Zakaz mglistych abstrakcji ('Widzisz jakieś podejrzane papiery').",
      en: "Do not use vague abstractions ('You see some suspicious papers').",
    },
  },
  {
    id: 'exposition_through_action',
    name: {
      pl: 'Ekspozycja przez Działanie (Exposition through Action)',
      en: 'Exposition through Action',
    },
    category: 'investigation',
    cadence: 2,
    sceneStates: ['investigation', 'dialogue'],
    whenToUse: {
      pl: 'Gdy badacz analizuje archiwa, artykuły prasowe, tomy wiedzy tajemnej lub księgi parafialne.',
      en: 'When the investigator examines archives, press clippings, mythos tomes, or parish registers.',
    },
    directive: {
      pl: 'Twardy zakaz encyklopedycznych ścian tekstu! Podawaj wiedzę przez działanie postaci i mikro-wycinki (1-2 nagłówki, fragment artykułu z datą, marginalia, zamazany wpis w rejestrze) przeplatane fizyczną czynnością (przewracanie kruchych stron, zapach naftaliny i kurzu, skrzypienie drabiny bibliotecznej). Wiedza ma być narzędziem, nie wykładem.',
      en: 'Strict prohibition of encyclopedic info-dumps! Convey information through investigator actions and micro-excerpts (1-2 headlines, dated article fragment, marginalia, smudged ledger entry) woven with tactile interaction (turning brittle pages, whiff of dust and mothballs, creak of library ladder). Lore must be a discovery tool, never a lecture.',
    },
    antiPatterns: {
      pl: 'Zakaz wklejania wieloakapitowych monologów historycznych i podręcznikowych streszczeń wydarzeń.',
      en: 'Do not paste multi-paragraph historical summaries or textbook lectures into the narrative.',
    },
  },

  // ==========================================================================
  // SENSORYKA
  // ==========================================================================
  {
    id: 'single_sensory_anchor',
    name: {
      pl: 'Pojedyncza Kotwica Zmysłowa (Single Sensory Anchor)',
      en: 'Single Sensory Anchor',
    },
    category: 'sensory',
    cadence: 2,
    sceneStates: ['investigation', 'dialogue', 'tension_spike'],
    whenToUse: {
      pl: 'W opisach kadrów i lokacji, aby zapobiec przeciążeniu percepcyjnemu i habituacji somatycznej.',
      en: 'In scene descriptions to prevent sensory overload and somatic habituation.',
    },
    directive: {
      pl: 'Wybierz dokładnie JEDEN dominujący bodziec pozawzrokowy na kadr (chłód wilgotnego kamienia pod palcami, metaliczny posmak powietrza, rytmiczne kapanie w rurach). Zakaz wymieniania wszystkich 5 zmysłów naraz w jednym akapicie.',
      en: 'Select exactly ONE dominant non-visual sensation per frame (cold damp stone under fingertips, metallic tang in the air, rhythmic pipe drip). Never list all five senses simultaneously in a single paragraph.',
    },
    antiPatterns: {
      pl: 'Zakaz somatycznych wyliczanek (wzrok + słuch + zapach + dotyk + bicie serca w każdej turze).',
      en: 'Do not generate laundry lists of sensations (sight + sound + smell + touch + racing pulse every turn).',
    },
  },

  // ==========================================================================
  // KOGNITYWISTYKA GROZY I ATMOSFERA
  // ==========================================================================
  {
    id: 'vacuum_variable',
    name: {
      pl: 'Zmienna Próżni (Vacuum Variable / The Void)',
      en: 'The Vacuum Variable (The Void)',
    },
    category: 'atmosphere',
    cadence: 4,
    sceneStates: ['investigation', 'tension_spike', 'abyssal_reveal'],
    whenToUse: {
      pl: 'W momentach narastania grozy kosmicznej, po nagłym ustaniu hałasu lub wejściu do strefy anomalii.',
      en: 'During cosmic dread escalation, following sudden silence, or upon stepping into an anomaly zone.',
    },
    directive: {
      pl: 'Groza wynika z braku, nie z nadmiaru: wyeksponuj nienaturalną nieobecność elementu, który powinien tam być (brak cienia pod lampą, martwa cisza bez cykania zegara, biurko pozbawione kurzu pośród zrujnowanego pokoju). Wymuś dedukcję pustki.',
      en: 'Dread stems from absence, not excess: highlight the unnatural lack of something that should be present (no shadow beneath the lamp, dead silence where clocks ticked, a dustless desk in a ruined room). Force deduction of the void.',
    },
    antiPatterns: {
      pl: "Zakaz taniego jump scare'a i epatowania potwornymi przymiotnikami Lovecrafta ('bluźnierczy', 'niewymowny').",
      en: "Do not rely on cheap jump scares or spamming pulp adjectives ('blasphemous', 'ineffable').",
    },
  },
  {
    id: 'threshold_shift',
    name: {
      pl: 'Próg Liminalny (Threshold Shift)',
      en: 'Liminal Threshold Shift',
    },
    category: 'atmosphere',
    cadence: 2,
    sceneStates: ['investigation', 'tension_spike'],
    whenToUse: {
      pl: 'Przy fizycznym przekraczaniu granicy lokacji (zejście do piwnicy, przekroczenie progu strychu, wejście do opuszczonego doku).',
      en: 'When crossing a physical environmental boundary (descending into a cellar, stepping over an attic sill, entering abandoned docks).',
    },
    directive: {
      pl: 'Rejestruj fizyczną zmianę ośrodka na progu: nagły spadek temperatury, gęstość i opór powietrza, stłumienie dźwięków ulicy za zamykanymi drzwiami. Przejście przez próg musi być odczuwalną granicą ontologiczną.',
      en: 'Register the physical shift in medium at the boundary: sudden temperature drop, air density and resistance, street noise muffling behind closing doors. Crossing the threshold must feel like an ontological boundary.',
    },
    antiPatterns: {
      pl: "Zakaz teleportacji badacza bez rejestracji przejścia ('Wchodzisz do piwnicy i widzisz...').",
      en: "Do not teleport the investigator without registering the transition ('You enter the basement and see...').",
    },
  },

  // ==========================================================================
  // REGUŁY RAW I ARBITRAŻ SĘDZIOWSKI
  // ==========================================================================
  {
    id: 'referee_veto',
    name: {
      pl: 'Weto Sędziowskie (Referee Veto & Fiction First)',
      en: 'Referee Veto & Fiction First',
    },
    category: 'referee',
    cadence: 1,
    sceneStates: ['dialogue', 'investigation', 'action'],
    whenToUse: {
      pl: 'Gdy gracz deklaruje czynność fizycznie niemożliwą, anachronizm epoki lub żąda rzutu kością z pominięciem fikcji.',
      en: 'When the player declares a physically impossible action, an era anachronism, or demands a roll bypassing fiction.',
    },
    directive: {
      pl: "Gdy deklaracja wykracza poza biologię człowieka, realia lat 20. lub twarde zasady d100 RAW, przerwij poetycki ton i odpowiedz krótko z pozycji bezstronnego Arbitra (1-2 zdania): 'Nie możesz tego zrobić. [Uzasadnienie]. Zadeklaruj inną akcję.' Nie żądaj rzutu na niemożliwe.",
      en: "When an action defies human biology, 1920s reality, or strict d100 RAW rules, drop poetic prose and issue an impartial Referee ruling (1-2 sentences): 'You cannot do that. [Reason]. Declare a different action.' Never call a roll on impossible tasks.",
    },
    antiPatterns: {
      pl: 'Zakaz proszenia o rzut na Sprawność przy skoku z 5. piętra bez spadochronu.',
      en: 'Do not ask for a Jump check when leaping from a 5th-floor roof without a parachute.',
    },
  },
];

export const TECHNIQUE_IDS: TechniqueId[] = GM_TECHNIQUES.map((t) => t.id);

export const TECHNIQUES_MAP: Record<TechniqueId, TechniqueDefinition> =
  GM_TECHNIQUES.reduce(
    (acc, technique) => {
      acc[technique.id] = technique;
      return acc;
    },
    {} as Record<TechniqueId, TechniqueDefinition>
  );

/**
 * Zwraca kompletną listę wszystkich 16 technik w Kodeksie
 */
export function getAllTechniques(): TechniqueDefinition[] {
  return GM_TECHNIQUES;
}

/**
 * Pobiera technikę po unikalnym ID
 */
export function getTechnique(id: TechniqueId): TechniqueDefinition | undefined {
  return TECHNIQUES_MAP[id];
}

/**
 * Filtruje techniki według kategorii
 */
export function getTechniquesByCategory(
  category: TechniqueCategory
): TechniqueDefinition[] {
  return GM_TECHNIQUES.filter((t) => t.category === category);
}

/**
 * Zwraca techniki pasujące do danego stanu sceny
 */
export function getTechniquesForSceneState(
  state: SceneState
): TechniqueDefinition[] {
  return GM_TECHNIQUES.filter((t) => t.sceneStates.includes(state));
}

/**
 * Zwraca zwięzłą dyrektywę promptową dla wybranego języka sesji
 */
export function getTechniqueDirective(
  id: TechniqueId,
  locale: Locale = 'pl'
): string {
  const technique = TECHNIQUES_MAP[id];
  if (!technique) {
    return '';
  }
  return technique.directive[locale] || technique.directive.pl;
}
