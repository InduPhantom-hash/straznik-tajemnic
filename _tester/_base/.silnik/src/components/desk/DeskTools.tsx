"use client";

import type { ChangeEvent, FC } from 'react';
import { useEffect, useState } from 'react';
import { Settings, User, BookOpen, Dices, Package, FileText, Users } from 'lucide-react';
import { CthulhuLogo } from '../ui/cthulhu-logo';
import { CharacterDialog } from '../dialogs/CharacterDialog';
import { CharacterSheet } from '../ui/character-sheet';
import { SessionJournal } from '../ui/session-journal';
import { DiceDialog } from '../dialogs/DiceDialog';
import { GMToolsPanel } from '../ui/gm-tools-panel';
import { SessionZeroModal } from '../ui/session-zero-modal';
import { AdventureSelector } from '../ui/adventure-selector';
import { EquipmentModal } from '../ui/equipment-modal';
import { Character } from '@/lib/types';
import { AdventureContext, CustomAdventure } from '@/lib/adventures-data';
import { cn } from '@/lib/utils';
import { SettingsModal } from '../ui/settings-modal';

interface DeskToolsProps {
  activeCharacter?: Character;
  characters?: Character[];
  onCharacterSwitch?: (character: Character) => void;
  onCharacterCreate?: () => void;
  onCharacterManage?: () => void;
  onUpdateCharacter?: (character: Character) => void;
  handleSendMessage?: (message: string) => void;
  activeGameState?: any;
  pdfMemory?: any;
  handleFileChange?: (e: ChangeEvent<HTMLInputElement>, type: 'rules' | 'adventure') => void;
  isUploading?: boolean;
  uploadProgress?: number;
  handleGenerateRandomCharacters?: () => void;
  voiceFeatureAvailable?: boolean;
  voiceEnabled?: boolean;
  setVoiceEnabled?: (enabled: boolean) => void;
  isTTSEnabled?: boolean;
  setIsTTSEnabled?: (enabled: boolean) => void;
  queueStatus?: { queueLength: number; totalCharacters: number; processing: boolean };
  onStartNewGame?: () => void;
  onOpenGameSession?: () => void;
  onOpenGMTools?: (tool: string) => void;
  onSaveGame?: () => void;
  onLoadGame?: () => void;
  onOpenHotSeat?: () => void;
  onSessionZeroComplete?: () => void;
  registerOpenSessionZero?: (openFn: () => void) => void;
  registerOpenAdventureSelector?: (openFn: () => void) => void;
  onAdventureSelect?: (adventure: any) => void;
  customAdventures?: CustomAdventure[];
  onUploadAdventure?: (file: File) => Promise<CustomAdventure | null>;
  onDeleteAdventure?: (id: string) => Promise<void>;
  isUploadingAdventure?: boolean;
}

