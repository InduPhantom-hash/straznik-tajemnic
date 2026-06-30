/**
 * Placeholder Image API
 * Generates SVG placeholder images with text for when image providers fail.
 * Used as graceful fallback in portrait generation and other image features.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const text = searchParams.get('text') || 'Brak obrazu';
    const width = Math.min(Math.max(parseInt(searchParams.get('width') || '300'), 50), 1200);
    const height = Math.min(Math.max(parseInt(searchParams.get('height') || '300'), 50), 1200);

    // Escape text for SVG
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Split long text into lines
    const maxCharsPerLine = Math.floor(width / 10);
    const words = escapedText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        }
    }
    if (currentLine) lines.push(currentLine.trim());

    const lineHeight = 20;
    const textBlockHeight = lines.length * lineHeight;
    const textStartY = (height - textBlockHeight) / 2 + lineHeight;

    const textElements = lines
        .map((line, i) => `<text x="${width / 2}" y="${textStartY + i * lineHeight}" text-anchor="middle" fill="#8b8b8b" font-family="system-ui, sans-serif" font-size="14">${line}</text>`)
        .join('\n    ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="8"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#2a2a3e" stroke-width="1" rx="7"/>
  <text x="${width / 2}" y="${height / 2 - textBlockHeight / 2 - 15}" text-anchor="middle" fill="#4a4a5e" font-size="40">🎭</text>
  ${textElements}
</svg>`;

    return new NextResponse(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
