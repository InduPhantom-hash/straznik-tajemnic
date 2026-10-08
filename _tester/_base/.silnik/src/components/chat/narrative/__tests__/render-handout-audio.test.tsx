/**
 * Testy jednostkowe dla diegetycznych handoutów audio i wyboru języka (Issue #703).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHandout } from '../render-handout';
import type { Section } from '../types';
import { STARTER_HAUNTING_ADVENTURE } from '@/lib/starter-haunting-data';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}));

// Mock AudioReelPlayer
jest.mock('@/components/ui/audio-reel-player', () => ({
  AudioReelPlayer: ({ audioUrl, title, reelType }: { audioUrl: string; title?: string; reelType?: string }) => (
    <div data-testid="audio-reel-player" data-audio-url={audioUrl} data-title={title} data-reel-type={reelType}>
      Mock Audio Player: {title} ({audioUrl}) [{reelType}]
    </div>
  ),
}));

// Mock DocumentViewer
jest.mock('@/components/ui/document-viewer', () => ({
  DocumentViewer: ({ imageUrl, title }: { imageUrl: string; title?: string }) => (
    <div data-testid="document-viewer" data-image-url={imageUrl} data-title={title}>
      Mock Document: {title}
    </div>
  ),
}));

describe('renderHandout z handoutami audio (Issue #703)', () => {
  it('renderuje AudioReelPlayer dla Boston Globe z polską ścieżką i reelType=radio', () => {
    const section: Section = {
      type: 'handout',
      content: '',
      handoutSlug: 'clue-02-boston-globe-1918',
    };

    render(<>{renderHandout(section, 0, STARTER_HAUNTING_ADVENTURE)}</>);

    const player = screen.getByTestId('audio-reel-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute(
      'data-audio-url',
      '/audio/handouts/nawiedzony-dom/audio-clue-02-boston-globe-pl.mp3'
    );
    expect(player).toHaveAttribute('data-reel-type', 'radio');
  });

  it('renderuje AudioReelPlayer dla Dziennika Corbitta z reelType=gramophone', () => {
    const section: Section = {
      type: 'handout',
      content: '',
      handoutSlug: 'clue-09-corbitt-journal',
    };

    render(<>{renderHandout(section, 1, STARTER_HAUNTING_ADVENTURE)}</>);

    const player = screen.getByTestId('audio-reel-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute(
      'data-audio-url',
      '/audio/handouts/nawiedzony-dom/audio-clue-09-corbitt-journal-pl.mp3'
    );
    expect(player).toHaveAttribute('data-reel-type', 'gramophone');
  });

  it('renderuje AudioReelPlayer dla Zeznania Gabrieli Macario z reelType=gramophone', () => {
    const section: Section = {
      type: 'handout',
      content: '',
      handoutSlug: 'audio-gabriela-macario-plea',
    };

    render(<>{renderHandout(section, 2, STARTER_HAUNTING_ADVENTURE)}</>);

    const player = screen.getByTestId('audio-reel-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute(
      'data-audio-url',
      '/audio/handouts/nawiedzony-dom/audio-gabriela-macario-plea-pl.mp3'
    );
    expect(player).toHaveAttribute('data-reel-type', 'gramophone');
  });
});
