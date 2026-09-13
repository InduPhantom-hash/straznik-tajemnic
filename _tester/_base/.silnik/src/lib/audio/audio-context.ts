/**
 * Shared AudioContext singleton (Issue #79)
 *
 * Reuses a single AudioContext across the application to prevent
 * hardware audio context exhaustion and browser resource leaks.
 */

let sharedContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!sharedContext || sharedContext.state === 'closed') {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    try {
      sharedContext = new AudioCtx();
    } catch (err) {
      console.warn('⚠️ [AudioContext] Failed to initialize AudioContext:', err);
      return null;
    }
  }

  if (sharedContext.state === 'suspended') {
    sharedContext.resume().catch((err) => {
      console.warn('⚠️ [AudioContext] Failed to resume suspended shared context:', err);
    });
  }

  return sharedContext;
}

/**
 * Reset helper for unit testing.
 */
export function resetSharedAudioContextForTesting(): void {
  if (sharedContext && sharedContext.state !== 'closed') {
    try {
      void sharedContext.close();
    } catch {
      // ignore
    }
  }
  sharedContext = null;
}
