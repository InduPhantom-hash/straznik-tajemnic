'use client';

import React, { useState, useCallback } from 'react';
import { EvidenceNode, EvidenceNodeStatus } from '@/types/investigator-board';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  HelpCircle,
  XCircle,
  MapPin,
  User,
  Calendar,
  Tag,
  StickyNote,
  Trash2,
} from 'lucide-react';

interface InspectionLightboxModalProps {
  node: EvidenceNode;
  onClose: () => void;
  onUpdateNode: (updatedNode: EvidenceNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

const STATUS_CONFIG: Record<EvidenceNodeStatus, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  confirmed:  { icon: CheckCircle, color: 'text-[#73a15c]', bgColor: 'bg-[#142310] border-[#2c4c19]', label: 'Potwierdzone' },
  hypothesis: { icon: HelpCircle,  color: 'text-[#bfa15f]', bgColor: 'bg-[#2a1b12] border-[#bfa15f]', label: 'Hipoteza' },
  refuted:    { icon: XCircle,     color: 'text-[#a84d4d]', bgColor: 'bg-[#2b1010] border-[#942c2c]', label: 'Obalone' },
};

export function InspectionLightboxModal({
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
}: InspectionLightboxModalProps) {
  const [imageZoom, setImageZoom] = useState(1);
  const [notes, setNotes] = useState(node.description);
  const [title, setTitle] = useState(node.title);
  const [isEditing, setIsEditing] = useState(false);

  const statusConfig = STATUS_CONFIG[node.status];
  const StatusIcon = statusConfig.icon;

  const handleStatusChange = useCallback((newStatus: EvidenceNodeStatus) => {
    onUpdateNode({ ...node, status: newStatus, updatedAt: new Date().toISOString() });
  }, [node, onUpdateNode]);

  const handleSaveNotes = useCallback(() => {
    onUpdateNode({
      ...node,
      title,
      description: notes,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  }, [node, title, notes, onUpdateNode]);

  const handleDelete = useCallback(() => {
    if (confirm('Czy na pewno chcesz usunac ten dowod z Tablicy Badacza?')) {
      onDeleteNode(node.id);
      onClose();
    }
  }, [node.id, onDeleteNode, onClose]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      {/* Mosiazna ramka Art Deco */}
      <div className="bg-[#1c120c] border-4 border-[#bfa15f]/60 rounded-xl shadow-2xl w-[95vw] max-w-5xl h-[90vh] flex flex-col overflow-hidden text-[#e2d4c9] relative">
        {/* Dekoracyjne narozniki Art Deco */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#bfa15f] rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#bfa15f] rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#bfa15f] rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#bfa15f] rounded-br-xl" />

        {/* Naglowek */}
        <div className="bg-[#2a1b12] border-b-2 border-[#3a2518] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('px-3 py-1 rounded border text-xs font-serif font-bold', statusConfig.bgColor)}>
              <StatusIcon className={cn('h-3.5 w-3.5 inline mr-1', statusConfig.color)} />
              {statusConfig.label}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#8a7667]">Podglad dowodu</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-[#a84d4d] hover:bg-[#2b1010] rounded transition-colors"
              title="Usun z tablicy"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-[#4a1c1c] hover:bg-[#632525] rounded-md border border-[#942c2c] text-[#f4ebd0] transition-colors"
              title="Zamknij"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tresc glowna */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Lewa kolumna: grafika */}
          <div className="md:w-1/2 bg-black/60 flex flex-col items-center justify-center p-4 relative overflow-hidden border-r border-[#3a2518]">
            {node.imageUrl ? (
              <>
                <div className="flex-1 flex items-center justify-center overflow-auto w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={node.imageUrl}
                    alt={node.title}
                    className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform duration-200"
                    style={{ transform: `scale(${imageZoom})` }}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                {/* Zoom controls */}
                <div className="flex items-center gap-2 mt-3 bg-[#0d0906] rounded-lg px-3 py-1.5 border border-[#3a2518]">
                  <button onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))} className="p-1 text-[#bfa15f] hover:text-[#f4ebd0]">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-[#8a7667] font-mono min-w-[3rem] text-center">{Math.round(imageZoom * 100)}%</span>
                  <button onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))} className="p-1 text-[#bfa15f] hover:text-[#f4ebd0]">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-[#8a7667] italic font-serif">
                <StickyNote className="h-16 w-16 mx-auto mb-3 text-[#bfa15f]/20" />
                <p>Brak ilustracji</p>
              </div>
            )}
          </div>

          {/* Prawa kolumna: szczegoly i notatki */}
          <div className="md:w-1/2 flex flex-col overflow-y-auto p-5 space-y-4">
            {/* Tytul */}
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d0906] border border-[#3a2518] rounded px-3 py-2 text-xl font-serif font-bold text-[#f4ebd0] outline-none focus:border-[#bfa15f]"
                />
              ) : (
                <h2 className="text-xl font-serif font-bold text-[#f4ebd0]">{node.title}</h2>
              )}
            </div>

            {/* Status hipotezy */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8a7667] block mb-1.5">Status hipotezy</label>
              <div className="flex gap-2">
                {(Object.entries(STATUS_CONFIG) as [EvidenceNodeStatus, typeof STATUS_CONFIG.confirmed][]).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-serif transition-all',
                        node.status === status
                          ? `${config.bgColor} ${config.color} font-bold`
                          : 'bg-[#0d0906] border-[#3a2518] text-[#8a7667] hover:text-[#e2d4c9]'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metadane */}
            <div className="space-y-2 bg-[#120905] rounded-md border border-[#3a2518] p-3">
              {node.foundInLocation && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-[#5c8a47]" />
                  <span className="text-[#8a7667]">Lokacja:</span>
                  <span className="text-[#e2d4c9]">{node.foundInLocation}</span>
                </div>
              )}
              {node.sourceNpc && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3.5 w-3.5 text-[#a84d4d]" />
                  <span className="text-[#8a7667]">NPC:</span>
                  <span className="text-[#e2d4c9]">{node.sourceNpc}</span>
                </div>
              )}
              {node.discoveredAtDate && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-[#bfa15f]" />
                  <span className="text-[#8a7667]">Odkryty:</span>
                  <span className="text-[#e2d4c9]">{node.discoveredAtDate}</span>
                </div>
              )}
              {node.tags && node.tags.length > 0 && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-[#8e4a96] shrink-0" />
                  {node.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-[#1e1024] border border-[#8e4a96]/30 rounded text-[#e2d4c9] text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notatki badacza */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-wider text-[#8a7667]">Notatki badacza</label>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] text-[#bfa15f] hover:text-[#f4ebd0] underline font-serif"
                  >
                    Edytuj
                  </button>
                ) : (
                  <button
                    onClick={handleSaveNotes}
                    className="text-[10px] bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] px-2 py-0.5 rounded border border-[#bfa15f]/30 font-serif"
                  >
                    Zapisz
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 min-h-[120px] bg-[#0d0906] border border-[#3a2518] rounded px-3 py-2 text-sm text-[#e2d4c9] outline-none focus:border-[#bfa15f] resize-none font-serif italic leading-relaxed"
                  placeholder="Zapisz swoje obserwacje i teorie..."
                />
              ) : (
                <div className="flex-1 bg-[#120905] border border-[#3a2518] rounded p-3 text-sm text-[#e2d4c9]/90 font-serif italic leading-relaxed whitespace-pre-wrap min-h-[120px]">
                  {node.description || <span className="text-[#8a7667]">Brak notatek. Kliknij &quot;Edytuj&quot; aby dodac obserwacje.</span>}
                </div>
              )}
            </div>

            {/* Data */}
            <div className="text-[9px] text-[#5a4d43] text-right">
              Utworzono: {new Date(node.createdAt).toLocaleString('pl-PL')}
              {node.updatedAt && <> | Aktualizacja: {new Date(node.updatedAt).toLocaleString('pl-PL')}</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
