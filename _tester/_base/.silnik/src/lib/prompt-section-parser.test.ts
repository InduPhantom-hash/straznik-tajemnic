import fs from 'fs';
import path from 'path';
import {
  parsePromptSections,
  detectGameContext,
  selectSectionsForContext,
  buildOptimizedPrompt,
} from './prompt-section-parser';

describe('prompt-section-parser', () => {
  const promptPath = path.resolve(__dirname, '../../public/default-gm-prompt.md');
  let rawPrompt: string;

  beforeAll(() => {
    rawPrompt = fs.readFileSync(promptPath, 'utf-8');
  });

  it('poprawnie wczytuje i parsuje default-gm-prompt.md na sekcje', () => {
    const sections = parsePromptSections(rawPrompt);

    expect(sections.length).toBeGreaterThanOrEqual(10);

    const ids = sections.map((s) => s.id);
    expect(ids).toContain('fundament');
    expect(ids).toContain('atmosfera');
    expect(ids).toContain('mechanika');
    expect(ids).toContain('npc');
    expect(ids).toContain('handouty');
    expect(ids).toContain('prowadzenie');
  });

  it('zawiera nowe reguły Kontrastu Grozy i Materialnego User Story w sekcji fundament', () => {
    const sections = parsePromptSections(rawPrompt);
    const fundament = sections.find((s) => s.id === 'fundament');

    expect(fundament).toBeDefined();
    expect(fundament?.content).toContain('KONTRAST GROZY');
    expect(fundament?.content).toContain('MATERIALNE USER STORY LOKACJI');
    expect(fundament?.content).toContain('SYSTEM ECHA AKCJI');
  });

  it('zawiera zasadę Actionable Clues w sekcji handouty', () => {
    const sections = parsePromptSections(rawPrompt);
    const handouty = sections.find((s) => s.id === 'handouty');

    expect(handouty).toBeDefined();
    expect(handouty?.content).toContain('ACTIONABLE CLUES');
  });

  it('zawiera zakaz info-dumpingu w sekcji prowadzenie', () => {
    const sections = parsePromptSections(rawPrompt);
    const prowadzenie = sections.find((s) => s.id === 'prowadzenie');

    expect(prowadzenie).toBeDefined();
    expect(prowadzenie?.content).toContain('Anti Info-Dumping');
  });

  it('buduje zoptymalizowany prompt dla kontekstu eksploracji', () => {
    const sections = parsePromptSections(rawPrompt);
    const context = detectGameContext('Wchodzę do starej biblioteki i rozglądam się');
    const selected = selectSectionsForContext(sections, context);
    const optimized = buildOptimizedPrompt(sections, context);

    expect(selected.some((s) => s.id === 'fundament')).toBe(true);
    expect(selected.some((s) => s.id === 'atmosfera')).toBe(true);
    expect(optimized).toContain('KONTRAST GROZY');
  });
});
