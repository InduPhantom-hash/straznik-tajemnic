'use client';

import React, { useState, useMemo } from 'react';
import { ExtendedJournalEntry } from '../session-journal';
import { FileText, User, MapPin, Package, AlertCircle, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceGraphViewProps {
  entries: ExtendedJournalEntry[];
  onSelectEntry?: (entry: ExtendedJournalEntry) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  entry: ExtendedJournalEntry;
}

export function EvidenceGraphView({ entries, onSelectEntry }: EvidenceGraphViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Przypisanie kolorów i ikon dla typów poszlak
  const getCategoryTheme = (type: string) => {
    switch (type) {
      case 'encyclopedia_character':
      case 'npc':
        return { color: '#e11d48', bg: 'bg-rose-950/80', border: 'border-rose-700', icon: User, label: 'Postać' };
      case 'encyclopedia_location':
      case 'location':
        return { color: '#0284c7', bg: 'bg-sky-950/80', border: 'border-sky-700', icon: MapPin, label: 'Lokacja' };
      case 'encyclopedia_item':
        return { color: '#d97706', bg: 'bg-amber-950/80', border: 'border-amber-700', icon: Package, label: 'Artefakt' };
      case 'quest':
        return { color: '#16a34a', bg: 'bg-emerald-950/80', border: 'border-emerald-700', icon: CheckCircle, label: 'Misja' };
      default:
        return { color: '#9333ea', bg: 'bg-purple-950/80', border: 'border-purple-700', icon: FileText, label: 'Poszlak' };
    }
  };

  // Wyliczenie pozycji węzłów po okręgu
  const nodes = useMemo<NodePosition[]>(() => {
    if (entries.length === 0) return [];
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    return entries.map((entry, index) => {
      const angle = (index / entries.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: entry.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        entry,
      };
    });
  }, [entries]);

  // Słownik szybkich pozycji po ID
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Lista połączeń (nitek)
  const connections = useMemo(() => {
    const lines: Array<{ from: NodePosition; to: NodePosition; isHighlighted: boolean }> = [];
    const addedPairs = new Set<string>();

    nodes.forEach((node) => {
      if (node.entry.linkedEntryIds && node.entry.linkedEntryIds.length > 0) {
        node.entry.linkedEntryIds.forEach((targetId: string) => {
          const targetNode = nodeMap.get(targetId);
          if (targetNode) {
            const pairKey = [node.id, targetId].sort().join('___');
            if (!addedPairs.has(pairKey)) {
              addedPairs.add(pairKey);
              const isHighlighted =
                selectedNodeId === node.id ||
                selectedNodeId === targetId ||
                hoveredNodeId === node.id ||
                hoveredNodeId === targetId;

              lines.push({ from: node, to: targetNode, isHighlighted });
            }
          }
        });
      }
    });
    return lines;
  }, [nodes, nodeMap, selectedNodeId, hoveredNodeId]);

  const activeEntry = selectedNodeId ? nodeMap.get(selectedNodeId)?.entry : null;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-amber-200/60 border border-amber-900/40 rounded-lg bg-black/40">
        <AlertCircle className="w-12 h-12 mb-3 text-amber-500/40" />
        <h4 className="text-lg font-serif text-amber-100">Tablica Dowodów jest pusta</h4>
        <p className="text-xs text-amber-200/50 max-w-md mt-1">
          Dodaj nowe wpisy w Kronice lub Encyklopedii i połącz je ze sobą, aby zbudować detektywistyczną mapę faktów i hipotez.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[550px] bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 relative overflow-hidden">
      {/* Detektywistyczna Tablica ze sznurkami */}
      <div className="flex-1 relative bg-black/60 rounded-md border border-amber-900/30 overflow-hidden flex items-center justify-center">
        {/* Tło przypominające starą tablicę korkową */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 800 500">
          {/* Czerwone nitki połączeń */}
          {connections.map((conn, idx) => (
            <line
              key={`line_${idx}`}
              x1={conn.from.x}
              y1={conn.from.y}
              x2={conn.to.x}
              y2={conn.to.y}
              stroke={conn.isHighlighted ? '#ef4444' : '#7f1d1d'}
              strokeWidth={conn.isHighlighted ? 2.5 : 1}
              strokeDasharray={conn.isHighlighted ? 'none' : '4 2'}
              className="transition-all duration-300"
            />
          ))}
        </svg>

        {/* Węzły poszlak i dowodów */}
        <div className="absolute inset-0">
          {nodes.map((node) => {
            const theme = getCategoryTheme(node.entry.type);
            const Icon = theme.icon;
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            return (
              <div
                key={node.id}
                style={{ left: `${(node.x / 800) * 100}%`, top: `${(node.y / 500) * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (onSelectEntry) onSelectEntry(node.entry);
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Pineska detektywistyczna */}
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-300 shadow-md mx-auto -mb-1 z-20 relative" />

                {/* Karta Węzła */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-serif transition-all duration-200 shadow-lg backdrop-blur-md',
                    theme.bg,
                    theme.border,
                    isSelected ? 'ring-2 ring-amber-400 scale-105 z-30' : 'opacity-85 hover:opacity-100 z-10',
                    isHovered && 'scale-105'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                  <span className="truncate max-w-[110px] text-amber-100 font-medium">
                    {node.entry.title}
                  </span>
                  {node.entry.hypothesisStatus && (
                    <span className="ml-0.5">
                      {node.entry.hypothesisStatus === 'confirmed' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      {node.entry.hypothesisStatus === 'disproven' && <XCircle className="w-3 h-3 text-rose-400" />}
                      {node.entry.hypothesisStatus === 'unverified' && <HelpCircle className="w-3 h-3 text-amber-400" />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel szczegółów wybranego węzła */}
      <div className="w-full md:w-72 bg-black/80 border border-amber-900/40 rounded-md p-3.5 flex flex-col justify-between overflow-y-auto">
        {activeEntry ? (
          <div>
            <div className="flex items-center justify-between border-b border-amber-900/30 pb-2 mb-3">
              <span className="text-[10px] uppercase tracking-wider text-amber-400/70 font-mono">
                {getCategoryTheme(activeEntry.type).label}
              </span>
              {activeEntry.hypothesisStatus && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-800/50 bg-amber-950/40 text-amber-200">
                  {activeEntry.hypothesisStatus === 'confirmed' && 'Potwierdzona'}
                  {activeEntry.hypothesisStatus === 'disproven' && 'Obalona'}
                  {activeEntry.hypothesisStatus === 'unverified' && 'Hipoteza'}
                </span>
              )}
            </div>

            <h3 className="font-serif text-sm font-bold text-amber-100 mb-2">{activeEntry.title}</h3>
            <p className="text-xs text-amber-200/80 leading-relaxed font-sans line-clamp-6 mb-4">
              {activeEntry.content}
            </p>

            {activeEntry.linkedEntryIds && activeEntry.linkedEntryIds.length > 0 && (
              <div className="mt-3 border-t border-amber-900/30 pt-2.5">
                <span className="text-[11px] font-medium text-amber-300 block mb-1.5">
                  Powiązane dowody ({activeEntry.linkedEntryIds.length}):
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activeEntry.linkedEntryIds.map((linkId: string) => {
                    const linkedNode = nodeMap.get(linkId);
                    if (!linkedNode) return null;
                    return (
                      <button
                        key={linkId}
                        onClick={() => setSelectedNodeId(linkId)}
                        className="w-full text-left text-xs px-2 py-1 rounded bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/30 text-amber-200/90 truncate flex items-center justify-between transition-colors"
                      >
                        <span className="truncate">{linkedNode.entry.title}</span>
                        <span className="text-[9px] text-amber-400/60 font-mono shrink-0 ml-1">Zobacz →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-amber-300/40 py-8">
            <HelpCircle className="w-8 h-8 mb-2 text-amber-500/30" />
            <p className="text-xs">Kliknij węzeł na tablicy dowodów, aby zobaczyć powiązania i podgląd treści.</p>
          </div>
        )}
      </div>
    </div>
  );
}
