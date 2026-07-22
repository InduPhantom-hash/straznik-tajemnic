'use client';

import React, { useState, useMemo } from 'react';
import {
  EvidenceNode,
  EvidenceRelation,
  EvidenceNodeType,
  EvidenceNodeStatus,
} from '@/types/investigator-board';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Plus, Pin, Link2, Trash2, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

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

  // Filtrowanie węzłów
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterType !== 'all' && n.type !== filterType) return false;
      return true;
    });
  }, [nodes, filterStatus, filterType]);

  // Węzły do kalkulacji sznurków SVG
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

  const handleStartConnection = (nodeId: string) => {
    if (connectingFromId === null) {
      setConnectingFromId(nodeId);
    } else if (connectingFromId !== nodeId) {
      // Stwórz połączenie
      const newRelation: EvidenceRelation = {
        id: `rel_${Date.now()}`,
        fromNodeId: connectingFromId,
        toNodeId: nodeId,
        label: 'Powiązany z',
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

    const newNode: EvidenceNode = {
      id: `node_${Date.now()}`,
      title,
      description,
      type: 'clue',
      status: 'hypothesis',
      position: { x: 100 + (nodes.length % 3) * 280, y: 100 + Math.floor(nodes.length / 3) * 200 },
      createdAt: new Date().toISOString(),
    };

    onUpdateNodes([...nodes, newNode]);
  };

  return (
    <div className="flex flex-col h-full bg-[#140c07] text-[#e2d4c9] overflow-hidden select-none">
      {/* Pasek narzędzi Tablicy */}
      <div className="bg-[#1c120c] border-b border-[#3a2518] px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-10 shadow-md">
        <div className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-[#bfa15f]" />
          <span className="font-serif font-bold text-lg text-[#f4ebd0]">TABLICA BADACZA</span>
          <span className="text-xs text-[#8a7667] ml-2">({filteredNodes.length} dowodów)</span>
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
            <span className="text-xs bg-[#942c2c] text-white px-2 py-1 rounded animate-pulse">
              Kliknij drugi element, by połączyć sznurkiem...
            </span>
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

      {/* Płótno Korkowe (Board Canvas) */}
      <div className="flex-1 relative overflow-auto bg-[#180f0a] bg-[radial-gradient(#2a1b12_1px,transparent_1px)] [background-size:16px_16px] p-8 min-h-[600px]">
        {/* Warstwa SVG dla czerwonych sznurków śledczych */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {relations.map((rel) => {
            const from = nodeMap.get(rel.fromNodeId);
            const to = nodeMap.get(rel.toNodeId);
            if (!from || !to) return null;

            const x1 = from.position.x + 120;
            const y1 = from.position.y + 20;
            const x2 = to.position.x + 120;
            const y2 = to.position.y + 20;

            return (
              <g key={rel.id}>
                {/* Linia czerwonego sznurka */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#a83232"
                  strokeWidth="2.5"
                  strokeDasharray={rel.status === 'doubtful' ? '4,4' : undefined}
                  className="drop-shadow-md"
                />
                {/* Etykieta sznurka */}
                {rel.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    fill="#f4ebd0"
                    fontSize="10"
                    fontFamily="serif"
                    textAnchor="middle"
                    className="bg-black/60 px-1 rounded"
                  >
                    {rel.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Karty Węzłów na Korku */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNodes.map((node) => {
            const typeInfo = nodeTypeLabels[node.type] || nodeTypeLabels.clue;
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingFromId === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  'relative rounded-lg p-4 shadow-xl border-2 transition-all cursor-pointer font-serif flex flex-col justify-between',
                  typeInfo.color,
                  isSelected && 'ring-2 ring-[#bfa15f] shadow-2xl scale-[1.02]',
                  isConnecting && 'border-red-500 animate-pulse'
                )}
              >
                {/* Kołek / Czerwona Szpilka */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-2 border-amber-200 shadow-md flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>

                {/* Nagłówek Karty */}
                <div>
                  <div className="flex justify-between items-center border-b border-[#3a2518] pb-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#bfa15f]">
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
                        className="text-[10px] text-[#8a7667] hover:text-[#f4ebd0] underline ml-1"
                      >
                        zmień
                      </button>
                    </div>
                  </div>

                  {/* Tytuł i Treść */}
                  <h4 className="font-bold text-base text-[#f4ebd0] mb-2">{node.title}</h4>
                  <p className="text-xs text-[#e2d4c9]/90 italic leading-relaxed line-clamp-4">
                    {node.description}
                  </p>
                </div>

                {/* Stopka Karty i Narzędzia */}
                <div className="mt-4 pt-2 border-t border-[#3a2518] flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#8a7667]">
                    {node.foundInLocation ? `📍 ${node.foundInLocation}` : ''}
                  </span>

                  <div className="flex items-center gap-2">
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
                      <Link2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1 text-[#a84d4d] hover:bg-[#3a2518] rounded transition-colors"
                      title="Usuń z tablicy"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#8a7667] italic font-serif">
              Tablica Badacza jest pusta. Użyj przycisku &quot;Przypnij wpis&quot; lub kontynuuj śledztwo w grze.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
