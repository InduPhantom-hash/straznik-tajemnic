import type { NPCEntity, SensoryContext, SettingFriction, ClueNode, WorldEngineDirectives } from './types';

/**
 * 1. NPCEngine - zarządza fasadą, skazą, ukrytą intencją i prawem głosu postaci
 */
export class NPCEngine {
  formatDirective(npc: NPCEntity, locale: 'pl' | 'en' = 'pl'): string {
    if (locale === 'en') {
      return `[NPC_DIRECTIVE: ${npc.name} | Facade: ${npc.facade} | Tell/Flaw: ${npc.flaw} | Hidden Agenda: ${npc.hiddenAgenda} | Resistance: ${npc.resistanceLevel} (Requires social test or leverage to yield)]`;
    }
    return `[NPC_DYREKTYWA: ${npc.name} | Fasada: ${npc.facade} | Skaza/Tik: ${npc.flaw} | Ukryty Cel: ${npc.hiddenAgenda} | Opór: ${npc.resistanceLevel} (Wymaga testu socjalnego lub lewara)]`;
  }
}

/**
 * 2. SensoryEngine - wymusza mikrosensorykę (2-3 zmysły, niewizualne na pierwszym planie, Zmienna Próżni)
 */
export class SensoryEngine {
  formatDirective(context: SensoryContext, locale: 'pl' | 'en' = 'pl'): string {
    const senses = [context.primarySense, context.secondarySense].filter(Boolean).join('+');
    const voidPart = context.voidVariable ? ` | Void: ${context.voidVariable}` : '';
    const gritPart = context.gritDetails.length > 0 ? ` | Grit: ${context.gritDetails[0]}` : '';

    if (locale === 'en') {
      return `[SENSORY_DIRECTIVE: Focus senses (${senses})${voidPart}${gritPart} | Avoid generic visuals, describe somatic body response]`;
    }
    return `[SENSORY_DYREKTYWA: Oprzyj kadr na zmysłach (${senses})${voidPart}${gritPart} | Zero etykiet emocji, opisz somatykę ciała]`;
  }
}

/**
 * 3. NarrativeGraphEngine - dba o strukturę Branch-and-Bottleneck oraz unikanie deadlocków
 */
export class NarrativeGraphEngine {
  formatDirective(currentBranch: string, bottleneckTarget: string, locale: 'pl' | 'en' = 'pl'): string {
    if (locale === 'en') {
      return `[GRAPH_DIRECTIVE: Current branch: "${currentBranch}" -> All roads converge at: "${bottleneckTarget}". Keep agency, advance investigation time.]`;
    }
    return `[GRAF_DYREKTYWA: Aktualna gałąź: "${currentBranch}" -> Zbiega się w: "${bottleneckTarget}". Zachowaj sprawczość, przesuwaj czas śledztwa.]`;
  }
}

/**
 * 4. PlotFrictionEngine - tarcie społeczne, plotki i tło żyjącego świata
 */
export class PlotFrictionEngine {
  formatDirective(friction: SettingFriction, locale: 'pl' | 'en' = 'pl'): string {
    if (locale === 'en') {
      return `[FRICTION_DIRECTIVE: Background tension (${friction.tensionType}): ${friction.ambientDetail} | Rumor in circulation: "${friction.activeRumor}"]`;
    }
    return `[TARCIE_DYREKTYWA: Tło społeczne (${friction.tensionType}): ${friction.ambientDetail} | Krążąca plotka: "${friction.activeRumor}"]`;
  }
}

/**
 * 5. MysteryClueEngine - reguła 3 poszlak, Fail-Forward i Sealed Envelope
 */
export class MysteryClueEngine {
  formatDirective(clue: ClueNode, locale: 'pl' | 'en' = 'pl'): string {
    if (locale === 'en') {
      return `[MYSTERY_DIRECTIVE: Active clue: "${clue.summary}" | Target: ${clue.targetRevelationId} | Fail-Forward cost if test fails: ${clue.failForwardCost} (never block progress)]`;
    }
    return `[ZAGADKA_DYREKTYWA: Aktywna poszlaka: "${clue.summary}" | Cel: ${clue.targetRevelationId} | Koszt Fail-Forward przy porażce: ${clue.failForwardCost} (zakaz blokowania poszlaki)]`;
  }
}

/**
 * Master World Engine Orchestrator
 */
export class WorldEngineDirector {
  private npcEngine = new NPCEngine();
  private sensoryEngine = new SensoryEngine();
  private graphEngine = new NarrativeGraphEngine();
  private frictionEngine = new PlotFrictionEngine();
  private mysteryEngine = new MysteryClueEngine();

  compileDirectives(params: {
    activeNPC?: NPCEntity;
    sensory?: SensoryContext;
    graph?: { branch: string; bottleneck: string };
    friction?: SettingFriction;
    clue?: ClueNode;
    locale?: 'pl' | 'en';
  }): string {
    const locale = params.locale || 'pl';
    const lines: string[] = [];

    if (params.sensory) {
      lines.push(this.sensoryEngine.formatDirective(params.sensory, locale));
    }
    if (params.activeNPC) {
      lines.push(this.npcEngine.formatDirective(params.activeNPC, locale));
    }
    if (params.graph) {
      lines.push(this.graphEngine.formatDirective(params.graph.branch, params.graph.bottleneck, locale));
    }
    if (params.friction) {
      lines.push(this.frictionEngine.formatDirective(params.friction, locale));
    }
    if (params.clue) {
      lines.push(this.mysteryEngine.formatDirective(params.clue, locale));
    }

    if (lines.length === 0) return '';

    const header = locale === 'en'
      ? '## WORLD ENGINE DIRECTIVES (IN-FLIGHT RUNTIME)'
      : '## DYREKTYWY SILNIKA ŚWIATA (SYSTEMY RUNTIME)';

    return `\n\n${header}\n${lines.join('\n')}\n`;
  }
}
