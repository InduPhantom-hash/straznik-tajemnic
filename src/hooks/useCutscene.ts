'use client';

import { useState, useCallback } from 'react';
import { CutsceneState, CutsceneSegment } from '@/lib/types';

/**
 * useCutscene - Hook do zarządzania stanem cutscen (Auto-GM)
 * 
 * Użycie:
 * ```tsx
 * const cutsceneManager = useCutscene();
 * 
 * // Start cutsceny
 * cutsceneManager.startCutscene([
 *   { id: '1', text: 'Mgła spowija ulice Arkham...' },
 *   { id: '2', text: 'W oddali słychać gong...' }
 * ]);
 * 
 * // W render:
 * <CutscenePlayer
 *   cutscene={cutsceneManager.cutscene}
 *   onSegmentComplete={cutsceneManager.nextSegment}
 *   onSkip={cutsceneManager.skipCutscene}
 *   ...
 * />
 * ```
 */
export function useCutscene() {
    const [cutscene, setCutscene] = useState<CutsceneState>({
        isActive: false,
        segments: [],
        currentIndex: 0,
        isPaused: false,
        isMuted: false,
    });

    /**
     * Rozpoczyna nową cutscenę z podanymi segmentami
     */
    const startCutscene = useCallback((segments: CutsceneSegment[]) => {
        if (segments.length === 0) return;

        setCutscene({
            isActive: true,
            segments,
            currentIndex: 0,
            isPaused: false,
            isMuted: false,
        });

        console.log(`🎬 Cutscene started with ${segments.length} segments`);
    }, []);

    /**
     * Przechodzi do następnego segmentu lub kończy cutscenę
     */
    const nextSegment = useCallback(() => {
        setCutscene(prev => {
            if (prev.currentIndex >= prev.segments.length - 1) {
                // Koniec cutsceny
                console.log('🎬 Cutscene completed');
                return { ...prev, isActive: false };
            }
            return { ...prev, currentIndex: prev.currentIndex + 1 };
        });
    }, []);

    /**
     * Natychmiastowe zakończenie cutsceny
     */
    const skipCutscene = useCallback(() => {
        console.log('🎬 Cutscene skipped');
        setCutscene(prev => ({ ...prev, isActive: false }));
    }, []);

    /**
     * Pauzuje cutscenę
     */
    const pause = useCallback(() => {
        setCutscene(prev => ({ ...prev, isPaused: true }));
    }, []);

    /**
     * Wznawia cutscenę
     */
    const resume = useCallback(() => {
        setCutscene(prev => ({ ...prev, isPaused: false }));
    }, []);

    /**
     * Przełącza stan pauzy
     */
    const togglePause = useCallback(() => {
        setCutscene(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }, []);

    /**
     * Przełącza wyciszenie
     */
    const toggleMute = useCallback(() => {
        setCutscene(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }, []);

    /**
     * Sprawdza czy cutscena jest aktywna
     */
    const isActive = cutscene.isActive;

    /**
     * Aktualny segment
     */
    const currentSegment = cutscene.segments[cutscene.currentIndex] || null;

    /**
     * Postęp cutsceny (0-1)
     */
    const progress = cutscene.segments.length > 0
        ? (cutscene.currentIndex + 1) / cutscene.segments.length
        : 0;

    return {
        cutscene,
        isActive,
        currentSegment,
        progress,
        startCutscene,
        nextSegment,
        skipCutscene,
        pause,
        resume,
        togglePause,
        toggleMute,
    };
}

/**
 * Parsuje tekst AI i wyodrębnia segmenty cutsceny
 * 
 * Format AI:
 * [CUTSCENE START]
 * Pierwszy akapit narracji...
 * 
 * Drugi akapit narracji...
 * [CUTSCENE END]
 */
export function parseCutsceneFromText(text: string): CutsceneSegment[] | null {
    const cutsceneMatch = text.match(/\[CUTSCENE(?:\s+START)?\]([\s\S]*?)\[CUTSCENE\s+END\]/i);

    if (!cutsceneMatch) {
        return null;
    }

    const cutsceneContent = cutsceneMatch[1].trim();

    // Podziel na akapity (podwójna nowa linia lub znacznik [SCENE])
    const rawSegments = cutsceneContent
        .split(/\n\n+|\[SCENE\]/gi)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (rawSegments.length === 0) {
        return null;
    }

    // Utwórz segmenty
    const segments: CutsceneSegment[] = rawSegments.map((text, index) => {
        // Sprawdź czy jest prompt do obrazu [IMAGE: ...]
        const imageMatch = text.match(/\[IMAGE:\s*([^\]]+)\]/i);
        const cleanText = text.replace(/\[IMAGE:\s*[^\]]+\]/gi, '').trim();

        return {
            id: `cutscene-${Date.now()}-${index}`,
            text: cleanText,
            imagePrompt: imageMatch ? imageMatch[1].trim() : undefined,
        };
    });

    console.log(`🎬 Parsed ${segments.length} cutscene segments from AI response`);
    return segments;
}
