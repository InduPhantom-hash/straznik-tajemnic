'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { HueClient } from '@/lib/hardware/hue/hue-client';
import {
  HueBridgeConfig,
  HueBridgeDiscoveryResult,
  HueLightResource,
} from '@/lib/hardware/hue/types';

const STORAGE_KEY = 'straznik_hue_config';

function loadStoredConfig(): HueBridgeConfig {
  if (typeof window === 'undefined') {
    return { enabled: false, bridgeIp: '', appKey: '', selectedLightIds: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, bridgeIp: '', appKey: '', selectedLightIds: [] };
    return JSON.parse(raw);
  } catch {
    return { enabled: false, bridgeIp: '', appKey: '', selectedLightIds: [] };
  }
}

function saveStoredConfig(cfg: HueBridgeConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function HueSettingsSection() {
  const t = useTranslations('HueSettings');
  const [config, setConfig] = useState<HueBridgeConfig>(loadStoredConfig);
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [discoveredBridges, setDiscoveredBridges] = useState<HueBridgeDiscoveryResult[]>([]);
  const [lights, setLights] = useState<HueLightResource[]>([]);
  const [isLoadingLights, setIsLoadingLights] = useState(false);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  // Pobierz listę lamp, jeśli mostek jest skonfigurowany
  useEffect(() => {
    if (config.bridgeIp && config.appKey) {
      const client = new HueClient(config);
      setIsLoadingLights(true);
      client
        .getLights()
        .then((res) => {
          setLights(res);
          setIsLoadingLights(false);
        })
        .catch(() => setIsLoadingLights(false));
    }
  }, [config.bridgeIp, config.appKey]);

  const handleToggleEnabled = () => {
    const next = !config.enabled;
    setConfig((prev) => ({ ...prev, enabled: next }));
  };

  const handleScanBridges = async () => {
    setIsScanning(true);
    setStatus(t('scanning'));
    try {
      const bridges = await HueClient.discoverBridges();
      setDiscoveredBridges(bridges);
      if (bridges.length > 0) {
        setStatus(t('foundBridges', { count: bridges.length }));
        if (!config.bridgeIp) {
          setConfig((prev) => ({ ...prev, bridgeIp: bridges[0].internalipaddress }));
        }
      } else {
        setStatus(t('noBridgesFound'));
      }
    } catch {
      setStatus(t('discoveryError'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleLinkBridge = async () => {
    if (!config.bridgeIp) {
      setStatus(t('provideIpFirst'));
      return;
    }
    setIsLinking(true);
    setStatus(t('pressButtonInstruction'));
    const client = new HueClient();
    const res = await client.linkBridge(config.bridgeIp);
    if (res.success && res.appKey) {
      setConfig((prev) => ({
        ...prev,
        enabled: true,
        bridgeIp: config.bridgeIp,
        appKey: res.appKey!,
      }));
      setStatus(t('linkSuccess'));
    } else {
      setStatus(res.error || t('linkFailed'));
    }
    setIsLinking(false);
  };

  const handleToggleLight = (lightId: string) => {
    setConfig((prev) => {
      const exists = prev.selectedLightIds.includes(lightId);
      const updated = exists
        ? prev.selectedLightIds.filter((id) => id !== lightId)
        : [...prev.selectedLightIds, lightId];
      return { ...prev, selectedLightIds: updated };
    });
  };

  const statusBadge = config.enabled && config.appKey
    ? t('statusActive', { count: config.selectedLightIds.length })
    : t('statusDisabled');

  return (
    <section data-testid="hue-settings" className="space-y-3 border border-brass/30 bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-brass">
            {t('title')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary/80">{statusBadge}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-brass/40 text-xs uppercase tracking-wider text-brass"
          >
            {isExpanded ? t('collapse') : t('expand')}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-3 border-t border-brass/20">
          <div className="flex items-center gap-3">
            <Button
              variant={config.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleEnabled}
              disabled={!config.appKey}
              className={config.enabled ? 'bg-primary text-[#04110f]' : 'border-brass/40 text-brass'}
            >
              {config.enabled ? t('enabled') : t('disabled')}
            </Button>
            {!config.appKey && (
              <span className="text-xs text-amber-400">{t('pairRequiredBeforeEnabling')}</span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('bridgeIpAddress')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.bridgeIp}
                onChange={(e) => setConfig((prev) => ({ ...prev, bridgeIp: e.target.value.trim() }))}
                placeholder="192.168.1.xxx"
                className="flex-1 bg-black/40 border border-brass/30 px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleScanBridges}
                disabled={isScanning}
                className="border-brass/40 text-xs"
              >
                {isScanning ? t('scanning') : t('scanLan')}
              </Button>
            </div>
            {discoveredBridges.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <span>{t('detectedBridges')}</span>
                {discoveredBridges.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setConfig((prev) => ({ ...prev, bridgeIp: b.internalipaddress }))}
                    className="ml-2 underline hover:text-primary font-mono text-xs"
                  >
                    {b.internalipaddress}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleLinkBridge}
              disabled={isLinking || !config.bridgeIp}
              size="sm"
              className="bg-primary text-[#04110f] text-xs font-semibold uppercase tracking-wider hover:brightness-110"
            >
              {isLinking ? t('linking') : t('pairBridgeButton')}
            </Button>
            {status && <span className="text-xs text-brass/90">{status}</span>}
          </div>

          {/* Selektor żarówek do gry */}
          {config.appKey && (
            <div className="space-y-2 pt-2 border-t border-brass/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('selectLightsTitle')}
              </span>
              {isLoadingLights && <p className="text-xs text-muted-foreground">{t('loadingLights')}</p>}
              {!isLoadingLights && lights.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('noLightsFound')}</p>
              )}
              {!isLoadingLights && lights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {lights.map((l) => {
                    const checked = config.selectedLightIds.includes(l.id);
                    return (
                      <label
                        key={l.id}
                        className="flex items-center gap-2 p-2 border border-brass/20 bg-black/20 text-xs cursor-pointer hover:border-primary/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleLight(l.id)}
                          className="accent-primary"
                        />
                        <span className="font-display font-medium text-foreground">
                          {l.metadata.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
