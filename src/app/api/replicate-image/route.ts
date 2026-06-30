/**
 * Replicate API endpoint dla generowania obrazów.
 *
 * IND-90 (Wariant A): in-memory cache (Map<>) zostal zdropowany - orchestrator
 * `/api/imagen` jest single source of truth dla cache. Sub-provider cache był
 * dead w trybie orchestrator (różny key - `${enhancedPrompt}-${model}-${width}-${height}-${steps}-${guidance}-${seed}`
 * vs orchestrator `${prompt}-${style}`), więc orchestrator NIGDY nie trafiał do
 * tego cache. Direct callerzy (`gemini-service.ts` 3× character/NPC portrety,
 * `useApiTester.ts` test API) tracą cache - acceptable, każde wywołanie ma
 * unikalne parametry (różny `width/height/numInferenceSteps`).
 *
 * `cacheKey` zachowany jako short identifier w response metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// IND-176 (sesja 148): REPLICATE_PRICING wyciągnięte do `src/lib/data/image-pricing.ts`
// (7-my pattern hardcoded dictionaries do lib/data/).
import { REPLICATE_PRICING } from '@/lib/data/image-pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // M4 sesja 146: Flux Schnell jako default (Tier 2 fast fallback po orchestrator flip).
    // Legacy SD modele dostępne przez explicit `model` w body.
    const {
      type,
      prompt,
      model = 'black-forest-labs/flux-schnell',
      width = 1024,
      height = 1024,
      numInferenceSteps = 28,
      guidanceScale = 3.5,
      seed = null,
      scheduler = 'K_EULER',
      style = 'realistic',
      resetRateLimit,
    } = body;

    // Test endpoint - sprawdź czy API jest dostępne
    if (type === 'test') {
      const replicateApiKey = process.env.REPLICATE_API_TOKEN;
      if (!replicateApiKey || replicateApiKey === 'your_replicate_token_here') {
        return NextResponse.json(
          {
            status: 'unavailable',
            message:
              'Replicate API key not configured. Please set REPLICATE_API_TOKEN in environment variables.',
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        status: 'available',
        message: 'Replicate API is configured and ready',
      });
    }

    // Reset rate limiting jeśli żądane
    if (resetRateLimit) {
      return NextResponse.json({
        success: true,
        message: 'Rate limit reset successfully',
      });
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Sprawdź czy klucz API jest dostępny
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey || replicateApiKey === 'your_replicate_token_here') {
      return NextResponse.json(
        { error: 'Replicate API key not configured' },
        { status: 500 }
      );
    }

    // Buduj lepszy prompt na podstawie stylu
    let enhancedPrompt = prompt;
    switch (style) {
      case 'horror':
        enhancedPrompt = `${prompt}, dark atmosphere, cosmic horror, Lovecraftian style, eerie lighting, detailed, high quality, 8k`;
        break;
      case 'vintage':
        enhancedPrompt = `${prompt}, 1920s style, vintage photography, sepia tones, period appropriate, detailed, high quality, 8k`;
        break;
      case 'artistic':
        enhancedPrompt = `${prompt}, artistic style, detailed illustration, atmospheric, high quality, 8k`;
        break;
      default:
        enhancedPrompt = `${prompt}, realistic style, detailed, high quality, atmospheric lighting, 8k`;
    }

    // IND-90: cacheKey zachowany jako short identifier w response metadata,
    // ale Map<> cache zostal zdropowany (orchestrator `/api/imagen` jest single
    // source of truth dla in-memory cache).
    const cacheKey = crypto
      .createHash('md5')
      .update(
        `${enhancedPrompt}-${model}-${width}-${height}-${numInferenceSteps}-${guidanceScale}-${seed || 'random'}`
      )
      .digest('hex');

    // IND-166: Flux modele używają Replicate's official models endpoint
    // (/v1/models/{owner}/{model}/predictions, brak version hash).
    // Legacy SD używają version-based predictions endpoint (/v1/predictions + version).
    const isFluxModel = model.startsWith('black-forest-labs/flux');

    const modelVersions: Record<string, string> = {
      'stability-ai/stable-diffusion':
        '27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
      'stability-ai/sdxl':
        '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      'runwayml/stable-diffusion-v1-5':
        'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
      'stability-ai/stable-diffusion-xl-base-1.0':
        '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      'stability-ai/stable-diffusion-3-medium':
        'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
    };

    if (!isFluxModel && !modelVersions[model]) {
      return NextResponse.json(
        { error: `Unsupported model: ${model}` },
        { status: 400 }
      );
    }

    // Przygotuj parametry dla Replicate
    // Flux: aspect_ratio + output_format zamiast width/height/scheduler
    // SD: width/height/num_inference_steps/guidance_scale/scheduler
    const input: Record<string, unknown> = isFluxModel
      ? {
          prompt: enhancedPrompt,
          aspect_ratio:
            width === height ? '1:1' : width > height ? '16:9' : '9:16',
          output_format: 'jpg',
          output_quality: 90,
          safety_tolerance: 2, // 1-6 (1=strictest, 6=most permissive)
          prompt_upsampling: true, // Flux auto-rewrite dla lepszej jakości
        }
      : {
          prompt: enhancedPrompt,
          width: Math.min(2048, Math.max(256, width)),
          height: Math.min(2048, Math.max(256, height)),
          num_inference_steps: Math.min(100, Math.max(1, numInferenceSteps)),
          guidance_scale: Math.min(20, Math.max(1, guidanceScale)),
          scheduler: scheduler,
        };

    // Dodaj seed jeśli podany (Flux + SD oba wspierają)
    if (seed !== null && seed !== undefined) {
      input.seed = Math.max(0, Math.min(2147483647, seed));
    }

    console.log(
      `🎨 Generating image with Replicate: ${model} (${isFluxModel ? 'flux/models' : 'legacy/predictions'})`
    );
    console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);

    // IND-166: Flux używa official models endpoint, legacy używa version-based
    const replicateUrl = isFluxModel
      ? `https://api.replicate.com/v1/models/${model}/predictions`
      : 'https://api.replicate.com/v1/predictions';
    const replicateBody = isFluxModel
      ? { input }
      : { version: modelVersions[model], input };

    const replicateResponse = await fetch(replicateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(replicateBody),
    });

    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json().catch(() => ({}));
      console.error(
        'Replicate API error:',
        replicateResponse.status,
        errorData
      );

      if (replicateResponse.status === 402) {
        return NextResponse.json(
          { error: 'Insufficient Replicate credits' },
          { status: 402 }
        );
      }

      return NextResponse.json(
        {
          error: `Replicate API error: ${errorData.detail || 'Unknown error'}`,
        },
        { status: replicateResponse.status }
      );
    }

    const replicateData = await replicateResponse.json();
    console.log('✅ Replicate prediction started:', replicateData.id);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 sekund - więcej czasu dla wysokiej jakości

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 sekunda

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${replicateData.id}`,
        {
          headers: {
            Authorization: `Token ${replicateApiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error(
          'Failed to check prediction status:',
          statusResponse.status
        );
        break;
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'succeeded' && statusData.output) {
        // Oblicz koszt
        const pricing =
          REPLICATE_PRICING[model as keyof typeof REPLICATE_PRICING] ||
          REPLICATE_PRICING['stability-ai/stable-diffusion'];
        // IND-166: Flux ma flat pricing (`steps: 0`), więc cost = `pricing.base`.
        // SD legacy: cost = base * sec + per-step (numInferenceSteps użyte).
        const estimatedCost = pricing.base + pricing.steps * numInferenceSteps;

        // IND-166: Flux zwraca `output: string` (single URL), SD zwraca `output: string[]`.
        const imageUrl = Array.isArray(statusData.output)
          ? statusData.output[0]
          : statusData.output;

        // IND-90: drop `imageCache.set(...)` - cache w orchestrator `/api/imagen`.

        console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);

        return NextResponse.json({
          success: true,
          imageUrl,
          prompt: enhancedPrompt,
          generatedAt: new Date().toISOString(),
          model: model,
          note: 'Generated via Replicate API',
          cost: estimatedCost,
          metadata: {
            style,
            quality: 'high',
            source: 'replicate',
            predictionId: replicateData.id,
            cacheKey: cacheKey.substring(0, 8),
            parameters: {
              width,
              height,
              numInferenceSteps,
              guidanceScale,
              seed,
              scheduler,
            },
          },
        });
      } else if (statusData.status === 'failed') {
        console.error('Replicate prediction failed:', statusData.error);
        return NextResponse.json(
          { error: `Image generation failed: ${statusData.error}` },
          { status: 500 }
        );
      }

      attempts++;
    }

    // Timeout
    console.log('⏰ Replicate prediction timeout');
    return NextResponse.json(
      { error: 'Image generation timeout' },
      { status: 408 }
    );
  } catch (error) {
    console.error('Error generating image with Replicate:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
