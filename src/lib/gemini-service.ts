import {
  loadAISettings,
  canMakeAIRequest,
  recordAIRequest,
} from './ai-settings';

export interface ImageGenerationRequest {
  prompt: string;
  style: 'realistic' | 'artistic' | 'horror' | 'vintage';
  quality: 'low' | 'medium' | 'high';
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9';
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: Date;
  cost: number;
  metadata: {
    style: string;
    quality: string;
    aspectRatio: string;
    [key: string]: string | number | boolean;
  };
}

class GeminiService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      const settings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
      if (!settings.geminiApiKey) {
        console.error('Gemini API key not configured');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      return false;
    }
  }

  // Sprawdź czy można wykonać żądanie AI
  private async checkCanMakeRequest(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    return canMakeAIRequest('image');
  }

  async generateCharacterPortrait(
    characterDescription: string,
    style: 'realistic' | 'artistic' | 'horror' | 'vintage' = 'realistic',
    quality: 'low' | 'medium' | 'high' = 'medium',
    aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' = '1:1'
  ): Promise<GeneratedImage | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    if (!(await this.checkCanMakeRequest())) {
      throw new Error(
        'Cannot make AI request - quota exceeded or feature disabled'
      );
    }

    try {
      const prompt = this.buildCharacterPortraitPrompt(
        characterDescription,
        style
      );

      // Użyj nowego endpointu replicate-image
      const response = await fetch('/api/replicate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          model: 'stability-ai/stable-diffusion',
          width: 512,
          height: 512,
          numInferenceSteps: 20,
          guidanceScale: 7.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Zarejestruj użycie
      recordAIRequest('image', 0.02);

      const generatedImage: GeneratedImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: result.imageUrl,
        timestamp: new Date(),
        cost: 0.02,
        metadata: {
          style,
          quality,
          aspectRatio,
          ...result.metadata,
          note: result.note,
          model: result.model,
        },
      };

      return generatedImage;
    } catch (error) {
      console.error('Failed to generate character portrait:', error);
      return null;
    }
  }

  async generateNPCIllustration(
    npcDescription: string,
    context: string,
    style: 'realistic' | 'artistic' | 'horror' | 'vintage' = 'realistic',
    quality: 'low' | 'medium' | 'high' = 'medium',
    aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' = '1:1'
  ): Promise<GeneratedImage | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    if (!(await this.checkCanMakeRequest())) {
      throw new Error(
        'Cannot make AI request - quota exceeded or feature disabled'
      );
    }

    try {
      const prompt = this.buildNPCIllustrationPrompt(
        npcDescription,
        context,
        style
      );

      // Użyj nowego endpointu replicate-image
      const response = await fetch('/api/replicate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          model: 'stability-ai/stable-diffusion',
          width: 512,
          height: 512,
          numInferenceSteps: 20,
          guidanceScale: 7.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Zarejestruj użycie
      recordAIRequest('image', 0.02);

      const generatedImage: GeneratedImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: result.imageUrl,
        timestamp: new Date(),
        cost: 0.02,
        metadata: {
          style,
          quality,
          aspectRatio,
          ...result.metadata,
          note: result.note,
          model: result.model,
        },
      };

      return generatedImage;
    } catch (error) {
      console.error('Failed to generate NPC illustration:', error);
      return null;
    }
  }

  async generateVisionImage(
    visionDescription: string,
    intensity: 'mild' | 'moderate' | 'severe' = 'moderate',
    style: 'realistic' | 'artistic' | 'horror' | 'vintage' = 'horror'
  ): Promise<GeneratedImage | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    if (!(await this.checkCanMakeRequest())) {
      throw new Error(
        'Cannot make AI request - quota exceeded or feature disabled'
      );
    }

    try {
      const prompt = this.buildVisionPrompt(
        visionDescription,
        intensity,
        style
      );

      // Użyj nowego endpointu replicate-image
      const response = await fetch('/api/replicate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          model: 'stability-ai/stable-diffusion',
          width: 512,
          height: 512,
          numInferenceSteps: 20,
          guidanceScale: 7.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Zarejestruj użycie
      recordAIRequest('image', 0.02);

      const generatedImage: GeneratedImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: result.imageUrl,
        timestamp: new Date(),
        cost: 0.02,
        metadata: {
          style,
          quality: 'medium',
          aspectRatio: '1:1',
          ...result.metadata,
          note: result.note,
          model: result.model,
        },
      };

      return generatedImage;
    } catch (error) {
      console.error('Failed to generate vision image:', error);
      return null;
    }
  }

  // Prywatne metody do budowania promptów
  private buildCharacterPortraitPrompt(
    description: string,
    style: string
  ): string {
    const stylePrompts = {
      realistic: 'realistyczny portret, szczegółowy, profesjonalny',
      artistic: 'artystyczny portret, malarski styl, kreatywny',
      horror: 'portret w stylu horroru, mroczny, niepokojący',
      vintage: 'portret w stylu vintage, retro, klasyczny',
    };

    return `Stwórz ${stylePrompts[style as keyof typeof stylePrompts]} postaci RPG: ${description}. Portret powinien być w wysokiej jakości, z odpowiednim oświetleniem i atmosferą.`;
  }

  private buildNPCIllustrationPrompt(
    description: string,
    context: string,
    style: string
  ): string {
    const stylePrompts = {
      realistic: 'realistyczna ilustracja, szczegółowa, profesjonalna',
      artistic: 'artystyczna ilustracja, malarski styl, kreatywna',
      horror: 'ilustracja w stylu horroru, mroczna, niepokojąca',
      vintage: 'ilustracja w stylu vintage, retro, klasyczna',
    };

    return `Stwórz ${stylePrompts[style as keyof typeof stylePrompts]} NPC z gry RPG: ${description}. Kontekst: ${context}. Ilustracja powinna być w wysokiej jakości, z odpowiednim otoczeniem i atmosferą.`;
  }

  private buildVisionPrompt(
    description: string,
    intensity: string,
    style: string
  ): string {
    const intensityPrompts = {
      mild: 'łagodna, subtelna',
      moderate: 'umiarkowana, wyraźna',
      severe: 'intensywna, przytłaczająca',
    };

    const stylePrompts = {
      realistic: 'realistyczna wizja, szczegółowa',
      artistic: 'artystyczna wizja, symboliczna',
      horror: 'wizja w stylu horroru, kosmiczna',
      vintage: 'wizja w stylu vintage, klasyczna',
    };

    return `Stwórz ${intensityPrompts[intensity as keyof typeof intensityPrompts]} ${stylePrompts[style as keyof typeof stylePrompts]}: ${description}. Wizja powinna być surrealistyczna, przedstawiająca surrealistyczne, kosmiczne elementy w stylu Lovecrafta.`;
  }

  // Sprawdź status API
  async checkAPIStatus(apiKey?: string): Promise<boolean> {
    try {
      console.log('🔍 Testing Gemini API connection...');
      // IND-30: Klucz priorytetowo z argumentu (live form state w UI) -> fallback do
      // localStorage (loadAISettings) -> endpoint robi ostatni fallback do env.
      // Przed sesją 21 czytaliśmy tylko localStorage — formularz wpisany przez usera
      // nie był testowany dopóki nie zapisał Settings, co dawało "zielony status"
      // dla niepoprawnego klucza wpisanego ad-hoc.
      // SSR safety: loadAISettings() ma guard `typeof window !== 'undefined'` (storage.ts:18).
      const effectiveKey = apiKey ?? loadAISettings().geminiApiKey;
      const response = await fetch('/api/chat-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testConnection: true,
          apiKey: effectiveKey,
        }),
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API test failed with status:', response.status);
        console.error('❌ Error details:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('✅ API response:', data);

      // Sprawdź czy odpowiedź zawiera sukces lub brak błędu
      const isSuccess = data.success === true || (!data.error && data.response);
      console.log('🎯 Test result:', isSuccess ? 'SUCCESS' : 'FAILED');
      return isSuccess;
    } catch (error) {
      console.error('❌ API status check failed:', error);
      return false;
    }
  }
}

// Eksportuj instancję singleton
export const geminiService = new GeminiService();
