/**
 * Google Text-to-Speech Service (Client-side wrapper)
 * Wywołuje API endpoint który używa Google Cloud TTS
 */

export interface GoogleTTSSettings {
  languageCode: string; // np. 'pl-PL', 'en-US'
  voiceName: string; // np. 'pl-PL-Wavenet-A'
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate: number; // 0.25 - 4.0 (1.0 = normalnie)
  pitch: number; // -20.0 - 20.0 (0 = normalne)
  volumeGainDb: number; // -96.0 - 16.0 (0 = normalne)
  effectsProfileId?: string[]; // np. ['headphone-class-device']
}

export interface TTSGenerationResult {
  audioUrl: string;
  duration: number;
  cost: number;
  timestamp: Date;
}

/** Input do `generateVoiceNarration` - mieszane formaty z różnych callerów (NPC voice, ElevenLabs-compat, manual). */
export interface VoiceNarrationInput {
  languageCode?: string;
  voiceName?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number;
  speed?: number; // alias dla speakingRate
  pitch?: number;
  volumeGainDb?: number;
}

/** Output `generateVoiceNarration` - kompatybilny z ElevenLabs response shape. */
export interface VoiceNarrationResult {
  id: string;
  type: 'voice';
  audioUrl: string;
  duration: number;
  timestamp: string | Date;
  cost: number;
  metadata: {
    voiceId: string;
    quality: 'high';
  };
}

/** Format voice zwracany przez `/api/tts/google` (subset Google Cloud TTS API). */
export interface GoogleVoiceFromAPI {
  voiceId: string;
  name: string;
  displayName: string;
  fullName: string;
  gender: string;
  genderPL: string;
  description: string;
  type: string;
  typeEmoji: string;
  priority: number;
  language: string;
  category: string;
}

const DEFAULT_SETTINGS: GoogleTTSSettings = {
  languageCode: 'pl-PL',
  voiceName: 'pl-PL-Wavenet-A',
  gender: 'MALE',
  speakingRate: 0.85, // Wolniej dla atmosfery Lovecrafta
  pitch: -3.0, // Niższy ton dla mrocznej narracji
  volumeGainDb: 2.0,
  effectsProfileId: ['large-home-entertainment-class-device'],
};

class GoogleTTSService {
  private isInitialized = false;
  private apiKey: string = '';

  async initialize(): Promise<boolean> {
    // Initialization is done on the API side (server-side only)
    this.isInitialized = true;
    return true;
  }

  /**
   * Generuje audio z tekstu używając Google Cloud TTS API endpoint
   */
  async generateSpeech(
    text: string,
    settings: Partial<GoogleTTSSettings> = {}
  ): Promise<VoiceNarrationResult | null> {
    return this.generateVoiceNarration(text, '', settings);
  }

  /**
   * Generuje audio (kompatybilność z ElevenLabs)
   */
  async generateVoiceNarration(
    text: string,
    voiceId: string,
    settings: VoiceNarrationInput
  ): Promise<VoiceNarrationResult | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    try {
      // Mapuj ustawienia z różnych formatów
      const fullSettings = {
        ...DEFAULT_SETTINGS,
        languageCode: settings.languageCode || DEFAULT_SETTINGS.languageCode,
        voiceName: voiceId || settings.voiceName || DEFAULT_SETTINGS.voiceName,
        gender:
          settings.ssmlGender || settings.gender || DEFAULT_SETTINGS.gender,
        speakingRate:
          settings.speakingRate ||
          settings.speed ||
          DEFAULT_SETTINGS.speakingRate,
        pitch: settings.pitch || DEFAULT_SETTINGS.pitch,
        volumeGainDb: settings.volumeGainDb || 0,
      };

      console.log(
        `🎙️ Generating speech with Google TTS: ${text.substring(0, 50)}...`
      );

      // Wywołaj nasz API endpoint (server-side)
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          settings: fullSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google TTS API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate speech');
      }

