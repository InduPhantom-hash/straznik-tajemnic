export const DEFAULT_TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
export const FALLBACK_TRANSCRIBE_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];

export interface TranscribeSegment {
  speaker: string;
  text: string;
}

export interface TranscribeResponseBody {
  text: string;
  segments?: TranscribeSegment[];
}
