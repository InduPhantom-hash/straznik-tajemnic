/**
 * @file hue-client.ts
 * Klient HTTP dla Philips Hue Bridge v2 (REST CLIP v2).
 * W 100% lokalny w sieci LAN (Zero Cloud), odporny na błędy sieciowe i rozłączenia.
 */

import {
  HueBridgeConfig,
  HueBridgeDiscoveryResult,
  HueLightResource,
  HueLightStateSnapshot,
} from './types';

export class HueClient {
  private config: HueBridgeConfig;

  constructor(config?: Partial<HueBridgeConfig>) {
    this.config = {
      enabled: false,
      bridgeIp: '',
      appKey: '',
      selectedLightIds: [],
      ...config,
    };
  }

  public updateConfig(newConfig: Partial<HueBridgeConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): HueBridgeConfig {
    return { ...this.config };
  }

  /**
   * Automatyczne wykrywanie mostka w sieci LAN przy użyciu oficjalnego endpointu Discovery
   */
  public static async discoverBridges(): Promise<HueBridgeDiscoveryResult[]> {
    try {
      const response = await fetch('https://discovery.meethue.com/', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data.map((b) => ({
        id: b.id,
        internalipaddress: b.internalipaddress,
        port: b.port,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Procedura parowania (Pushlink): wysyła POST /api z nazwą aplikacji.
   * Użytkownik musi uprzednio wcisnąć fizyczny przycisk na mostku.
   */
  public async linkBridge(
    bridgeIp: string,
    appName = 'straznik-tajemnic#pc'
  ): Promise<{ success: boolean; appKey?: string; error?: string }> {
    try {
      const url = `http://${bridgeIp}/api`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devicetype: appName,
          generateclientkey: true,
        }),
      });

      const data = await response.json();
      if (Array.isArray(data) && data[0]) {
        if (data[0].success && data[0].success.username) {
          const key = data[0].success.username;
          this.updateConfig({ bridgeIp, appKey: key });
          return { success: true, appKey: key };
        }
        if (data[0].error) {
          return { success: false, error: data[0].error.description };
        }
      }
      return { success: false, error: 'Nieznana odpowiedź mostka' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Pobiera listę zasobów oświetlenia z mostka (CLIP v2 API)
   */
  public async getLights(): Promise<HueLightResource[]> {
    if (!this.config.bridgeIp || !this.config.appKey) return [];

    try {
      const url = `http://${this.config.bridgeIp}/clip/v2/resource/light`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'hue-application-key': this.config.appKey,
          Accept: 'application/json',
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) return [];
      return data.data as HueLightResource[];
    } catch {
      return [];
    }
  }

  /**
   * Wykonuje migawkę (snapshot) bieżącego stanu wybranych świateł
   */
  public async captureSnapshot(): Promise<HueLightStateSnapshot[]> {
    const lights = await this.getLights();
    const targetIds =
      this.config.selectedLightIds.length > 0
        ? this.config.selectedLightIds
        : lights.map((l) => l.id);

    return lights
      .filter((l) => targetIds.includes(l.id))
      .map((l) => ({
        lightId: l.id,
        on: l.on.on,
        brightness: l.dimming?.brightness,
        mirek: l.color_temperature?.mirek,
        xy: l.color?.xy,
      }));
  }

  /**
   * Przywraca stan świateł z zapisanej migawki (Safety & Restore)
   */
  public async restoreSnapshot(
    snapshots: HueLightStateSnapshot[],
    transitionMs = 3000
  ): Promise<void> {
    if (!this.config.bridgeIp || !this.config.appKey) return;

    for (const snap of snapshots) {
      const payload: Record<string, unknown> = {
        on: { on: snap.on },
        dynamics: { duration: transitionMs },
      };

      if (snap.brightness !== undefined) {
        payload.dimming = { brightness: snap.brightness };
      }
      if (snap.mirek !== undefined && snap.mirek !== null) {
        payload.color_temperature = { mirek: snap.mirek };
      } else if (snap.xy) {
        payload.color = { xy: snap.xy };
      }

      await this.setLightState(snap.lightId, payload);
    }
  }

  /**
   * Ustawia stan pojedynczego światła przez CLIP v2
   */
  public async setLightState(
    lightId: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.config.bridgeIp || !this.config.appKey) return false;

    try {
      const url = `http://${this.config.bridgeIp}/clip/v2/resource/light/${lightId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'hue-application-key': this.config.appKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Aplikuje komendę do wszystkich aktualnie wybranych świateł
   */
  public async applyToSelectedLights(
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.config.enabled || !this.config.bridgeIp || !this.config.appKey) {
      return;
    }

    const lightIds = this.config.selectedLightIds;
    if (lightIds.length === 0) return;

    // Wysyłamy asynchronicznie bez blokowania wątku
    await Promise.allSettled(
      lightIds.map((id) => this.setLightState(id, payload))
    );
  }
}
