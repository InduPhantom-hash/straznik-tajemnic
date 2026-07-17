/**
 * OPT-19: Unified TTS Router
 *
 * Pojedynczy endpoint z parametrem `provider` zamiast osobnych endpointów.
 * Istniejące endpointy (/api/tts/google, /api/tts/gemini) nadal działają
 * dla backward compatibility - ten router jest preferowaną ścieżką.
 *
 * Usage: POST /api/tts { provider: 'google' | 'gemini', ...params }
 *
 * M5+M6 sesja 146: openai + elevenlabs DROPPED per D2.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, ...params } = body;

    if (!provider) {
      return NextResponse.json(
        {
          error: 'Missing "provider" parameter. Use: google, gemini',
        },
        { status: 400 }
      );
    }

    // Route to the appropriate provider endpoint
    const providerRoutes: Record<string, string> = {
      google: '/api/tts/google',
      gemini: '/api/tts/gemini',
    };

    const targetPath = providerRoutes[provider.toLowerCase()];
    if (!targetPath) {
      return NextResponse.json(
        {
          error: `Unknown provider "${provider}". Available: ${Object.keys(providerRoutes).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Internal fetch to the provider-specific endpoint
    const targetUrl = new URL(targetPath, request.nextUrl.origin);
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward API key headers if present
        ...(request.headers.get('X-Gemini-Api-Key')
          ? { 'X-Gemini-Api-Key': request.headers.get('X-Gemini-Api-Key')! }
          : {}),
      },
      body: JSON.stringify(params),
    });

    // Pass through the provider response
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ TTS router error:', error);
    return NextResponse.json(
      {
        error: 'TTS routing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts?provider=google - list voices for provider
 */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') || 'google';

  const providerRoutes: Record<string, string> = {
    google: '/api/tts/google',
    gemini: '/api/tts/gemini',
  };

  const targetPath = providerRoutes[provider.toLowerCase()];
  if (!targetPath) {
    return NextResponse.json(
      { error: `Unknown provider "${provider}"` },
      { status: 400 }
    );
  }

  try {
    const targetUrl = new URL(targetPath, request.nextUrl.origin);
    const response = await fetch(targetUrl.toString());
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to list voices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
