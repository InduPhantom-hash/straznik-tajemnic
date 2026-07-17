// GM Tools Storage - zarządzanie danymi NPC, lokacji i timeline w cloud storage

import { googleCloudStorageService } from './google-cloud-storage-service-fixed';
import { NPC } from './types';
import { Location } from './types';
import { TimelineEvent } from './session-timeline';

const DEFAULT_USER_ID = 'default_user';

/**
 * Zapisuje NPC do cloud storage
 */
export async function saveNPCsToCloud(
  npcs: NPC[],
  userId: string = DEFAULT_USER_ID
): Promise<void> {
  try {
    const fileName = `gm-tools/npcs/${userId}/npcs.json`;
    const content = JSON.stringify(npcs, null, 2);
    await googleCloudStorageService.uploadFile(
      Buffer.from(content, 'utf-8'),
      fileName,
      {
        metadata: {
          contentType: 'application/json',
          customMetadata: {
            type: 'npcs',
            userId,
            count: npcs.length.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      }
    );
    console.log(`✅ NPCs saved to cloud for user ${userId}`);
  } catch (error) {
    console.error('Error saving NPCs to cloud:', error);
    throw error;
  }
}

/**
 * Ładuje NPC z cloud storage
 */
export async function loadNPCsFromCloud(
  userId: string = DEFAULT_USER_ID
): Promise<NPC[]> {
  try {
    const fileName = `gm-tools/npcs/${userId}/npcs.json`;
    const fileBuffer = await googleCloudStorageService.downloadFile(fileName);
    const npcs: NPC[] = JSON.parse(fileBuffer.toString('utf-8'));

    // Konwertuj daty
    return npcs.map((npc) => ({
      ...npc,
      createdAt: new Date(npc.createdAt),
      updatedAt: new Date(npc.updatedAt),
      lastUsed: npc.lastUsed ? new Date(npc.lastUsed) : undefined,
      changeHistory: npc.changeHistory.map((h) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Error loading NPCs from cloud:', error);
    // Zwróć pustą tablicę jeśli plik nie istnieje
    return [];
  }
}

/**
 * Usuwa NPC z cloud storage (idempotent — 404 zwracane jako success)
 */
export async function deleteNPCsFromCloud(
  userId: string = DEFAULT_USER_ID
): Promise<void> {
  const fileName = `gm-tools/npcs/${userId}/npcs.json`;
  try {
    await googleCloudStorageService.deleteFile(fileName);
    console.log(`✅ NPCs deleted from cloud for user ${userId}`);
  } catch (error: unknown) {
    // Idempotent — 404 (file not found) NIE jest błędem dla DELETE
    const errorCode = (error as { code?: number })?.code;
    if (errorCode === 404) {
      console.log(`ℹ️ No NPCs file to delete for user ${userId} (404)`);
      return;
    }
    console.error('Error deleting NPCs from cloud:', error);
    throw error;
  }
}

/**
 * Zapisuje lokacje do cloud storage
 */
export async function saveLocationsToCloud(
  locations: Location[],
  userId: string = DEFAULT_USER_ID
): Promise<void> {
  try {
    const fileName = `gm-tools/locations/${userId}/locations.json`;
    const content = JSON.stringify(locations, null, 2);
    await googleCloudStorageService.uploadFile(
      Buffer.from(content, 'utf-8'),
      fileName,
      {
        metadata: {
          contentType: 'application/json',
          customMetadata: {
            type: 'locations',
            userId,
            count: locations.length.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      }
    );
    console.log(`✅ Locations saved to cloud for user ${userId}`);
  } catch (error) {
    console.error('Error saving locations to cloud:', error);
    throw error;
  }
}

/**
 * Ładuje lokacje z cloud storage
 */
export async function loadLocationsFromCloud(
  userId: string = DEFAULT_USER_ID
): Promise<Location[]> {
  try {
    const fileName = `gm-tools/locations/${userId}/locations.json`;
    const fileBuffer = await googleCloudStorageService.downloadFile(fileName);
    const locations: Location[] = JSON.parse(fileBuffer.toString('utf-8'));

    // Konwertuj daty
    return locations.map((loc) => ({
      ...loc,
      createdAt: new Date(loc.createdAt),
      updatedAt: new Date(loc.updatedAt),
      lastVisited: loc.lastVisited ? new Date(loc.lastVisited) : undefined,
    }));
  } catch (error) {
    console.error('Error loading locations from cloud:', error);
    return [];
  }
}

/**
 * Zapisuje timeline do cloud storage
 */
export async function saveTimelineToCloud(
  events: TimelineEvent[],
  sessionId: string,
  userId: string = DEFAULT_USER_ID
): Promise<void> {
  try {
    const fileName = `gm-tools/timeline/${userId}/${sessionId}/timeline.json`;
    const content = JSON.stringify(events, null, 2);
    await googleCloudStorageService.uploadFile(
      Buffer.from(content, 'utf-8'),
      fileName,
      {
        metadata: {
          contentType: 'application/json',
          customMetadata: {
            type: 'timeline',
            userId,
            sessionId,
            count: events.length.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      }
    );
    console.log(`✅ Timeline saved to cloud for session ${sessionId}`);
  } catch (error) {
    console.error('Error saving timeline to cloud:', error);
    throw error;
  }
}

/**
 * Ładuje timeline z cloud storage
 */
export async function loadTimelineFromCloud(
  sessionId: string,
  userId: string = DEFAULT_USER_ID
): Promise<TimelineEvent[]> {
  try {
    const fileName = `gm-tools/timeline/${userId}/${sessionId}/timeline.json`;
    const fileBuffer = await googleCloudStorageService.downloadFile(fileName);
    const events: TimelineEvent[] = JSON.parse(fileBuffer.toString('utf-8'));

    // Konwertuj daty
    return events.map((event) => ({
      ...event,
      timestamp: new Date(event.timestamp),
    }));
  } catch (error) {
    console.error('Error loading timeline from cloud:', error);
    return [];
  }
}

/**
 * Synchronizuje dane z localStorage do cloud storage
 */
export async function syncGMToolsDataToCloud(
  userId: string = DEFAULT_USER_ID
): Promise<{
  npcs: number;
  locations: number;
  timelines: number;
}> {
  const stats = { npcs: 0, locations: 0, timelines: 0 };

  try {
    // Synchronizuj NPC
    if (typeof window !== 'undefined') {
      const savedNPCs = localStorage.getItem('gm_npcs');
      if (savedNPCs) {
        const npcs: NPC[] = JSON.parse(savedNPCs);
        await saveNPCsToCloud(npcs, userId);
        stats.npcs = npcs.length;
      }

      // Synchronizuj lokacje
      const savedLocations = localStorage.getItem('gm_locations');
      if (savedLocations) {
        const locations: Location[] = JSON.parse(savedLocations);
        await saveLocationsToCloud(locations, userId);
        stats.locations = locations.length;
      }

      // Synchronizuj timeline dla wszystkich sesji
      const timelineKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('timeline_')
      );
      for (const key of timelineKeys) {
        const sessionId = key.replace('timeline_', '');
        const events = JSON.parse(localStorage.getItem(key) || '[]');
        if (events.length > 0) {
          await saveTimelineToCloud(events, sessionId, userId);
          stats.timelines++;
        }
      }
    }

    console.log(`✅ GM Tools data synced to cloud:`, stats);
  } catch (error) {
    console.error('Error syncing GM Tools data to cloud:', error);
    throw error;
  }

  return stats;
}

/**
 * Ładuje dane z cloud storage do localStorage
 */
export async function loadGMToolsDataFromCloud(
  userId: string = DEFAULT_USER_ID,
  sessionId?: string
): Promise<{
  npcs: number;
  locations: number;
  timelineEvents: number;
}> {
  const stats = { npcs: 0, locations: 0, timelineEvents: 0 };

  try {
    // Ładuj NPC
    const npcs = await loadNPCsFromCloud(userId);
    if (npcs.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('gm_npcs', JSON.stringify(npcs));
      stats.npcs = npcs.length;
    }

    // Ładuj lokacje
    const locations = await loadLocationsFromCloud(userId);
    if (locations.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('gm_locations', JSON.stringify(locations));
      stats.locations = locations.length;
    }

    // Ładuj timeline dla sesji
    if (sessionId) {
      const events = await loadTimelineFromCloud(sessionId, userId);
      if (events.length > 0 && typeof window !== 'undefined') {
        localStorage.setItem(`timeline_${sessionId}`, JSON.stringify(events));
        stats.timelineEvents = events.length;
      }
    }

    console.log(`✅ GM Tools data loaded from cloud:`, stats);
  } catch (error) {
    console.error('Error loading GM Tools data from cloud:', error);
    throw error;
  }

  return stats;
}