export const DeskTools: FC<DeskToolsProps> = ({
  activeCharacter,
  characters,
  onCharacterSwitch,
  onCharacterCreate,
  onCharacterManage,
  onUpdateCharacter,
  handleSendMessage,
  activeGameState,
  pdfMemory,
  handleFileChange,
  isUploading,
  uploadProgress,
  handleGenerateRandomCharacters,
  voiceFeatureAvailable,
  voiceEnabled,
  setVoiceEnabled,
  isTTSEnabled,
  setIsTTSEnabled,
  queueStatus,
  onStartNewGame,
  onOpenGameSession,
  onOpenGMTools,
  onSaveGame,
  onLoadGame,
  onOpenHotSeat,
  onSessionZeroComplete,
  registerOpenSessionZero,
  registerOpenAdventureSelector,
  onAdventureSelect,
  customAdventures,
  onUploadAdventure,
  onDeleteAdventure,
  isUploadingAdventure,
}) => {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showSessionZero, setShowSessionZero] = useState(false);
  const [showAdventureSelector, setShowAdventureSelector] = useState(false);
  const [adventureContext, setAdventureContext] = useState<AdventureContext | null>(null);
  const [unseenJournalCount, setUnseenJournalCount] = useState(0);

  useEffect(() => {
    if (!activeCharacter) return;
    const storageKey = `unseen_${activeCharacter.id}`;
    const stored = localStorage.getItem(storageKey);
    const unseenData = stored ? JSON.parse(stored) : { journalSeen: 0 };
    const journalCount = activeCharacter.journal?.length || 0;
    const newJournal = Math.max(0, journalCount - unseenData.journalSeen);
    setUnseenJournalCount(newJournal);
  }, [activeCharacter, activeCharacter?.journal?.length]);

  useEffect(() => {
    if (!activeCharacter) return;
    const storageKey = `unseen_${activeCharacter.id}`;
    if (openDialog === 'journal') {
      const journalCount = activeCharacter.journal?.length || 0;
      const stored = localStorage.getItem(storageKey);
      const unseenData = stored ? JSON.parse(stored) : { journalSeen: 0, inventorySeen: 0 };
      localStorage.setItem(storageKey, JSON.stringify({ ...unseenData, journalSeen: journalCount }));
      setUnseenJournalCount(0);
    }
  }, [openDialog, activeCharacter]);

  useEffect(() => {
    if (registerOpenSessionZero) registerOpenSessionZero(() => setShowSessionZero(true));
  }, [registerOpenSessionZero]);

  useEffect(() => {
    if (registerOpenAdventureSelector) registerOpenAdventureSelector(() => setShowAdventureSelector(true));
  }, [registerOpenAdventureSelector]);

  const playerTools = [
    { id: "character", icon: User, label: "AKTA OSOBOWE" },
    { id: "equipment", icon: Package, label: "EKWIPUNEK" },
    { id: "journal", icon: BookOpen, label: "DZIENNIK" },
    { id: "dice", icon: Dices, label: "KOŚCI" }
  ];

  return (
    <>
      <div className="flex flex-col text-[#1a1a1a] font-special-elite space-y-8">
        
        {/* Active Character Status (Printed directly on page style) */}
        {activeCharacter && (
            <div className="relative pb-4 border-b-2 border-dotted border-[#8b5a2b]/30">
              <div className="flex items-start gap-4">
                  {/* Portrait - Paperclip style */}
                  <div className="relative transform -rotate-2 shadow-md">
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-8 bg-zinc-400 rounded-full border-2 border-zinc-500 z-10"></div>
                     {activeCharacter.portraitUrl ? (
                         <img src={activeCharacter.portraitUrl} className="w-20 h-20 object-cover border-4 border-white sepia-[0.3]" alt="Badacz" />
                     ) : (
                         <div className="w-20 h-20 bg-[#d7ccb9] border-4 border-white flex items-center justify-center text-3xl text-[#5c4a35]">?</div>
                     )}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-xs font-bold uppercase tracking-widest text-[#5c4a35]">RAPORT STANU</div>
                        <Settings 
                            size={14} 
                            className="cursor-pointer text-[#5c4a35] hover:rotate-90 transition-transform opacity-50 hover:opacity-100" 
                            onClick={() => setOpenDialog('settings')}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-courier-prime">
                        <div className="flex justify-between items-baseline border-b border-[#5c4a35]/20">
                          <span className="text-xs uppercase text-[#5c4a35]">ŻYCIE</span>
                          <span className="font-bold text-lg text-[#b94e48]">{activeCharacter.hp}</span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-[#5c4a35]/20">
                          <span className="text-xs uppercase text-[#5c4a35]">POCZYTALNOŚĆ</span>
                          <span className="font-bold text-lg text-[#4a5c9a]">{activeCharacter.san}</span>
                        </div>
                    </div>

                    {/* Quick Switcher */}
                    {characters && characters.length > 0 && (
                        <select
                            className="mt-3 w-full bg-transparent border-none text-sm font-bold cursor-pointer hover:bg-black/5 p-1 rounded -ml-1"
                            value={activeCharacter.id}
                            style={{ fontStyle: 'italic' }}
                            onChange={(e) => {
                                const char = characters.find(c => c.id === e.target.value);
                                if (char && onCharacterSwitch) onCharacterSwitch(char);
                            }}
                        >
                            {characters.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                  </div>
              </div>
            </div>
        )}

        {/* Tools Section */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold border-b-2 border-[#1a1a1a] inline-block pr-6 mb-2 tracking-widest uppercase">
              NARZĘDZIA
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {playerTools.map((item) => {
                const Icon = item.icon;
                const badgeCount = item.id === 'journal' ? unseenJournalCount : 0;
                return (
                    <button
                      key={item.id}
                      onClick={() => setOpenDialog(item.id)}
                      className="group flex flex-col items-center justify-center p-3 border-2 border-[#d3c4a9] bg-[#fcfbf9] hover:border-[#5c4a35] hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#d3c4a9] group-hover:bg-[#5c4a35] transition-colors"></div>
                      <Icon className="w-6 h-6 mb-2 text-[#5c4a35] group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-xs tracking-wide text-[#1a1a1a]">{item.label}</span>
                      
                      {badgeCount > 0 && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-[#b94e48] rounded-full animate-pulse"></div>
                      )}
                    </button>
                )
              })}
            </div>
        </div>

        {/* Evidence / Files Section */}
        <div className="space-y-3">
            <h3 className="text-sm font-bold border-b-2 border-[#1a1a1a] inline-block pr-6 mb-2 tracking-widest uppercase">
              DOWODY RZECZOWE
            </h3>
            
            <div className="font-courier-prime text-sm space-y-3 pl-2">
                <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80">
                   <div className={`w-4 h-4 border-2 border-[#1a1a1a] flex items-center justify-center ${pdfMemory?.rulesUrl ? 'bg-[#1a1a1a]' : ''}`}>
                      {pdfMemory?.rulesUrl && <span className="text-[#fdfbf7] text-xs">✓</span>}
                   </div>
                   <div className="flex-1 border-b border-dotted border-[#1a1a1a]/40 pb-1 flex justify-between">
                      <span>PODRĘCZNIK (ZASADY)</span>
                      {!pdfMemory?.rulesUrl && (
                        <button 
                            onClick={() => (window as any).rulesUploadInput?.click()}
                            className="text-[#b94e48] text-xs font-bold hover:underline"
                        >
                            [DODAJ]
                        </button>
                      )}
                   </div>
                </div>

                <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80">
                   <div className={`w-4 h-4 border-2 border-[#1a1a1a] flex items-center justify-center ${pdfMemory?.adventureUrl ? 'bg-[#1a1a1a]' : ''}`}>
                      {pdfMemory?.adventureUrl && <span className="text-[#fdfbf7] text-xs">✓</span>}
                   </div>
                   <div className="flex-1 border-b border-dotted border-[#1a1a1a]/40 pb-1 flex justify-between">
                      <span>AKTA SPRAWY (PDF)</span>
                      {!pdfMemory?.adventureUrl && (
                        <button 
                            onClick={() => (window as any).adventureUploadInput?.click()}
                            className="text-[#b94e48] text-xs font-bold hover:underline"
                        >
                            [DODAJ]
                        </button>
                      )}
                   </div>
                </div>
            </div>

             {/* Hidden inputs */}
             <input type="file" id="rules-upload" className="hidden" accept=".pdf" 
                ref={el => { if(el) (window as any).rulesUploadInput = el; }}
                onChange={e => handleFileChange && handleFileChange(e, 'rules')} />
             <input type="file" id="adventure-upload" className="hidden" accept=".pdf"
                ref={el => { if(el) (window as any).adventureUploadInput = el; }}
                onChange={e => handleFileChange && handleFileChange(e, 'adventure')} />
        </div>

        {/* Management Stamp */}
        <div className="mt-8 relative">
             <div className="absolute inset-0 border-4 border-[#5c4a35]/20 transform rotate-1 pointer-events-none"></div>
             <div className="p-4 relative z-10">
                <div className="text-xs font-bold uppercase tracking-widest text-[#5c4a35]/60 mb-3 text-center">KONTROLA SESJI</div>
                
                <div className="flex gap-4 mb-3">
                    <button onClick={onSaveGame} className="flex-1 text-xs font-bold uppercase tracking-widest text-[#1a1a1a] hover:underline flex items-center justify-center gap-1 group">
                        <span className="w-1 h-1 bg-[#1a1a1a] rounded-full group-hover:bg-[#b94e48]"></span> ZAPISZ
                    </button>
                    <button onClick={onLoadGame} className="flex-1 text-xs font-bold uppercase tracking-widest text-[#1a1a1a] hover:underline flex items-center justify-center gap-1 group">
                        <span className="w-1 h-1 bg-[#1a1a1a] rounded-full group-hover:bg-[#b94e48]"></span> WCZYTAJ
                    </button>
                </div>

                <div className="space-y-2 border-t border-[#5c4a35]/20 pt-3">
                    <button onClick={() => setShowAdventureSelector(true)} className="w-full text-left text-xs font-courier-prime hover:text-[#b94e48] transition-colors">
                        ➜ Wybierz Scenariusz...
                    </button>
                    <button onClick={() => setShowSessionZero(true)} className="w-full text-left text-xs font-courier-prime hover:text-[#b94e48] transition-colors">
                        ➜ Protokół Sesji Zero...
                    </button>
                </div>
             </div>
        </div>

      </div>

      {openDialog === "settings" && <SettingsModal open={true} onClose={() => setOpenDialog(null)} />}
      <CharacterDialog open={openDialog === "character"} onOpenChange={o => !o && setOpenDialog(null)} activeCharacter={activeCharacter} characters={characters} onCharacterSwitch={onCharacterSwitch} onCharacterCreate={onCharacterCreate} onCharacterManage={onCharacterManage} />
      <CharacterSheet open={openDialog === "character"} onOpenChange={o => !o && setOpenDialog(null)} character={activeCharacter} onCharacterUpdate={onUpdateCharacter} characters={characters} onCharacterChange={onCharacterSwitch} />
      {openDialog === "journal" && activeCharacter && onUpdateCharacter && <SessionJournal character={activeCharacter} onUpdateCharacter={onUpdateCharacter} onClose={() => setOpenDialog(null)} />}
      {openDialog === "equipment" && activeCharacter && onUpdateCharacter && <EquipmentModal open={true} onOpenChange={o => !o && setOpenDialog(null)} character={activeCharacter} onCharacterUpdate={onUpdateCharacter} era={adventureContext?.yearRange?.split('-')[0] || '1920s'} adventureTheme={adventureContext?.title} />}
      <DiceDialog open={openDialog === "dice"} onOpenChange={o => !o && setOpenDialog(null)} activeCharacter={activeCharacter} onRollSendToChat={handleSendMessage} />
      <SessionZeroModal open={showSessionZero} onClose={() => setShowSessionZero(false)} adventureContext={adventureContext || undefined} onComplete={() => onSessionZeroComplete && onSessionZeroComplete()} />
      <AdventureSelector open={showAdventureSelector} onClose={() => setShowAdventureSelector(false)} onSelect={a => { setAdventureContext(a); localStorage.setItem('adventure_context', JSON.stringify(a)); if (onAdventureSelect) onAdventureSelect(a); setShowAdventureSelector(false); setTimeout(() => setShowSessionZero(true), 300); }} customAdventures={customAdventures} onUploadAdventure={onUploadAdventure} onDeleteAdventure={onDeleteAdventure} isUploading={isUploadingAdventure} />
    </>
  );
};
