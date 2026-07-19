/**
 * Flux Kontext Pro endpoint (M7 sesja 146 - D4)
 *
 * Image-to-image przez Replicate Flux Kontext Pro - NPC character consistency.
 * Use case: użytkownik regeneruje portret istniejącego NPC w nowej scenie,
 * zachowując tożsamość postaci (twarz, ubranie) ale modyfikując tło/akcję.
 *
 * Smoke sesja 146 (KROK 0): input field `input_image` accepted (status: starting,
 * brak immediate error). Model version: black-forest-labs/flux-kontext-pro.
 *
 * Cost: $0.04/image (Replicate flat pricing).
 *
 * Caller: useMediaCache.generateImageWithCache({ inputPortraitUrl }) gdy user
 * zaznaczy checkbox "use existing portrait" w npc-manager.tsx.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { recordImageCost } from '@/lib/cost-event-emitter';

const FLUX_KONTEXT_COST = 0.04; // USD per image
const POLL_MAX_ATTEMPTS = 60; // 60 sekund timeout
const POLL_INTERVAL_MS = 1000;

async function resolveInputImage(inputImageUrl: string): Promise<string> {
  if (!inputImageUrl.startsWith('/portraits/predefined/')) return inputImageUrl;

  if (inputImageUrl.includes('..') || !inputImageUrl.endsWith('.webp')) {
    throw new Error('Invalid local portrait path');
  }

  const filePath = join(process.cwd(), 'public', inputImageUrl);
  const image = await readFile(filePath);
  return `data:image/webp;base64,${image.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, inputImageUrl, style = 'horror' } = body;

    // Walidacja inputów
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!inputImageUrl || typeof inputImageUrl !== 'string') {
      return NextResponse.json(
        { error: 'inputImageUrl is required for image-to-image generation' },
        { status: 400 }
      );
    }

    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey || replicateApiKey === 'your_replicate_token_here') {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    const resolvedInputImageUrl = await resolveInputImage(inputImageUrl);

    // Buduj enhanced prompt (style-aware)
    let enhancedPrompt = prompt;
    if (style === 'horror') {
      enhancedPrompt = `${prompt}, dark atmosphere, cosmic horror, Lovecraftian style, eerie lighting, detailed`;
    } else if (style === 'vintage') {
      enhancedPrompt = `${prompt}, 1920s style, vintage photography, sepia tones, period appropriate`;
    }

    console.log(`🎨 Flux Kontext: generating image-to-image for prompt`);

    // Start prediction (Flux Kontext używa official models endpoint)
    const startResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: enhancedPrompt,
            input_image: resolvedInputImageUrl,
          },
        }),
      }
    );

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: `Flux Kontext API error: ${errorData.detail || 'Unknown error'}`,
        },
        { status: startResponse.status }
      );
    }

    const startData = await startResponse.json();
    console.log('✅ Flux Kontext prediction started:', startData.id);

    // Poll for completion
    let attempts = 0;
    while (attempts < POLL_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${startData.id}`,
        {
          headers: { Authorization: `Token ${replicateApiKey}` },
        }
      );

      if (!statusResponse.ok) {
        console.error('Failed to check Flux Kontext status');
        break;
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'succeeded' && statusData.output) {
        // Flux zwraca output: string (single URL)
        const imageUrl = Array.isArray(statusData.output)
          ? statusData.output[0]
          : statusData.output;

        // Track cost
        recordImageCost(FLUX_KONTEXT_COST);

        console.log(
          `💰 Flux Kontext Pro cost: $${FLUX_KONTEXT_COST.toFixed(4)}`
        );

        return NextResponse.json({
          success: true,
          imageUrl,
          prompt: enhancedPrompt,
          cost: FLUX_KONTEXT_COST,
          provider: 'flux-kontext-pro',
          metadata: {
            inputImageUrl,
            predictionId: startData.id,
            source: 'replicate-flux-kontext',
          },
        });
      } else if (statusData.status === 'failed') {
        console.error('Flux Kontext prediction failed:', statusData.error);
        return NextResponse.json(
          { error: `Flux Kontext generation failed: ${statusData.error}` },
          { status: 500 }
        );
      }

      attempts++;
    }

    return NextResponse.json(
      { error: 'Flux Kontext generation timeout (60s)' },
      { status: 504 }
    );
  } catch (error) {
    console.error('Flux Kontext route error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}
