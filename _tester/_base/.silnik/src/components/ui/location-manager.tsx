"use client";

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';
import { Location } from '@/lib/types';
import { NPC } from '@/lib/types';
import { MapPin, Search, Filter, Plus, Edit, Trash2, Link, Eye, EyeOff, Loader2, X, RefreshCw } from 'lucide-react';
import { generateImageWithCache } from '@/hooks/use-media-cache';

interface LocationManagerProps {
  onClose?: () => void;
  onLocationSelected?: (location: Location) => void;
  onAddToSession?: (location: Location) => void;
  npcs?: NPC[];
  currentSessionId?: string;
}

export function LocationManager({
  onClose,
  onLocationSelected,
  onAddToSession,
  npcs = [],
  currentSessionId
}: LocationManagerProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEra, setFilterEra] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);

  // Ładowanie lokacji z localStorage
  useEffect(() => {
    loadLocations();
  }, []);

  // Filtrowanie lokacji
  useEffect(() => {
    let filtered = locations;

    // Wyszukiwanie
    if (searchQuery.trim()) {
      filtered = filtered.filter(loc => 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtr typu
    if (filterType !== 'all') {
      filtered = filtered.filter(loc => loc.type === filterType);
    }

    // Filtr epoki
    if (filterEra !== 'all') {
      filtered = filtered.filter(loc => loc.era === filterEra);
    }

    setFilteredLocations(filtered);
  }, [locations, searchQuery, filterType, filterEra]);

  const loadLocations = () => {
    try {
      const saved = localStorage.getItem('gm_locations');
      if (saved) {
        const loaded = JSON.parse(saved).map((loc: any) => ({
          ...loc,
          createdAt: new Date(loc.createdAt),
          updatedAt: new Date(loc.updatedAt),
          lastVisited: loc.lastVisited ? new Date(loc.lastVisited) : undefined
        }));
        setLocations(loaded);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const saveLocations = (newLocations: Location[]) => {
    localStorage.setItem('gm_locations', JSON.stringify(newLocations));
    setLocations(newLocations);
  };

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setShowForm(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tę lokację?')) {
      const newLocations = locations.filter(loc => loc.id !== id);
      saveLocations(newLocations);
    }
  };

  const handleGenerateMap = async (location: Location, forceRegenerate: boolean = false) => {
    setIsGeneratingMap(true);
    try {
      const prompt = `Map or layout of ${location.name}, ${location.type}, ${location.description}, 1920s period-accurate, realistic layout, detailed, atmospheric`;
      
      // Use persistent cache - will check IndexedDB first
      const result = await generateImageWithCache({
        type: 'location',
        id: location.id,
        prompt,
        style: 'realistic',
        forceRegenerate,
      });
      
      console.log(`🗺️ Location map ${result.fromCache ? 'loaded from cache' : 'generated'}: ${location.name}`);
      
      const updatedLocation = { 
        ...location, 
        mapUrl: result.imageUrl, 
        mapGenerated: true,
        imageCacheId: location.id, // Store cache reference
      };
      const newLocations = locations.map(l => l.id === location.id ? updatedLocation : l);
      saveLocations(newLocations);
      
    } catch (error) {
      console.error('Error generating map:', error);
      alert('Błąd podczas generowania mapy');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  const getTypeLabel = (type: Location['type']) => {
    switch (type) {
      case 'city': return 'Miasto';
      case 'building': return 'Budowla';
      case 'wilderness': return 'Dzicz';
      case 'laboratory': return 'Laboratorium';
      case 'temple': return 'Świątynia';
      case 'other': return 'Inne';
    }
  };

  const getTypeColor = (type: Location['type']) => {
    switch (type) {
      case 'city': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'building': return 'bg-gray-500/20 text-foreground border-border/30';
      case 'wilderness': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'laboratory': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'temple': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'other': return 'bg-gray-500/20 text-foreground border-border/30';
    }
  };

  const locationTypes: Location['type'][] = ['city', 'building', 'wilderness', 'laboratory', 'temple', 'other'];
  const eras: Location['era'][] = ['1920s', '1930s', 'modern', 'other'];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground font-mono">📍 Menedżer Lokacji</h2>
            <Button onClick={handleCreateLocation} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nowa Lokacja
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Filtry i wyszukiwanie */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Szukaj lokacji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
            >
              <option value="all">Wszystkie typy</option>
              {locationTypes.map(type => (
                <option key={type} value={type}>{getTypeLabel(type)}</option>
              ))}
            </select>
            <select
              value={filterEra}
              onChange={(e) => setFilterEra(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
            >
              <option value="all">Wszystkie epoki</option>
              <option value="1920s">Lata 20.</option>
              <option value="1930s">Lata 30.</option>
              <option value="modern">Współczesność</option>
              <option value="other">Inna</option>
            </select>
          </div>

          {/* Lista lokacji */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak lokacji. Kliknij "Nowa Lokacja" aby utworzyć pierwszą.</p>
              </div>
            ) : (
              filteredLocations.map(location => (
                <Card key={location.id} className="bg-muted/50 border-border hover:border-primary/50 transition-colors">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-foreground">{location.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getTypeColor(location.type)}>
                            {getTypeLabel(location.type)}
                          </Badge>
                          {location.visitedByPlayer && (
                            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                              Odwiedzona
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Opis */}
                    {location.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {location.description}
                      </p>
                    )}

                    {/* Adres */}
                    {location.address && (
                      <div className="text-xs text-muted-foreground">
                        📍 {location.address}
                      </div>
                    )}

                    {/* NPC */}
                    {location.npcs && location.npcs.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap text-xs">
                        <span className="text-muted-foreground">NPC:</span>
                        {location.npcs.map(npcId => {
                          const npc = npcs.find(n => n.id === npcId);
                          return npc ? (
                            <Badge key={npcId} variant="outline" className="text-xs">
                              {npc.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Mapa */}
                    {location.mapUrl && (
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                        <img src={location.mapUrl} alt={location.name} className="w-full h-full object-cover" />
                        {/* Regenerate button overlay */}
                        <button
                          onClick={() => handleGenerateMap(location, true)}
                          disabled={isGeneratingMap}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          title="Regeneruj mapę"
                        >
                          {isGeneratingMap ? (
                            <Loader2 className="w-4 h-4 text-foreground animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-foreground" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Tajemnice */}
                    {location.secrets && location.secrets.length > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {location.secrets.filter(s => s.discovered).length}/{location.secrets.length} tajemnic odkryte
                        </span>
                      </div>
                    )}

                    {/* Akcje */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      {onAddToSession && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddToSession(location)}
                          className="flex-1"
                        >
                          Użyj w sesji
                        </Button>
                      )}
                      {!location.mapUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateMap(location)}
                          disabled={isGeneratingMap}
                          className="flex-1"
                        >
                          {isGeneratingMap ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Generuj mapę'
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
        <LocationForm
          location={editingLocation}
          npcs={npcs}
          onSave={(location) => {
            if (editingLocation) {
              const newLocations = locations.map(l => l.id === editingLocation.id ? location : l);
              saveLocations(newLocations);
            } else {
              saveLocations([...locations, location]);
            }
            setShowForm(false);
            setEditingLocation(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingLocation(null);
          }}
          sessionId={currentSessionId}
        />
      )}
    </div>
  );
}

// Komponent formularza lokacji
interface LocationFormProps {
  location?: Location | null;
  npcs: NPC[];
  onSave: (location: Location) => void;
  onCancel: () => void;
  sessionId?: string;
}

function LocationForm({ location, npcs, onSave, onCancel, sessionId }: LocationFormProps) {
  const [formData, setFormData] = useState<Partial<Location>>(() => {
    if (location) {
      return { ...location };
    }
    return {
      name: '',
      type: 'building',
      era: '1920s',
      description: '',
      appearance: '',
      atmosphere: '',
      address: '',
      connectedLocations: [],
      npcs: [],
      items: [],
      secrets: [],
      gmNotes: '',
      visitedByPlayer: false
    };
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'connections' | 'secrets'>('basic');

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('Nazwa lokacji jest wymagana');
      return;
    }

    const locationData: Location = {
      id: location?.id || Date.now().toString(),
      name: formData.name!,
      type: formData.type || 'building',
      era: formData.era || '1920s',
      description: formData.description || '',
      appearance: formData.appearance || '',
      atmosphere: formData.atmosphere || '',
      address: formData.address,
      coordinates: formData.coordinates,
      connectedLocations: formData.connectedLocations || [],
      npcs: formData.npcs || [],
      items: formData.items || [],
      secrets: formData.secrets || [],
      mapUrl: formData.mapUrl,
      mapGenerated: formData.mapGenerated,
      gmNotes: formData.gmNotes || '',
      createdAt: location?.createdAt || new Date(),
      updatedAt: new Date(),
      lastVisited: formData.lastVisited,
      visitedByPlayer: formData.visitedByPlayer || false,
      discoveryRequirements: formData.discoveryRequirements
    };

    onSave(locationData);
  };

  const addSecret = () => {
    const newSecret = {
      id: Date.now().toString(),
      title: '',
      description: '',
      discovered: false,
      requirements: ''
    };
    setFormData(prev => ({
      ...prev,
      secrets: [...(prev.secrets || []), newSecret]
    }));
  };

  const removeSecret = (id: string) => {
    setFormData(prev => ({
      ...prev,
      secrets: (prev.secrets || []).filter(s => s.id !== id)
    }));
  };

  const updateSecret = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      secrets: (prev.secrets || []).map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  const toggleNPC = (npcId: string) => {
    setFormData(prev => {
      const current = prev.npcs || [];
      if (current.includes(npcId)) {
        return { ...prev, npcs: current.filter(id => id !== npcId) };
      } else {
        return { ...prev, npcs: [...current, npcId] };
      }
    });
  };

  return (
    <Card className="bg-card border-border fixed inset-4 z-50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground font-mono">
            {location ? 'Edytuj Lokację' : 'Nowa Lokacja'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {(['basic', 'details', 'connections', 'secrets'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'basic' && 'Podstawowe'}
              {tab === 'details' && 'Szczegóły'}
              {tab === 'connections' && 'Powiązania'}
              {tab === 'secrets' && 'Tajemnice'}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nazwa *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nazwa lokacji"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Typ</label>
                <select
                  value={formData.type || 'building'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Location['type'] }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                >
                  <option value="city">Miasto</option>
                  <option value="building">Budowla</option>
                  <option value="wilderness">Dzicz</option>
                  <option value="laboratory">Laboratorium</option>
                  <option value="temple">Świątynia</option>
                  <option value="other">Inne</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Epoka</label>
                <select
                  value={formData.era || '1920s'}
                  onChange={(e) => setFormData(prev => ({ ...prev, era: e.target.value as Location['era'] }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                >
                  <option value="1920s">Lata 20.</option>
                  <option value="1930s">Lata 30.</option>
                  <option value="modern">Współczesność</option>
                  <option value="other">Inna</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Adres/Lokalizacja</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Adres lub opis lokalizacji"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Opis</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ogólny opis lokacji"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Wygląd</label>
              <Textarea
                value={formData.appearance || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, appearance: e.target.value }))}
                placeholder="Szczegółowy opis wyglądu lokacji"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Atmosfera</label>
              <Textarea
                value={formData.atmosphere || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, atmosphere: e.target.value }))}
                placeholder="Opis atmosfery, odczuć, zmysłów"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Notatki GM</label>
              <Textarea
                value={formData.gmNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, gmNotes: e.target.value }))}
                placeholder="Prywatne notatki dla mistrza gry"
                rows={5}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <input
                  type="checkbox"
                  checked={formData.visitedByPlayer || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitedByPlayer: e.target.checked }))}
                  className="w-4 h-4"
                />
                Lokacja została odwiedzona przez gracza
              </label>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">NPC w lokacji</label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {npcs.map(npc => (
                  <label key={npc.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border cursor-pointer hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={formData.npcs?.includes(npc.id) || false}
                      onChange={() => toggleNPC(npc.id)}
                    />
                    <span className="text-sm">{npc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Secrets Tab */}
        {activeTab === 'secrets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">Tajemnice</label>
              <Button onClick={addSecret} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj Tajemnicę
              </Button>
            </div>
            <div className="space-y-3">
              {formData.secrets?.map(secret => (
                <Card key={secret.id} className="bg-muted/50 border-border">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Input
                        value={secret.title}
                        onChange={(e) => updateSecret(secret.id, 'title', e.target.value)}
                        placeholder="Tytuł tajemnicy"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSecret(secret.id)}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={secret.description}
                      onChange={(e) => updateSecret(secret.id, 'description', e.target.value)}
                      placeholder="Opis tajemnicy"
                      rows={3}
                    />
                    <Input
                      value={secret.requirements || ''}
                      onChange={(e) => updateSecret(secret.id, 'requirements', e.target.value)}
                      placeholder="Warunki odkrycia (opcjonalnie)"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={secret.discovered}
                        onChange={(e) => updateSecret(secret.id, 'discovered', e.target.checked)}
                      />
                      Odkryta przez gracza
                    </label>
                  </div>
                </Card>
              ))}
              {(!formData.secrets || formData.secrets.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  Brak tajemnic. Dodaj pierwszą tajemnicę.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border flex-shrink-0 flex gap-2">
        <Button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
          Zapisz
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Anuluj
        </Button>
      </div>
    </Card>
  );
}

