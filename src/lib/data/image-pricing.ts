/**
 * Image Generation Pricing - cennik per provider/model (USD per image lub per second/step).
 *
 * IND-176 (sesja 148): wyciągnięte z `vertex-imagen/route.ts:22` + `replicate-image/route.ts:22`
 * do `lib/data/` jako 7-my pattern hardcoded dictionaries (analog IND-79 CoC glossary,
 * IND-126 character data, IND-145 chat-ui handout-types, welcome/data/quotes sesja 130,
 * adventure-styles sesja 148 IND-134).
 *
 * Reuse w future: cost tracker UI, billing dashboard, prod cost analytics.
 *
 * Aktualne ceny (2026-05-25 sesja 146 M4 + D3 sesji 145):
 * - Vertex Imagen 4 Ultra (HIGH/ULTRA preset) = $0.06
 * - Vertex Imagen 4 Fast (LOW/MID preset) = $0.02
 * - Replicate Flux Schnell (Tier 2 fast fallback) = $0.003
 * - Replicate legacy SD models (per second + per step)
 */

/**
 * Vertex AI Imagen pricing per image (USD).
 * M4 sesja 146 (D3 sesji 145): Imagen 4 default, Imagen 3 legacy backward compat.
 * Smoke sesja 146 (curl Ultra): PASS w us-central1, bytesBase64Encoded 1.94 MB PNG.
 */
export const IMAGEN_PRICING = {
  'imagen-4.0-ultra-generate-001': 0.06, // Ultra najwyższa jakość, HIGH/ULTRA preset
  'imagen-4.0-fast-generate-001': 0.02, // Fast LOW/MID preset
  'imagen-3.0-generate-001': 0.04, // Legacy backward compat
  'imagen-3.0-fast-generate-001': 0.02, // Legacy backward compat
} as const;

export type ImagenModel = keyof typeof IMAGEN_PRICING;

/**
 * Replicate pricing per model (USD).
 * Flux models: per image base. Legacy SD models: per second + per step.
 * M4 sesja 146: Flux.1 Pro + Flux Pro DROPPED po flipie orchestratora Vertex Imagen 4 Tier 1.
 */
export const REPLICATE_PRICING = {
  // Flux Schnell - jedyny Flux po M4 sesja 146 ($0.003/image, Replicate official models endpoint)
  'black-forest-labs/flux-schnell': {
    base: 0.003,
    steps: 0,
  },
  // Legacy SD (per-second + per-step)
  'stability-ai/stable-diffusion': {
    base: 0.0023, // per second
    steps: 0.0001, // per step
  },
  'stability-ai/sdxl': {
    base: 0.0046, // per second
    steps: 0.0002, // per step
  },
  'runwayml/stable-diffusion-v1-5': {
    base: 0.0023, // per second
    steps: 0.0001, // per step
  },
  'stability-ai/stable-diffusion-xl-base-1.0': {
    base: 0.0046, // per second
    steps: 0.0002, // per step
  },
  'stability-ai/stable-diffusion-3-medium': {
    base: 0.0092, // per second
    steps: 0.0004, // per step
  },
} as const;

export type ReplicateModel = keyof typeof REPLICATE_PRICING;

/**
 * Vertex AI region dla Imagen API (sesja 146: us-central1 = jedyny region z Imagen 4 access).
 */
export const VERTEX_AI_REGION = 'us-central1';