      // Zwróć w formacie kompatybilnym z ElevenLabs
      return {
        id: `tts-${Date.now()}`,
        type: 'voice',
        audioUrl: result.audioUrl,
        duration: result.duration,
        timestamp: result.timestamp,
        cost: result.cost,
        metadata: {
          voiceId: fullSettings.voiceName,
          quality: 'high',
        },
      };
    } catch (error) {
      console.error('Failed to generate speech:', error);
      return null;
    }
  }

  /**
   * Szacuje czas trwania audio na podstawie długości tekstu i prędkości mówienia
   */
  private estimateDuration(text: string, speakingRate: number): number {
    // Średnio 150 słów na minutę przy normalnej prędkości (1.0)
    const wordsPerMinute = 150 * speakingRate;
    const words = text.split(/\s+/).length;
    const durationInMinutes = words / wordsPerMinute;
    return Math.ceil(durationInMinutes * 60); // w sekundach
  }

  /**
   * Kompresuje tekst przed wysłaniem do TTS (usuwanie didaskaliów, skracanie)
   */
  compressTextForTTS(text: string): string {
    // Usuń didaskalia historyczne w nawiasach klamrowych
    let compressed = text.replace(/\{[^}]*\}/g, '').trim();

    // Usuń polecenia gracza w nawiasach kwadratowych
    compressed = compressed.replace(/\[.*?\]/g, '').trim();

    // Usuń znaki formatowania markdown (ważne: przed usunięciem emotikonów)
    // Usuń podwójne gwiazdki (pogrubienie) - **tekst**
    compressed = compressed.replace(/\*\*/g, '');
    // Usuń pojedyncze gwiazdki używane do kursywy - *tekst* (prostszy regex dla kompatybilności)
    compressed = compressed.replace(/\*([^*]+?)\*/g, '$1');
    // Usuń podwójne podkreślenia (pogrubienie) - __tekst__
    compressed = compressed.replace(/__/g, '');
    // Usuń pojedyncze podkreślenia używane do kursywy - _tekst_ (prostszy regex)
    compressed = compressed.replace(/_([^_]+?)_/g, '$1');
    // Usuń backtick (kod) - `tekst`
    compressed = compressed.replace(/`/g, '');
    // Usuń nagłówki markdown - # ## ### ####
    compressed = compressed.replace(/^#{1,6}\s+/gm, '');
    // Usuń linki markdown - [tekst](url) lub ![alt](url)
    compressed = compressed.replace(/!?\[([^\]]*)\]\([^\)]*\)/g, '$1');
    // Usuń blockquotes - > tekst
    compressed = compressed.replace(/^>\s+/gm, '');
    // Usuń horizontal rules - --- lub ***
    compressed = compressed.replace(/^[-*]{3,}$/gm, '');
    // Usuń listy markdown - - * + na początku linii
    compressed = compressed.replace(/^[\s]*[-*+]\s+/gm, '');
    // Usuń numerowane listy - 1. 2. etc.
    compressed = compressed.replace(/^\d+\.\s+/gm, '');

    // Usuń emotikony Unicode (emoji)
    // Regex dla emotikonów Unicode: zakresy emoji w Unicode
    compressed = compressed.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    compressed = compressed.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
    compressed = compressed.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
    compressed = compressed.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    compressed = compressed.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
    compressed = compressed.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
    compressed = compressed.replace(/[\u{FE00}-\u{FE0F}]/gu, ''); // Variation Selectors
    compressed = compressed.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
    compressed = compressed.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
    compressed = compressed.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A

    // Usuń standardowe emotikony tekstowe
    compressed = compressed.replace(/[:;=][-']?[)DpP]/g, ''); // :) :D :P :( etc.
    compressed = compressed.replace(/[)DpP][-']?[:;=]/g, ''); // odwrotne: ) :D :P etc.

    // Usuń nadmiarowe spacje
    compressed = compressed.replace(/\s+/g, ' ').trim();

    // Ogranicz długość do 5000 znaków (limit Google TTS)
    if (compressed.length > 5000) {
      compressed = compressed.substring(0, 4997) + '...';
    }

    return compressed;
  }

  /**
   * Pobierz dostępne głosy z Google Cloud TTS API endpoint
   */
  async getAvailableVoices(
    languageCode?: string
  ): Promise<GoogleVoiceFromAPI[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return [];
    }

    try {
      const url = languageCode
        ? `/api/tts/google?languageCode=${languageCode}`
        : `/api/tts/google`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  /**
   * Test połączenia z Google Cloud TTS API
   */
  async checkAPIStatus(): Promise<boolean> {
    try {
      const result = await this.generateSpeech('Test', {
        languageCode: 'en-US',
        voiceName: 'en-US-Wavenet-A',
      });
      return result !== null;
    } catch (error) {
      console.error('Google TTS API status check failed:', error);
      return false;
    }
  }
}

export const googleTTSService = new GoogleTTSService();
