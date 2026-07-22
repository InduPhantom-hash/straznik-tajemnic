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
  evidence: { label: 'DOWÓD RZECZOWY', color: 'border-[#bfa15f] bg-[#221810]' },
  clue: { label: 'POSZLAKA', color: 'border-[#4a7a96] bg-[#101b24]' },
  suspect: { label: 'POSTAĆ / PODEJRZANY', color: 'border-[#a84d4d] bg-[#241010]' },
  location: { label: 'LOKACJA', color: 'border-[#5c8a47] bg-[#12210e]' },
  artifact: { label: 'ARTEFAKT MITÓW', color: 'border-[#8e4a96] bg-[#1e1024]' },
};

const statusIcons: Record<EvidenceNodeStatus, React.ReactNode> = {
  confirmed: <span title="Potwierdzone"><CheckCircle className="h-4 w-4 text-[#73a15c]" /></span>,
  hypothesis: <span title="Hipoteza"><HelpCircle className="h-4 w-4 text-[#bfa15f]" /></span>,
  refuted: <span title="Obalone"><XCircle className="h-4 w-4 text-[#a84d4d]" /></span>,
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
    <div className="flex flex-col h-full bg-[#140c07] text-[#e2d4c9] overflow-hidden select-none">
      {/* Pasek narzędzi Tablicy */}
      <div className="bg-[#1c120c] border-b border-[#3a2518] px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-[#bfa15f]" />
          <span className="font-serif font-bold text-lg text-[#f4ebd0]">TABLICA BADACZA</span>
          <span className="text-xs text-[#8a7667] ml-2">({filteredNodes.length} dowodów)</span>
          <span className="text-[11px] text-[#bfa15f]/70 italic ml-2 hidden md:inline">
            Przeciągaj karty chwytając za nagłówek
          </span>
        </div>

        {/* Filtry */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#bfa15f] font-serif font-semibold">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EvidenceNodeStatus | 'all')}
            className="bg-[#0f0905] border border-[#3a2518] rounded px-2 py-1 text-[#e2d4c9] outline-none"
          >
            <option value="all">Wszystkie</option>
            <option value="confirmed">Potwierdzone</option>
            <option value="hypothesis">Hipotezy</option>
            <option value="refuted">Obalone</option>
          </select>

          <span className="text-[#bfa15f] font-serif font-semibold ml-2">Typ:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EvidenceNodeType | 'all')}
            className="bg-[#0f0905] border border-[#3a2518] rounded px-2 py-1 text-[#e2d4c9] outline-none"
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
        <div className="flex items-center gap-2">
          {connectingFromId && (
            <button
              onClick={() => setConnectingFromId(null)}
              className="text-xs bg-[#942c2c] text-white px-2 py-1 rounded animate-pulse cursor-pointer"
            >
              Anuluj łączenie sznurkiem
            </button>
          )}
          <Button
            onClick={handleAddNode}
            size="sm"
            className="bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
          >
            <Plus className="h-4 w-4 mr-1" /> Przypnij wpis
          </Button>
        </div>
      </div>

      {/* Płótno Korkowe (Board Canvas z Swobodnym Pozycjonowaniem) */}
      <div
        ref={boardCanvasRef}
        className="flex-1 relative overflow-auto bg-[#180f0a] bg-[radial-gradient(#2a1b12_1px,transparent_1px)] [background-size:16px_16px] p-8 min-h-[650px] min-w-[1200px]"
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
                      fill="#0f0905"
                      stroke="#3a2518"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="1"
                      fill="#f4ebd0"
                      fontSize="10"
                      fontFamily="serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
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
                }}
                onPointerDown={(e) => handlePointerDownNode(e, node)}
                onPointerMove={handlePointerMoveNode}
                onPointerUp={handlePointerUpNode}
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  'rounded-lg p-3 shadow-2xl border-2 transition-shadow cursor-grab active:cursor-grabbing font-serif flex flex-col justify-between select-none bg-[#1a110a]',
                  typeInfo.color,
                  isSelected && 'ring-2 ring-[#bfa15f] shadow-amber-900/30 scale-[1.01]',
                  isConnecting && 'border-red-500 animate-pulse'
                )}
              >
                {/* Czerwona Szpilka Detektywistyczna */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-amber-200 shadow-md flex items-center justify-center pointer-events-none">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>

                {/* Nagłówek Karty */}
                <div>
                  <div className="flex justify-between items-center border-b border-[#3a2518] pb-1.5 mb-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#bfa15f]">
                      {typeInfo.label}
                    </span>
                    <div className="flex items-center gap-1">
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
                        className="text-[9px] text-[#8a7667] hover:text-[#f4ebd0] underline ml-1"
                      >
                        zmień
                      </button>
                    </div>
                  </div>

                  {/* Ilustracja Klocka / Dowodu */}
                  {node.imageUrl && (
                    <div className="mb-2 overflow-hidden rounded border border-[#3a2518] h-24 bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={node.imageUrl}
                        alt={node.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Tytuł i Treść */}
                  <h4 className="font-bold text-sm text-[#f4ebd0] mb-1 leading-snug">{node.title}</h4>
                  <p className="text-[11px] text-[#e2d4c9]/90 italic leading-relaxed line-clamp-3">
                    {node.description}
                  </p>
                </div>

                {/* Stopka Karty i Narzędzia */}
                <div className="mt-3 pt-1.5 border-t border-[#3a2518] flex items-center justify-between text-xs">
                  <span className="text-[9px] text-[#8a7667]">
                    {node.foundInLocation ? `📍 ${node.foundInLocation}` : ''}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = prompt('URL ilustracji:', node.imageUrl || '');
                        if (url !== null) {
                          const updated = nodes.map((n) => (n.id === node.id ? { ...n, imageUrl: url } : n));
                          onUpdateNodes(updated);
                        }
                      }}
                      className="p-1 text-[#bfa15f] hover:bg-[#3a2518] rounded transition-colors"
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
                        'p-1 rounded hover:bg-[#3a2518] transition-colors',
                        isConnecting ? 'text-red-400 font-bold' : 'text-[#bfa15f]'
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
                      className="p-1 text-[#a84d4d] hover:bg-[#3a2518] rounded transition-colors"
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
            <div className="text-center py-20 text-[#8a7667] italic font-serif">
              Tablica Badacza jest pusta. Użyj przycisku &quot;Przypnij wpis&quot; aby rozpocząć układanie dowodów.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
