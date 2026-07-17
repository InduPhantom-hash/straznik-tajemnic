/**
 * Vertex AI Imagen 3 API endpoint
 * Używa REST API z kluczem API Vertex AI
 * Najwyższa jakość generowania obrazów
 *
 * IND-90 (Wariant A): cache zdjęć przeniesiony do orchestratora `/api/imagen` jako
 * single source of truth. Sub-provider cache był dead code w trybie orchestrator
 * (różny key - `vertex-${enhancedPrompt}-${model}` vs `${prompt}-${style}`), więc
 * orchestrator NIGDY nie trafiał do tego cache. Direct callerzy
 * (`equipment-modal.tsx`) tracą cache - acceptable, equipment images mają unikalne
 * prompty z `model: 'imagen-3.0-fast-generate-001'`.
 *
 * `cacheKey` zachowany jako stable GCS filename (deterministic dedup w bucket).
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// IND-176 (sesja 148): IMAGEN_PRICING + VERTEX_AI_REGION wyciągnięte do
// `src/lib/data/image-pricing.ts` (7-my pattern hardcoded dictionaries do lib/data/).
import { IMAGEN_PRICING, VERTEX_AI_REGION } from '@/lib/data/image-pricing';

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      style = 'horror',
      // M4 sesja 146: default flip Imagen 3 → Imagen 4 Ultra (D3 lepszy text rendering)
      model = 'imagen-4.0-ultra-generate-001',
      aspectRatio = '1:1',
      numberOfImages = 1,
    } = await request.json();

    // Walidacja promptu
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Sprawdź zmienne środowiskowe
    const apiKey = process.env.VERTEX_AI_API_KEY;
    const projectId =
      process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'VERTEX_AI_API_KEY not configured in .env.local' },
        { status: 500 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'VERTEX_AI_PROJECT_ID not configured in .env.local' },
        { status: 500 }
      );
    }

    // Test endpoint
    if (prompt === 'test') {
      return NextResponse.json({
        status: 'available',
        message: 'Vertex AI Imagen 3 API is configured',
        projectId: projectId,
        region: VERTEX_AI_REGION,
      });
    }

    // Rozszerz prompt o styl
    let enhancedPrompt = prompt;
    switch (style) {
      case 'horror':
        enhancedPrompt = `${prompt}, dark atmospheric horror, Lovecraftian cosmic horror, 1920s aesthetic, eerie mysterious lighting, highly detailed, photorealistic, cinematic composition`;
        break;
      case 'realistic':
        enhancedPrompt = `${prompt}, photorealistic, ultra detailed, 8k resolution, professional photography, natural lighting`;
        break;
      case 'artistic':
        enhancedPrompt = `${prompt}, artistic oil painting style, dramatic lighting, fantasy art, concept art, highly detailed illustration`;
        break;
      case 'vintage':
        enhancedPrompt = `${prompt}, 1920s vintage photograph, sepia tones, aged paper texture, historical, period accurate`;
        break;
      case 'portrait':
        enhancedPrompt = `${prompt}, detailed character portrait, expressive eyes, dramatic lighting, professional portrait photography`;
        break;
      case 'location':
        enhancedPrompt = `${prompt}, wide establishing shot, atmospheric environment, moody lighting, detailed architecture, cinematic`;
        break;
    }

    // IND-90: cacheKey zachowany jako stable GCS filename (dedup w bucket),
    // ale Map<> cache zostal zdropowany (orchestrator `/api/imagen` jest single
    // source of truth dla in-memory cache).
    const cacheKey = crypto
      .createHash('md5')
      .update(`vertex-${enhancedPrompt}-${model}`)
      .digest('hex');

    console.log(`🎨 Generating image with Vertex AI Imagen 3: ${model}`);
    console.log(`   Project: ${projectId}, Region: ${VERTEX_AI_REGION}`);
    console.log(`   Prompt: ${enhancedPrompt.substring(0, 80)}...`);

    // Vertex AI REST API endpoint
    const endpoint = `https://${VERTEX_AI_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_AI_REGION}/publishers/google/models/${model}:predict`;

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: enhancedPrompt,
          },
        ],
        parameters: {
          sampleCount: numberOfImages,
          aspectRatio: aspectRatio,
          safetyFilterLevel: 'block_only_high',
          personGeneration: 'allow_adult',
          // Negative prompt dla lepszej jakości
          negativePrompt:
            'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, text, watermark, signature',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        'Vertex AI Imagen error:',
        response.status,
        JSON.stringify(errorData).substring(0, 500)
      );

      // IND-166 B9 fix: drop dead Replicate fallback - orchestrator `/api/imagen` JUŻ
      // fallback'uje na Replicate gdy Vertex zwróci 500. Wewnętrzny fallback tutaj
      // powodował DOUBLE BILLING Replicate (raz przez vertex-imagen, raz przez orchestrator).
      return NextResponse.json(
        {
          error: `Vertex AI Imagen error: ${errorData.error?.message || response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Wyciągnij obraz z odpowiedzi
    const predictions = data.predictions || [];
    if (predictions.length === 0 || !predictions[0].bytesBase64Encoded) {
      console.error(
        'No image in Vertex AI response:',
        JSON.stringify(data).substring(0, 300)
      );

      // IND-166 B9 fix: drop dead Replicate fallback - analog jak wyżej, orchestrator
      // `/api/imagen` JUŻ fallback'uje na Replicate. Wewnętrzny fallback = DOUBLE BILLING.
      return NextResponse.json(
        { error: 'Vertex AI did not generate an image' },
        { status: 500 }
      );
    }

    // Konwertuj base64 na Buffer i uploaduj do GCS
    const imageBase64 = predictions[0].bytesBase64Encoded;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Próbuj uploadować do GCS dla publicznego URL
    let imageUrl: string;
    try {
      const { googleCloudStorageService } =
        await import('@/lib/google-cloud-storage-service-fixed');
      const fileName = `images/generated/${cacheKey}.png`;
      imageUrl = await googleCloudStorageService.uploadImage(
        imageBuffer,
        fileName,
        'image/png'
      );
      console.log(`✅ Image uploaded to GCS: ${imageUrl}`);
    } catch (gcsError) {
      console.warn('⚠️ GCS upload failed, falling back to base64:', gcsError);
      // Fallback do base64 jeśli GCS nie działa
      imageUrl = `data:image/png;base64,${imageBase64}`;
    }

    // IND-90: drop `imageCache.set(...)` - cache w orchestrator `/api/imagen`.

    const cost = IMAGEN_PRICING[model as keyof typeof IMAGEN_PRICING] || 0.04;
    console.log(`✅ Vertex AI Imagen 3 generated successfully, cost: $${cost}`);

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: enhancedPrompt,
      generatedAt: new Date().toISOString(),
      model,
      cost,
      provider: 'vertex-ai',
      metadata: {
        style,
        aspectRatio,
        source: 'vertex-ai-imagen-4', // M4 sesja 146: flip Imagen 3 → 4
        projectId,
        cacheKey: cacheKey.substring(0, 8),
      },
    });
  } catch (error) {
    console.error('Vertex AI Imagen error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}

// GET endpoint do sprawdzania statusu
export async function GET() {
  const apiKey = process.env.VERTEX_AI_API_KEY;
  const projectId =
    process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;

  return NextResponse.json({
    available: !!(apiKey && projectId),
    message:
      apiKey && projectId
        ? 'Vertex AI Imagen 3 API is configured'
        : 'Missing VERTEX_AI_API_KEY or VERTEX_AI_PROJECT_ID',
    projectId: projectId || 'not set',
    region: VERTEX_AI_REGION,
    models: Object.keys(IMAGEN_PRICING),
    pricing: IMAGEN_PRICING,
  });
}
