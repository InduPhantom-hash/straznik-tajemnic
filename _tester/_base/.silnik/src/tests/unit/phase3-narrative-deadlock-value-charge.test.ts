import {
  detectInvestigativeDeadlock,
  formatDeadlockDirective,
  formatValueChargeDirective,
  buildWorldEngineDirectives,
} from '@/lib/world-engine/adapter';
import { getTechnique } from '@/lib/narrative-engine/techniques/playbook';
import { selectSceneTechniques } from '@/lib/narrative-engine/scene-director';
import { getGMProtocolPrompt, getCompactGMProtocolPrompt } from '@/lib/prompts/gm-protocol';

describe('Issue #648 - Faza 3: Reżyseria Sceny, Deadlock i Techniki Narracyjne', () => {
  describe('detectInvestigativeDeadlock', () => {
    it('powinien wykrywać impas, gdy gracz wprost deklaruje brak pomysłów', () => {
      expect(detectInvestigativeDeadlock('Nie mam pojęcia co robić dalej w tym pokoju')).toBe(true);
      expect(detectInvestigativeDeadlock('Utknąłem, nie wiem co dalej')).toBe(true);
      expect(detectInvestigativeDeadlock('Co mam teraz zrobić? Brak tropu')).toBe(true);
      expect(detectInvestigativeDeadlock('To ślepy zaułek, nie wiem co dalej')).toBe(true);
      expect(detectInvestigativeDeadlock('i am stuck, no idea what to do next')).toBe(true);
    });

    it('powinien wykrywać impas, gdy gracz spędza 4+ tur w lokacji i pyta bezradnie', () => {
      expect(
        detectInvestigativeDeadlock('co?', {
          turnsInCurrentLocation: 5,
        }),
      ).toBe(true);
      expect(
        detectInvestigativeDeadlock('where?', {
          turnsInCurrentLocation: 4,
        }),
      ).toBe(true);
    });

    it('nie powinien wykrywać impasu przy normalnej eksploracji lub walce', () => {
      expect(detectInvestigativeDeadlock('Podchodzę do biurka i otwieram szufladę')).toBe(false);
      expect(detectInvestigativeDeadlock('Strzelam do kultysty z rewolweru')).toBe(false);
      expect(detectInvestigativeDeadlock('Pytam barmana o Waltera Corbitta')).toBe(false);
    });
  });

  describe('formatDeadlockDirective', () => {
    it('powinien generować dyrektywę impasu w języku polskim z zasadą CoC 7e RAW s. 101', () => {
      const directive = formatDeadlockDirective(true, 'pl');
      expect(directive).toContain('[PROTOKÓŁ_IMPASU:');
      expect(directive).toContain('[Test Pomysłowości (Idea Roll INT)]');
      expect(directive).toContain('Fail-Forward');
      expect(directive).toContain('Anti-Spooning / No Deduction Hijacking');
    });

    it('powinien generować pusty ciąg, gdy deadlock nie został wykryty', () => {
      expect(formatDeadlockDirective(false, 'pl')).toBe('');
    });

    it('powinien generować dyrektywę impasu w języku angielskim', () => {
      const directive = formatDeadlockDirective(true, 'en');
      expect(directive).toContain('[PROTOKÓŁ_IMPASU:');
      expect(directive).toContain('(Deadlock Protocol & Idea Roll Handshake - CoC 7e RAW p. 101)');
      expect(directive).toContain('[Test Pomysłowości (Idea Roll INT)]');
      expect(directive).toContain('Fail-Forward');
    });
  });

  describe('formatValueChargeDirective', () => {
    it('powinien generować dyrektywę zwrotu sceny (Value Charge Shift +/-)', () => {
      const directive = formatValueChargeDirective('-', 'pl');
      expect(directive).toContain('[ZWROT_SCENY:');
      expect(directive).toContain('UJEMNY');
      expect(directive).toContain('komplikacją');
    });

    it('powinien generować wersję dodatnią dyrektywy zwrotu sceny', () => {
      const directive = formatValueChargeDirective('+', 'pl');
      expect(directive).toContain('[ZWROT_SCENY:');
      expect(directive).toContain('DODATNI');
      expect(directive).toContain('przełom w śledztwie');
    });

    it('powinien generować wersję angielską dyrektywy zwrotu sceny', () => {
      const directive = formatValueChargeDirective(undefined, 'en');
      expect(directive).toContain('[ZWROT_SCENY:');
      expect(directive).toContain('Robert McKee principle');
    });
  });

  describe('buildWorldEngineDirectives z parametrami Fazy 3', () => {
    it('powinien wstrzykiwać dyrektywy impasu i zwrotu sceny, gdy zostały przekazane', () => {
      const result = buildWorldEngineDirectives({
        currentLocation: 'Gabinet Vance’a',
        locale: 'pl',
        deadlockDetected: true,
        valueChargeHint: '-',
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('[PROTOKÓŁ_IMPASU:');
      expect(result).toContain('[ZWROT_SCENY:');
    });
  });

  describe('Playbook Technik Fazy 3', () => {
    it('powinien posiadać technikę value_charge_shift', () => {
      const tech = getTechnique('value_charge_shift');
      expect(tech).toBeDefined();
      expect(tech?.name.pl).toBe('Zwrot Wektora Sceny (Value Charge Shift +/-)');
      expect(tech?.category).toBe('pacing');
      expect(tech?.directive.pl).toContain('zasada Roberta McKee +/-');
    });

    it('powinien posiadać technikę exposition_through_action', () => {
      const tech = getTechnique('exposition_through_action');
      expect(tech).toBeDefined();
      expect(tech?.name.pl).toBe('Ekspozycja przez Działanie (Exposition through Action)');
      expect(tech?.category).toBe('investigation');
      expect(tech?.directive.pl).toContain('Twardy zakaz encyklopedycznych ścian tekstu');
    });

    it('powinien posiadać technikę prep_situations', () => {
      const tech = getTechnique('prep_situations');
      expect(tech).toBeDefined();
      expect(tech?.name.pl).toBe('Sytuacja zamiast Fabuły (Prep Situations, Not Plots)');
      expect(tech?.category).toBe('npc');
      expect(tech?.directive.pl).toContain('Świat reaguje stanem, a nie scenariuszem');
    });
  });

  describe('Scene Director z technikami Fazy 3', () => {
    it('powinien promować exposition_through_action, gdy gracz bada dokumenty lub czyta bibliotekę', () => {
      const selection = selectSceneTechniques({
        sceneState: 'investigation',
        playerMessage: 'Czytam stary pamiętnik Corbitta i wertuję akta w archiwum',
      });

      const selectedIds = [selection.primaryTechnique.id, selection.secondaryTechnique?.id].filter(Boolean);
      expect(selectedIds).toContain('exposition_through_action');
    });

    it('powinien promować prep_situations w dialogu przy zderzeniu interesów', () => {
      const selection = selectSceneTechniques({
        sceneState: 'dialogue',
        playerMessage: 'Pytam o frakcje i kto za tym stoi, szukam ugody',
      });

      const selectedIds = [selection.primaryTechnique.id, selection.secondaryTechnique?.id].filter(Boolean);
      expect(selectedIds).toContain('prep_situations');
    });
  });

  describe('gm-protocol prompt content', () => {
    it('powinien zawierać sekcje M, N, O, P w pełnym protokole', () => {
      const prompt = getGMProtocolPrompt();
      expect(prompt).toContain('M. ZWROT WEKTORA SCENY (VALUE CHARGE SHIFT +/- / ROBERT MCKEE)');
      expect(prompt).toContain('N. EKSPOZYCJA PRZEZ DZIAŁANIE (EXPOSITION THROUGH ACTION & ANTI-INFODUMP)');
      expect(prompt).toContain('O. PROTOKÓŁ IMPASU I IDEA ROLL HANDSHAKE (COC 7E RAW S. 101)');
      expect(prompt).toContain('P. PRZYGOTUJ SYTUACJĘ, A NIE FABUŁĘ (PREP SITUATIONS, NOT PLOTS - THE ALEXANDRIAN)');
      expect(prompt).toContain('ZWROT_SCENY:');
    });

    it('powinien zawierać skrótowe reguły Fazy 3 w getCompactGMProtocolPrompt', () => {
      const compactPrompt = getCompactGMProtocolPrompt();
      expect(compactPrompt).toContain('ZWROT WEKTORA SCENY (VALUE CHARGE SHIFT +/-):');
      expect(compactPrompt).toContain('EKSPOZYCJA PRZEZ DZIAŁANIE:');
      expect(compactPrompt).toContain('PROTOKÓŁ IMPASU & IDEA ROLL HANDSHAKE (CoC 7e RAW s. 101):');
      expect(compactPrompt).toContain('PREP SITUATIONS (The Alexandrian):');
    });
  });
});
