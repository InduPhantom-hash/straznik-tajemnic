'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  EvidenceNode,
  EvidenceRelation,
  EvidenceNodeType,
  EvidenceNodeStatus,
} from '@/types/investigator-board';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Plus, Pin, Link2, Trash2, CheckCircle, HelpCircle, XCircle, Image as ImageIcon } from 'lucide-react';

interface InvestigatorBoardProps {
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
  onUpdateNodes: (nodes: EvidenceNode[]) => void;
  onUpdateRelations: (relations: EvidenceRelation[]) => void;
}

const nodeTypeLabels: Record<EvidenceNodeType, { label: string; color: string }> = {
  evidence: { label: 'DOWÓD RZECZOWY', color: 'border-[#c9a227]/60 bg-[#100d09]' },
  clue: { label: 'POSZLAKA', color: 'border-[#0d9488]/50 bg-[#0d9488]/5' },
  suspect: { label: 'POSTAĆ / PODEJRZANY', color: 'border-[#d9685f]/50 bg-[#d9685f]/5' },
  location: { label: 'LOKACJA', color: 'border-[#73a15c]/50 bg-[#73a15c]/5' },
  artifact: { label: 'ARTEFAKT MITÓW', color: 'border-[#8e4a96]/50 bg-[#8e4a96]/5' },
};

const statusIcons: Record<EvidenceNodeStatus, React.ReactNode> = {
  confirmed: <span title="Potwierdzone"><CheckCircle className="h-4 w-4 text-[#0d9488]" /></span>,
  hypothesis: <span title="Hipoteza"><HelpCircle className="h-4 w-4 text-[#c9a227]" /></span>,
  refuted: <span title="Obalone"><XCircle className="h-4 w-4 text-[#d9685f]" /></span>,
};

const CARD_WIDTH = 260;
const CARD_HEIGHT = 180;

