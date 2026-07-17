'use client';

/**
 * React Hook for Persistent Media Cache
 * Provides easy access to cached media with automatic fallback to generation
 */

import { useState, useCallback } from 'react';
import {
  persistentMediaCache,
  STORES as MEDIA_CACHE_STORES,
  CacheStats,
  MediaMetadata,
} from '../lib/persistent-media-cache';

interface UseMediaCacheResult {
  // Stats
  stats: CacheStats | null;
  isLoading: boolean;

  // NPC portraits
  getNpcPortrait: (npcId: string) => Promise<string | null>;
  setNpcPortrait: (
    npcId: string,
    imageData: string,
    metadata?: MediaMetadata
  ) => Promise<boolean>;

  // Location images
  getLocationImage: (locationId: string) => Promise<string | null>;
  setLocationImage: (
    locationId: string,
    imageData: string,
    metadata?: MediaMetadata
  ) => Promise<boolean>;

  // TTS audio
  getTtsAudio: (
    text: string,
    voiceId: string,
    pitch?: number,
    rate?: number
  ) => Promise<string | null>;
  setTtsAudio: (
    text: string,
    voiceId: string,
    audioData: string,
    pitch?: number,
    rate?: number
  ) => Promise<boolean>;

  // SFX audio
  getSfxAudio: (prompt: string) => Promise<string | null>;
  setSfxAudio: (prompt: string, audioData: string) => Promise<boolean>;

  // Utility
  refreshStats: () => Promise<void>;
  clearAll: () => Promise<void>;
  clearStore: (store: keyof typeof MEDIA_CACHE_STORES) => Promise<void>;
  isAvailable: boolean;
}

export function useMediaCache(): UseMediaCacheResult {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAvailable = persistentMediaCache.isAvailable();

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats = await persistentMediaCache.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // NPC portraits
  const getNpcPortrait = useCallback(
    async (npcId: string): Promise<string | null> => {
      return persistentMediaCache.getNpcPortrait(npcId);
    },
    []
  );

  const setNpcPortrait = useCallback(
    async (
      npcId: string,
      imageData: string,
      metadata?: MediaMetadata
    ): Promise<boolean> => {
      const result = await persistentMediaCache.setNpcPortrait(
        npcId,
        imageData,
        metadata
      );
      if (result) refreshStats();
      return result;
    },
    [refreshStats]
  );

  // Location images
  const getLocationImage = useCallback(
    async (locationId: string): Promise<string | null> => {
      return persistentMediaCache.getLocationImage(locationId);
    },
    []
  );

  const setLocationImage = useCallback(
    async (
      locationId: string,
      imageData: string,
      metadata?: MediaMetadata
    ): Promise<boolean> => {
      const result = await persistentMediaCache.setLocationImage(
        locationId,
        imageData,
        metadata
      );
      if (result) refreshStats();
      return result;
    },
    [refreshStats]
  );

  // TTS audio
  const getTtsAudio = useCallback(
    async (
      text: string,
      voiceId: string,
      pitch?: number,
      rate?: number
    ): Promise<string | null> => {
      const cacheKey = persistentMediaCache.generateTtsCacheKey(
        text,
        voiceId,
        pitch,
        rate
      );
      return persistentMediaCache.getTtsAudio(cacheKey);
    },
    []
  );

  const setTtsAudio = useCallback(
    async (
      text: string,
      voiceId: string,
      audioData: string,
      pitch?: number,
      rate?: number
    ): Promise<boolean> => {
      const cacheKey = persistentMediaCache.generateTtsCacheKey(
        text,
        voiceId,
        pitch,
        rate
      );
      const result = await persistentMediaCache.setTtsAudio(
        cacheKey,
        audioData,
        {
          text: text.substring(0, 100),
          voiceId,
          pitch,
          rate,
        }
      );
      if (result) refreshStats();
      return result;
    },
    [refreshStats]
  );

  // SFX audio
  const getSfxAudio = useCallback(
    async (prompt: string): Promise<string | null> => {
      const cacheKey = persistentMediaCache.generateSfxCacheKey(prompt);
      return persistentMediaCache.getSfxAudio(cacheKey);
    },
    []
  );

  const setSfxAudio = useCallback(
    async (prompt: string, audioData: string): Promise<boolean> => {
      const cacheKey = persistentMediaCache.generateSfxCacheKey(prompt);
      const result = await persistentMediaCache.setSfxAudio(
        cacheKey,
        audioData,
        {
          prompt: prompt.substring(0, 100),
        }
      );
      if (result) refreshStats();
      return result;
    },
    [refreshStats]
  );

  // Utility
  const clearAll = useCallback(async () => {
    await persistentMediaCache.clearAll();
    setStats(null);
  }, []);

  const clearStore = useCallback(
    async (store: keyof typeof MEDIA_CACHE_STORES) => {
      const storeName = MEDIA_CACHE_STORES[store];
      await persistentMediaCache.clearStore(storeName);
      refreshStats();
    },
    [refreshStats]
  );

  return {
    stats,
    isLoading,
    getNpcPortrait,
    setNpcPortrait,
    getLocationImage,
    setLocationImage,
    getTtsAudio,
    setTtsAudio,
    getSfxAudio,
    setSfxAudio,
    refreshStats,
    clearAll,
    clearStore,
    isAvailable,
  };
}

