"use client";

import type { ReactNode, FC } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CharacterDossierProps {
  children: ReactNode;
  className?: string;
  characterName?: string;
}

export const CharacterDossier: FC<CharacterDossierProps> = ({
  children,
  className,
  characterName
}) => {
  return (
    <section className={cn("character-dossier prop-container relative w-full h-full flex items-center justify-center", className)} style={{ "--rotation": "1.5deg" } as any}>
       <div className="manila-folder relative w-full h-[90%] bg-[#dccc9a] rounded-lg shadow-2xl border border-[#c5b583] flex flex-col p-2">
          {/* Folder Tab */}
          <div className="folder-tab absolute -top-8 right-8 bg-[#e6d5a7] px-8 py-2 rounded-t-lg border-t border-x border-[#c5b583] shadow-sm font-bold text-[#5e5444] tracking-widest text-sm z-0">
             AKTA: {characterName || 'NIEZNANY'}
          </div>

          {/* Paper Sheet - Clipped Inside */}
          <div className="paper-sheet clipped flex-1 bg-[#fdfbf7] shadow-[2px_2px_5px_rgba(0,0,0,0.1)] m-2 p-6 overflow-hidden relative rotate-[-0.5deg]">
             {/* Paper Texture */}
             <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply z-0" 
                  style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")'}}></div>

             {/* Header */}
             <div className="relative z-10">
                <header className="sheet-header flex justify-between items-start border-b-2 border-black/10 pb-4 mb-4">
                <div>
                    <h2 className="text-2xl font-special-elite font-bold text-[#1a1a1a] tracking-tighter">KARTA BADACZA</h2>
                    <p className="text-xs font-courier-prime opacity-60 uppercase tracking-widest">OFICJALNE DOKUMENTY ŚLEDZTWA</p>
                </div>
                <div className="stamp-mark border-4 border-red-800 text-red-800 font-bold px-2 py-1 transform -rotate-12 opacity-80 uppercase text-xs font-special-elite">
                    ŚCIŚLE TAJNE
                </div>
                </header>

                {/* Content (DeskTools / Children) */}
                <div className="h-[calc(100%-80px)] overflow-y-auto pr-2 custom-scrollbar relative">
                    {children}
                </div>
             </div>
          </div>
          
          {/* Weapon Overlay (Prop) */}
          <div className="prop-weapon revolver absolute bottom-[-20px] right-[-20px] w-64 h-48 pointer-events-none opacity-30 bg-contain bg-no-repeat bg-bottom-right rotate-12 mix-blend-multiply" 
               style={{backgroundImage: "url('/textures/revolver_silhouette.png')"}}>
          </div>
       </div>
    </section>
  );
};
