import {
  GM_TECHNIQUES,
  TECHNIQUE_IDS,
  TECHNIQUES_MAP,
  getAllTechniques,
  getTechnique,
  getTechniquesByCategory,
  getTechniquesForSceneState,
  getTechniqueDirective,
} from './playbook';
import type { TechniqueCategory, SceneState, TechniqueId } from './types';

describe('GM Technique Playbook (Issue #535 & Issue #648 Faza 3)', () => {
  it('zawiera dokładnie 19 kanonicznych technik narracyjnych', () => {
    expect(GM_TECHNIQUES).toHaveLength(19);
    expect(TECHNIQUE_IDS).toHaveLength(19);
    expect(Object.keys(TECHNIQUES_MAP)).toHaveLength(19);
    expect(getAllTechniques()).toHaveLength(19);
  });

  it('każda technika ma unikalny identyfikator', () => {
    const idSet = new Set(TECHNIQUE_IDS);
    expect(idSet.size).toBe(19);
  });

  it('zapewnia 100% symetrię językową (PL + EN) bez pustych pól i bez półpauz', () => {
    for (const technique of GM_TECHNIQUES) {
      // Nazwa
      expect(technique.name.pl.trim()).not.toBe('');
      expect(technique.name.en.trim()).not.toBe('');

      // Kiedy stosować
      expect(technique.whenToUse.pl.trim()).not.toBe('');
      expect(technique.whenToUse.en.trim()).not.toBe('');

      // Dyrektywa promptowa
      expect(technique.directive.pl.trim()).not.toBe('');
      expect(technique.directive.en.trim()).not.toBe('');

      // Zakazy / Antywzorce
      expect(technique.antiPatterns.pl.trim()).not.toBe('');
      expect(technique.antiPatterns.en.trim()).not.toBe('');

      // Rygor typograficzny: wyłącznie zwykły łącznik '-', zakaz pauzy i półpauzy
      expect(technique.name.pl).not.toMatch(/[—–]/);
      expect(technique.name.en).not.toMatch(/[—–]/);
      expect(technique.directive.pl).not.toMatch(/[—–]/);
      expect(technique.directive.en).not.toMatch(/[—–]/);
      expect(technique.antiPatterns.pl).not.toMatch(/[—–]/);
      expect(technique.antiPatterns.en).not.toMatch(/[—–]/);
    }
  });

  it('każda technika posiada poprawny bieg kadencji (1..4)', () => {
    for (const technique of GM_TECHNIQUES) {
      expect([1, 2, 3, 4]).toContain(technique.cadence);
    }
  });

  it('każda technika deklaruje przynajmniej jeden obsługiwany stan sceny', () => {
    const validStates: SceneState[] = [
      'dialogue',
      'investigation',
      'action',
      'tension_spike',
      'abyssal_reveal',
    ];

    for (const technique of GM_TECHNIQUES) {
      expect(technique.sceneStates.length).toBeGreaterThan(0);
      for (const state of technique.sceneStates) {
        expect(validStates).toContain(state);
      }
    }
  });

  it('każda kategoria posiada przynajmniej jedną technikę', () => {
    const categories: TechniqueCategory[] = [
      'pacing',
      'npc',
      'investigation',
      'sensory',
      'atmosphere',
      'referee',
    ];

    for (const category of categories) {
      const filtered = getTechniquesByCategory(category);
      expect(filtered.length).toBeGreaterThan(0);
    }
  });

  it('każdy stan sceny posiada dedykowane techniki do dyspozycji Reżysera (#536)', () => {
    const validStates: SceneState[] = [
      'dialogue',
      'investigation',
      'action',
      'tension_spike',
      'abyssal_reveal',
    ];

    for (const state of validStates) {
      const matching = getTechniquesForSceneState(state);
      expect(matching.length).toBeGreaterThan(0);
    }
  });

  describe('getTechnique', () => {
    it('zwraca właściwą technikę dla poprawnego ID', () => {
      const tech = getTechnique('bang_hard_move');
      expect(tech).toBeDefined();
      expect(tech?.id).toBe('bang_hard_move');
      expect(tech?.cadence).toBe(3);
    });

    it('zwraca undefined dla nieistniejącego ID', () => {
      // @ts-expect-error testowanie niepoprawnego ID
      const tech = getTechnique('non_existent_technique');
      expect(tech).toBeUndefined();
    });
  });

  describe('getTechniqueDirective', () => {
    it('zwraca polską dyrektywę dla locale pl', () => {
      const directive = getTechniqueDirective('referee_veto', 'pl');
      expect(directive).toContain('Nie możesz tego zrobić');
    });

    it('zwraca angielską dyrektywę dla locale en', () => {
      const directive = getTechniqueDirective('referee_veto', 'en');
      expect(directive).toContain('You cannot do that');
    });

    it('domyślnie zwraca język polski przy braku drugiego parametru', () => {
      const directive = getTechniqueDirective('referee_veto');
      expect(directive).toContain('Nie możesz tego zrobić');
    });

    it('zwraca pusty ciąg dla nieznanej techniki', () => {
      const directive = getTechniqueDirective('invalid_id' as TechniqueId, 'pl');
      expect(directive).toBe('');
    });
  });
});
