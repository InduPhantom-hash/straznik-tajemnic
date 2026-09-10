'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  Users,
  Network,
  MapPin,
  Film,
  Key,
  ShieldAlert,
  Brain,
  Search,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DramatronAdventure } from '@/lib/adventure-generator/types';

interface DramatronReviewInspectorProps {
  dramatron: DramatronAdventure;
}

export function DramatronReviewInspector({ dramatron }: DramatronReviewInspectorProps) {
  const t = useTranslations('AdventureBuilder.dramatron');
  const [activeTab, setActiveTab] = useState<'premise' | 'cast' | 'clues' | 'locations' | 'scenes'>('premise');

  const { premise, cast, clueWeb, locations, scenes } = dramatron;

  return (
    <div className="border border-brass/30 bg-[#16120e] p-4 rounded-md space-y-4 font-serif">
      {/* NAGŁÓWEK TABÓW */}
      <div className="flex flex-wrap items-center justify-between border-b border-brass/20 pb-3 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('premise')}
            className={`px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'premise'
                ? 'bg-brass text-[#120f0d] font-bold shadow'
                : 'bg-[#1a1511] text-[#b0a390] hover:bg-brass/20 hover:text-brass'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('tabPremise')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cast')}
            className={`px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'cast'
                ? 'bg-brass text-[#120f0d] font-bold shadow'
                : 'bg-[#1a1511] text-[#b0a390] hover:bg-brass/20 hover:text-brass'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {t('tabCast')} ({cast.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clues')}
            className={`px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'clues'
                ? 'bg-brass text-[#120f0d] font-bold shadow'
                : 'bg-[#1a1511] text-[#b0a390] hover:bg-brass/20 hover:text-brass'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            {t('tabClues')} ({clueWeb.clues.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'locations'
                ? 'bg-brass text-[#120f0d] font-bold shadow'
                : 'bg-[#1a1511] text-[#b0a390] hover:bg-brass/20 hover:text-brass'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {t('tabLocations')} ({locations.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scenes')}
            className={`px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === 'scenes'
                ? 'bg-brass text-[#120f0d] font-bold shadow'
                : 'bg-[#1a1511] text-[#b0a390] hover:bg-brass/20 hover:text-brass'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            {t('tabScenes')} ({scenes.length})
          </button>
        </div>

        <Badge variant="outline" className="border-brass/40 text-brass text-[11px] font-special-elite shrink-0">
          CoC 7e RAW &bull; Keeper Truth
        </Badge>
      </div>

      {/* TAB 1: PREMISE */}
      {activeTab === 'premise' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 border border-brass/30 bg-[#120f0c] rounded space-y-2">
            <div className="font-display font-bold text-sm text-gold">{premise.title}</div>
            <p className="text-[#dcd2c3] leading-relaxed italic">&ldquo;{premise.logline}&rdquo;</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="border-brass/30 text-brass text-[10px]">
                {premise.eraLabel} ({premise.exactYear})
              </Badge>
              <Badge variant="outline" className="border-brass/30 text-emerald-400 text-[10px]">
                {premise.location}, {premise.country}
              </Badge>
              <Badge variant="outline" className="border-destructive/60 text-destructive text-[10px]">
                Bóstwo: {premise.mythosEntity}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border border-brass/20 bg-[#181410] rounded space-y-1">
              <span className="font-display uppercase tracking-wider text-[11px] text-brass flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" />
                {t('anomalyTitle')}
              </span>
              <p className="text-[#b8ab99]">{premise.anomalyType}</p>
            </div>

            <div className="p-3 border border-brass/20 bg-[#181410] rounded space-y-1">
              <span className="font-display uppercase tracking-wider text-[11px] text-brass flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                {t('centralMysteryTitle')}
              </span>
              <p className="text-[#b8ab99]">{premise.centralMystery}</p>
            </div>
          </div>

          <div className="p-3 border border-destructive/40 bg-destructive/10 rounded space-y-1">
            <span className="font-display uppercase tracking-wider text-[11px] text-destructive flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              {t('keeperTruthOverviewTitle')}
            </span>
            <p className="text-[#edd6d6] leading-relaxed">{premise.keeperTruthOverview}</p>
          </div>
        </div>
      )}

      {/* TAB 2: CAST */}
      {activeTab === 'cast' && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
          {cast.map((npc) => (
            <div key={npc.id} className="p-3 border border-brass/30 bg-[#13100d] rounded space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display font-bold text-gold text-sm">{npc.name}</span>
                  <span className="text-[#8e8272] ml-2 font-special-elite">({npc.occupation})</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    npc.disposition === 'hostile' || npc.disposition === 'fanatical'
                      ? 'border-destructive text-destructive'
                      : npc.disposition === 'suspicious'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-emerald-500 text-emerald-400'
                  }`}
                >
                  {npc.disposition}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 border border-brass/10 bg-[#181410] rounded">
                  <span className="font-bold text-brass block mb-0.5">{t('maskLabel')}:</span>
                  <span className="text-[#c8bdaf]">{npc.mask}</span>
                </div>
                <div className="p-2 border border-destructive/30 bg-destructive/5 rounded">
                  <span className="font-bold text-destructive block mb-0.5">{t('secretLabel')}:</span>
                  <span className="text-[#e2bebe]">{npc.secret}</span>
                </div>
              </div>

              <div className="p-2 border border-brass/15 bg-[#171310] rounded space-y-1 text-[11px]">
                <span className="font-display uppercase tracking-wider text-[10px] text-brass/90 block">
                  {t('egriHeader')}
                </span>
                <div className="text-[#aaa092]">
                  <strong className="text-brass/80">{t('egriPhysio')}:</strong> {npc.physiologicalDetail}
                </div>
                <div className="text-[#aaa092]">
                  <strong className="text-brass/80">{t('egriSocio')}:</strong> {npc.sociologicalStatus}
                </div>
                <div className="text-[#aaa092]">
                  <strong className="text-brass/80">{t('egriPsycho')}:</strong> {npc.psychologicalAgenda}
                </div>
              </div>

              <div className="font-mono text-[10px] text-[#7a6f60] bg-[#0d0a08] p-1.5 rounded">
                {npc.statsSummary}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CLUES */}
      {activeTab === 'clues' && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
          <div className="p-3 border border-amber-500/40 bg-amber-950/20 rounded space-y-1.5">
            <span className="font-display uppercase tracking-wider text-[11px] text-amber-400 flex items-center gap-1.5 font-bold">
              <Key className="h-3.5 w-3.5" />
              {t('truthAnchorTitle')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#e0cfb8]">
              <div>
                <strong>{t('culpritLabel')}:</strong> {clueWeb.truthAnchor.culprit}
              </div>
              <div>
                <strong>{t('motiveLabel')}:</strong> {clueWeb.truthAnchor.motive}
              </div>
              <div className="sm:col-span-2">
                <strong>{t('weaponLabel')}:</strong> {clueWeb.truthAnchor.murderWeapon}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-display uppercase tracking-wider text-[11px] text-brass block">
              {t('cluesListHeader')} (Reguła 3 Poszlak: Alexandrian Node Network)
            </span>
            {clueWeb.clues.map((clue) => (
              <div key={clue.id} className="p-2.5 border border-brass/20 bg-[#14100d] rounded space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-gold">{clue.title}</span>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="border-brass/30 text-[10px] uppercase">
                      {clue.category}
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] uppercase">
                      M.I.C.E: {clue.miceType}
                    </Badge>
                  </div>
                </div>
                <p className="text-[#b8ab99]">{clue.description}</p>
                {clue.insightHint && (
                  <p className="text-[10px] text-primary italic">&bull; INT Hint: {clue.insightHint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-brass/20">
            <span className="font-display uppercase tracking-wider text-[11px] text-brass block">
              {t('connectionsHeader')}
            </span>
            <div className="space-y-1">
              {clueWeb.connections.map((conn, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1.5 bg-[#100d0a] rounded font-mono text-[11px] text-[#8e8272]">
                  <span className="text-brass font-bold">{conn.fromId}</span>
                  <span>&rarr;</span>
                  <span className="text-[#c8bdaf] font-serif flex-1">{conn.description}</span>
                  <span>&rarr;</span>
                  <span className="text-brass font-bold">{conn.toId}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
          {locations.map((loc) => (
            <div key={loc.id} className="p-3 border border-brass/30 bg-[#13100d] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-gold text-sm">{loc.name}</span>
                <span className="text-[#7e7364] font-special-elite text-[11px]">{loc.addressOrRegion}</span>
              </div>
              <p className="text-[#b8ab99]">{loc.description}</p>

              <div className="p-2 border border-brass/15 bg-[#171310] rounded text-[11px] text-[#aaa092] space-y-1">
                <div>
                  <strong className="text-brass/90">{t('sensoryAtmosphereLabel')}:</strong> {loc.sensoryAtmosphere}
                </div>
                {loc.sensoryIllusions && (
                  <div>
                    <strong className="text-primary">{t('sensoryIllusionsLabel')}:</strong> {loc.sensoryIllusions}
                  </div>
                )}
              </div>

              {loc.lockedRoomMystery && (
                <div className="p-2.5 border border-amber-600/40 bg-amber-950/20 rounded space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 font-display text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <Lock className="h-3.5 w-3.5" />
                    {t('carrMysteryHeader')} ({loc.lockedRoomMystery.type})
                  </div>
                  <p className="text-[#ded1be]">
                    <strong>{t('carrAnomalyLabel')}:</strong> {loc.lockedRoomMystery.anomalyDescription}
                  </p>
                  <p className="text-[#b09e86] italic">
                    <strong>{t('carrHintLabel')}:</strong> {loc.lockedRoomMystery.investigationHint}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: SCENES */}
      {activeTab === 'scenes' && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
          {scenes.map((scene) => (
            <div key={scene.id} className="p-3 border border-brass/30 bg-[#13100d] rounded space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display font-bold text-gold text-sm">{scene.title}</span>
                  <span className="text-[#8e8272] ml-2 font-special-elite text-[11px]">&bull; {scene.actLabel}</span>
                </div>
                {scene.isClimax && (
                  <Badge variant="destructive" className="text-[10px] uppercase font-display">
                    {t('climaxBadge')}
                  </Badge>
                )}
              </div>
              <p className="text-[#b8ab99]">{scene.description}</p>

              <div className="space-y-1.5 pt-1">
                <span className="font-display uppercase tracking-wider text-[10px] text-brass/80 block">
                  {t('beatsHeader')} ({scene.beats.length})
                </span>
                {scene.beats.map((beat) => (
                  <div key={beat.id} className="p-2 border border-brass/15 bg-[#171310] rounded text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#e0d5c5]">{beat.title}</span>
                      {beat.sanLossRisk && (
                        <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px]">
                          SAN: {beat.sanLossRisk}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[#9e9384]">{beat.description}</p>
                    {beat.skillChecks && beat.skillChecks.length > 0 && (
                      <div className="text-[10px] text-brass font-mono">
                        Testy: {beat.skillChecks.join(', ')}
                      </div>
                    )}
                    {beat.outcome && (
                      <div className="text-[10px] text-emerald-400/90 italic">
                        &rarr; {beat.outcome}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
