'use client';

/**
 * DocumentViewer - Interaktywny diegetyczny czytnik dokumentów (P1)
 *
 * Wykorzystuje OpenSeadragon (BSD-3) do bezstratnego przybliżania (Deep Zoom),
 * przesuwania (pan & zoom) i badania detali: odręcznych dopisków, pieczęci,
 * mikro-śladów i planów bez rozmycia.
 *
 * Posiada diegetyczny pasek narzędzi Dark Art Déco oraz filtry starzenia papieru CSS:
 * - 'none': oryginalny skan
 * - 'vintage-1920': sepia, pożółkły pergamin, delikatne ziarno i ciepły odcień lat 20.
 * - 'prl-1970': matowy papier maszynowy, podbity kontrast powielacza/ksero
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import OpenSeadragon from 'openseadragon';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';

export type PaperAgingFilter = 'none' | 'vintage-1920' | 'prl-1970';

interface DocumentViewerProps {
  imageUrl: string;
  title?: string;
  docTypeLabel?: string;
  className?: string;
  initialFilter?: PaperAgingFilter;
  onFactDiscovered?: (factSummary: string) => void;
  evidenceFact?: string;
}

export function DocumentViewer({
  imageUrl,
  title,
  docTypeLabel,
  className = '',
  initialFilter = 'vintage-1920',
  onFactDiscovered,
  evidenceFact,
}: DocumentViewerProps) {
  const t = useTranslations('DocumentViewer');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);

  const [filter, setFilter] = useState<PaperAgingFilter>(initialFilter);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [factLogged, setFactLogged] = useState(false);

  // Inicjalizacja OpenSeadragon
  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    const viewer = OpenSeadragon({
      element: containerRef.current,
      showNavigationControl: false, // Własny diegetyczny pasek sterowania
      showNavigator: false,
      tileSources: {
        type: 'image',
        url: imageUrl,
      },
      animationTime: 0.4,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 4,
      minZoomImageRatio: 0.8,
      visibilityRatio: 1,
      zoomPerScroll: 1.25,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
      },
    });

    viewer.addHandler('open', () => {
      setIsLoading(false);
    });

    viewer.addHandler('open-failed', () => {
      setIsLoading(false);
    });

    viewerRef.current = viewer;

    // Zasada Zero-Effort Ledger: badanie rekwizytu automatycznie rejestruje fakt w Dossier
    if (evidenceFact && onFactDiscovered && !factLogged) {
      onFactDiscovered(evidenceFact);
      setFactLogged(true);
    }

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl, evidenceFact, onFactDiscovered, factLogged]);

  // Kontrolki nawigacji
  const handleZoomIn = useCallback(() => {
    if (!viewerRef.current) return;
    const currentZoom = viewerRef.current.viewport.getZoom();
    viewerRef.current.viewport.zoomTo(currentZoom * 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!viewerRef.current) return;
    const currentZoom = viewerRef.current.viewport.getZoom();
    viewerRef.current.viewport.zoomTo(currentZoom * 0.7);
  }, []);

  const handleReset = useCallback(() => {
    if (!viewerRef.current) return;
    viewerRef.current.viewport.goHome();
    viewerRef.current.viewport.setRotation(0);
  }, []);

  const handleRotate = useCallback(() => {
    if (!viewerRef.current) return;
    const currentRotation = viewerRef.current.viewport.getRotation();
    viewerRef.current.viewport.setRotation((currentRotation + 90) % 360);
  }, []);

  // Klasy filtrów starzenia papieru CSS
  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'vintage-1920':
        return {
          filter: 'sepia(0.55) contrast(1.15) brightness(0.92) saturate(1.1)',
        };
      case 'prl-1970':
        return {
          filter: 'grayscale(0.35) contrast(1.35) brightness(0.98)',
        };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <div
      className={`relative flex flex-col border border-brass/35 bg-[#120f0c] shadow-2xl rounded-sm overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 bg-black/95' : className
      }`}
    >
      {/* Pasek nagłówka dokumentu */}
      <div className="flex items-center justify-between border-b border-brass/25 bg-[#181410] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brass" />
          <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-amber-200 truncate max-w-[280px]">
            {title || t('defaultTitle')}
          </span>
          {docTypeLabel && (
            <span className="inline-flex items-center text-[10px] font-mono uppercase bg-brass/10 text-brass border border-brass/30 px-1.5 py-0.5 rounded">
              {docTypeLabel}
            </span>
          )}
        </div>

        {/* Przełącznik filtru starzenia papieru */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-muted-foreground mr-1 hidden sm:inline-flex items-center gap-1">
            <Sliders className="h-3 w-3 text-brass/70" />
            {t('filterLabel')}:
          </span>
          <button
            type="button"
            onClick={() => setFilter('none')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'none'
                ? 'bg-brass/25 text-amber-200 border border-brass/50'
                : 'text-muted-foreground hover:text-brass'
            }`}
            title={t('filterNoneTitle')}
          >
            {t('filterNone')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('vintage-1920')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'vintage-1920'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/50'
                : 'text-muted-foreground hover:text-brass'
            }`}
            title={t('filterVintageTitle')}
          >
            {t('filterVintage')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('prl-1970')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'prl-1970'
                ? 'bg-stone-800 text-stone-200 border border-stone-500/50'
                : 'text-muted-foreground hover:text-brass'
            }`}
            title={t('filterPrlTitle')}
          >
            {t('filterPrl')}
          </button>
        </div>
      </div>

      {/* Kontener podglądu OpenSeadragon */}
      <div className="relative flex-1 min-h-[360px] bg-[#0c0a08] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0c0a08]/80 text-brass font-special-elite text-xs uppercase tracking-widest animate-pulse">
            {t('loadingDocument')}
          </div>
        )}
        <div
          ref={containerRef}
          style={getFilterStyle()}
          className="w-full h-full min-h-[360px] cursor-grab active:cursor-grabbing transition-[filter] duration-300"
        />

        {/* Diegetyczny pasek narzędzi (Lupka & Rotacja) w rogu widoku */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-[#16130f]/90 border border-brass/35 p-1 rounded backdrop-blur-sm shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-brass/85 hover:text-amber-200 hover:bg-brass/15 rounded transition-colors"
            title={t('zoomIn')}
            aria-label={t('zoomIn')}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-brass/85 hover:text-amber-200 hover:bg-brass/15 rounded transition-colors"
            title={t('zoomOut')}
            aria-label={t('zoomOut')}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-brass/85 hover:text-amber-200 hover:bg-brass/15 rounded transition-colors"
            title={t('rotate')}
            aria-label={t('rotate')}
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-brass/85 hover:text-amber-200 hover:bg-brass/15 rounded transition-colors"
            title={t('resetView')}
            aria-label={t('resetView')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-brass/25 my-auto" />
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 text-brass/85 hover:text-amber-200 hover:bg-brass/15 rounded transition-colors"
            title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Diegetyczny badge wskazówki */}
        <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1 text-[11px] font-serif italic text-amber-200/70 bg-black/40 px-2 py-0.5 rounded border border-brass/20">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>{t('investigateHint')}</span>
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer;
