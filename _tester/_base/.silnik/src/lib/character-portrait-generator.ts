// Character Portrait Generator
// Module-level functions integrating with /api/imagen orchestrator

import { Character } from './types';
import { EnhancedCharacterTemplate } from './enhanced-character-templates';

interface PortraitConfig {
  character: Character;
  template?: EnhancedCharacterTemplate;
  style: 'realistic' | 'artistic' | 'noir' | 'vintage';
  mood: 'serious' | 'mysterious' | 'confident' | 'haunted' | 'scholarly';
  setting: 'studio' | 'office' | 'library' | 'street' | 'home';
}

interface PortraitResult {
  imageUrl: string;
  prompt: string;
  style: string;
  seed?: string;
}

function getAgeFromEducation(education: number): string {
  if (education >= 80) return '35-45 year old ';
  if (education >= 70) return '30-40 year old ';
  if (education >= 60) return '25-35 year old ';
  return '20-30 year old ';
}

function getOccupationAppearance(occupation: string): string {
  const appearances: { [key: string]: string } = {
    Antykwariusz: 'distinguished antiquarian with keen eyes and scholarly demeanor, ',
    Detektyw: 'sharp-eyed detective with weathered features and alert expression, ',
    Lekarz: 'professional doctor with compassionate yet analytical gaze, ',
    Dziennikarz: 'charismatic journalist with inquisitive expression and confident bearing, ',
    Akademik: 'intellectual academic with thoughtful expression and scholarly appearance, ',
    Policjant: 'stern police officer with authoritative presence and vigilant eyes, ',
    Prawnik: 'well-dressed lawyer with sharp features and persuasive demeanor, ',
  };

  return appearances[occupation] || 'professional individual with determined expression, ';
}

function getPhysicalTraits(character: Character): string {
  let traits = '';

  if (character.str >= 70) {
    traits += 'strong and well-built physique, ';
  } else if (character.str <= 40) {
    traits += 'lean and wiry build, ';
  }

  if (character.app >= 70) {
    traits += 'striking and attractive features, ';
  } else if (character.app <= 40) {
    traits += 'plain but memorable features, ';
  }

  if (character.int >= 70) {
    traits += 'intelligent and perceptive eyes, ';
  }

  return traits;
}

function getTemplateAppearance(template: EnhancedCharacterTemplate): string {
  const classAppearance: { [key: string]: string } = {
    upper: 'impeccably dressed in fine clothing with refined bearing, ',
    middle: 'well-dressed in respectable attire with professional appearance, ',
    working: 'practical clothing and hardworking demeanor, ',
  };

  return classAppearance[template.socialClass] || '';
}

function getStyleElements(style: string): string {
  const styles: { [key: string]: string } = {
    realistic: 'photorealistic portrait, detailed facial features, natural lighting, ',
    artistic: 'artistic portrait painting, expressive brushstrokes, dramatic lighting, ',
    noir: 'film noir style, high contrast black and white, dramatic shadows, ',
    vintage: 'vintage photograph style, sepia tones, classic portrait composition, ',
  };

  return styles[style] || styles.realistic;
}

function getMoodElements(mood: string): string {
  const moods: { [key: string]: string } = {
    serious: 'serious and focused expression, determined gaze, ',
    mysterious: 'enigmatic expression with hint of secrets, mysterious smile, ',
    confident: 'confident and charismatic expression, assured posture, ',
    haunted: 'haunted expression with shadows in the eyes, troubled demeanor, ',
    scholarly: 'thoughtful and contemplative expression, intellectual bearing, ',
  };

  return moods[mood] || moods.serious;
}

function getSettingElements(setting: string, occupation: string): string {
  const settings: { [key: string]: string } = {
    studio: 'professional portrait studio background with soft lighting, ',
    office: `in their ${occupation.toLowerCase()} office with period-appropriate furnishings, `,
    library: 'in a well-appointed library with books and scholarly atmosphere, ',
    street: 'on a 1920s city street with period architecture in background, ',
    home: 'in an elegant home interior with period decorations, ',
  };

  return settings[setting] || settings.studio;
}

function getEraElements(era: string): string {
  const eras: { [key: string]: string } = {
    '1920s':
      '1920s fashion and styling, period-appropriate clothing and hairstyles, Art Deco influences, ',
    '1930s': '1930s fashion and styling, Depression-era clothing, classic Hollywood glamour, ',
    modern: 'contemporary styling and clothing, modern professional appearance, ',
  };

  return eras[era] || eras['1920s'];
}

