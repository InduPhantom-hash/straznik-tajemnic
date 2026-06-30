"use client";

import type { ReactNode, FC } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface InvestigatorLogProps {
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
}

export const InvestigatorLog: FC<InvestigatorLogProps> = ({ 
  children, 
  className,
  isOpen = true
}) => {
  return (
    <section className={cn("journal-book prop-container relative w-full h-full flex flex-col items-center justify-center perspective-[1000px]", className)} style={{ "--rotation": "-2deg" } as any}>
      <div className="book-cover relative w-full max-w-5xl h-[90%] bg-[#5e2c2c] rounded-md shadow-2xl flex border-2 border-[#3a1b1b]">
        {/* Spine */}
        <div className="book-spine w-12 h-full bg-[#4a2323] rounded-l-md border-r border-[#3a1b1b] shadow-inner" />
        
        {/* Pages Container - The "Open Book" */}
        <div className="book-pages open flex-1 bg-[#e8dfc8] flex rounded-r-md overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]">
           {/* Paper Texture Overlay */}
           <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply z-0" 
                style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")'}}></div>
           
           {/* Center Fold Shadow */}
           <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none mix-blend-multiply z-10" />

           {/* Content */}
           <div className="relative z-20 w-full h-full">
                {children}
           </div>
        </div>
      </div>
    </section>
  );
};
