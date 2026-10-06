/**
 * @file types.ts
 * Definicje typów dla integracji z mostkiem Philips Hue CLIP v2 i Reżysera Światła.
 */

export interface HueLightResource {
  id: string;
  id_v1?: string;
  metadata: {
    name: string;
    archetype?: string;
  };
  on: {
    on: boolean;
  };
  dimming?: {
    brightness: number; // 0.0 - 100.0
  };
  color_temperature?: {
    mirek: number | null; // 153 (zimna) - 500 (bardzo ciepła)
  };
  color?: {
    xy: {
      x: number;
      y: number;
    };
  };
}

export interface HueLightStateSnapshot {
  lightId: string;
  on: boolean;
  brightness?: number;
  mirek?: number | null;
  xy?: { x: number; y: number };
}

export interface HueBridgeConfig {
  enabled: boolean;
  bridgeIp: string;
  appKey: string;
  selectedLightIds: string[];
}

export interface HueBridgeDiscoveryResult {
  id: string;
  internalipaddress: string;
  port?: number;
}

export interface LightPreset {
  id: string;
  name: string;
  description: string;
  mirek?: number;
  xy?: [number, number];
  brightness: number; // 0 - 100
  transitionMs: number;
}

export type SceneLightingMood =
  | 'kerosene_lamp'
  | 'new_england_fog'
  | 'subterranean_dark'
  | 'cosmic_horror'
  | 'candlelight'
  | 'institutional_cold';