export function InvestigatorBoard({
  nodes,
  relations,
  onUpdateNodes,
  onUpdateRelations,
}: InvestigatorBoardProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<EvidenceNodeStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<EvidenceNodeType | 'all'>('all');

  // Drag & Drop State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardCanvasRef = useRef<HTMLDivElement>(null);

  // Filtrowanie węzłów
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterType !== 'all' && n.type !== filterType) return false;
      return true;
    });
  }, [nodes, filterStatus, filterType]);

  // Mapa węzłów do kalkulacji połączeń SVG
  const nodeMap = useMemo(() => {
    const map = new Map<string, EvidenceNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const handleStatusChange = (nodeId: string, newStatus: EvidenceNodeStatus) => {
    const updated = nodes.map((n) => (n.id === nodeId ? { ...n, status: newStatus } : n));
    onUpdateNodes(updated);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten element z Tablicy Badacza?')) return;
    onUpdateNodes(nodes.filter((n) => n.id !== nodeId));
    onUpdateRelations(relations.filter((r) => r.fromNodeId !== nodeId && r.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDeleteRelation = (relId: string) => {
    onUpdateRelations(relations.filter((r) => r.id !== relId));
  };

  const handleStartConnection = (nodeId: string) => {
    if (connectingFromId === null) {
      setConnectingFromId(nodeId);
    } else if (connectingFromId !== nodeId) {
      const label = prompt('Etykieta powiązania (np. "Widziany w", "Właściciel"):', 'Powiązany z') || 'Powiązany z';
      const newRelation: EvidenceRelation = {
        id: `rel_${Date.now()}`,
        fromNodeId: connectingFromId,
        toNodeId: nodeId,
        label,
        color: '#a83232',
      };
      onUpdateRelations([...relations, newRelation]);
      setConnectingFromId(null);
    } else {
      setConnectingFromId(null);
    }
  };

  const handleAddNode = () => {
    const title = prompt('Tytuł dowodu / poszlaki:');
    if (!title) return;
    const description = prompt('Opis:') || '';
    const imageUrl = prompt('URL obrazka / ilustracji (opcjonalnie):') || undefined;

    const canvasRect = boardCanvasRef.current?.getBoundingClientRect();
    const scrollLeft = boardCanvasRef.current?.scrollLeft || 0;
    const scrollTop = boardCanvasRef.current?.scrollTop || 0;

    const posX = scrollLeft + 40 + (nodes.length % 4) * 280;
    const posY = scrollTop + 40 + Math.floor(nodes.length / 4) * 200;

    const newNode: EvidenceNode = {
      id: `node_${Date.now()}`,
      title,
      description,
      type: 'clue',
      status: 'hypothesis',
      position: { x: posX, y: posY },
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    onUpdateNodes([...nodes, newNode]);
  };

  // Drag Handlers - używamy stanu lokalnego podczas przeciągania
  const [localNodes, setLocalNodes] = useState<EvidenceNode[]>(nodes);

  // Synchronizacja lokalnych węzłów po zmianie z zewnątrz
  React.useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  const handlePointerDownNode = (e: React.PointerEvent, node: EvidenceNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);

    // Jeśli aktywne jest łączenie sznurkiem i kliknięto inną kartę -> utwórz połączenie
    if (connectingFromId && connectingFromId !== node.id) {
      handleStartConnection(node.id);
      return;
    }

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDraggingNodeId(node.id);
  };

  const handlePointerMoveNode = (e: React.PointerEvent) => {
    if (!draggingNodeId || !boardCanvasRef.current) return;

    const canvasRect = boardCanvasRef.current.getBoundingClientRect();
    const newX = Math.max(10, e.clientX - canvasRect.left + boardCanvasRef.current.scrollLeft - dragOffsetRef.current.x);
    const newY = Math.max(10, e.clientY - canvasRect.top + boardCanvasRef.current.scrollTop - dragOffsetRef.current.y);

    // Zmieniaj wyłącznie stan lokalny (zero zbędnych re-renderów całej aplikacji!)
    setLocalNodes((prev) => prev.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n)));
  };

  const handlePointerUpNode = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      const target = e.currentTarget as HTMLElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe catch
      }
      setDraggingNodeId(null);
      // Zapisujemy pozycję w stanie rodzica / karcie postaci dopiero na koniec przeciągania
      onUpdateNodes(localNodes);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0a07] text-[#ebe8dc] overflow-hidden select-none border border-[#c9a227]/25">
      {/* Pasek narzędzi Tablicy wg Design Systemu */}
      <div className="bg-[#16130f] border-b border-[#c9a227]/25 px-5 py-3 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <Pin className="h-5 w-5 text-[#c9a227]" />
          <span className="font-display font-bold text-xl uppercase tracking-[0.1em] text-[#ebe8dc]">TABLICA BADACZA</span>
          <span className="font-special-elite text-xs text-[#8a8472] tracking-[0.12em] uppercase ml-2">({filteredNodes.length} wpisów)</span>
          <span className="text-[10px] text-[#c9a227]/60 italic ml-4 font-special-elite tracking-widest hidden md:inline border border-[#c9a227]/25 px-2 py-1">
            Chwyć by przesunąć
          </span>
        </div>

        {/* Filtry */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#8a8472] font-special-elite uppercase tracking-wider text-[10px]">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EvidenceNodeStatus | 'all')}
            className="bg-[#100d09] border border-[#c9a227]/30 rounded-none px-2 py-1.5 text-[#b3a892] outline-none font-special-elite text-xs hover:border-[#c9a227] transition-colors"
          >
            <option value="all">Wszystkie</option>
            <option value="confirmed">Potwierdzone</option>
            <option value="hypothesis">Hipotezy</option>
            <option value="refuted">Obalone</option>
          </select>

          <span className="text-[#8a8472] font-special-elite uppercase tracking-wider text-[10px] ml-1">Typ:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EvidenceNodeType | 'all')}
            className="bg-[#100d09] border border-[#c9a227]/30 rounded-none px-2 py-1.5 text-[#b3a892] outline-none font-special-elite text-xs hover:border-[#c9a227] transition-colors"
          >
            <option value="all">Wszystkie typy</option>
            <option value="evidence">Dowód rzeczowy</option>
            <option value="clue">Poszlaka</option>
            <option value="suspect">Postać / NPC</option>
            <option value="location">Lokacja</option>
            <option value="artifact">Artefakt</option>
          </select>
        </div>

        {/* Akcje */}
        <div className="flex items-center gap-3">
          {connectingFromId && (
            <button
              onClick={() => setConnectingFromId(null)}
              className="font-special-elite uppercase tracking-widest text-[10px] text-[#d9685f] border border-[#d9685f]/40 bg-[#d9685f]/5 px-3 py-1.5 animate-pulse cursor-pointer hover:bg-[#d9685f]/20 transition-colors"
            >
              Anuluj łączenie
            </button>
          )}
          <Button
            onClick={handleAddNode}
            size="sm"
            className="font-display uppercase tracking-[0.12em] font-semibold text-xs px-4 py-2 text-[#c9a227] bg-transparent border border-[#c9a227]/50 rounded-none hover:bg-[#c9a227]/10 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Przypnij wpis
          </Button>
        </div>
      </div>

      {/* Płótno (Mroczny Design) */}
      <div
        ref={boardCanvasRef}
        className="flex-1 relative overflow-auto bg-[#0a0806] bg-[radial-gradient(rgba(201,162,39,0.08)_1px,transparent_1px)] [background-size:24px_24px] p-8 min-h-[650px] min-w-[1200px]"
      >
        {/* Warstwa SVG dla czerwonych sznurków śledczych */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {relations.map((rel) => {
            const from = nodeMap.get(rel.fromNodeId);
            const to = nodeMap.get(rel.toNodeId);
            if (!from || !to) return null;

            // Obliczanie środków kart dla sznurka SVG
            const x1 = (from.position?.x ?? 50) + CARD_WIDTH / 2;
            const y1 = (from.position?.y ?? 50) + CARD_HEIGHT / 2;
            const x2 = (to.position?.x ?? 300) + CARD_WIDTH / 2;
            const y2 = (to.position?.y ?? 50) + CARD_HEIGHT / 2;

            const strokeColor = rel.color || '#a83232';

            return (
              <g key={rel.id} className="group pointer-events-auto">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeDasharray={rel.status === 'doubtful' ? '4,4' : undefined}
                  className="drop-shadow-md cursor-pointer hover:stroke-yellow-400 transition-colors"
                  onClick={() => {
                    if (confirm(`Usuń sznurek "${rel.label}"?`)) {
                      handleDeleteRelation(rel.id);
                    }
                  }}
                />
                {rel.label && (
                  <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 8})`}>
                    <rect
                      x="-45"
                      y="-10"
                      width="90"
                      height="16"
                      rx="3"
                      fill="#16130f"
                      stroke="#c9a227"
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="1"
                      fill="#b3a892"
                      fontSize="9"
                      fontFamily="Special Elite, monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      letterSpacing="0.05em"
                    >
                      {rel.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Karty Węzłów na Korku z Pozycjonowaniem Absolutnym */}
        <div className="relative z-10 w-full h-full min-h-[600px]">
          {localNodes.map((node) => {
            const typeInfo = nodeTypeLabels[node.type] || nodeTypeLabels.clue;
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingFromId === node.id;
            const posX = node.position?.x ?? 50;
            const posY = node.position?.y ?? 50;

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: `${posX}px`,
                  top: `${posY}px`,
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_HEIGHT}px`, // Sztywne ramy chroniące powiązania (SVG line logic)
                }}
                onPointerDown={(e) => handlePointerDownNode(e, node)}
                onPointerMove={handlePointerMoveNode}
                onPointerUp={handlePointerUpNode}
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  'p-4 shadow-2xl border transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between select-none relative overflow-hidden',
                  typeInfo.color,
                  isSelected && 'ring-1 ring-[#c9a227] shadow-[0_0_20px_rgba(201,162,39,0.3)] scale-[1.01] z-30',
                  isConnecting && 'border-[#d9685f] animate-pulse',
                  !isSelected && 'z-10 hover:z-20'
                )}
              >
                {/* Złote narożniki (tylko małe na rogach dla estetyki) */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#c9a227]/70 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#c9a227]/70 pointer-events-none" />

                {/* Czerwona Szpilka / Spinacz - zmodyfikowane wg mroku */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-gradient-to-b from-[#d9685f] to-[#a02c2c] shadow-sm shadow-black/80 flex items-center justify-center pointer-events-none rounded-b-sm border border-black/50">
                   <div className="w-1 h-1 bg-white/40 rounded-full" />
                </div>

                {/* Nagłówek Karty */}
                <div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2 pt-1">
                    <span className="font-special-elite text-[9px] uppercase tracking-widest text-[#8a8472]">
                      {typeInfo.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {statusIcons[node.status]}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus: EvidenceNodeStatus =
                            node.status === 'confirmed'
                              ? 'hypothesis'
                              : node.status === 'hypothesis'
                              ? 'refuted'
                              : 'confirmed';
                          handleStatusChange(node.id, nextStatus);
                        }}
                        className="font-special-elite text-[9px] text-[#6f6a5a] hover:text-[#b3a892] underline ml-1 tracking-widest uppercase"
                      >
                        Stan
                      </button>
                    </div>
                  </div>

                  {/* Ilustracja Dowodu */}
                  {node.imageUrl && (
                    <div className="mb-2 overflow-hidden border border-[#c9a227]/20 h-16 bg-black/60 relative">
                      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={node.imageUrl}
                        alt={node.title}
                        className="w-full h-full object-cover grayscale opacity-90"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Tytuł i Treść */}
                  <h4 className="font-display font-bold text-base text-[#ebe8dc] mb-1.5 leading-snug tracking-wide line-clamp-1 truncate" title={node.title}>{node.title}</h4>
                  <p className="font-serif text-[11px] text-[#b3a892] italic leading-relaxed line-clamp-2">
                    {node.description}
                  </p>
                </div>

                {/* Stopka Karty i Narzędzia */}
                <div className="mt-auto pt-2 border-t border-[#c9a227]/10 flex items-center justify-between">
                  <span className="font-special-elite text-[9px] text-[#6f6a5a] tracking-wider truncate max-w-[120px]">
                    {node.foundInLocation ? `LOK: ${node.foundInLocation}` : ''}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = prompt('URL ilustracji:', node.imageUrl || '');
                        if (url !== null) {
                          const updated = nodes.map((n) => (n.id === node.id ? { ...n, imageUrl: url } : n));
                          onUpdateNodes(updated);
                        }
                      }}
                      className="p-1.5 text-[#8a8472] hover:bg-[#16130f] hover:text-[#c9a227] border border-transparent hover:border-[#c9a227]/30 transition-all"
                      title="Dodaj/Zmień obrazek"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartConnection(node.id);
                      }}
                      className={cn(
                        'p-1.5 hover:bg-[#16130f] border border-transparent hover:border-[#c9a227]/30 transition-all',
                        isConnecting ? 'text-[#d9685f] font-bold border-[#d9685f]/30' : 'text-[#8a8472] hover:text-[#c9a227]'
                      )}
                      title="Połącz sznurkiem"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1.5 text-[#6f6a5a] hover:text-[#d9685f] hover:bg-[#d9685f]/10 border border-transparent hover:border-[#d9685f]/30 transition-all"
                      title="Usuń z tablicy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="text-center py-24 text-[#6f6a5a] tracking-[0.1em] uppercase font-special-elite text-sm">
              Tablica Badacza jest pusta. Użyj przycisku "Przypnij wpis" aby rozpocząć układanie dowodów.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
