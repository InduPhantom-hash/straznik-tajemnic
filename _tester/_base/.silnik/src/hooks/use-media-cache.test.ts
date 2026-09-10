import { renderHook, act } from '@testing-library/react';
import { useMediaCache } from './use-media-cache';
import { persistentMediaCache } from '../lib/persistent-media-cache';

jest.mock('../lib/persistent-media-cache', () => {
  const actual = jest.requireActual('../lib/persistent-media-cache');
  return {
    ...actual,
    persistentMediaCache: {
      isAvailable: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockResolvedValue({ totalSize: 100, itemCount: 1, byStore: {} }),
      getNpcPortrait: jest.fn().mockResolvedValue('data:npc'),
      setNpcPortrait: jest.fn().mockResolvedValue(true),
      getLocationImage: jest.fn().mockResolvedValue('data:loc'),
      setLocationImage: jest.fn().mockResolvedValue(true),
      getChatImage: jest.fn().mockResolvedValue('data:chat'),
      setChatImage: jest.fn().mockResolvedValue(true),
      getTtsAudio: jest.fn().mockResolvedValue('data:tts'),
      setTtsAudio: jest.fn().mockResolvedValue(true),
      getSfxAudio: jest.fn().mockResolvedValue('data:sfx'),
      setSfxAudio: jest.fn().mockResolvedValue(true),
      cleanupExpired: jest.fn().mockResolvedValue(3),
      resetDatabase: jest.fn().mockResolvedValue(true),
      clearAll: jest.fn().mockResolvedValue(undefined),
      clearStore: jest.fn().mockResolvedValue(undefined),
      generateTtsCacheKey: jest.fn().mockReturnValue('tts-key'),
      generateSfxCacheKey: jest.fn().mockReturnValue('sfx-key'),
    },
  };
});

describe('useMediaCache (Issue #78 Retention Hook Integration)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('eksponuje pełny interfejs hooka wraz z nowymi metodami Issue #78', () => {
    const { result } = renderHook(() => useMediaCache());

    expect(result.current.isAvailable).toBe(true);
    expect(typeof result.current.getChatImage).toBe('function');
    expect(typeof result.current.setChatImage).toBe('function');
    expect(typeof result.current.cleanupExpired).toBe('function');
    expect(typeof result.current.resetDatabase).toBe('function');
    expect(typeof result.current.clearAll).toBe('function');
    expect(typeof result.current.clearStore).toBe('function');
  });

  it('deleguje operacje chat-images do persistentMediaCache', async () => {
    const { result } = renderHook(() => useMediaCache());

    let chatImg: string | null = null;
    await act(async () => {
      chatImg = await result.current.getChatImage('msg-1', 0);
    });
    expect(chatImg).toBe('data:chat');
    expect(persistentMediaCache.getChatImage).toHaveBeenCalledWith('msg-1', 0);

    let setResult = false;
    await act(async () => {
      setResult = await result.current.setChatImage('msg-1', 0, 'data:new-chat');
    });
    expect(setResult).toBe(true);
    expect(persistentMediaCache.setChatImage).toHaveBeenCalledWith('msg-1', 0, 'data:new-chat', undefined);
  });

  it('deleguje cleanupExpired i resetDatabase do persistentMediaCache', async () => {
    const { result } = renderHook(() => useMediaCache());

    let deleted = 0;
    await act(async () => {
      deleted = await result.current.cleanupExpired();
    });
    expect(deleted).toBe(3);
    expect(persistentMediaCache.cleanupExpired).toHaveBeenCalled();

    let resetSuccess = false;
    await act(async () => {
      resetSuccess = await result.current.resetDatabase();
    });
    expect(resetSuccess).toBe(true);
    expect(persistentMediaCache.resetDatabase).toHaveBeenCalledWith(undefined);

    await act(async () => {
      await result.current.resetDatabase(500);
    });
    expect(persistentMediaCache.resetDatabase).toHaveBeenCalledWith(500);

    await act(async () => {
      await result.current.resetDatabase({ blockedTimeoutMs: 750 });
    });
    expect(persistentMediaCache.resetDatabase).toHaveBeenCalledWith({ blockedTimeoutMs: 750 });

    // Gdy resetDatabase zwraca false, stats nie jest czyszczone do null
    (persistentMediaCache.resetDatabase as jest.Mock).mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.refreshStats();
    });
    expect(result.current.stats).not.toBeNull();

    let failSuccess = true;
    await act(async () => {
      failSuccess = await result.current.resetDatabase(100);
    });
    expect(failSuccess).toBe(false);
    expect(result.current.stats).not.toBeNull();
  });
});
