'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  EvidenceNode,
  EvidenceRelation,
  EvidenceNodeType,
  EvidenceNodeStatus,
  PinType,
  BoardViewport,
} from '@/types/investigator-board';
import { Button } from '../button';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pin,
  Link2,
  Trash2,
  CheckCircle,
  HelpCircle,
  XCircle,
  Image as ImageIcon,
  PanelRightOpen,
  PanelRightClose,
  ZoomIn,
  ZoomOut,
  Maximize2,
  BookOpen,
  Package,
  StickyNote,
  Search,
  Eye,
} from 'lucide-react';

// ------------------------------------------------------------------
// Typy i stale
// ------------------------------------------------------------------

interface CorkboardInvestigationBoardProps {
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
  onUpdateNodes: (nodes: EvidenceNode[]) => void;
  onUpdateRelations: (relations: EvidenceRelation[]) => void;
  viewport?: BoardViewport;
  onUpdateViewport?: (viewport: BoardViewport) => void;
  /** Wpisy z Dziennika (Kronika, Notatki) do przypinania na tablice */
  journalEntries?: Array<{ id: string; title: string; content: string; type: string; imageUrl?: string }>;
  /** Przedmioty z Ekwipunku do przypinania na tablice */
  equipmentItems?: Array<{ id: string; name: string; description: string; imageUrl?: string }>;
  /** Callback otwierajacy Inspection Lightbox dla danego wezla */
  onInspectNode?: (node: EvidenceNode) => void;
}

const NODE_TYPE_LABELS: Record<EvidenceNodeType, { label: string; color: string; borderColor: string }> = {
  evidence:    { label: 'DOWOD RZECZOWY',     color: 'bg-[#221810]', borderColor: 'border-[#bfa15f]' },
  clue:        { label: 'POSZLAKA',           color: 'bg-[#101b24]', borderColor: 'border-[#4a7a96]' },
  suspect:     { label: 'POSTAC / PODEJRZANY', color: 'bg-[#241010]', borderColor: 'border-[#a84d4d]' },
  location:    { label: 'LOKACJA',            color: 'bg-[#12210e]', borderColor: 'border-[#5c8a47]' },
  artifact:    { label: 'ARTEFAKT MITOW',     color: 'bg-[#1e1024]', borderColor: 'border-[#8e4a96]' },
  player_note: { label: 'NOTATKA GRACZA',     color: 'bg-[#1a1a1e]', borderColor: 'border-[#6b7280]' },
};

const STATUS_ICONS: Record<EvidenceNodeStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  confirmed:  { icon: CheckCircle, color: 'text-[#73a15c]', label: 'Potwierdzone' },
  hypothesis: { icon: HelpCircle,  color: 'text-[#bfa15f]', label: 'Hipoteza' },
  refuted:    { icon: XCircle,     color: 'text-[#a84d4d]', label: 'Obalone' },
};

const CARD_WIDTH = 240;
const CARD_MIN_HEIGHT = 160;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;

// ------------------------------------------------------------------
// Helpery SVG dla sznurkow Beziera
// ------------------------------------------------------------------

function computeBezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const sag = Math.min(80, Math.max(20, distance * 0.15));
  const controlX = midX;
  const controlY = midY + sag;
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
}