function getQualityParameters(): string {
  return 'high quality, detailed, professional portrait, 4K resolution, perfect composition, masterpiece';
}

function buildBaseDescription(
  character: Character,
  template?: EnhancedCharacterTemplate
): string {
  let description = '';

  if (character.age && character.age > 0) {
    description += `${character.age}-year-old `;
  } else {
    description += getAgeFromEducation(character.edu);
  }

  description += getOccupationAppearance(character.occupation);
  description += getPhysicalTraits(character);

  if (template) {
    description += getTemplateAppearance(template);
  }

  return description;
}

export function generatePortraitPrompt(config: PortraitConfig): string {
  const { character, template, style, mood, setting } = config;

  let prompt = buildBaseDescription(character, template);
  prompt += getStyleElements(style);
  prompt += getMoodElements(mood);
  prompt += getSettingElements(setting, character.occupation);
  prompt += getEraElements(template?.era || '1920s');
  prompt += getQualityParameters();

  return prompt;
}

export async function generatePortraitVariants(
  config: PortraitConfig
): Promise<PortraitResult[]> {
  const variants: PortraitResult[] = [];
  const moodVariants: Array<typeof config.mood> = ['serious', 'mysterious', 'confident'];

  for (const mood of moodVariants) {
    const variantConfig = { ...config, mood };
    const prompt = generatePortraitPrompt(variantConfig);

    try {
      const response = await fetch('/api/imagen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          type: 'portrait',
          characterName: config.character.name,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        variants.push({
          imageUrl: result.imageUrl || result.url,
          prompt,
          style: `${config.style}-${mood}`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          `Portrait variant ${mood} failed:`,
          errorData.error || response.statusText
        );
        variants.push({
          imageUrl: `/api/placeholder-image?text=${encodeURIComponent(
            'Nie udało się wygenerować portretu'
          )}&width=512&height=512`,
          prompt,
          style: `${config.style}-${mood}`,
        });
      }
    } catch (error) {
      console.error('Error generating portrait variant:', error);
      variants.push({
        imageUrl: `/api/placeholder-image?text=${encodeURIComponent(
          'Błąd generowania portretu'
        )}&width=512&height=512`,
        prompt,
        style: `${config.style}-${mood}`,
      });
    }
  }

  return variants;
}

export function getSuggestedPortraitConfigs(
  character: Character,
  template?: EnhancedCharacterTemplate
): PortraitConfig[] {
  const configs: PortraitConfig[] = [];

  configs.push({
    character,
    template,
    style: 'realistic',
    mood: 'serious',
    setting: 'office',
  });

  configs.push({
    character,
    template,
    style: 'noir',
    mood: 'mysterious',
    setting: 'street',
  });

  if (['Akademik', 'Lekarz', 'Antykwariusz'].includes(character.occupation)) {
    configs.push({
      character,
      template,
      style: 'vintage',
      mood: 'scholarly',
      setting: 'library',
    });
  }

  return configs;
}

export async function generateQuickPortrait(
  character: Character,
  template?: EnhancedCharacterTemplate
): Promise<PortraitResult | null> {
  const config: PortraitConfig = {
    character,
    template,
    style: 'realistic',
    mood: 'serious',
    setting: 'studio',
  };

  const prompt = generatePortraitPrompt(config);

  try {
    const response = await fetch('/api/imagen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        type: 'portrait',
        characterName: character.name,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        imageUrl: result.imageUrl || result.url,
        prompt,
        style: config.style,
      };
    }

    const errorData = await response.json().catch(() => ({}));
    console.warn('Quick portrait failed:', errorData.error || response.statusText);
  } catch (error) {
    console.error('Error generating quick portrait:', error);
  }

  return {
    imageUrl: `/api/placeholder-image?text=${encodeURIComponent(
      'Nie udało się wygenerować portretu. Sprawdź klucze API w ustawieniach.'
    )}&width=512&height=512`,
    prompt,
    style: config.style,
  };
}

export const characterPortraitGenerator = {
  generatePortraitPrompt,
  generatePortraitVariants,
  getSuggestedPortraitConfigs,
  generateQuickPortrait,
};

export type { PortraitConfig, PortraitResult };
