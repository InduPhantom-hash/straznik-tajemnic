/**
 * API endpoint: PDF (FormData) → tekst → LOKALNY indeks zasad
 * Fala 2 - kreator pierwszego uruchomienia ("Strażnik Tajemnic", produkt B).
 *
 * Samodzielny, BEZ chmury (zero GCS). Gracz wgrywa własny podręcznik:
 * parse w pamięci → chunk → embedding (Gemini) → zapis do data/rag/rules.*
 * przez localVectorStore (`getWritableDataDir()` / `RAG_DATA_DIR`).
 *
 * Różni się od /api/upload-pdf (GCS-first): tu plik leci od razu do pamięci serwera
 * i nigdy nie dotyka chmury - jedyne wyjście to embeddingi do Gemini.
 *
 * POST FormData { file: PDF, type?: 'rules'|'adventure' (domyślnie rules), fileName?, adventureId? }
 *   → { success, indexed, failed, totalChunks, namespace, durationMs }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDocumentModelUseBlocked, documentPolicyError } from '@/lib/document-model-policy';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { embeddingService } from '@/lib/embedding-service';
import { pdfParserService } from '@/lib/pdf-parser-service';
import { extractAdventureEntities } from '@/lib/pdf/adventure-extractor';
import { detectRulebookProfile } from '@/lib/pdf/rulebook-fingerprint';
import { generateSemanticOverlay } from '@/lib/pdf/semantic-overlay-engine';
import { registerOverlay, loadCapabilities } from '@/lib/pdf/capabilities-manager';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';
import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';

export const maxDuration = 300; // 5 min - duże podręczniki (setki stron)
export const runtime = 'nodejs';

const MAX_PDF_BYTES = 500 * 1024 * 1024; // 500 MB (spójnie z /api/upload-pdf)
const MIN_TEXT_LENGTH = 100;

function writableRagDirectory(): string {
  return process.env.RAG_DATA_DIR || path.join(getWritableDataDir(), 'rag');
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    // Klucz Gemini (opcjonalny fallback): lokalny RAG używa wbudowanego modelu ONNX (BGE-M3).
    const geminiApiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() || process.env.GEMINI_API_KEY?.trim() || undefined;

    let pdfText = '';
    let fileName = '';
    let type: 'rules' | 'adventure' = 'rules';
    let clearBefore = false;
    let adventureId: string | undefined;

    let pdfPagesCount = 1;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      pdfText = body.text;
      type = body.type === 'adventure' ? 'adventure' : 'rules';
      fileName = body.fileName || `${type}-document`;
      adventureId =
        typeof body.adventureId === 'string' && body.adventureId.trim()
          ? body.adventureId.trim()
          : undefined;
      clearBefore = body.clearBefore === true;
    } else {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'Brak pliku PDF (pole formularza "file")' },
          { status: 400 }
        );
      }
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'Tylko pliki PDF są dozwolone' },
          { status: 400 }
        );
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: 'Plik jest za duży. Maksymalny rozmiar to 500MB',
          },
          { status: 400 }
        );
      }

      const rawType = formData.get('type');
      type = rawType === 'adventure' ? 'adventure' : 'rules';
      const rawAdvId = formData.get('adventureId');
      adventureId =
        typeof rawAdvId === 'string' && rawAdvId.trim()
          ? rawAdvId.trim()
          : undefined;
      fileName =
        (typeof formData.get('fileName') === 'string'
          ? (formData.get('fileName') as string)
          : '') ||
        file.name ||
        `${type}-document`;
      clearBefore = type === 'rules' || (type === 'adventure' && !!adventureId);

      // Parse PDF w pamięci (pdf-parse na buforze - GCS-free).
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const parsed = await pdfParserService.parsePDFBuffer(buffer);
        pdfText = parsed.text;
        pdfPagesCount = parsed.pages || 1;
        console.log(
          `📄 PDF sparsowany lokalnie: ${parsed.pages} stron, ${pdfText.length} znaków ("${fileName}")`
        );
      } catch (parseError) {
        return NextResponse.json(
          {
            success: false,
            error: `Błąd parsowania PDF: ${
              parseError instanceof Error ? parseError.message : 'Nieznany błąd'
            }`,
          },
          { status: 422 }
        );
      }
    }

    if (!pdfText || pdfText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Tekst za krótki do indeksowania (${
            pdfText?.length ?? 0
          } znaków, minimum ${MIN_TEXT_LENGTH}). PDF może być skanem bez warstwy tekstowej (OCR).`,
        },
        { status: 422 }
      );
    }

    // Doktryna Clean Room Engine (BYOB / Zero-Cytowań):
    // Podręcznik gracza jest analizowany wyłącznie lokalnie na urządzeniu w RAM (detekcja reguł i profilu).
    // Chroniony autorsko tekst książki NIE trafia do zewnętrznych ani lokalnych modeli AI.
    if (type === 'rules') {
      const rulebookProfile = detectRulebookProfile(pdfText);
      const ragDir = writableRagDirectory();
      if (!fs.existsSync(ragDir)) {
        fs.mkdirSync(ragDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(ragDir, 'rules-profile.json'),
        JSON.stringify(rulebookProfile, null, 2),
        'utf-8'
      );
      console.log(`📜 Profil podręcznika wykryty i zapisany: ${rulebookProfile.profile} (${rulebookProfile.title})`);

      // Generujemy modularną nakładkę semantyczną DLC i rejestrujemy w capabilities.json
      const overlay = generateSemanticOverlay(pdfText, rulebookProfile, fileName);
      const capabilities = registerOverlay(overlay);
      console.log(`🧩 Nakładka DLC zarejestrowana: ${overlay.id} (tagi: ${overlay.tags.join(', ')})`);

      // Tagi dla wektorów syntetycznych (np. RULE:core-d100, TAG:NPC, TAG:CZARY itp.)
      const semanticTags = overlay.tags.map((t) => `TAG:${t}`).join(',');
      const combinedTags = semanticTags
        ? `RULE:${rulebookProfile.profile},${semanticTags}`
        : `RULE:${rulebookProfile.profile}`;

      // Zapisujemy w lokalnym store wskaźniki gotowości per strona (doktryna Zero-Cytowań: text jest undefined, brak cytatów autorskich)
      const syntheticVectors = Array.from({ length: pdfPagesCount }, (_, i) => ({
        id: `rules-page-${i + 1}`,
        values: [0],
        metadata: {
          contentType: 'rule-page',
          summary: `Strona ${i + 1} podręcznika ${rulebookProfile.title}`,
          sourceFile: fileName,
          chunkIndex: i,
          gameTimestamp: '',
          realTimestamp: new Date().toISOString(),
          tags: combinedTags,
          sessionId: '',
          messageRange: '',
        },
      }));

      await localVectorStore.replaceNamespace('rules', syntheticVectors);

      return NextResponse.json({
        success: true,
        indexed: pdfPagesCount,
        failed: 0,
        totalChunks: pdfPagesCount,
        namespace: 'rules',
        durationMs: Date.now() - start,
        rulebookProfile,
        overlay,
        capabilities,
      });
    }

    // Dla pozostałych dokumentów (np. adventure) obowiązuje polityka ochrony przed wysyłaniem do modeli
    if (isDocumentModelUseBlocked()) {
      return NextResponse.json(
        documentPolicyError(request.headers.get('x-locale') || request.headers.get('accept-language') || 'pl'),
        { status: 403 }
      );
    }

    // Embedding service na kluczu gracza; indeksowanie idzie do data/rag/ (lokalnie).
    embeddingService.initialize(geminiApiKey);

    const result = await pdfIndexingService.indexPdf({
      text: pdfText,
      type,
      fileName,
      clearBefore,
      apiKey: geminiApiKey,
      adventureId,
    });

    if (!result.success) {
      return NextResponse.json(
        { ...result, error: result.error || 'Indeksowanie nie powiodło się' },
        { status: 500 }
      );
    }

    // Jeśli typ to 'adventure' i dostępny jest klucz Gemini, wykonaj rozszerzoną ekstrakcję struktur
    let extractedAdventure = null;
    if (type === 'adventure' && geminiApiKey) {
      try {
        console.log('🤖 Rozpoczynanie ekstrakcji ustrukturyzowanej przygody przez Gemini 3.6 Flash...');
        extractedAdventure = await extractAdventureEntities(pdfText, fileName, geminiApiKey);
        
        // Zapisz wyekstrahowaną strukturę lokalnie w data/adventures/
        const dataDir = path.join(getWritableDataDir(), 'adventures');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const filePath = path.join(dataDir, `${extractedAdventure.adventureId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(extractedAdventure, null, 2), 'utf-8');
        console.log(`💾 Zapisano ustrukturyzowane dane przygody: ${filePath}`);
      } catch (extError) {
        console.warn('⚠️ Ekstrakcja przygody przez Gemini 3.6 Flash nie powiodła się, kontynuowanie samego RAG:', extError);
      }
    }

    return NextResponse.json({
      ...result,
      rulebookProfile: null,
      extractedAdventure,
    });
  } catch (error) {
    console.error('❌ ingest-local API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        durationMs: Date.now() - start,
      },
      { status: 500 }
    );
  }
}

// GET /api/pdf/ingest-local?type=rules|adventure
// Zwraca statystyki lokalnego magazynu wektorów dla ustawień podręcznika.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'rules';
    const adventureId = searchParams.get('adventureId') || undefined;
    const { localVectorStore } = await import('@/lib/vector-db/local-vector-store');
    const { LOCAL_RAG_NAMESPACES } = await import('@/lib/vector-db/vector-types');
    const targetNamespace =
      type === 'rules'
        ? LOCAL_RAG_NAMESPACES.RULES
        : adventureId
          ? LOCAL_RAG_NAMESPACES.adventure(adventureId)
          : LOCAL_RAG_NAMESPACES.ADVENTURES;
    const recordCount = localVectorStore.getNamespaceCount(targetNamespace);

    let rulebookProfile = null;
    if (type === 'rules') {
      try {
        const writableProfilePath = path.join(writableRagDirectory(), 'rules-profile.json');
        const bundledProfilePath = path.join(
          process.env.RAG_BUNDLED_DATA_DIR || path.join(process.cwd(), 'data', 'rag'),
          'rules-profile.json'
        );
        const profilePath = fs.existsSync(writableProfilePath) ? writableProfilePath : bundledProfilePath;
        if (fs.existsSync(profilePath)) {
          rulebookProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
        }
      } catch (err) {
        console.warn('Błąd odczytu rules-profile.json:', err);
      }
    }

    return NextResponse.json({
      success: true,
      type,
      recordCount,
      rulebookProfile,
      capabilities: loadCapabilities(),
    });
  } catch (error) {
    console.error('Błąd GET ingest-local:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rules count', recordCount: 0 },
      { status: 500 }
    );
  }
}
