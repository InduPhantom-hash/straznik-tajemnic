/**
 * Session Export - Shared types
 */

import { Character } from '../types';

export interface SessionExportData {
  name?: string;
  date?: Date;
  character?: Character;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: Date;
    generatedImages?: string[];
    // Diagnostic fields
    rawContent?: string; // Surowa treść przed formatowaniem
    ttsStatus?: 'success' | 'error' | 'skipped' | 'pending';
    ttsError?: string;
    imagePrompts?: string[]; // Prompty do generowania obrazów
    imageStatus?: 'success' | 'error' | 'skipped';
    tokenCount?: number;
    modelUsed?: string;
    responseTime?: number; // ms
  }>;
  notes?: string;
  images?: string[];
}
