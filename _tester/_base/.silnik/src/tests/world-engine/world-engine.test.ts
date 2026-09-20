import {
  NPCEngine,
  SensoryEngine,
  NarrativeGraphEngine,
  PlotFrictionEngine,
  MysteryClueEngine,
  GeographyEngine,
  OccultEngine,
  WorldEngineDirector,
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
});

