import { _resetAiGenerationState, beginAiGeneration, isAiGenerationActive } from './generation-state';

describe('AI generation state', () => {
  beforeEach(_resetAiGenerationState);

  it('blocks updates until every active generation ends', () => {
    const endFirst = beginAiGeneration();
    const endSecond = beginAiGeneration();
    expect(isAiGenerationActive()).toBe(true);
    endFirst();
    expect(isAiGenerationActive()).toBe(true);
    endSecond();
    expect(isAiGenerationActive()).toBe(false);
    endSecond();
    expect(isAiGenerationActive()).toBe(false);
  });
});
