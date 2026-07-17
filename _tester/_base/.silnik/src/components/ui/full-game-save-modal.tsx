'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import {
  X,
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import FullGameSaveManager, {
  FullGameSave,
} from '@/lib/full-game-save-manager';
import { AISettings } from '@/lib/ai-settings';
import { Character, Campaign, NPC, Location, HotSeatConfig } from '@/lib/types';
import type { Message as LibMessage } from '@/lib/types';
import type { PdfMemory } from '@/hooks/usePdfMemory';
import {
  collectSaveImages,
  applySaveImageUrls,
  dataUrlExtension,
  sanitizeHistoryForApi,
  sanitizeCharacterForApi,
  sanitizeNpcForApi,
} from '@/lib/chat-history-sanitizer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  illustrations?: Array<{
    imageUrl: string;
    prompt: string;
    timestamp: Date;
  }>;
  // Realne obrazy scen (pole `generatedImages` z @/lib/types). Licznik checkboxa
  // liczy WŁAŚNIE to - `illustrations` jest martwe (zawsze puste).
  generatedImages?: string[];
}

/** Metadane zapisu zwracane z `/api/game-save?list=true`. */
interface SaveMeta {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  formattedSize: string;
  messageCount: number;
  imageCount: number;
  // Bogata karta katalogu (makieta .agent/design/15) - opcjonalne.
  characterName?: string;
  thumbnail?: string;
  sceneFragment?: string;
  chapterTitle?: string;
  hp?: number;
  maxHp?: number;
  san?: number;
  maxSan?: number;
  durationMinutes?: number;
}

