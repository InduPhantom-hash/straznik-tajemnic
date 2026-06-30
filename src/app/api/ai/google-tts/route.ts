import { NextRequest, NextResponse } from 'next/server';
import { apiCacheService } from '@/lib/api-cache-service';

export async function POST(request: NextRequest) {
  try {
    const { type, text, voiceId, soundEffectId, settings } = await request.json();
    
    // Sprawdź czy klucz API jest dostępny
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Cloud API key not configured' },
        { status: 500 }
      );
    }

    // Walidacja typu żądania - Google TTS obsługuje głos, test i voices
    if (!type || (type !== 'voice' && type !== 'test' && type !== 'voices')) {
      return NextResponse.json(
        { error: 'Invalid type. Google TTS supports only "voice", "test" or "voices" type' },
        { status: 400 }
      );
    }

    // Test endpoint - sprawdź czy API jest dostępne
    if (type === 'test') {
      return NextResponse.json({ 
        status: 'available',
        message: 'Google TTS API is configured and ready'
      });
    }

    // Voices endpoint - pobierz listę dostępnych głosów
    if (type === 'voices') {
      if (!apiKey) {
        return NextResponse.json({
          error: 'Google TTS API key not configured'
        }, { status: 500 });
      }

      try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch voices: ${response.status}`);
        }

        const data = await response.json();
        const polishVoices = data.voices.filter((voice: any) => 
          voice.languageCodes.includes('pl-PL')
        );

        console.log('🎤 Available Polish voices:', polishVoices.map((v: any) => ({
          name: v.name,
          ssmlGender: v.ssmlGender,
          languageCodes: v.languageCodes
        })));

        return NextResponse.json({
          success: true,
          voices: polishVoices,
          allVoices: data.voices
        });
      } catch (error) {
        console.error('Failed to fetch voices:', error);
        return NextResponse.json({
          error: 'Failed to fetch voices from Google TTS API'
        }, { status: 500 });
      }
    }

    if (type === 'voice') {
      // Generowanie głosu
      if (!text || !voiceId) {
        return NextResponse.json(
          { error: 'Text and voiceId are required for voice generation' },
          { status: 400 }
        );
      }

      // Check cache first
      const cacheKey = { type, text, voiceId, settings };
      const cachedResponse = apiCacheService.get('google-tts', cacheKey);
      
      if (cachedResponse) {
        console.log('Cache hit for Google TTS voice generation');
        return NextResponse.json(cachedResponse);
      }

      try {
        // Przygotuj dane dla Google TTS API
        const requestBody = {
          input: { text: text },
          voice: {
            languageCode: settings?.languageCode || 'pl-PL',
            name: voiceId,
            ssmlGender: settings?.ssmlGender || 'MALE'
          },
          audioConfig: {
            audioEncoding: settings?.audioEncoding || 'MP3',
            speakingRate: settings?.speakingRate || 1.0,
            pitch: settings?.pitch || 0.0,
            volumeGainDb: settings?.volume ? (settings.volume - 50) * 0.4 : 0.0, // Convert 0-100 to dB
            sampleRateHertz: settings?.sampleRateHertz || 24000
          }
        };

        console.log('🎤 Google TTS API Request:', {
          voiceId,
          requestBody,
          settings
        });

        // Generuj audio używając Google Cloud TTS API
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Google TTS API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            requestBody
          });
          throw new Error(`Google TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Google TTS API Success:', {
          voiceId,
          textLength: text.length,
          audioContentLength: data.audioContent?.length || 0
        });
        
        // Dekoduj base64 audio
        const audioBuffer = Buffer.from(data.audioContent, 'base64');

        // Zwróć audio jako base64 data URL
        const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;

        const generatedAudio = {
          id: `google-tts-${Date.now()}`,
          type: 'voice' as const,
          audioUrl: audioDataUrl,
          duration: Math.ceil(text.length / 15), // Szacunkowy czas trwania
          timestamp: new Date().toISOString(),
          cost: Math.ceil(text.length / 1000) * 0.004, // $4 per 1M characters
          metadata: {
            voiceId: voiceId,
            quality: 'high' as const,
            format: 'mp3' as const
          }
        };

        // Cache the response
        apiCacheService.set('google-tts', cacheKey, generatedAudio, 30 * 60 * 1000); // 30 minutes

        return NextResponse.json(generatedAudio);

      } catch (error) {
        console.error('Google TTS voice generation failed:', error);
        return NextResponse.json(
          { error: 'Failed to generate voice narration' },
          { status: 500 }
        );
      }
    }

    // Google TTS nie obsługuje efektów dźwiękowych

    return NextResponse.json(
      { error: 'Invalid request type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Google TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice narration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
