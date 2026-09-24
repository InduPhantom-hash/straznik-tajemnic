import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import {
  evaluateEraGuardrail,
  detectAnachronism,
  detectEquipmentQuery,
  detectWeaponSpecsQuery,
  detectDiceRulesQuery,
  buildAnachronismResponse,
  buildEquipmentResponse,
  buildWeaponSpecsResponse,
  buildDiceRulesResponse,
} from '@/lib/guardrails/era-guardrail';
import { formatEquipment, handleCommand } from '@/lib/command-handler';
import { parseSSEStream } from '@/lib/sse-parser';
import type { Character, EquipmentItem } from '@/lib/types';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream: (globalThis as any).ReadableStream ?? NodeReadableStream,
});

describe('Era Guardrail & Mechanical Fast-Gate (Issue #508)', () => {
  const mockCharacterWithGear: Character = {
    id: 'char-1',
    name: 'Franciszek Szary',
    occupation: 'Dziennikarz śledczy',
    age: 32,
    background: 'Bada zagadkowe zjawiska w Nowej Anglii.',
    playerName: 'Tester',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
    residence: 'Arkham',
    birthplace: 'Boston',
    str: 50,
    con: 55,
    siz: 60,
    dex: 65,
    app: 45,
    int: 75,
    pow: 60,
    edu: 70,
    hp: 11,
    maxHp: 11,
    san: 60,
    maxSan: 60,
    mp: 12,
    maxMp: 12,
    luck: 55,
    damageBonus: '0',
    build: 0,
    move: 8,
    skills: {
      'Broń Palna (Krótka)': 60,
      'Walka Wręcz (Bijatyka)': 45,
      'Spostrzegawczość': 70,
    },
    equipment: [
      {
        id: 'eq-1',
        name: 'Rewolwer Colt .38',
        category: 'weapon',
        modifiers: { damage: '1d10', range: '15 yards', malfunction: 100 },
        currentAmmo: 6,
        maxAmmo: 6,
        description: 'Niezawodny rewolwer z oksydowaną lufą.',
      },
      {
        id: 'eq-2',
        name: 'Notes z ołówkiem',
        category: 'tool',
        quantity: 1,
        description: 'Notes w skórzanej oprawie.',
      },
      {
        id: 'eq-3',
        name: 'Pudełko zapałek',
        category: 'tool',
        charges: 18,
        maxCharges: 20,
      },
    ],
  };

  const mockCharacterEmpty: Character = {
    ...mockCharacterWithGear,
    id: 'char-empty',
    name: 'Arthur Dent',
    equipment: [],
  };

  describe('1. Twarde anachronizmy technologiczne (Hard Anachronisms)', () => {
    const anachronisms = [
      { text: 'Wyciągam smartfona i sprawdzam GPS', label: 'smartfon / GPS' },
      { text: 'Dzwonię z komórki do kolegi', label: 'komórka' },
      { text: 'Wyciągam iPhone z kieszeni płaszcza', label: 'iPhone' },
      { text: 'Otwieram laptopa i szukam w internecie', label: 'laptop / internet' },
      { text: 'Zamawiam Ubera pod kamienicę', label: 'Uber' },
      { text: 'Zamawiam Bolta pod hotel', label: 'Bolt' },
      { text: 'Płacę Blikiem za gazetę', label: 'Blik' },
      { text: 'Płacę kartą zbliżeniową przy kasie', label: 'karta zbliżeniowa' },
      { text: 'Szukam tego w Google i na Wikipedii', label: 'Google / Wikipedia' },
      { text: 'Wrzucam nagranie na TikToka przez Wi-Fi', label: 'TikTok / Wi-Fi' },
      { text: 'Używam celownika laserowego', label: 'laser' },
      { text: 'Związuję go nylonową liną', label: 'nylon' },
      { text: 'Wypuszczam drona z kamerą nad rezydencję', label: 'dron' },
      { text: 'Wsiadam do Tesli i odjeżdżam cicho', label: 'Tesla' },
      { text: 'Porażam napastnika taserem', label: 'taser' },
      { text: 'Odbieram paczkę z Paczkomatu InPost', label: 'paczkomat' },
      { text: 'Idę do Żabki po hot-doga', label: 'żabka' },
    ];

    it.each(anachronisms)(
      'blokuje anachronizm: "$text"',
      ({ text }) => {
        const result = evaluateEraGuardrail({
          message: text,
          character: mockCharacterWithGear,
          locale: 'pl',
        });

        expect(result).not.toBeNull();
        expect(result?.blocked).toBe(true);
        expect(result?.category).toBe('anachronism');
        expect(result?.response).toContain('[STRAŻNIK TAJEMNIC — KOREKTA REALIZMU EPOKI]');
        expect(result?.alternatives).toBeDefined();
        expect(result?.alternatives!.length).toBeGreaterThan(0);
        expect(result?.executionTimeMs).toBeLessThan(25);
      }
    );

    it('zwraca wersję angielską przy locale: "en"', () => {
      const result = evaluateEraGuardrail({
        message: 'I check my smartphone for GPS navigation',
        character: mockCharacterWithGear,
        locale: 'en',
      });

      expect(result).not.toBeNull();
      expect(result?.blocked).toBe(true);
      expect(result?.response).toContain('[KEEPER OF ARCANE LORE — ERA REALITY CHECK]');
      expect(result?.response).toContain('1920s');
      expect(result?.executionTimeMs).toBeLessThan(25);
    });

    it('blokuje SMS jako anachronizm telekomunikacyjny', () => {
      const result = evaluateEraGuardrail({
        message: 'Wysyłam sms do przyjaciela',
        character: mockCharacterWithGear,
        locale: 'pl',
      });

      expect(result).not.toBeNull();
      expect(result?.blocked).toBe(true);
      expect(result?.category).toBe('anachronism');
      expect(result?.response).toContain('[STRAŻNIK TAJEMNIC — KOREKTA REALIZMU EPOKI]');
    });
  });

  describe('2. Świadome wykluczenia (Anti-scope / Stylizowane wypowiedzi i metafory)', () => {
    const validStatements = [
      'Podnoszę słuchawkę telefonu na biurku i proszę centralę o połączenie z policją',
      'Wsiadam do żółtej taksówki i każę kierowcy ruszać na dworzec',
      'Złap dryndę i jedźmy za nimi',
      'Biegnę szybko jak błyskawica przez mgłę',
      'Kupuję poranną gazetę w kiosku i płacę miedziakiem',
      'Zdejmuję z półki starą księgę oprawioną w skórę',
      'Przeszukuję biurko profesora szukając listów',
      'Wyjmuję z kieszeni mosiężną zapalniczkę i odpalam papierosa',
      'Rozmawiam z barmanem w speakeasy pytając o wczorajszego gościa',
      'Oglądam stary kufer na poddaszu',
      // Zaawansowane testy anty-fałszywych alarmów (Issue #508 hardening):
      'Przeszukuję ciemną komórkę pod schodami',
      'Zamykam podejrzanego w komórce na węgiel',
      'I slide the bolt of the rifle',
      'I hear a low drone from the ritual chamber',
      'Widzę małą żabkę skaczącą po mokrych liściach',
      'Czerwona biedronka spaceruje po parapecie',
      'Profesor bada cewkę Tesli w laboratorium',
      'Biorę rewolwer z ekwipunku i strzelam do kultysty',
      'Strzelam do uciekającego kultysty na maksymalny zasięg broni',
      'Zabieram cały swój ekwipunek i biegnę do wyjścia',
      'I take my equipment and run into the woods',
    ];

    it.each(validStatements)(
      'nie blokuje dozwolonej deklaracji gracza: "$text"',
      (text) => {
        const result = evaluateEraGuardrail({
          message: text,
          character: mockCharacterWithGear,
          locale: 'pl',
        });

        expect(result).toBeNull();
      }
    );
  });

  describe('3. Zapytania o ekwipunek (Equipment Queries)', () => {
    const equipmentQueries = [
      'Co mam w ekwipunku?',
      'Pokaż ekwipunek',
      'Jaki mam ekwipunek?',
      'Co mam przy sobie?',
      'Co mam w kieszeniach?',
      'Co ze sobą niosę?',
      'mój ekwipunek',
      'inwentarz',
      'What do I have with me?',
      'show equipment',
    ];

    it.each(equipmentQueries)(
      'odpowiada lokalnie na zapytanie o ekwipunek: "$query"',
      (query) => {
        const result = evaluateEraGuardrail({
          message: query,
          character: mockCharacterWithGear,
          locale: 'pl',
        });

        expect(result).not.toBeNull();
        expect(result?.blocked).toBe(true);
        expect(result?.category).toBe('equipment');
        expect(result?.response).toContain('Rewolwer Colt .38');
        expect(result?.response).toContain('amunicja: 6/6');
        expect(result?.response).toContain('Notes z ołówkiem');
        expect(result?.executionTimeMs).toBeLessThan(25);
      }
    );

    it('obsługuje postać z pustym ekwipunkiem', () => {
      const result = evaluateEraGuardrail({
        message: 'Co mam przy sobie?',
        character: mockCharacterEmpty,
        locale: 'pl',
      });

      expect(result).not.toBeNull();
      expect(result?.blocked).toBe(true);
      expect(result?.category).toBe('equipment');
      expect(result?.response).toContain('Twój ekwipunek jest pusty');
      expect(result?.executionTimeMs).toBeLessThan(25);
    });

    it('obsługuje brak aktywnej postaci (null)', () => {
      const result = evaluateEraGuardrail({
        message: 'pokaż ekwipunek',
        character: null,
        locale: 'pl',
      });

      expect(result).not.toBeNull();
      expect(result?.blocked).toBe(true);
      expect(result?.response).toContain('Nie masz aktywnej postaci');
    });

    it('obsługuje wersję angielską z pustym ekwipunkiem', () => {
      const result = evaluateEraGuardrail({
        message: 'check inventory',
        character: mockCharacterEmpty,
        locale: 'en',
      });

      expect(result).not.toBeNull();
      expect(result?.response).toContain('not carrying any special equipment');
    });
  });

  describe('4. Zapytania o zasięg i parametry broni (Weapon Specs Queries)', () => {
    const weaponQueries = [
      'Jaki jest zasięg mojej broni?',
      'Zasięg mojego rewolweru',
      'Z jakiej odległości mogę strzelić?',
      'Jakie obrażenia ma moja broń?',
      'Zasięg broni',
      'statystyki broni',
      'weapon range',
      'range of my weapon',
    ];

    it.each(weaponQueries)(
      'odpowiada lokalnie na zapytanie o broń: "$query"',
      (query) => {
        const result = evaluateEraGuardrail({
          message: query,
          character: mockCharacterWithGear,
          locale: 'pl',
        });

        expect(result).not.toBeNull();
        expect(result?.blocked).toBe(true);
        expect(result?.category).toBe('weapon_specs');
        expect(result?.response).toContain('Rewolwer Colt .38');
        expect(result?.response).toContain('15 yards');
        expect(result?.response).toContain('1d10');
        expect(result?.response).toContain('Zasada CoC 7e (RAW)');
        expect(result?.executionTimeMs).toBeLessThan(25);
      }
    );

    it('informuje o walce wręcz gdy postać nie ma broni', () => {
      const result = evaluateEraGuardrail({
        message: 'Jaki mam zasięg broni?',
        character: mockCharacterEmpty,
        locale: 'pl',
      });

      expect(result).not.toBeNull();
      expect(result?.category).toBe('weapon_specs');
      expect(result?.response).toContain('Nie posiadasz przy sobie żadnej broni');
      expect(result?.response).toContain('1d3');
      expect(result?.executionTimeMs).toBeLessThan(25);
    });

    it('zwraca wersję angielską parametrów broni', () => {
      const result = evaluateEraGuardrail({
        message: 'range of my weapon',
        character: mockCharacterWithGear,
        locale: 'en',
      });

      expect(result).not.toBeNull();
      expect(result?.response).toContain('Weapons & Combat Ranges');
      expect(result?.response).toContain('Call of Cthulhu 7e Rule');
      expect(result?.executionTimeMs).toBeLessThan(25);
    });
  });

  describe('5. Zapytania o zasady rzutów (Dice Rules & Mechanics Queries)', () => {
    const rulesQueries = [
      'Jak działają rzuty?',
      'Jak działa rzut na umiejętność?',
      'Jak rzucać kośćmi?',
      'Co to jest sukces trudny?',
      'Co to jest sukces ekstremalny?',
      'Jak działa forsowanie rzutu?',
      'Kiedy jest pech?',
      'Kiedy jest krytyk?',
      'Jak działa szczęście w rzutach?',
      'how do rolls work',
      'skill check rules',
    ];

    it.each(rulesQueries)(
      'odpowiada lokalnie na pytanie o mechanikę: "$query"',
      (query) => {
        const result = evaluateEraGuardrail({
          message: query,
          character: mockCharacterWithGear,
          locale: 'pl',
        });

        expect(result).not.toBeNull();
        expect(result?.blocked).toBe(true);
        expect(result?.category).toBe('dice_rules');
        expect(result?.response).toContain('k100');
        expect(result?.response).toContain('Sukces zwykły');
        expect(result?.response).toContain('Sukces trudny');
        expect(result?.response).toContain('Sukces ekstremalny');
        expect(result?.response).toContain('Sukces krytyczny');
        expect(result?.response).toContain('Pech (Fumble)');
        expect(result?.response).toContain('Forsowanie rzutu (Pushed Roll)');
        expect(result?.response).toContain('Punkty Szczęścia');
        expect(result?.executionTimeMs).toBeLessThan(25);
      }
    );

    it('zwraca angielską wersję zasad rzutów', () => {
      const result = evaluateEraGuardrail({
        message: 'how do rolls work',
        character: mockCharacterWithGear,
        locale: 'en',
      });

      expect(result).not.toBeNull();
      expect(result?.response).toContain('Call of Cthulhu 7th Edition — Skill Tests & Dice Rules');
      expect(result?.response).toContain('1d100');
      expect(result?.response).toContain('Regular Success');
      expect(result?.response).toContain('Hard Success');
      expect(result?.response).toContain('Extreme Success');
      expect(result?.response).toContain('Pushed Roll');
      expect(result?.executionTimeMs).toBeLessThan(25);
    });
  });

  describe('6. formatEquipment w command-handler.ts', () => {
    it('zwraca realne przedmioty z ekwipunku postaci', () => {
      const formatted = formatEquipment(mockCharacterWithGear);
      expect(formatted).toContain('**Ekwipunek: Franciszek Szary**');
      expect(formatted).toContain('- **Rewolwer Colt .38** (amunicja: 6/6, obr: 1d10, zasięg: 15 yards) – Niezawodny rewolwer z oksydowaną lufą.');
      expect(formatted).toContain('- **Notes z ołówkiem** – Notes w skórzanej oprawie.');
      expect(formatted).toContain('- **Pudełko zapałek** (ładunki: 18/20)');
    });

    it('zwraca informację o pustym ekwipunku gdy equipment jest puste', () => {
      const formatted = formatEquipment(mockCharacterEmpty);
      expect(formatted).toBe('**Ekwipunek: Arthur Dent**\n\nTwój ekwipunek jest pusty.');
    });

    it('zwraca informację o braku aktywnej postaci gdy character to null', () => {
      const formatted = formatEquipment(null);
      expect(formatted).toBe('Nie masz aktywnej postaci.');
    });

    it('działa poprzez handleCommand("ekwipunek", character)', () => {
      const response = handleCommand('ekwipunek', mockCharacterWithGear);
      expect(response).not.toBeNull();
      expect(response).toContain('Franciszek Szary');
      expect(response).toContain('Rewolwer Colt .38');
    });

    it('działa poprzez handleCommand("inventory", character)', () => {
      const response = handleCommand('inventory', mockCharacterWithGear);
      expect(response).not.toBeNull();
      expect(response).toContain('Franciszek Szary');
      expect(response).toContain('Rewolwer Colt .38');
    });

    it('poprawnie formatuje przedmiot z samym zasięgiem bez obrażeń', () => {
      const charWithRangeTool: Character = {
        ...mockCharacterEmpty,
        equipment: [
          {
            id: 'tool-1',
            name: 'Lornetka polowa',
            category: 'tool',
            modifiers: { range: '500 metrów' },
            description: 'Mosiężna lornetka Zeissa.',
          },
        ],
      };
      const formatted = formatEquipment(charWithRangeTool);
      expect(formatted).toContain('- **Lornetka polowa** (zasięg: 500 metrów) – Mosiężna lornetka Zeissa.');
    });
  });

  describe('7. Rygor wydajnościowy (< 25 ms benchmark)', () => {
    it('wszystkie ścieżki guardrail wykonują się w czasie < 25 ms', () => {
      const queries = [
        'Wyciągam smartfon z kieszeni',
        'Co mam w ekwipunku?',
        'Jaki jest zasięg broni?',
        'Jak działają rzuty kośćmi?',
        'Oglądam stary zegar w rogu pokoju', // passthrough
      ];

      for (const q of queries) {
        const start = performance.now();
        const res = evaluateEraGuardrail({
          message: q,
          character: mockCharacterWithGear,
          locale: 'pl',
        });
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(25);
        if (res) {
          expect(res.executionTimeMs).toBeLessThan(25);
        }
      }
    });
  });

  describe('8. Kompatybilność ze strumieniowaniem SSE (parseSSEStream)', () => {
    it('odpowiedź guardrail w strumieniu SSE jest w pełni dekodowana przez parseSSEStream', async () => {
      const guardrailResult = evaluateEraGuardrail({
        message: 'Co mam w ekwipunku?',
        character: mockCharacterWithGear,
        locale: 'pl',
      });
      expect(guardrailResult).not.toBeNull();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'text', content: guardrailResult!.response })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'metadata',
                guardrail: true,
                guardrailCategory: guardrailResult!.category,
                guardrailExecutionTimeMs: guardrailResult!.executionTimeMs,
              })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );
          controller.close();
        },
      });

      const response = {
        body: stream as unknown as ReadableStream<Uint8Array>,
      } as unknown as Response;

      let streamedText = '';
      let receivedMetadata: any = null;

      const parsedText = await parseSSEStream(response, {
        onText: (text) => {
          streamedText = text;
        },
        onMetadata: (meta) => {
          receivedMetadata = meta;
        },
      });

      expect(parsedText).toBe(guardrailResult!.response);
      expect(streamedText).toBe(guardrailResult!.response);
      expect(receivedMetadata?.guardrail).toBe(true);
      expect(receivedMetadata?.guardrailCategory).toBe('equipment');
    });
  });
});