/** "Dziś, 23:51" / "Wczoraj, 21:08" / "12.05, 18:00" - relatywna data (makieta 15). */
function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const dayMs = 86_400_000;
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (dDay === startOfToday) return `Dziś, ${time}`;
  if (dDay === startOfToday - dayMs) return `Wczoraj, ${time}`;
  return `${d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

/** Minuty → "HH:MM" czasu gry (makieta 15: "Czas gry 02:13"). */
function formatGameTime(minutes?: number): string | null {
  if (typeof minutes !== 'number' || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface FullGameSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load';

  // Dane do zapisania
  currentData?: {
    messages: Message[];
    aiSettings: AISettings;
    characters: Character[];
    activeCharacterId?: string;
    hotSeatConfig?: HotSeatConfig;
    campaigns: Campaign[];
    activeCampaignId?: string;
    npcs: NPC[];
    locations: Location[];
    currentLocationId?: string;
    pdfMemory?: PdfMemory;
    notes?: string;
    sessionStartTime?: string;
  };

  // Callback po wczytaniu
  onLoad?: (save: FullGameSave) => void;

  // Callback po UDANYM zapisie (np. powrót do kreatora dla "Nowej przygody")
  onSaved?: () => void;
}

export function FullGameSaveModal({
  isOpen,
  onClose,
  mode,
  currentData,
  onLoad,
  onSaved,
}: FullGameSaveModalProps) {
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [saveImages, setSaveImages] = useState(true);
  const [saveSettings, setSaveSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savesList, setSavesList] = useState<SaveMeta[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Pobierz listę save'ów
  useEffect(() => {
    if (isOpen && mode === 'load') {
      loadSavesList();
    }
  }, [isOpen, mode]);

  const loadSavesList = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/game-save?list=true&userId=local');

      if (response.ok) {
        const data = await response.json();
        setSavesList(data.saves || []);
      } else {
        console.error("Błąd podczas pobierania listy save'ów");
      }
    } catch (error) {
      console.error("Błąd podczas ładowania save'ów:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upload jednego base64 obrazu na dysk jako plik (multipart - omija limit body
   * JSON, który dla base64 ~MB powodował HTTP 500 przy zapisie). Zwraca publiczny
   * URL pliku albo null gdy upload się nie powiódł (best-effort, nie psuje zapisu).
   */
  const uploadSaveImage = async (
    saveId: string,
    userId: string,
    name: string,
    dataUrl: string
  ): Promise<string | null> => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `${name}.${dataUrlExtension(dataUrl)}`;
      const formData = new FormData();
      formData.append('images', blob, fileName);

      const res = await fetch(
        `/api/game-save/upload-images?saveId=${saveId}&userId=${userId}`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.images?.[0]?.url ?? null;
    } catch (e) {
      console.warn(`⚠️ Upload obrazu ${name} nie powiódł się:`, e);
      return null;
    }
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      setError("Nazwa save'u jest wymagana");
      return;
    }

    if (!currentData) {
      setError('Brak danych do zapisania');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const userId = 'local';
      // saveId generujemy klient-side, by uploadować obrazy do jego folderu PRZED
      // zapisem save.json - wtedy w save.json są lekkie URL-e, nie ciężki base64.
      const saveId = `save_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 1. Zbierz base64 obrazy z historii (intro w content + obrazy scen w generatedImages).
      const imageRefs = collectSaveImages(currentData.messages);

      // 2. Upload best-effort (tylko gdy checkbox "zapisz obrazy"). Każdy osobno:
      //    pojedynczy plik nie zbliża się do limitu body, a awaria jednego degraduje
      //    tylko ten obraz zamiast wywalać cały zapis.
      const urlByName: Record<string, string | null> = {};
      if (saveImages) {
        for (const ref of imageRefs) {
          urlByName[ref.name] = await uploadSaveImage(
            saveId,
            userId,
            ref.name,
            ref.dataUrl
          );
        }
      }

      // 3. Podmień base64 na URL-e plików (lub usuń) + bezpiecznik wycinający wszelkie
      //    pozostałe base64 - payload NIGDY nie niesie base64, więc zapis nie przekracza
      //    limitu body. Wczytanie działa: markdown/generatedImages renderują z URL pliku.
      const messagesWithUrls = applySaveImageUrls(
        currentData.messages,
        imageRefs,
        urlByName
      );
      const safeMessages = sanitizeHistoryForApi(
        messagesWithUrls as unknown as LibMessage[]
      );

      // 4. Katalog obrazów save'u (miniatura + licznik) - tylko z uploadowanych URL-i.
      const images: FullGameSave['images'] = imageRefs
        .filter((ref) => urlByName[ref.name])
        .map((ref, idx) => ({
          id: `img_${ref.msgIndex}_${idx}`,
          url: urlByName[ref.name] as string,
          gcsPath: urlByName[ref.name] as string,
          prompt: '',
          timestamp: new Date().toISOString(),
          type: 'illustration',
          messageId: `msg_${ref.msgIndex}`,
        }));

      const sessionCost = currentData.aiSettings?.costControl?.sessionCost || 0;

      const saveData = {
        id: saveId,
        name: saveName,
        userId,
        messages: safeMessages,
        images,
        gameSettings: {
          aiSettings: saveSettings
            ? currentData.aiSettings
            : ({} as AISettings),
        },
        // Bezpiecznik limitu body 10 MB: miniatury ekwipunku / portrety to base64
        // (~MB każdy) w żywym stanie - bez tego payload zapisu rośnie > 10 MB → HTTP 500.
        // Obrazy wracają po wczytaniu (hydracja z IndexedDB + regeneracja miniatur).
        characters: currentData.characters
          .map((c) => sanitizeCharacterForApi(c))
          .filter((c): c is Character => c !== null),
        activeCharacterId: currentData.activeCharacterId,
        hotSeatConfig: currentData.hotSeatConfig,
        campaigns: currentData.campaigns,
        activeCampaignId: currentData.activeCampaignId,
        npcs: currentData.npcs.map((n) => sanitizeNpcForApi(n)),
        locations: currentData.locations,
        currentLocationId: currentData.currentLocationId,
        pdfMemory: currentData.pdfMemory,
        notes: saveNotes,
        sessionStartTime: currentData.sessionStartTime,
        sessionCost,
      };

      const response = await fetch('/api/game-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Save zapisany:', result);
        alert(
          `Save "${saveName}" został zapisany pomyślnie!\nRozmiar: ${result.formattedSize}\nWiadomości: ${result.messageCount}\nObrazy: ${result.imageCount}`
        );
        onClose();
        // Po udanym zapisie: powiadom rodzica (np. reset do kreatora dla "Nowej przygody")
        onSaved?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się zapisać save'u");
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (save: SaveMeta) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/game-save?saveId=${save.id}&userId=${save.userId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (onLoad) {
          onLoad(data.save);
        }
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się wczytać save'u");
      }
    } catch (error) {
      console.error('Błąd podczas wczytywania:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (saveId: string) => {
    try {
      const response = await fetch(
        `/api/game-save?saveId=${saveId}&userId=local`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        alert('Save usunięty pomyślnie');
        loadSavesList();
        setShowDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się usunąć save'u");
      }
    } catch (error) {
      console.error('Błąd podczas usuwania:', error);
      alert(
        `Błąd podczas usuwania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
      );
    }
  };

  const handleExport = async (save: SaveMeta) => {
    try {
      const response = await fetch(
        `/api/game-save?saveId=${save.id}&userId=${save.userId}`
      );

      if (response.ok) {
        const data = await response.json();
        FullGameSaveManager.exportToFile(data.save);
      } else {
        alert("Nie udało się eksportować save'u");
      }
    } catch (error) {
      console.error('Błąd podczas eksportu:', error);
      alert("Błąd podczas eksportu save'u");
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const save = await FullGameSaveManager.importFromFile(file);
      if (save && onLoad) {
        onLoad(save);
        onClose();
      } else {
        alert("Nie udało się zaimportować save'u");
      }
    } catch (error) {
      console.error('Błąd podczas importu:', error);
      alert("Błąd podczas importu save'u");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#050608]/80 flex items-center justify-center z-50 p-4">
      <div className="relative w-[90vw] max-w-[1440px] max-h-[90vh] overflow-hidden flex flex-col border border-brass/30 bg-gradient-to-br from-[#14110c] to-[#0a0c0f] shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        {/* Narożniki déco */}
        <span className="absolute top-3 left-3 w-[30px] h-[30px] border-t-2 border-l-2 border-brass/55 pointer-events-none" />
        <span className="absolute top-3 right-3 w-[30px] h-[30px] border-t-2 border-r-2 border-brass/55 pointer-events-none" />
        <span className="absolute bottom-3 left-3 w-[30px] h-[30px] border-b-2 border-l-2 border-brass/55 pointer-events-none" />
        <span className="absolute bottom-3 right-3 w-[30px] h-[30px] border-b-2 border-r-2 border-brass/55 pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-brass/25">
          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
              {mode === 'save'
                ? 'Archiwum · zapis stanu'
                : 'Archiwum · wczytanie'}
            </div>
            <h2 className="mt-1 font-display uppercase tracking-[0.1em] text-2xl text-foreground">
              {mode === 'save' ? 'Zapisz grę' : 'Wczytaj grę'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-brass transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 border-l-2 border-destructive bg-destructive/10 px-4 py-3 font-special-elite text-xs uppercase tracking-[0.08em] text-destructive">
              {error}
            </div>
          )}

          {mode === 'save' ? (
            /* SAVE MODE */
            <div className="space-y-4">
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-2">
                  Nazwa zapisu *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Np. 'Rozdział 1 - Po śladach kultu'"
                  className="w-full px-4 py-2 bg-input border border-brass/30 rounded-md font-special-elite text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-2">
                  Notatki (opcjonalne)
                </label>
                <textarea
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="Dodaj notatki o tym zapisie..."
                  className="w-full px-4 py-2 bg-input border border-brass/30 rounded-md font-special-elite text-foreground focus:border-primary focus:outline-none min-h-[100px]"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveImages}
                    onChange={(e) => setSaveImages(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-special-elite text-sm text-foreground">
                    {/* Liczymy TĄ SAMĄ funkcją co zapis (collectSaveImages):
                        obrazy inline w treści (intro `![Wprowadzenie](data:)`) +
                        generatedImages + illustrations. Wcześniej liczyło tylko
                        generatedImages → intro nie wpadał → "(0)" mimo obrazu. */}
                    Zapisz wygenerowane obrazy (
                    {currentData
                      ? collectSaveImages(currentData.messages).length
                      : 0}
                    )
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveSettings}
                    onChange={(e) => setSaveSettings(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-special-elite text-sm text-foreground">
                    Zapisz ustawienia AI
                  </span>
                </label>
              </div>
              <div className="relative border border-brass/30 bg-[#16130f] p-4">
                <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/40" />
                <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/40" />
                <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-3 flex items-center gap-2">
                  <Info size={14} />
                  Zawartość zapisu
                </h3>
                <ul className="font-special-elite text-xs text-muted-foreground tracking-[0.04em] space-y-2">
                  <li className="flex items-center justify-between">
                    <span>Historia rozmowy</span>
                    <span className="text-foreground">
                      {currentData?.messages.length || 0} wiadomości
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Postacie</span>
                    <span className="text-foreground">
                      {currentData?.characters.length || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Kampanie</span>
                    <span className="text-foreground">
                      {currentData?.campaigns.length || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>NPC</span>
                    <span className="text-foreground">
                      {currentData?.npcs.length || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Lokacje</span>
                    <span className="text-foreground">
                      {currentData?.locations.length || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>PDF Memory (zasady i przygoda)</span>
                    <span className="text-primary">✓</span>
                  </li>
                  {saveImages && (
                    <li className="flex items-center justify-between">
                      <span>Wygenerowane obrazy</span>
                      <span className="text-primary">✓</span>
                    </li>
                  )}
                  {saveSettings && (
                    <li className="flex items-center justify-between">
                      <span>Ustawienia AI</span>
                      <span className="text-primary">✓</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            /* LOAD MODE */
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={loadSavesList}
                  disabled={isLoading}
                  className="px-4 py-2 border border-primary bg-primary text-[#04110f] font-display uppercase tracking-[0.12em] text-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                >
                  <FolderOpen size={16} />
                  Odśwież listę
                </button>

                <label className="px-4 py-2 border border-brass/50 bg-brass/[0.04] text-brass font-display uppercase tracking-[0.12em] text-sm hover:bg-brass/10 cursor-pointer flex items-center gap-2">
                  <Upload size={16} />
                  Importuj z pliku
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
              {isLoading ? (
                <div className="text-center py-8 font-special-elite uppercase tracking-[0.18em] text-sm text-muted-foreground">
                  Ładowanie zapisów...
                </div>
              ) : savesList.length === 0 ? (
                <div className="relative border border-dashed border-brass/30 bg-[#1f1a14]/40 py-10 text-center">
                  <p className="font-display uppercase tracking-[0.16em] text-brass text-sm">
                    Brak zapisanych gier
                  </p>
                  <p className="font-serif italic text-muted-foreground mt-1">
                    Zapisz swoją pierwszą kronikę
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savesList.map((save, idx) => (
                    <div
                      key={save.id}
                      className="relative border border-brass/25 bg-[#16130f] hover:border-primary/50 hover:bg-[#0e1413] transition-colors p-4"
                    >
                      <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-brass/40" />
                      <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-brass/40" />

                      <div className="flex gap-4 mb-2">
                        {/* Miniatura sceny (makieta 15) */}
                        <div className="flex-none w-24 h-16 border border-brass/30 bg-[#0a0c0f] overflow-hidden flex items-center justify-center">
                          {save.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={save.thumbnail}
                              alt="Miniatura sceny"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-special-elite text-[13px] uppercase tracking-[0.18em] text-muted-foreground/60">
                              Scena
                            </span>
                          )}
                        </div>

                        {/* Treść karty */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-foreground tracking-[0.06em] truncate">
                              {save.name}
                            </h3>
                            <div className="flex-none flex items-center gap-2">
                              {idx === 0 && (
                                <span className="font-special-elite text-[13px] uppercase tracking-[0.14em] text-primary border border-primary/50 px-1.5 py-0.5">
                                  ● Aktualny
                                </span>
                              )}
                              <span className="font-special-elite text-[14px] uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">
                                {formatRelativeDate(save.createdAt)}
                              </span>
                            </div>
                          </div>

                          {save.sceneFragment && (
                            <p className="font-serif italic text-sm text-muted-foreground mt-1 line-clamp-2">
                              {save.sceneFragment}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 font-special-elite text-[14px] uppercase tracking-[0.06em] text-muted-foreground">
                            {save.chapterTitle && (
                              <span className="text-brass/80">
                                {save.chapterTitle}
                              </span>
                            )}
                            {save.characterName && (
                              <span>{save.characterName}</span>
                            )}
                            {formatGameTime(save.durationMinutes) && (
                              <span>
                                Czas gry {formatGameTime(save.durationMinutes)}
                              </span>
                            )}
                            {typeof save.hp === 'number' && (
                              <span>
                                PŻ {save.hp}
                                {save.maxHp ? `/${save.maxHp}` : ''}
                              </span>
                            )}
                            {typeof save.san === 'number' && (
                              <span>
                                PR {save.san}
                                {save.maxSan ? `/${save.maxSan}` : ''}
                              </span>
                            )}
                            <span className="text-muted-foreground/60">
                              {save.formattedSize} · {save.imageCount} ilustr.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleLoad(save)}
                          className="flex-1 px-3 py-2 border border-primary bg-primary text-[#04110f] font-display uppercase tracking-[0.12em] text-xs hover:brightness-110"
                        >
                          Wczytaj
                        </button>
                        <button
                          onClick={() => handleExport(save)}
                          className="px-3 py-2 border border-brass/50 bg-brass/[0.04] text-brass hover:bg-brass/10 text-xs"
                          title="Eksportuj do pliku"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(save.id)}
                          className="px-3 py-2 border border-destructive/50 bg-destructive/[0.06] text-destructive hover:bg-destructive/15 text-xs"
                          title="Usuń"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {showDeleteConfirm === save.id && (
                        <div className="mt-3 border-l-2 border-destructive bg-destructive/10 p-3">
                          <p className="font-special-elite text-xs text-destructive mb-2 tracking-[0.04em]">
                            Czy na pewno chcesz usunąć ten zapis? Tej operacji
                            nie można cofnąć.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(save.id)}
                              className="px-3 py-1.5 border border-destructive bg-destructive text-destructive-foreground font-display uppercase tracking-[0.12em] text-xs hover:bg-destructive/90"
                            >
                              Usuń
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1.5 border border-brass/40 text-muted-foreground font-display uppercase tracking-[0.12em] text-xs hover:text-brass hover:border-brass/60"
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-brass/25">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-brass/40 text-muted-foreground font-display uppercase tracking-[0.16em] text-sm hover:text-brass hover:border-brass/60 transition-colors"
          >
            Anuluj
          </button>

          {mode === 'save' && (
            <button
              onClick={handleSave}
              disabled={isSaving || !saveName.trim()}
              className="px-6 py-2 border border-primary bg-primary text-[#04110f] font-display uppercase tracking-[0.16em] text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Zapisywanie...' : 'Zapisz grę'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
