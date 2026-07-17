'use client';

import type { ReactNode, FC } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, FolderOpen } from 'lucide-react';

interface DeskLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export const DeskLayout: FC<DeskLayoutProps> = ({
  children,
  sidebar,
  className,
}) => {
  const [mobileShowDossier, setMobileShowDossier] = useState(false);

  return (
    <div
      id="investigator-desk"
      className={cn('relative w-screen h-screen overflow-hidden', className)}
      style={{
        backgroundImage: "url('/textures/desk_wood.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Warm lighting overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 10% 20%, rgba(255, 180, 100, 0.4) 0%, transparent 50%)',
        }}
      />

      {/* DECORATIVE PROPS - Removed per user request (2026-01-20) 
          To be reintroduced later after proper asset cleanup.
      */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {/* Placeholder for future props */}
      </div>

      {/* MAIN CONTENT: Two Column Layout (z-10 sits ON TOP of props) */}
      <main
        className="relative z-10 w-full h-full p-4 md:p-6 grid gap-4 md:gap-8"
        style={{ gridTemplateColumns: '70% 30%' }}
      >
        {/* === LEFT PANEL: INVESTIGATOR'S LOG (Open Book) === */}
        <section
          className={cn(
            'journal-panel min-h-0 relative transform -rotate-0.5 transition-all duration-500',
            mobileShowDossier ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Book Container */}
          <div className="book-container w-full h-full flex shadow-2xl">
            {/* Leather Spine */}
            <div
              className="book-spine w-10 md:w-14 h-full rounded-l-md flex-shrink-0"
              style={{
                background:
                  'linear-gradient(to right, #3a1b1b 0%, #5e2c2c 50%, #4a2323 100%)',
                boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.3)',
              }}
            />

            {/* Pages (Paper) */}
            <div
              className="book-pages flex-1 rounded-r-sm flex flex-col relative overflow-hidden"
              style={{
                background: '#e8dfc8',
                boxShadow:
                  'inset 0 0 30px rgba(0,0,0,0.15), 5px 5px 20px rgba(0,0,0,0.4)',
              }}
            >
              {/* Paper texture overlay */}
              <div
                className="absolute inset-0 opacity-30 mix-blend-multiply pointer-events-none"
                style={{
                  backgroundImage:
                    'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
                }}
              />

              {/* Center fold shadow */}
              <div
                className="absolute top-0 bottom-0 left-0 w-6 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 100%)',
                }}
              />

              {/* Bookmark */}
              <div
                className="absolute -top-2 right-12 w-5 h-20 rounded-b-sm z-20"
                style={{
                  background: '#5e2c2c',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                }}
              />

              {/* Content wrapper */}
              <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </section>

        {/* === RIGHT PANEL: CHARACTER DOSSIER (Manila Folder) === */}
        <section
          className={cn(
            'dossier-panel flex-1 min-h-0 relative transform rotate-1',
            mobileShowDossier ? 'flex' : 'hidden md:flex'
          )}
        >
          {/* Folder Container */}
          <div
            className="manila-folder w-full h-full relative flex flex-col rounded-lg overflow-visible"
            style={{
              background: '#dccc9a',
              boxShadow: '5px 5px 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* Folder Tab */}
            <div
              className="folder-tab absolute -top-6 right-6 px-4 md:px-6 py-2 rounded-t-md z-10"
              style={{
                background: '#e6d5a7',
                border: '1px solid #c5b583',
                borderBottom: 'none',
                fontFamily: "'Special Elite', monospace",
              }}
            >
              <span className="text-[#5e5444] font-bold text-xs md:text-sm tracking-wider uppercase">
                CHARACTER DOSSIER
              </span>
            </div>

            {/* Side Tab */}
            <div
              className="absolute -right-1 top-1/3 w-6 py-8 rounded-r-md z-10 flex items-center justify-center"
              style={{
                background: '#e6d5a7',
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontFamily: "'Special Elite', monospace",
              }}
            >
              <span className="text-[#5e5444] font-bold text-[14px] tracking-widest uppercase">
                CHARACTER DOSSIER
              </span>
            </div>

            {/* Paper Sheet inside folder */}
            <div
              className="paper-sheet absolute inset-3 md:inset-4 rounded-sm flex flex-col overflow-hidden transform -rotate-[0.5deg]"
              style={{
                background: '#fdfbf7',
                boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {/* Paper texture */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none"
                style={{
                  backgroundImage:
                    'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
                }}
              />

              {/* Coffee stain decoration */}
              <div
                className="absolute top-1/4 right-8 w-24 h-24 rounded-full opacity-20 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle, #8b5a2b 0%, transparent 70%)',
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6 min-h-0 overflow-auto">
                {sidebar}
              </div>
            </div>
          </div>

          {/* Revolver prop */}
          <div
            className="absolute -bottom-4 -right-4 w-48 h-36 pointer-events-none opacity-80 hidden md:block"
            style={{
              backgroundImage: "url('/textures/revolver_silhouette.png')",
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'bottom right',
              transform: 'rotate(15deg)',
              filter: 'drop-shadow(3px 3px 5px rgba(0,0,0,0.5))',
            }}
          />
        </section>
      </main>

      {/* Mobile Toggle Button */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <button
          onClick={() => setMobileShowDossier(!mobileShowDossier)}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center"
          style={{
            background: '#5c4a35',
            border: '2px solid #f0e6d2',
            color: '#f0e6d2',
          }}
        >
          {mobileShowDossier ? (
            <BookOpen size={24} />
          ) : (
            <FolderOpen size={24} />
          )}
        </button>
      </div>
    </div>
  );
};
