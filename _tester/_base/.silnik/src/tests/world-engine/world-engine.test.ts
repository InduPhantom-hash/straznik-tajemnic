import {
  NPCEngine,
  SensoryEngine,
  NarrativeGraphEngine,
  PlotFrictionEngine,
  MysteryClueEngine,
  GeographyEngine,
  OccultEngine,
  WorldEngineDirector,
  buildWorldEngineDirectives,
} from '@/lib/world-engine';


describe('World Engine Suite', () => {
  it('NPCEngine formats directive with facade, flaw, agenda and resistance', () => {
    const engine = new NPCEngine();
    const directive = engine.formatDirective({
      id: 'npc-1',
      name: 'Doktor Henry Armitage',
      facade: 'Spokojny bibliotekarz Miskatonic',
      flaw: 'Drżenie dłoni i unikanie spojrzeń',
      hiddenAgenda: 'Chce zatańczyć wokół prawdy o Necronomiconie',
      resistanceLevel: 'suspicious',
      fearOrLeverage: 'Groźba skandalu uczelnianego',
    }, 'pl');

    expect(directive).toContain('Doktor Henry Armitage');
    expect(directive).toContain('Fasada: Spokojny bibliotekarz Miskatonic');
    expect(directive).toContain('Opór: suspicious');
  });

  it('SensoryEngine formats non-visual senses and void variable', () => {
    const engine = new SensoryEngine();
    const directive = engine.formatDirective({
      primarySense: 'olfactory',
      secondarySense: 'auditory',
      voidVariable: 'Brak odgłosów ptaków w lesie',
      gritDetails: ['Rdzawe zacieki na klamce bramy'],
    }, 'pl');

    expect(directive).toContain('olfactory+auditory');
    expect(directive).toContain('Void: Brak odgłosów ptaków w lesie');
    expect(directive).toContain('Grit: Rdzawe zacieki na klamce bramy');
  });

  it('NarrativeGraphEngine enforces branch and bottleneck convergence', () => {
    const engine = new NarrativeGraphEngine();
    const directive = engine.formatDirective(
      'Przeszukanie gabinetu profesora',
      'Spotkanie na cmentarzu o północy',
      'pl'
    );

    expect(directive).toContain('Przeszukanie gabinetu profesora');
    expect(directive).toContain('Spotkanie na cmentarzu o północy');
  });

  it('PlotFrictionEngine injects societal tension and active rumors', () => {
    const engine = new PlotFrictionEngine();
    const directive = engine.formatDirective({
      tensionType: 'class',
      description: 'Strajk dokerów w porcie Arkham',
      activeRumor: 'Mówią, że w dokach zaginęło dwóch strażników nocnych',
      ambientDetail: 'Grupy robotników gromadzą się przy bramie stoczni',
    }, 'pl');

    expect(directive).toContain('class');
    expect(directive).toContain('Mówią, że w dokach zaginęło dwóch strażników nocnych');
  });

  it('MysteryClueEngine enforces fail-forward cost and target', () => {
    const engine = new MysteryClueEngine();
    const directive = engine.formatDirective({
      id: 'clue-1',
      summary: 'Podarty list z pieczęcią loży masońskiej',
      targetRevelationId: 'Tożsamość fundatora wykopalisk',
      sources: ['observation', 'handout'],
      failForwardCost: 'time',
    }, 'pl');

    expect(directive).toContain('Podarty list z pieczęcią loży masońskiej');
    expect(directive).toContain('Koszt Fail-Forward przy porażce: time');
  });

  it('GeographyEngine formats chokepoint and economic constraints', () => {
    const engine = new GeographyEngine();
    const directive = engine.formatDirective({
      terrainOrChokepoint: 'Wąska przełęcz pod Innsmouth',
      economicConstraint: 'Przemyt nafty i monopol rodu Marshów',
      undergroundOrigin: 'sewers',
      waterwayLogic: 'Rzeka Manuxet zbiega ku oceanowi',
    }, 'pl');

    expect(directive).toContain('GEOGRAFIA_DYREKTYWA');
    expect(directive).toContain('Przewężenie/Teren: Wąska przełęcz pod Innsmouth');
    expect(directive).toContain('Presja ekonomiczna: Przemyt nafty i monopol rodu Marshów');
    expect(directive).toContain('Podziemia: sewers');
    expect(directive).toContain('Woda: Rzeka Manuxet zbiega ku oceanowi');
  });

  it('OccultEngine formats magic system limits and somatic cost', () => {
    const engine = new OccultEngine();
    const directive = engine.formatDirective({
      magicType: 'soft_weird',
      somaticCost: 'Krwawienie z nosa i metaliczny posmak popiołu',
      cultTier: 'inner_initiated',
      cosmicTaboo: 'Nie wymawiaj imienia Hastura przy pełni',
    }, 'pl');

    expect(directive).toContain('OKULTYZM_DYREKTYWA');
    expect(directive).toContain('Natura magii: soft_weird');
    expect(directive).toContain('Koszt somatyczny: Krwawienie z nosa i metaliczny posmak popiołu');
    expect(directive).toContain('Krąg kultu: inner_initiated');
    expect(directive).toContain('Tabu: Nie wymawiaj imienia Hastura przy pełni');
  });

  it('WorldEngineDirector compiles all active engines into coherent prompt block', () => {
    const director = new WorldEngineDirector();
    const compiled = director.compileDirectives({
      sensory: {
        primarySense: 'olfactory',
        gritDetails: ['Wyszczerbiony nóż do papieru'],
      },
      activeNPC: {
        id: 'npc-2',
        name: 'Inspektor Legrasse',
        facade: 'Twardy gliniarz z Nowego Orleanu',
        flaw: 'Nieustanne palenie cygar',
        hiddenAgenda: 'Boi się powtórki z bagien',
        resistanceLevel: 'guarded',
        fearOrLeverage: 'Wzmianka o bagnie',
      },
      geography: {
        terrainOrChokepoint: 'Most nad Miskatonic',
        economicConstraint: 'Kontrola spławu drewna',
      },
      occult: {
        magicType: 'soft_weird',
        somaticCost: 'Pękanie naczynek w oku',
      },
      locale: 'pl',
    });

    expect(compiled).toContain('## DYREKTYWY SILNIKA ŚWIATA (SYSTEMY RUNTIME)');
    expect(compiled).toContain('Inspektor Legrasse');
    expect(compiled).toContain('SENSORY_DYREKTYWA');
    expect(compiled).toContain('GEOGRAFIA_DYREKTYWA');
    expect(compiled).toContain('OKULTYZM_DYREKTYWA');
  });

  describe('buildWorldEngineDirectives Adapter', () => {
    it('activates all 7 engines when full context with occult theme is provided', () => {
      const output = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Piwnica pod dokami w Arkham',
        npcs: [
          {
            id: 'npc-1',
            name: 'Kapitan Zadok Allen',
            description: 'Stary rybak o przekrwionych oczach',
            occupation: 'Marynarz',
            disposition: 'suspicious',
            agenda: 'Ostrzega przed zakonem Dagona',
          } as any,
        ],
        adventureContext: {
          title: 'Cień nad Innsmouth',
          location: 'Innsmouth',
          themes: ['mit cthulhu', 'okultyzm'],
          graph: {
            nodes: [
              { id: 'n1', label: 'Doki', isBottleneck: false },
              { id: 'n2', label: 'Rafa Diabelska', isBottleneck: true },
            ],
            edges: [],
          } as any,
          conflicts: [
            {
              id: 'c1',
              name: 'Konflikt rybaków z zakonem',
              description: 'Napięcie między mieszkańcami a kultem',
              stakes: 'Przemoc i zmowa milczenia',
            } as any,
          ],
          setupAsymmetry: {
            rumors: ['Mówią, że w nocy morze świeci nienaturalnym blaskiem'],
            characterHooks: [],
          },
          puzzles: [
            {
              id: 'p1',
              title: 'Dziwny medalion z głębin',
              description: 'Nieznany stop złota',
              solution: 'Symbol kultu głębinowców',
            } as any,
          ],
        },
        eraContext: {
          countryCode: 'US',
          effectiveYear: 1928,
        },
      });

      expect(output).toContain('## DYREKTYWY SILNIKA ŚWIATA (SYSTEMY RUNTIME)');
      expect(output).toContain('[SENSORY_DYREKTYWA:');
      expect(output).toContain('[NPC_DYREKTYWA: Kapitan Zadok Allen');
      expect(output).toContain('[GRAF_DYREKTYWA:');
      expect(output).toContain('Rafa Diabelska');
      expect(output).toContain('[TARCIE_DYREKTYWA:');
      expect(output).toContain('Mówią, że w nocy morze świeci');
      expect(output).toContain('[ZAGADKA_DYREKTYWA:');
      expect(output).toContain('Dziwny medalion z głębin');
      expect(output).toContain('[GEOGRAFIA_DYREKTYWA:');
      expect(output).toContain('Podziemia: cellars');
      expect(output).toContain('Woda: Naturalny spływ wód');
      expect(output).toContain('[OKULTYZM_DYREKTYWA:');
      expect(output).toContain('Natura magii: soft_weird');
    });

    it('suppresses OccultEngine in ordinary non-occult scenes to prevent horror slop', () => {
      const output = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Biblioteka Uniwersytetu Miskatonic',
        adventureContext: {
          title: 'Kradzież w archiwum',
          location: 'Arkham',
          themes: ['śledztwo kryminalne', 'zagadka'],
        },
        character: {
          id: 'char-1',
          name: 'Francis Morgan',
          spells: [],
        } as any,
        playerMessage: 'Dzień dobry, szukam rocznika gazety z 1922 roku.',
      });

      expect(output).toContain('## DYREKTYWY SILNIKA ŚWIATA (SYSTEMY RUNTIME)');
      expect(output).toContain('[SENSORY_DYREKTYWA:');
      expect(output).toContain('[GEOGRAFIA_DYREKTYWA:');
      expect(output).not.toContain('OKULTYZM_DYREKTYWA');
    });

    it('formats directives cleanly in English when requested', () => {
      const output = buildWorldEngineDirectives({
        locale: 'en',
        currentLocation: 'Abandoned Harbor Warehouse',
        npcs: [
          {
            id: 'npc-en',
            name: 'Silas Marsh',
            occupation: 'Smuggler',
            disposition: 'hostile',
          } as any,
        ],
        adventureContext: {
          location: 'Innsmouth',
          themes: ['cosmic horror'],
        },
      });

      expect(output).toContain('## WORLD ENGINE DIRECTIVES (IN-FLIGHT RUNTIME)');
      expect(output).toContain('[SENSORY_DIRECTIVE:');
      expect(output).toContain('[NPC_DIRECTIVE: Silas Marsh');
      expect(output).toContain('[GEOGRAPHY_DIRECTIVE:');
      expect(output).toContain('[OCCULT_DIRECTIVE:');
    });
  });
});