function randomRotation(): number {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

// ------------------------------------------------------------------
// Komponent glowny
// ------------------------------------------------------------------

export function CorkboardInvestigationBoard({
  nodes,
  relations,
  onUpdateNodes,
  onUpdateRelations,
  viewport: externalViewport,
  onUpdateViewport,
  journalEntries = [],
  equipmentItems = [],
  onInspectNode,
}: CorkboardInvestigationBoardProps) {
  // --- Stan lokalny --------------------------------------------------
  const [localNodes, setLocalNodes] = useState<EvidenceNode[]>(nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'journal' | 'equipment'>('journal');
  const [drawerSearch, setDrawerSearch] = useState('');

  // Viewport (zoom + pan)
  const [viewport, setViewport] = useState<BoardViewport>(
    externalViewport || { zoom: 1, panX: 0, panY: 0 }
  );

  // Connection label modal state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ fromId: string; toId: string } | null>(null);
  const [connectionLabel, setConnectionLabel] = useState('');
  const [connectionColor, setConnectionColor] = useState('#a83232');

  // Refs
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardCanvasRef = useRef<HTMLDivElement>(null);

  // Sync z zewnetrznym stanem
  useEffect(() => { setLocalNodes(nodes); }, [nodes]);

  // --- Mapa wezlow ---------------------------------------------------
  const nodeMap = useMemo(() => {
    const map = new Map<string, EvidenceNode>();
    localNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [localNodes]);

  // --- Juz przypiete ID (zeby ukryc w szufladzie) --------------------
  const pinnedSourceIds = useMemo(() => {
    const ids = new Set<string>();
    localNodes.forEach((n) => {
      if (n.sourceJournalEntryId) ids.add(n.sourceJournalEntryId);
      if (n.sourceEquipmentItemId) ids.add(n.sourceEquipmentItemId);
    });
    return ids;
  }, [localNodes]);

  // --- Viewport helpers ----------------------------------------------
  const updateViewport = useCallback((v: BoardViewport) => {
    setViewport(v);
    onUpdateViewport?.(v);
  }, [onUpdateViewport]);

  const handleZoomIn = useCallback(() => {
    updateViewport({ ...viewport, zoom: Math.min(MAX_ZOOM, viewport.zoom + 0.15) });
  }, [viewport, updateViewport]);

  const handleZoomOut = useCallback(() => {
    updateViewport({ ...viewport, zoom: Math.max(MIN_ZOOM, viewport.zoom - 0.15) });
  }, [viewport, updateViewport]);

  const handleResetView = useCallback(() => {
    updateViewport({ zoom: 1, panX: 0, panY: 0 });
  }, [updateViewport]);

  // --- Wheel zoom na canvasie ----------------------------------------
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom + delta));
      updateViewport({ ...viewport, zoom: newZoom });
    }
  }, [viewport, updateViewport]);

  // --- Drag & Drop kart (PointerEvents) ------------------------------
  const handlePointerDownNode = useCallback((e: React.PointerEvent, node: EvidenceNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);

    // Jesli aktywne jest laczenie sznurkiem
    if (connectingFromId && connectingFromId !== node.id) {
      setPendingConnection({ fromId: connectingFromId, toId: node.id });
      setConnectionLabel('');
      setConnectionColor('#a83232');
      setShowConnectionModal(true);
      setConnectingFromId(null);
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
  }, [connectingFromId]);

  const handlePointerMoveNode = useCallback((e: React.PointerEvent) => {
    if (!draggingNodeId || !boardCanvasRef.current) return;

    const canvasRect = boardCanvasRef.current.getBoundingClientRect();
    const zoom = viewport.zoom;
    const newX = Math.max(10, (e.clientX - canvasRect.left) / zoom + boardCanvasRef.current.scrollLeft / zoom - dragOffsetRef.current.x / zoom);
    const newY = Math.max(10, (e.clientY - canvasRect.top) / zoom + boardCanvasRef.current.scrollTop / zoom - dragOffsetRef.current.y / zoom);

    setLocalNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n))
    );
  }, [draggingNodeId, viewport.zoom]);

  const handlePointerUpNode = useCallback((e: React.PointerEvent) => {
    if (draggingNodeId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch { /* safe */ }
      setDraggingNodeId(null);
      // Utrwalenie pozycji w stanie rodzica
      onUpdateNodes(localNodes);
    }
  }, [draggingNodeId, localNodes, onUpdateNodes]);

  // --- Akcje na wezlach ----------------------------------------------
  const handleStatusChange = useCallback((nodeId: string, newStatus: EvidenceNodeStatus) => {
    const updated = localNodes.map((n) => (n.id === nodeId ? { ...n, status: newStatus, updatedAt: new Date().toISOString() } : n));
    setLocalNodes(updated);
    onUpdateNodes(updated);
  }, [localNodes, onUpdateNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!confirm('Czy na pewno chcesz usunac ten element z Tablicy Badacza?')) return;
    const updatedNodes = localNodes.filter((n) => n.id !== nodeId);
    const updatedRelations = relations.filter((r) => r.fromNodeId !== nodeId && r.toNodeId !== nodeId);
    setLocalNodes(updatedNodes);
    onUpdateNodes(updatedNodes);
    onUpdateRelations(updatedRelations);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [localNodes, relations, selectedNodeId, onUpdateNodes, onUpdateRelations]);

  const handleDeleteRelation = useCallback((relId: string) => {
    onUpdateRelations(relations.filter((r) => r.id !== relId));
  }, [relations, onUpdateRelations]);

  // --- Laczenie sznurkiem (modal UI zamiast prompt) -------------------
  const handleStartConnection = useCallback((nodeId: string) => {
    if (connectingFromId === null) {
      setConnectingFromId(nodeId);
    } else if (connectingFromId === nodeId) {
      setConnectingFromId(null);
    }
  }, [connectingFromId]);

  const handleConfirmConnection = useCallback(() => {
    if (!pendingConnection) return;
    const newRelation: EvidenceRelation = {
      id: `rel_${Date.now()}`,
      fromNodeId: pendingConnection.fromId,
      toNodeId: pendingConnection.toId,
      label: connectionLabel || 'Powiazany z',
      color: connectionColor,
      createdAt: new Date().toISOString(),
    };
    onUpdateRelations([...relations, newRelation]);
    setShowConnectionModal(false);
    setPendingConnection(null);
  }, [pendingConnection, connectionLabel, connectionColor, relations, onUpdateRelations]);

  // --- Reczne przypinanie nowej notatki ------------------------------
  const handleAddManualNote = useCallback(() => {
    const scrollLeft = boardCanvasRef.current?.scrollLeft || 0;
    const scrollTop = boardCanvasRef.current?.scrollTop || 0;
    const zoom = viewport.zoom;
    const posX = scrollLeft / zoom + 60 + (localNodes.length % 4) * 280;
    const posY = scrollTop / zoom + 60 + Math.floor(localNodes.length / 4) * 240;

    const newNode: EvidenceNode = {
      id: `node_manual_${Date.now()}`,
      title: 'Nowa notatka',
      description: '',
      type: 'player_note',
      status: 'hypothesis',
      position: { x: posX, y: posY },
      isManuallyCreated: true,
      pinType: 'note',
      rotation: randomRotation(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...localNodes, newNode];
    setLocalNodes(updated);
    onUpdateNodes(updated);
    setSelectedNodeId(newNode.id);
  }, [localNodes, viewport.zoom, onUpdateNodes]);

  // --- Przypinanie z Szuflady Poszlak --------------------------------
  const handlePinFromJournal = useCallback((entry: { id: string; title: string; content: string; type: string; imageUrl?: string }) => {
    const scrollLeft = boardCanvasRef.current?.scrollLeft || 0;
    const scrollTop = boardCanvasRef.current?.scrollTop || 0;
    const zoom = viewport.zoom;
    const posX = scrollLeft / zoom + 60 + (localNodes.length % 3) * 300;
    const posY = scrollTop / zoom + 80;

    let nodeType: EvidenceNodeType = 'clue';
    if (entry.type === 'encyclopedia_character') nodeType = 'suspect';
    else if (entry.type === 'encyclopedia_location') nodeType = 'location';
    else if (entry.type === 'encyclopedia_item') nodeType = 'artifact';
    else if (entry.type === 'note') nodeType = 'player_note';
    else if (entry.type === 'quest') nodeType = 'evidence';

    const newNode: EvidenceNode = {
      id: `node_j_${entry.id}_${Date.now()}`,
      title: entry.title,
      description: entry.content,
      type: nodeType,
      status: 'hypothesis',
      position: { x: posX, y: posY },
      imageUrl: entry.imageUrl,
      sourceJournalEntryId: entry.id,
      isManuallyCreated: false,
      pinType: nodeType === 'player_note' ? 'note' : 'telegram',
      rotation: randomRotation(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...localNodes, newNode];
    setLocalNodes(updated);
    onUpdateNodes(updated);
  }, [localNodes, viewport.zoom, onUpdateNodes]);

  const handlePinFromEquipment = useCallback((item: { id: string; name: string; description: string; imageUrl?: string }) => {
    const scrollLeft = boardCanvasRef.current?.scrollLeft || 0;
    const scrollTop = boardCanvasRef.current?.scrollTop || 0;
    const zoom = viewport.zoom;
    const posX = scrollLeft / zoom + 60 + (localNodes.length % 3) * 300;
    const posY = scrollTop / zoom + 80;

    const newNode: EvidenceNode = {
      id: `node_eq_${item.id}_${Date.now()}`,
      title: item.name,
      description: item.description,
      type: 'evidence',
      status: 'hypothesis',
      position: { x: posX, y: posY },
      imageUrl: item.imageUrl,
      sourceEquipmentItemId: item.id,
      isManuallyCreated: false,
      pinType: 'badge',
      rotation: randomRotation(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...localNodes, newNode];
    setLocalNodes(updated);
    onUpdateNodes(updated);
  }, [localNodes, viewport.zoom, onUpdateNodes]);

  // --- Filtrowanie szuflady ------------------------------------------
  const filteredJournalEntries = useMemo(() => {
    const q = drawerSearch.toLowerCase();
    return journalEntries.filter((e) => {
      if (pinnedSourceIds.has(e.id)) return false;
      if (!q) return true;
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    });
  }, [journalEntries, pinnedSourceIds, drawerSearch]);

  const filteredEquipmentItems = useMemo(() => {
    const q = drawerSearch.toLowerCase();
    return equipmentItems.filter((e) => {
      if (pinnedSourceIds.has(e.id)) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
    });
  }, [equipmentItems, pinnedSourceIds, drawerSearch]);

  // --- Render --------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-[#140c07] text-[#e2d4c9] overflow-hidden select-none relative">
      {/* =================== PASEK NARZEDZI ========================= */}
      <div className="bg-[#1c120c] border-b border-[#3a2518] px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-[#bfa15f]" />
          <span className="font-serif font-bold text-lg text-[#f4ebd0]">TABLICA BADACZA</span>
          <span className="text-xs text-[#8a7667] ml-2">({localNodes.length} dowodow)</span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="p-1.5 text-[#bfa15f] hover:bg-[#3a2518] rounded transition-colors" title="Oddal">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-[#8a7667] min-w-[3rem] text-center font-mono">{Math.round(viewport.zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 text-[#bfa15f] hover:bg-[#3a2518] rounded transition-colors" title="Przybliz">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={handleResetView} className="p-1.5 text-[#bfa15f] hover:bg-[#3a2518] rounded transition-colors ml-1" title="Resetuj widok">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Akcje */}
        <div className="flex items-center gap-2">
          {connectingFromId && (
            <button
              onClick={() => setConnectingFromId(null)}
              className="text-xs bg-[#942c2c] text-white px-2 py-1 rounded animate-pulse cursor-pointer"
            >
              Anuluj laczenie sznurkiem
            </button>
          )}
          <Button
            onClick={handleAddManualNote}
            size="sm"
            className="bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
          >
            <StickyNote className="h-4 w-4 mr-1" /> Nowa notatka
          </Button>
          <Button
            onClick={() => setDrawerOpen(!drawerOpen)}
            size="sm"
            className="bg-[#3a2518] hover:bg-[#503422] text-[#bfa15f] border border-[#bfa15f]/40 font-serif"
          >
            {drawerOpen
              ? <><PanelRightClose className="h-4 w-4 mr-1" /> Zamknij szuflade</>
              : <><PanelRightOpen className="h-4 w-4 mr-1" /> Szuflada poszlak</>
            }
          </Button>
        </div>
      </div>

      {/* =================== GLOWNA ZAWARTOSC ======================= */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ============= PLOTNO KORKOWE ============================= */}
        <div
          ref={boardCanvasRef}
          className="flex-1 relative overflow-auto"
          style={{ backgroundColor: '#180f0a' }}
          onWheel={handleWheel}
        >
          {/* Tlo korkowe */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#2a1b12 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              minWidth: '2400px',
              minHeight: '1600px',
            }}
          />

          {/* Kontener skalowany zoomem */}
          <div
            style={{
              transform: `scale(${viewport.zoom})`,
              transformOrigin: 'top left',
              minWidth: '2400px',
              minHeight: '1600px',
              position: 'relative',
            }}
          >
            {/* ---- Warstwa SVG: Sznurki Beziera ---- */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minWidth: '2400px', minHeight: '1600px' }}>
              {relations.map((rel) => {
                const from = nodeMap.get(rel.fromNodeId);
                const to = nodeMap.get(rel.toNodeId);
                if (!from || !to) return null;

                const x1 = (from.position?.x ?? 50) + CARD_WIDTH / 2;
                const y1 = (from.position?.y ?? 50) + CARD_MIN_HEIGHT / 2;
                const x2 = (to.position?.x ?? 300) + CARD_WIDTH / 2;
                const y2 = (to.position?.y ?? 50) + CARD_MIN_HEIGHT / 2;

                const pathD = computeBezierPath(x1, y1, x2, y2);
                const strokeColor = rel.color || '#a83232';

                return (
                  <g key={rel.id} className="pointer-events-auto">
                    {/* Cien sznurka */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="5"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                      style={{ filter: 'blur(2px)' }}
                    />
                    {/* Sznurek glowny */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={rel.status === 'doubtful' ? '6,4' : undefined}
                      className="cursor-pointer hover:stroke-yellow-400 transition-colors"
                      onClick={() => {
                        if (confirm(`Usun sznurek "${rel.label}"?`)) {
                          handleDeleteRelation(rel.id);
                        }
                      }}
                    />
                    {/* Etykieta sznurka */}
                    {rel.label && (
                      <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 + 12})`}>
                        <rect
                          x={-Math.min(55, rel.label.length * 3.5)}
                          y="-9"
                          width={Math.min(110, rel.label.length * 7)}
                          height="18"
                          rx="3"
                          fill="#0f0905"
                          stroke="#3a2518"
                          strokeWidth="1"
                          fillOpacity="0.9"
                        />
                        <text
                          x="0"
                          y="2"
                          fill="#f4ebd0"
                          fontSize="10"
                          fontFamily="serif"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {rel.label.length > 18 ? rel.label.slice(0, 16) + '...' : rel.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ---- Warstwa kart wezlow ---- */}
            <div className="relative z-10 w-full h-full" style={{ minWidth: '2400px', minHeight: '1600px' }}>
              {localNodes.map((node) => {
                const typeInfo = NODE_TYPE_LABELS[node.type] || NODE_TYPE_LABELS.clue;
                const statusInfo = STATUS_ICONS[node.status];
                const StatusIcon = statusInfo.icon;
                const isSelected = selectedNodeId === node.id;
                const isConnecting = connectingFromId === node.id;
                const posX = node.position?.x ?? 50;
                const posY = node.position?.y ?? 50;
                const rotation = node.rotation ?? 0;

                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${posX}px`,
                      top: `${posY}px`,
                      width: `${CARD_WIDTH}px`,
                      transform: `rotate(${rotation}deg)`,
                      zIndex: isSelected ? 30 : draggingNodeId === node.id ? 40 : 10,
                    }}
                    onPointerDown={(e) => handlePointerDownNode(e, node)}
                    onPointerMove={handlePointerMoveNode}
                    onPointerUp={handlePointerUpNode}
                    className={cn(
                      'rounded-lg shadow-2xl border-2 transition-shadow cursor-grab active:cursor-grabbing font-serif flex flex-col select-none',
                      typeInfo.color,
                      typeInfo.borderColor,
                      isSelected && 'ring-2 ring-[#bfa15f] shadow-amber-900/40 scale-[1.02]',
                      isConnecting && 'border-red-500 animate-pulse',
                    )}
                  >
                    {/* Czerwona pineska 3D */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-800 border-2 border-red-300/70 shadow-lg flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white/80 rounded-full" />
                      </div>
                    </div>

                    <div className="p-3 pt-4 flex flex-col">
                      {/* Naglowek karty */}
                      <div className="flex justify-between items-center border-b border-[#3a2518] pb-1.5 mb-2">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#bfa15f]">
                          {typeInfo.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <span title={statusInfo.label}>
                            <StatusIcon className={cn('h-4 w-4', statusInfo.color)} />
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus: EvidenceNodeStatus =
                                node.status === 'confirmed' ? 'hypothesis'
                                : node.status === 'hypothesis' ? 'refuted'
                                : 'confirmed';
                              handleStatusChange(node.id, nextStatus);
                            }}
                            className="text-[9px] text-[#8a7667] hover:text-[#f4ebd0] underline ml-1"
                          >
                            zmien
                          </button>
                        </div>
                      </div>

                      {/* Ilustracja */}
                      {node.imageUrl && (
                        <div
                          className="mb-2 overflow-hidden rounded border border-[#3a2518] h-24 bg-black/40 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectNode?.(node);
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={node.imageUrl}
                            alt={node.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Tytul i Tresc */}
                      <h4 className="font-bold text-sm text-[#f4ebd0] mb-1 leading-snug">{node.title}</h4>
                      <p className="text-[11px] text-[#e2d4c9]/90 italic leading-relaxed line-clamp-3">
                        {node.description}
                      </p>

                      {/* Stopka karty */}
                      <div className="mt-3 pt-1.5 border-t border-[#3a2518] flex items-center justify-between text-xs">
                        <span className="text-[9px] text-[#8a7667] truncate max-w-[100px]">
                          {node.foundInLocation ? `📍 ${node.foundInLocation}` : ''}
                        </span>

                        <div className="flex items-center gap-0.5">
                          {/* Podglad (Inspect) */}
                          {onInspectNode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onInspectNode(node); }}
                              className="p-1 text-[#bfa15f] hover:bg-[#3a2518] rounded transition-colors"
                              title="Zbadaj dowod"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Polacz sznurkiem */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartConnection(node.id); }}
                            className={cn(
                              'p-1 rounded hover:bg-[#3a2518] transition-colors',
                              isConnecting ? 'text-red-400 font-bold' : 'text-[#bfa15f]'
                            )}
                            title="Polacz sznurkiem"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                          {/* Usun */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                            className="p-1 text-[#a84d4d] hover:bg-[#3a2518] rounded transition-colors"
                            title="Usun z tablicy"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {localNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center py-20 text-[#8a7667] italic font-serif max-w-md">
                    <Pin className="h-12 w-12 mx-auto mb-4 text-[#bfa15f]/30" />
                    <p className="text-lg mb-2">Tablica Badacza jest pusta</p>
                    <p className="text-sm">Uzyj przycisku &quot;Nowa notatka&quot; lub otworz &quot;Szuflade poszlak&quot;, aby przypiac dowody z Kroniki i Ekwipunku.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============= SZUFLADA POSZLAK (Evidence Drawer) ========= */}
        {drawerOpen && (
          <div className="w-80 bg-[#120b07] border-l-2 border-[#3a2518] flex flex-col overflow-hidden z-20 shadow-2xl">
            <div className="bg-[#1c120c] border-b border-[#3a2518] px-3 py-2.5">
              <h3 className="font-serif font-bold text-sm text-[#f4ebd0] mb-2">SZUFLADA POSZLAK</h3>
              {/* Zakladki szuflady */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setDrawerTab('journal')}
                  className={cn(
                    'flex-1 text-xs py-1.5 rounded font-serif transition-colors',
                    drawerTab === 'journal' ? 'bg-[#3a2518] text-[#f4ebd0]' : 'text-[#8a7667] hover:text-[#e2d4c9]'
                  )}
                >
                  <BookOpen className="h-3 w-3 inline mr-1" /> Kronika
                </button>
                <button
                  onClick={() => setDrawerTab('equipment')}
                  className={cn(
                    'flex-1 text-xs py-1.5 rounded font-serif transition-colors',
                    drawerTab === 'equipment' ? 'bg-[#3a2518] text-[#f4ebd0]' : 'text-[#8a7667] hover:text-[#e2d4c9]'
                  )}
                >
                  <Package className="h-3 w-3 inline mr-1" /> Ekwipunek
                </button>
              </div>
              {/* Wyszukiwarka */}
              <div className="flex items-center bg-[#0d0906] rounded px-2 py-1 border border-[#3a2518]">
                <Search className="h-3 w-3 text-[#8a7667] mr-1.5" />
                <input
                  type="text"
                  placeholder="Szukaj..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="bg-transparent text-xs w-full outline-none text-[#e2d4c9] placeholder-[#5a4d43]"
                />
              </div>
            </div>

            {/* Lista elementow szuflady */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {drawerTab === 'journal' && (
                <>
                  {filteredJournalEntries.length === 0 && (
                    <p className="text-xs text-[#8a7667] italic text-center py-4">Brak wpisow do przypiecia</p>
                  )}
                  {filteredJournalEntries.map((entry) => (
                    <div key={entry.id} className="bg-[#1c120c] border border-[#3a2518] rounded p-2.5 group">
                      <h5 className="text-xs font-serif font-bold text-[#f4ebd0] mb-0.5 line-clamp-1">{entry.title}</h5>
                      <p className="text-[10px] text-[#e2d4c9]/70 line-clamp-2 mb-1.5">{entry.content}</p>
                      <button
                        onClick={() => handlePinFromJournal(entry)}
                        className="text-[10px] bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] px-2 py-0.5 rounded border border-[#bfa15f]/30 font-serif transition-colors"
                      >
                        <Pin className="h-2.5 w-2.5 inline mr-0.5" /> Przypnij do tablicy
                      </button>
                    </div>
                  ))}
                </>
              )}
              {drawerTab === 'equipment' && (
                <>
                  {filteredEquipmentItems.length === 0 && (
                    <p className="text-xs text-[#8a7667] italic text-center py-4">Brak przedmiotow do przypiecia</p>
                  )}
                  {filteredEquipmentItems.map((item) => (
                    <div key={item.id} className="bg-[#1c120c] border border-[#3a2518] rounded p-2.5 group">
                      <h5 className="text-xs font-serif font-bold text-[#f4ebd0] mb-0.5 line-clamp-1">{item.name}</h5>
                      <p className="text-[10px] text-[#e2d4c9]/70 line-clamp-2 mb-1.5">{item.description}</p>
                      <button
                        onClick={() => handlePinFromEquipment(item)}
                        className="text-[10px] bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] px-2 py-0.5 rounded border border-[#bfa15f]/30 font-serif transition-colors"
                      >
                        <Pin className="h-2.5 w-2.5 inline mr-0.5" /> Przypnij do tablicy
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =================== MODAL LACZENIA SZNURKIEM =============== */}
      {showConnectionModal && pendingConnection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1c120c] border-2 border-[#3a2518] rounded-xl shadow-2xl w-96 p-5 text-[#e2d4c9]">
            <h3 className="font-serif font-bold text-lg text-[#f4ebd0] mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#bfa15f]" />
              Nowy czerwony sznurek
            </h3>

            <label className="text-xs font-serif text-[#bfa15f] block mb-1">Etykieta polaczenia</label>
            <input
              type="text"
              value={connectionLabel}
              onChange={(e) => setConnectionLabel(e.target.value)}
              placeholder="np. Widziany w, Wlasciciel, Podejrzany o..."
              className="w-full bg-[#0d0906] border border-[#3a2518] rounded px-3 py-2 text-sm text-[#e2d4c9] outline-none focus:border-[#bfa15f] mb-3"
              autoFocus
            />

            <label className="text-xs font-serif text-[#bfa15f] block mb-1">Kolor sznurka</label>
            <div className="flex gap-2 mb-4">
              {['#a83232', '#bfa15f', '#4a7a96', '#5c8a47', '#8e4a96'].map((c) => (
                <button
                  key={c}
                  onClick={() => setConnectionColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    connectionColor === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => { setShowConnectionModal(false); setPendingConnection(null); }}
                variant="outline"
                size="sm"
                className="border-[#3a2518] text-[#8a7667] hover:bg-[#2a1b12] bg-transparent"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleConfirmConnection}
                size="sm"
                className="bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
              >
                Polacz sznurkiem
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
