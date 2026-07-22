'use client';

/**
 * NarrativeFormatter renderNarrativeWithImages - IND-144 micro 6/8 (extract z NarrativeFormatter.tsx)
 *
 * Renderuje narrację z obsługą obrazów Markdown ![alt](url). Parser dzieli content
 * na fragmenty tekstu i obrazy, renderuje sekwencyjnie. Plain text bez obrazów →
 * single <p>.
 *
 * IND-172: raw <img> zamiast next/image. AI chat generuje obrazy inline jako
 * base64 data URLs (Gemini Image, Replicate Flux), które next/image NIE wspiera
 * domyślnie. ESLint disable dla single line `@next/next/no-img-element`.
 */

import type { ReactNode } from 'react';

export function renderNarrativeWithImages(
  content: string,
  key: number,
  onImageClick?: (imgUrl: string, allImages: string[]) => void
): ReactNode {
  // Regex do wykrywania obrazów Markdown: ![alt text](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  // Sprawdź czy są jakiekolwiek obrazy
  if (!imageRegex.test(content)) {
    // Brak obrazów - renderuj jako zwykły tekst
    return (
      <p
        key={key}
        className="text-foreground leading-relaxed whitespace-pre-wrap"
      >
        {content}
      </p>
    );
  }

  // Reset regex (test() przesuwa lastIndex)
  imageRegex.lastIndex = 0;

  // Podziel content na fragmenty texto i obrazy
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let partIndex = 0;

  while ((match = imageRegex.exec(content)) !== null) {
    // Dodaj tekst przed obrazem
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push(
          <p
            key={`${key}-text-${partIndex}`}
            className="text-foreground leading-relaxed whitespace-pre-wrap"
          >
            {textBefore}
          </p>
        );
        partIndex++;
      }
    }

    // Dodaj obraz
    const altText = match[1] || 'Obraz';
    const imageUrl = match[2];

    // Sprawdź czy to base64 czy URL
    const isBase64 = imageUrl.startsWith('data:image');

    // IND-172: raw <img> zamiast next/image. AI chat generuje obrazy inline jako
    // base64 data URLs (Gemini Image, Replicate Flux), które next/image NIE wspiera
    // domyślnie (wymaga `unoptimized` prop lub custom loader z konwersją). HTTP URLs
    // z GCS dałoby się migrować, ale różne paths render różnie (data URL wymaga
    // explicit width/height inference z base64 header) → defer hybrid migrację do
    // osobnego ticketu. Single `<img>` z fallback display:none on error wystarczy.
    parts.push(
      <div key={`${key}-img-${partIndex}`} className="my-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={altText}
          // IND-216: format pocztówkowy ~16:9 - wypełnia szerokość okna czatu,
          // object-cover kadruje do proporcji (nie za wysoki) niezależnie od
          // proporcji generacji. Obrazy scen generowane natywnie 16:9 (useChat/useGameStart).
          className={`rounded-lg shadow-lg w-full aspect-[16/9] object-cover border border-zinc-700 ${
            onImageClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
          }`}
          style={{
            filter: 'sepia(0.1) saturate(1.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
          loading={isBase64 ? 'eager' : 'lazy'}
          onClick={
            onImageClick
              ? () => onImageClick(imageUrl, [imageUrl])
              : undefined
          }
          onError={(e) => {
            console.warn('Image failed to load:', altText);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.parentElement) {
              const fallback = document.createElement('div');
              fallback.className = 'p-3 text-xs text-amber-400/80 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-center gap-2';
              fallback.innerText = '⚠️ Nie udało się załadować ilustracji sceny.';
              target.parentElement.appendChild(fallback);
            }
          }}
        />
      </div>
    );
    partIndex++;

    lastIndex = match.index + match[0].length;
  }

  // Dodaj pozostały tekst po ostatnim obrazie
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
      parts.push(
        <p
          key={`${key}-text-${partIndex}`}
          className="text-foreground leading-relaxed whitespace-pre-wrap"
        >
          {textAfter}
        </p>
      );
    }
  }

  return <div key={key}>{parts}</div>;
}
