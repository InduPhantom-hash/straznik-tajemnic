let activeGenerations = 0;

export function beginAiGeneration(): () => void {
  activeGenerations += 1;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    activeGenerations = Math.max(0, activeGenerations - 1);
  };
}

export function isAiGenerationActive(): boolean {
  return activeGenerations > 0;
}

export function _resetAiGenerationState(): void {
  activeGenerations = 0;
}
