'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Input } from './input';
import { Textarea } from './textarea';
import { NPC } from '@/lib/types';
import { loadAISettings } from '@/lib/ai-settings';
import {
  X,
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  MapPin,
  Tag,
  Heart,
  Skull,
  AlertTriangle,
  UserCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { generateImageWithCache } from '@/hooks/use-media-cache';
import {
  DEFAULT_SKILLS,
  NPC_TEMPLATES,
  type DefaultSkillName,
  type NpcTemplateKey,
} from '@/lib/data/npc';
import { generateRandomNPC as libGenerateRandomNPC } from '@/lib/npc';
import { GEMINI_VOICES, type GeminiVoiceRole } from '@/lib/gemini-voices';
import { getVoiceForNPC } from '@/lib/npc-voice-mapping';

const VOICE_ROLE_LABELS: Record<GeminiVoiceRole, string> = {
  narrator: 'Narratorzy',
  male: 'Mężczyźni',
  female: 'Kobiety',
  young: 'Młodzi',
  old: 'Starsi',
  monster: 'Potwory / Mythos',
};

interface NPCManagerProps {
  onClose?: () => void;
  onNPCSelected?: (npc: NPC) => void;
  onAddToSession?: (npc: NPC) => void;
  currentLocation?: string;
  sessionId?: string;
}

// DEFAULT_SKILLS + NPC_TEMPLATES extracted do `@/lib/data/npc/` (sesja 100 IND-106 Wariant A scope-reduction).

export function NPCManager({
  onClose,
  onNPCSelected,
  onAddToSession,
  currentLocation,
  sessionId,
}: NPCManagerProps) {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [filteredNPCs, setFilteredNPCs] = useState<NPC[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  // M9 sesja 146 (D4): per-NPC checkbox DROPPED → globalny toggle w Settings
  // (replicateSettings.useExistingPortraitForRegen). Read na każdy regen call.

  // Ładowanie NPC z localStorage
  useEffect(() => {
    loadNPCs();
  }, []);

  // Filtrowanie NPC
  useEffect(() => {
    let filtered = npcs;

    // Wyszukiwanie
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (npc) =>
          npc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          npc.occupation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          npc.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtr typu
    if (filterType !== 'all') {
      filtered = filtered.filter((npc) => npc.type === filterType);
    }

    // Filtr statusu
    if (filterStatus !== 'all') {
      filtered = filtered.filter((npc) => npc.status === filterStatus);
    }

    // Filtr lokalizacji
    if (filterLocation !== 'all') {
      filtered = filtered.filter((npc) => npc.location === filterLocation);
    }

    setFilteredNPCs(filtered);
  }, [npcs, searchQuery, filterType, filterStatus, filterLocation]);

  const loadNPCs = () => {
    try {
      const saved = localStorage.getItem('gm_npcs');
      if (saved) {
        const loaded = (
          JSON.parse(saved) as Array<Record<string, unknown>>
        ).map((npc) => ({
          ...npc,
          createdAt: new Date(npc.createdAt as string),
          updatedAt: new Date(npc.updatedAt as string),
          lastUsed: npc.lastUsed ? new Date(npc.lastUsed as string) : undefined,
          changeHistory:
            (
              npc.changeHistory as Array<Record<string, unknown>> | undefined
            )?.map((ch) => ({
              ...ch,
              timestamp: new Date(ch.timestamp as string),
            })) || [],
        })) as NPC[];
        setNPCs(loaded);
      }
    } catch (error) {
      console.error('Error loading NPCs:', error);
    }
  };

  const saveNPCs = (newNPCs: NPC[]) => {
    localStorage.setItem('gm_npcs', JSON.stringify(newNPCs));
    setNPCs(newNPCs);
  };

  // calculateDerivedStats + generateRandomNPC extracted do `@/lib/npc/` (sesja 100 IND-106).

  const handleCreateNPC = () => {
    setEditingNPC(null);
    setShowForm(true);
  };

  const handleEditNPC = (npc: NPC) => {
    setEditingNPC(npc);
    setShowForm(true);
  };

  const handleDeleteNPC = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tego NPC?')) {
      const newNPCs = npcs.filter((npc) => npc.id !== id);
      saveNPCs(newNPCs);
    }
  };

  const handleGeneratePortrait = async (
    npc: NPC,
    forceRegenerate: boolean = false
  ) => {
    setIsGeneratingPortrait(true);
    try {
      const prompt = `Portrait of ${npc.name}, ${npc.occupation}, ${npc.appearance || npc.description}, Call of Cthulhu style, 1920s, detailed, atmospheric`;

      // M9 sesja 146 (D4): globalny toggle z Settings - gdy true + NPC ma
      // portretUrl, używamy Flux Kontext Pro (character consistency).
      const aiSettings = loadAISettings();
      const useExisting =
        aiSettings.replicateSettings.useExistingPortraitForRegen ?? true;
      const inputPortraitUrl =
        useExisting && npc.portraitUrl ? npc.portraitUrl : undefined;

      // Use persistent cache - will check IndexedDB first
      const result = await generateImageWithCache({
        type: 'npc',
        id: npc.id,
        prompt,
        style: 'realistic',
        forceRegenerate,
        inputPortraitUrl,
      });

      console.log(
        `📸 NPC Portrait ${result.fromCache ? 'loaded from cache' : 'generated'}: ${npc.name}`
      );

      const updatedNPC = {
        ...npc,
        portraitUrl: result.imageUrl,
        portraitGenerated: true,
        portraitCacheId: npc.id, // Store cache reference
      };
      const newNPCs = npcs.map((n) => (n.id === npc.id ? updatedNPC : n));
      saveNPCs(newNPCs);
    } catch (error) {
      console.error('Error generating portrait:', error);
      alert('Błąd podczas generowania portretu');
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const getNPCTypeIcon = (type: NPC['type']) => {
    switch (type) {
      case 'friendly':
        return <Heart className="w-4 h-4 text-green-400" />;
      case 'neutral':
        return <UserCheck className="w-4 h-4 text-yellow-400" />;
      case 'hostile':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'monster':
        return <Skull className="w-4 h-4 text-red-400" />;
    }
  };

  const getNPCTypeColor = (type: NPC['type']) => {
    switch (type) {
      case 'friendly':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'neutral':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'hostile':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'monster':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  const getStatusColor = (status: NPC['status']) => {
    switch (status) {
      case 'alive':
        return 'text-green-400';
      case 'dead':
        return 'text-red-400';
      case 'unknown':
        return 'text-muted-foreground';
    }
  };

  const locations = Array.from(
    new Set(npcs.map((npc) => npc.location).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      <Card className="relative bg-gradient-to-br from-[#1a1610] to-[#100d09] border-brass/30">
        {/* Narożniki déco */}
        <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-brass/55" />
        <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-brass/55" />
        <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-brass/55" />
        <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-brass/55" />

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-special-elite uppercase text-[14px] tracking-[0.4em] text-primary">
                Spotkane osoby · Bohaterowie niezależni
              </div>
              <h2 className="mt-1.5 font-display font-bold text-2xl uppercase tracking-[0.1em] text-foreground">
                Menedżer NPC
              </h2>
            </div>
            <Button
              onClick={handleCreateNPC}
              className="font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-primary hover:brightness-110 shadow-[0_0_16px_rgba(13,148,136,0.3)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nowy NPC
            </Button>
          </div>

          {/* Separator déco */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
            <span className="w-2 h-2 bg-brass rotate-45" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Filtry i wyszukiwanie */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brass/60 w-4 h-4" />
              <Input
                placeholder="Szukaj NPC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-special-elite"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
            >
              <option value="all">Wszystkie typy</option>
              <option value="friendly">Przyjazne</option>
              <option value="neutral">Neutralne</option>
              <option value="hostile">Wrogie</option>
              <option value="monster">Potwory</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="alive">Żywe</option>
              <option value="dead">Martwe</option>
              <option value="unknown">Nieznane</option>
            </select>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
            >
              <option value="all">Wszystkie lokacje</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Lista NPC */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNPCs.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 text-brass/40" />
                <p className="font-serif italic text-lg">
                  Brak NPC. Kliknij &quot;Nowy NPC&quot; aby utworzyć pierwszą
                  postać.
                </p>
              </div>
            ) : (
              filteredNPCs.map((npc) => (
                <Card
                  key={npc.id}
                  className="relative bg-[#16130f] border-brass/25 hover:border-primary/50 transition-colors"
                >
                  {/* Narożniki déco karty */}
                  <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/40" />
                  <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/40" />

                  <div className="p-4 space-y-3">
                    {/* Header: awatar + imię (Cinzel) + zawód (Special Elite) */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Awatar / miniatura portretu z rastrem déco */}
                        <div
                          className="relative w-11 h-11 flex-none border border-brass/45 flex items-center justify-center overflow-hidden"
                          style={{
                            backgroundImage: npc.portraitUrl
                              ? undefined
                              : 'repeating-linear-gradient(45deg,#211c15,#211c15 5px,#1a160f 5px,#1a160f 10px)',
                          }}
                        >
                          {npc.portraitUrl ? (
                            <img
                              src={npc.portraitUrl}
                              alt={npc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-display text-brass text-sm">
                              {npc.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display text-base text-foreground truncate">
                            {npc.name}
                          </h3>
                          {npc.occupation && (
                            <p className="font-special-elite text-[14px] uppercase tracking-[0.08em] text-muted-foreground truncate">
                              {npc.occupation}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-none">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNPC(npc)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-brass"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNPC(npc.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Status: typ + status (znaczniki déco, kolor wg dyspozycji) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`flex items-center gap-1.5 font-special-elite text-[14px] uppercase tracking-[0.08em] px-2.5 py-1 border ${getNPCTypeColor(
                          npc.type
                        )}`}
                      >
                        {getNPCTypeIcon(npc.type)}
                        {npc.type === 'friendly'
                          ? 'Przyjazny'
                          : npc.type === 'neutral'
                            ? 'Neutralny'
                            : npc.type === 'hostile'
                              ? 'Wrogi'
                              : 'Potwór'}
                      </span>
                      <span
                        className={`font-special-elite text-[14px] uppercase tracking-[0.08em] border border-brass/30 px-2.5 py-1 ${getStatusColor(
                          npc.status
                        )}`}
                      >
                        {npc.status === 'alive'
                          ? 'Żywy'
                          : npc.status === 'dead'
                            ? 'Martwy'
                            : 'Nieznany'}
                      </span>
                    </div>

                    {/* Statystyki: PŻ (bordo) / PR (złoto) / PM (emerald) */}
                    <div className="grid grid-cols-3 gap-2 font-special-elite text-xs">
                      <div className="border border-brass/20 bg-[#1f1a14] px-2 py-1.5 text-center">
                        <span className="block text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
                          PŻ
                        </span>
                        <span className="text-[#b3322c]">
                          {npc.hp}/{npc.maxHp}
                        </span>
                      </div>
                      <div className="border border-brass/20 bg-[#1f1a14] px-2 py-1.5 text-center">
                        <span className="block text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
                          PR
                        </span>
                        <span className="text-brass">
                          {npc.san}/{npc.maxSan}
                        </span>
                      </div>
                      <div className="border border-brass/20 bg-[#1f1a14] px-2 py-1.5 text-center">
                        <span className="block text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
                          PM
                        </span>
                        <span className="text-primary">
                          {npc.mp}/{npc.maxMp}
                        </span>
                      </div>
                    </div>

                    {/* Lokalizacja */}
                    {npc.location && (
                      <div className="flex items-center gap-1.5 font-special-elite text-xs text-muted-foreground">
                        <MapPin className="w-4 h-4 text-brass/60" />
                        <span>{npc.location}</span>
                      </div>
                    )}

                    {/* Tagi */}
                    {npc.tags && npc.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="w-4 h-4 text-brass/60" />
                        {npc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-special-elite text-[14px] uppercase tracking-[0.06em] text-muted-foreground border border-brass/30 px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Portret (pełny, gdy istnieje) z rastrem winiety */}
                    {npc.portraitUrl && (
                      <div className="relative aspect-square overflow-hidden border border-brass/30 group">
                        <img
                          src={npc.portraitUrl}
                          alt={npc.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Winieta déco */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 60px 16px rgba(0,0,0,.55)',
                          }}
                        />
                        {/* Regenerate button overlay (M9 sesja 146: tryb steruje
                            globalny toggle replicateSettings.useExistingPortraitForRegen) */}
                        <button
                          onClick={() => handleGeneratePortrait(npc, true)}
                          disabled={isGeneratingPortrait}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 border border-brass/40 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          title="Regeneruj portret (tryb w Settings: Zachowaj wygląd)"
                        >
                          {isGeneratingPortrait ? (
                            <Loader2 className="w-4 h-4 text-brass animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-brass" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Akcje */}
                    <div className="flex gap-2 pt-3 border-t border-brass/20">
                      {onAddToSession && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddToSession(npc)}
                          className="flex-1 font-display uppercase tracking-[0.12em] text-xs text-brass bg-brass/[0.04] border-brass/45 hover:bg-brass/10"
                        >
                          Użyj w sesji
                        </Button>
                      )}
                      {!npc.portraitUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeneratePortrait(npc)}
                          disabled={isGeneratingPortrait}
                          className="flex-1 font-display uppercase tracking-[0.12em] text-xs text-muted-foreground border-brass/30 hover:border-brass/60 hover:text-brass"
                        >
                          {isGeneratingPortrait ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Generuj portret'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Formularz tworzenia/edycji */}
      {showForm && (
        <NPCForm
          npc={editingNPC}
          onSave={(npc) => {
            if (editingNPC) {
              const newNPCs = npcs.map((n) =>
                n.id === editingNPC.id ? npc : n
              );
              saveNPCs(newNPCs);
            } else {
              saveNPCs([...npcs, npc]);
            }
            setShowForm(false);
            setEditingNPC(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingNPC(null);
          }}
          onGenerateRandom={() => {
            const random = libGenerateRandomNPC();
            // To będzie używane w formularzu (pre-existing TODO od initial commit, dead code)
            void random;
          }}
          currentLocation={currentLocation}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}

// Komponent formularza NPC
interface NPCFormProps {
  npc?: NPC | null;
  onSave: (npc: NPC) => void;
  onCancel: () => void;
  onGenerateRandom: () => void;
  currentLocation?: string;
  sessionId?: string;
}

function NPCForm({
  npc,
  onSave,
  onCancel,
  onGenerateRandom,
  currentLocation,
  sessionId,
}: NPCFormProps) {
  const [formData, setFormData] = useState<Partial<NPC>>(() => {
    if (npc) {
      return { ...npc };
    }
    // Domyślne wartości
    const stats = NPC_TEMPLATES.ordinary_citizen.stats;
    const derived = {
      hp: Math.floor((stats.con + stats.siz) / 10),
      maxHp: Math.floor((stats.con + stats.siz) / 10),
      san: stats.pow,
      maxSan: stats.pow,
      mp: Math.floor(stats.pow / 5),
      maxMp: Math.floor(stats.pow / 5),
    };
    return {
      name: '',
      type: 'neutral',
      occupation: '',
      ...stats,
      luck: 50,
      ...derived,
      skills: { ...DEFAULT_SKILLS },
      description: '',
      appearance: '',
      personality: '',
      motivations: '',
      relationshipWithPlayer: '',
      location: currentLocation || '',
      status: 'alive',
      statusEffects: [],
      tags: [],
      gmNotes: '',
      changeHistory: [],
      voiceConfig: undefined,
    };
  });

  const [activeTab, setActiveTab] = useState<
    'basic' | 'stats' | 'skills' | 'details'
  >('basic');

  const calculateDerivedStats = () => {
    const hp = Math.floor(((formData.con || 0) + (formData.siz || 0)) / 10);
    const san = formData.pow || 0;
    const mp = Math.floor((formData.pow || 0) / 5);
    setFormData((prev) => ({
      ...prev,
      hp: prev.hp || hp,
      maxHp: prev.maxHp || hp,
      san: prev.san || san,
      maxSan: prev.maxSan || san,
      mp: prev.mp || mp,
      maxMp: prev.maxMp || mp,
    }));
  };

  useEffect(() => {
    calculateDerivedStats();
  }, [formData.con, formData.siz, formData.pow]);

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('Nazwa NPC jest wymagana');
      return;
    }

    const npcData: NPC = {
      id: npc?.id || Date.now().toString(),
      name: formData.name!,
      type: formData.type || 'neutral',
      occupation: formData.occupation || '',
      str: formData.str || 50,
      dex: formData.dex || 50,
      con: formData.con || 50,
      app: formData.app || 50,
      pow: formData.pow || 50,
      edu: formData.edu || 50,
      siz: formData.siz || 50,
      int: formData.int || 50,
      luck: formData.luck || 50,
      hp: formData.hp || 10,
      maxHp: formData.maxHp || 10,
      san: formData.san || 50,
      maxSan: formData.maxSan || 50,
      mp: formData.mp || 10,
      maxMp: formData.maxMp || 10,
      skills: formData.skills || {},
      description: formData.description || '',
      appearance: formData.appearance || '',
      personality: formData.personality || '',
      motivations: formData.motivations || '',
      relationshipWithPlayer: formData.relationshipWithPlayer || '',
      location: formData.location || '',
      status: formData.status || 'alive',
      statusEffects: formData.statusEffects || [],
      tags: formData.tags || [],
      gmNotes: formData.gmNotes || '',
      createdAt: npc?.createdAt || new Date(),
      updatedAt: new Date(),
      lastUsed: formData.lastUsed,
      sessionId: formData.sessionId || sessionId,
      changeHistory: npc?.changeHistory || [],
      portraitUrl: formData.portraitUrl,
      portraitGenerated: formData.portraitGenerated,
      voiceConfig: formData.voiceConfig,
    };

    onSave(npcData);
  };

  const applyTemplate = (templateKey: NpcTemplateKey) => {
    const template = NPC_TEMPLATES[templateKey];
    const derived = {
      hp: Math.floor((template.stats.con + template.stats.siz) / 10),
      san: template.stats.pow,
      mp: Math.floor(template.stats.pow / 5),
    };
    setFormData((prev) => ({
      ...prev,
      ...template.stats,
      ...derived,
      maxHp: derived.hp,
      maxSan: derived.san,
      maxMp: derived.mp,
      skills: { ...DEFAULT_SKILLS, ...template.skills },
    }));
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags?.includes(tag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag.trim()],
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  return (
    <Card className="relative bg-gradient-to-br from-[#1a1610] to-[#100d09] border-brass/40 fixed inset-4 z-50 overflow-hidden flex flex-col shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      {/* Narożniki déco */}
      <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-brass/55 z-10" />
      <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-brass/55 z-10" />
      <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-brass/55 z-10" />
      <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-brass/55 z-10" />

      <div className="p-6 border-b border-brass/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xl uppercase tracking-[0.1em] text-foreground">
            {npc ? 'Edytuj NPC' : 'Nowy NPC'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-brass"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-brass/25">
          {(['basic', 'stats', 'skills', 'details'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-display uppercase tracking-[0.14em] text-xs transition-colors ${
                activeTab === tab
                  ? 'text-brass border-b-2 border-brass'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'basic' && 'Podstawowe'}
              {tab === 'stats' && 'Statystyki'}
              {tab === 'skills' && 'Umiejętności'}
              {tab === 'details' && 'Szczegóły'}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Nazwa *
              </label>
              <Input
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Imię NPC"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                  Typ
                </label>
                <select
                  value={formData.type || 'neutral'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as NPC['type'],
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
                >
                  <option value="friendly">Przyjazny</option>
                  <option value="neutral">Neutralny</option>
                  <option value="hostile">Wrogi</option>
                  <option value="monster">Potwór</option>
                </select>
              </div>
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                  Zawód/Profesja
                </label>
                <Input
                  value={formData.occupation || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      occupation: e.target.value,
                    }))
                  }
                  placeholder="np. Detektyw, Antykwariusz"
                />
              </div>
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Lokalizacja
              </label>
              <Input
                value={formData.location || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Gdzie można spotkać tego NPC"
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Status
              </label>
              <select
                value={formData.status || 'alive'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as NPC['status'],
                  }))
                }
                className="w-full px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
              >
                <option value="alive">Żywy</option>
                <option value="dead">Martwy</option>
                <option value="unknown">Nieznany</option>
              </select>
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Głos NPC (multi-voice ULTRA)
              </label>
              <select
                value={formData.voiceConfig?.voiceId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    voiceConfig: e.target.value
                      ? { voiceId: e.target.value }
                      : undefined,
                  }))
                }
                className="w-full px-3 py-2 bg-[#16130f] border border-brass/30 rounded-md text-foreground font-special-elite text-sm focus:border-brass/60 focus:outline-none"
                aria-label="Wybór głosu Gemini TTS dla NPC"
              >
                <option value="">
                  Auto (sugestia: {getVoiceForNPC(formData as NPC)})
                </option>
                {(
                  [
                    'narrator',
                    'male',
                    'female',
                    'young',
                    'old',
                    'monster',
                  ] as GeminiVoiceRole[]
                ).map((role) => (
                  <optgroup key={role} label={VOICE_ROLE_LABELS[role]}>
                    {GEMINI_VOICES.filter((v) => v.role === role).map((v) => (
                      <option key={v.voiceId} value={v.voiceId}>
                        {v.name} - {v.characteristic} ({v.description})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="font-serif italic text-sm text-muted-foreground mt-1.5">
                &quot;Auto&quot; - aplikacja dobiera głos po type/wieku/płci.
                Słyszalny tylko gdy preset = ULTRA (słuchowisko radiowe).
              </p>
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Tagi
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 font-special-elite text-[14px] uppercase tracking-[0.06em] text-muted-foreground border border-brass/30 px-2 py-0.5"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-brass"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Dodaj tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[placeholder="Dodaj tag..."]'
                    ) as HTMLInputElement;
                    if (input) {
                      addTag(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Dodaj
                </Button>
              </div>
              <p className="font-serif italic text-sm text-muted-foreground mt-1.5">
                Popularne tagi: Świadek, Sprzymierzeniec, Antagonista,
                Informator
              </p>
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Szablony
              </label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(NPC_TEMPLATES).map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(key as NpcTemplateKey)}
                  >
                    {NPC_TEMPLATES[key as NpcTemplateKey].name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  'str',
                  'dex',
                  'con',
                  'app',
                  'pow',
                  'edu',
                  'siz',
                  'int',
                  'luck',
                ] as const
              ).map((stat) => (
                <div key={stat}>
                  <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                    {stat.toUpperCase()}
                  </label>
                  <Input
                    type="number"
                    value={formData[stat] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [stat]: parseInt(e.target.value) || 0,
                      }))
                    }
                    min="1"
                    max="100"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-brass/25">
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                  PŻ
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.hp || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hp: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                  <span className="self-center">/</span>
                  <Input
                    type="number"
                    value={formData.maxHp || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxHp: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                  PR
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.san || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        san: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                  <span className="self-center">/</span>
                  <Input
                    type="number"
                    value={formData.maxSan || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxSan: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                  PM
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.mp || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mp: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                  <span className="self-center">/</span>
                  <Input
                    type="number"
                    value={formData.maxMp || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxMp: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {Object.keys(DEFAULT_SKILLS).map((skill) => (
                <div key={skill}>
                  <label className="block font-special-elite uppercase tracking-[0.08em] text-muted-foreground text-[14px] mb-1">
                    {skill}
                  </label>
                  <Input
                    type="number"
                    value={
                      formData.skills?.[skill] ||
                      DEFAULT_SKILLS[skill as DefaultSkillName] ||
                      0
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        skills: {
                          ...prev.skills,
                          [skill]: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    min="0"
                    max="100"
                  />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-brass/25">
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Dodaj własną umiejętność
              </label>
              <div className="flex gap-2">
                <Input placeholder="Nazwa umiejętności" id="new-skill-name" />
                <Input
                  type="number"
                  placeholder="Wartość"
                  id="new-skill-value"
                  min="0"
                  max="100"
                />
                <Button
                  onClick={() => {
                    const nameInput = document.getElementById(
                      'new-skill-name'
                    ) as HTMLInputElement;
                    const valueInput = document.getElementById(
                      'new-skill-value'
                    ) as HTMLInputElement;
                    if (nameInput.value.trim() && valueInput.value) {
                      setFormData((prev) => ({
                        ...prev,
                        skills: {
                          ...prev.skills,
                          [nameInput.value.trim()]:
                            parseInt(valueInput.value) || 0,
                        },
                      }));
                      nameInput.value = '';
                      valueInput.value = '';
                    }
                  }}
                >
                  Dodaj
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Opis
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Ogólny opis NPC"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Wygląd
              </label>
              <Textarea
                value={formData.appearance || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    appearance: e.target.value,
                  }))
                }
                placeholder="Szczegółowy opis wyglądu"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Osobowość
              </label>
              <Textarea
                value={formData.personality || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    personality: e.target.value,
                  }))
                }
                placeholder="Charakter, zachowanie, cechy osobowości"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Motywacje
              </label>
              <Textarea
                value={formData.motivations || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    motivations: e.target.value,
                  }))
                }
                placeholder="Co motywuje tego NPC? Jakie ma cele?"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Relacja z graczem
              </label>
              <Textarea
                value={formData.relationshipWithPlayer || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    relationshipWithPlayer: e.target.value,
                  }))
                }
                placeholder="Jak NPC odnosi się do postaci gracza?"
                rows={2}
              />
            </div>
            <div>
              <label className="block font-display uppercase tracking-[0.16em] text-brass text-xs font-semibold mb-2">
                Notatki GM
              </label>
              <Textarea
                value={formData.gmNotes || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gmNotes: e.target.value }))
                }
                placeholder="Prywatne notatki dla mistrza gry"
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-brass/30 flex-shrink-0 flex gap-2">
        <Button
          onClick={handleSave}
          className="flex-1 font-display font-semibold uppercase tracking-[0.16em] text-[#04110f] bg-primary border border-primary hover:brightness-110"
        >
          Zapisz
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 font-display uppercase tracking-[0.16em] text-muted-foreground border-brass/30 hover:border-brass/60 hover:text-brass"
        >
          Anuluj
        </Button>
      </div>
    </Card>
  );
}
