/**
 * Cost Event Emitter - Real-time cost tracking
 * Emits events whenever an API call is made with cost data
 */

// M5 sesja 146: 'elevenlabs' DROPPED z type union per D2.
type CostEventType = 'gemini' | 'tts' | 'image';

interface CostEvent {
  type: CostEventType;
  cost: number;
  tokens?: number;
  characters?: number;
  model?: string;
  timestamp: Date;
}

interface CostStats {
  gemini: { cost: number; tokens: number; calls: number };
  tts: { cost: number; characters: number; calls: number };
  image: { cost: number; count: number; calls: number };
  // M5 sesja 146: elevenlabs DROPPED per D2.
  total: { cost: number; calls: number };
  lastUpdate: Date;
}

type CostEventListener = (stats: CostStats) => void;

class CostEventEmitter {
  private listeners: Set<CostEventListener> = new Set();
  private stats: CostStats = this.getInitialStats();
  private storageKey = 'cost_tracking_stats';

  constructor() {
    this.loadFromStorage();
  }

  private getInitialStats(): CostStats {
    return {
      gemini: { cost: 0, tokens: 0, calls: 0 },
      tts: { cost: 0, characters: 0, calls: 0 },
      image: { cost: 0, count: 0, calls: 0 },
      total: { cost: 0, calls: 0 },
      lastUpdate: new Date(),
    };
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.stats = {
          ...this.getInitialStats(),
          ...parsed,
          lastUpdate: new Date(parsed.lastUpdate || Date.now()),
        };
      }
    } catch (error) {
      console.error('Failed to load cost stats:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save cost stats:', error);
    }
  }

  // Record a cost event
  record(event: CostEvent): void {
    const { type, cost, tokens, characters } = event;

    // Update type-specific stats
    switch (type) {
      case 'gemini':
        this.stats.gemini.cost += cost;
        this.stats.gemini.tokens += tokens || 0;
        this.stats.gemini.calls += 1;
        break;
      case 'tts':
        this.stats.tts.cost += cost;
        this.stats.tts.characters += characters || 0;
        this.stats.tts.calls += 1;
        break;
      case 'image':
        this.stats.image.cost += cost;
        this.stats.image.count += 1;
        this.stats.image.calls += 1;
        break;
      // M5 sesja 146: case 'elevenlabs' DROPPED per D2.
    }

    // Update totals
    this.stats.total.cost += cost;
    this.stats.total.calls += 1;
    this.stats.lastUpdate = new Date();

    // Persist and notify
    this.saveToStorage();
    this.emit();

    console.log(
      `💰 Cost recorded: ${type} - $${cost.toFixed(4)} (Total: $${this.stats.total.cost.toFixed(4)})`
    );
  }

  // Subscribe to cost updates
  subscribe(listener: CostEventListener): () => void {
    this.listeners.add(listener);
    // Immediately send current stats
    listener(this.stats);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Emit to all listeners
  private emit(): void {
    this.listeners.forEach((listener) => listener(this.stats));
  }

  // Get current stats
  getStats(): CostStats {
    return { ...this.stats };
  }

  // Reset all stats
  reset(): void {
    this.stats = this.getInitialStats();
    this.saveToStorage();
    this.emit();
  }

  // Reset session stats only
  resetSession(): void {
    // Keep total but reset session-specific data
    this.stats.lastUpdate = new Date();
    this.saveToStorage();
    this.emit();
  }
}

// Singleton instance
export const costEventEmitter = new CostEventEmitter();

// Helper functions for recording costs
export function recordGeminiCost(
  cost: number,
  tokens: number,
  model?: string
): void {
  costEventEmitter.record({
    type: 'gemini',
    cost,
    tokens,
    model,
    timestamp: new Date(),
  });
}

export function recordTTSCost(cost: number, characters: number): void {
  costEventEmitter.record({
    type: 'tts',
    cost,
    characters,
    timestamp: new Date(),
  });
}

export function recordImageCost(cost: number): void {
  costEventEmitter.record({
    type: 'image',
    cost,
    timestamp: new Date(),
  });
}

// M5 sesja 146: recordElevenLabsCost DROPPED per D2.

export type { CostStats, CostEvent, CostEventType };