/**
 * Helper function to generate image with cache check
 */
export async function generateImageWithCache(options: {
  type: 'npc' | 'location';
  id: string;
  prompt: string;
  style?: string;
  forceRegenerate?: boolean;
  /**
   * Zew-App-Local: IGNOROWANE. Wcześniej URL portretu NPC dla Flux Kontext Pro
   * (image-to-image przez Replicate). Po przejściu na jeden klucz Gemini wszystkie
   * obrazy idą przez /api/imagen - spójność wyglądu NPC między scenami nie jest
   * już wspierana. Parametr zostaje dla zgodności callerów (do wycięcia w Liście 2).
   */
  inputPortraitUrl?: string;
}): Promise<{ imageUrl: string; fromCache: boolean; cost: number }> {
  const {
    type,
    id,
    prompt,
    style = 'horror',
    forceRegenerate = false,
  } = options;

  // Check cache first (unless force regenerate)
  if (!forceRegenerate) {
    const cached =
      type === 'npc'
        ? await persistentMediaCache.getNpcPortrait(id)
        : await persistentMediaCache.getLocationImage(id);

    if (cached) {
      console.log(`🎯 Cache hit for ${type}/${id}`);
      return { imageUrl: cached, fromCache: true, cost: 0 };
    }
  }

  // Zew-App-Local: zawsze orkiestrator /api/imagen (tylko Gemini, jeden klucz).
  console.log(
    `🎨 Generating new image for ${type}/${id} via /api/imagen (Gemini)`
  );

  const response = await fetch('/api/imagen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style }),
  });

  const data = await response.json();

  if (!data.success || !data.imageUrl) {
    throw new Error(data.error || 'Failed to generate image');
  }

  // Save to cache
  if (type === 'npc') {
    await persistentMediaCache.setNpcPortrait(id, data.imageUrl, {
      prompt,
      style,
    });
  } else {
    await persistentMediaCache.setLocationImage(id, data.imageUrl, {
      prompt,
      style,
    });
  }

  return { imageUrl: data.imageUrl, fromCache: false, cost: data.cost || 0 };
}

/**
 * Helper function to generate TTS with cache check
 * Uses persistent IndexedDB cache to avoid regenerating identical TTS
 */
export async function generateTtsWithCache(options: {
  text: string;
  voiceId: string;
  pitch?: number;
  rate?: number;
  gender?: 'MALE' | 'FEMALE';
  languageCode?: string;
  volumeGainDb?: number;
  forceRegenerate?: boolean;
}): Promise<{ audioUrl: string; fromCache: boolean; duration?: number }> {
  const {
    text,
    voiceId,
    pitch = 0,
    rate = 1.0,
    gender = 'MALE',
    languageCode = 'pl-PL',
    volumeGainDb = 0,
    forceRegenerate = false,
  } = options;

  // Check cache first
  if (!forceRegenerate) {
    const cacheKey = persistentMediaCache.generateTtsCacheKey(
      text,
      voiceId,
      pitch,
      rate
    );
    const cached = await persistentMediaCache.getTtsAudio(cacheKey);

    if (cached) {
      console.log(`🎯 TTS cache hit for voice ${voiceId}`);
      return { audioUrl: cached, fromCache: true };
    }
  }

  // Generate new TTS using /api/tts/google endpoint
  console.log(`🎤 Generating new TTS for voice ${voiceId}`);

  const response = await fetch('/api/tts/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      settings: {
        languageCode,
        voiceName: voiceId,
        gender,
        speakingRate: rate,
        pitch,
        volumeGainDb,
      },
    }),
  });

  const data = await response.json();

  if (!data.success || !data.audioUrl) {
    throw new Error(data.error || 'Failed to generate TTS');
  }

  // Save to cache
  const cacheKey = persistentMediaCache.generateTtsCacheKey(
    text,
    voiceId,
    pitch,
    rate
  );
  await persistentMediaCache.setTtsAudio(cacheKey, data.audioUrl, {
    text: text.substring(0, 100),
    voiceId,
    pitch,
    rate,
    languageCode,
  });

  console.log(`📦 TTS cached: ${voiceId}`);
  return { audioUrl: data.audioUrl, fromCache: false, duration: data.duration };
}

// M5 sesja 146: generateSfxWithCache DROPPED per D2 (ElevenLabs SoundEffect API odchodzi).
