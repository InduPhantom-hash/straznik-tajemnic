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
import { pdfParserService } from '@/lib/pdf-parser-service';
import {
  detectRulebookProfile,
  isAdventureBearingProfile,
  isBaseRulebookProfile,
  isRulebookColumnProfile,
  RulebookFingerprintResult,
  RulebookProfile,
} from '@/lib/pdf/rulebook-fingerprint';
import { generateSemanticOverlay } from '@/lib/pdf/semantic-overlay-engine';
import {
  registerOverlay,
  removeOverlay,
  loadCapabilities,
  InstalledOverlayInfo,
  SystemCapabilities,
} from '@/lib/pdf/capabilities-manager';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';
import { buildLocalCustomAdventures } from '@/lib/pdf/adventure-local-builder';
import { LOCAL_RAG_NAMESPACES, UpsertVector } from '@/lib/vector-db/vector-types';
import type { CustomAdventure } from '@/lib/adventures-data';
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

function getRulebookPriority(profile: RulebookProfile): number {
  switch (profile) {
    case 'core-d100':
      return 50;
    case 'starter-d100':
      return 40;
    case 'custom-d100':
      return 30;
    case 'pulp-d100':
      return 20;
    case 'investigator_handbook':
      return 10;
    default:
      return 0;
  }
}

function buildRulebookVectorsFromCapabilities(
  caps: SystemCapabilities,
  fallbackOverlay?: { id: string; title: string; fileName: string; profile: RulebookProfile; tags: string[]; pageCount: number }
): UpsertVector[] {
  const ruleOverlays = caps.installedOverlays.filter((o) =>
    isRulebookColumnProfile(o.profile)
  );

  const sources =
    ruleOverlays.length > 0
      ? ruleOverlays.map((o) => ({
          id: o.id,
          title: o.title,
          fileName: o.fileName,
          profile: o.profile,
          tags: o.tags,
          pageCount: Math.max(1, o.pageCount || 1),
        }))
      : fallbackOverlay
        ? [fallbackOverlay]
        : [];

  const vectors: UpsertVector[] = [];
  for (const src of sources) {
    const semanticTags = src.tags.map((t) => `TAG:${t}`).join(',');
    const combinedTags = semanticTags
      ? `RULE:${src.profile},${semanticTags}`
      : `RULE:${src.profile}`;

    for (let i = 0; i < src.pageCount; i++) {
      vectors.push({
        id: `rules-${src.id}-p${i + 1}`,
        values: [0],
        metadata: {
          contentType: 'rule-page',
          summary: `Strona ${i + 1} podręcznika ${src.title}`,
          sourceFile: src.fileName,
          chunkIndex: i,
          gameTimestamp: '',
          realTimestamp: new Date().toISOString(),
          tags: combinedTags,
          sessionId: '',
          messageRange: '',
        },
      });
    }
  }

  return vectors;
}

function syncRulesProfileJson(
  ragDir: string,
  caps: SystemCapabilities,
  latestFingerprint?: RulebookFingerprintResult
): RulebookFingerprintResult | null {
  if (!fs.existsSync(ragDir)) {
    fs.mkdirSync(ragDir, { recursive: true });
  }
  const profileFilePath = path.join(ragDir, 'rules-profile.json');
  const ruleOverlays = caps.installedOverlays.filter((o) =>
    isRulebookColumnProfile(o.profile)
  );

  if (ruleOverlays.length === 0) {
    try {
      if (fs.existsSync(profileFilePath)) {
        fs.unlinkSync(profileFilePath);
      }
    } catch (e) {
      console.warn('⚠️ Nie udało się usunąć rules-profile.json:', e);
    }
    return null;
  }

  const sorted = [...ruleOverlays].sort(
    (a, b) => getRulebookPriority(b.profile) - getRulebookPriority(a.profile)
  );
  const top = sorted[0];

  if (latestFingerprint && latestFingerprint.profile === top.profile) {
    fs.writeFileSync(profileFilePath, JSON.stringify(latestFingerprint, null, 2), 'utf-8');
    return latestFingerprint;
  }

  // Jeśli istnieje już plik rules-profile.json o wyższym lub równym priorytecie, zachowaj go
  if (fs.existsSync(profileFilePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(profileFilePath, 'utf-8')) as RulebookFingerprintResult;
      if (
        existing &&
        ruleOverlays.some((o) => o.profile === existing.profile) &&
        getRulebookPriority(existing.profile) >= getRulebookPriority(top.profile)
      ) {
        return existing;
      }
    } catch {
      // nadpisz poniżej
    }
  }

  const synthesized: RulebookFingerprintResult = latestFingerprint && isRulebookColumnProfile(latestFingerprint.profile)
    ? latestFingerprint
    : {
        profile: top.profile,
        title: top.title,
        confidence: 0.9,
        detectedFeatures: {
          hasCombatRules: caps.flags.hasCombatRules,
          hasSanityRules: caps.flags.hasSanityRules,
          hasChaseRules: caps.flags.hasChaseRules,
          hasMagicRules: caps.flags.hasMagicSystem,
          hasCreatures: caps.counts.totalCreatures > 0,
          hasSpells: caps.counts.totalSpells > 0,
          hasHandouts: caps.counts.totalHandouts > 0,
          hasScenarios: caps.counts.totalAdventures > 0,
          hasPulpTalents: caps.flags.hasPulpTalents,
          hasInvestigatorCreation: top.profile === 'investigator_handbook' || top.profile === 'core-d100',
        },
        detectedLanguage: 'pl',
        semanticPlan: {
          detectedCategories: top.tags,
          estimatedEntities: {
            npcs: caps.counts.totalNpcs > 0,
            locations: false,
            clues: false,
            handouts: caps.counts.totalHandouts > 0,
            spells: caps.counts.totalSpells > 0,
            creatures: caps.counts.totalCreatures > 0,
            rules: true,
          },
          multiPartDetected: false,
        },
      };

  fs.writeFileSync(profileFilePath, JSON.stringify(synthesized, null, 2), 'utf-8');
  return synthesized;
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    let pdfText = '';
    let fileName = '';
    let type: 'rules' | 'adventure' = 'rules';
    let targetColumn: 'rules' | 'optional' | undefined;
    let adventureId: string | undefined;
    let pdfPagesCount = 1;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      pdfText = body.text;
      type = body.type === 'adventure' ? 'adventure' : 'rules';
      if (body.targetColumn === 'rules' || body.targetColumn === 'optional') {
        targetColumn = body.targetColumn;
      }
      fileName = body.fileName || `${type}-document`;
      adventureId =
        typeof body.adventureId === 'string' && body.adventureId.trim()
          ? body.adventureId.trim()
          : undefined;
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
      const rawTargetColumn = formData.get('targetColumn');
      if (rawTargetColumn === 'rules' || rawTargetColumn === 'optional') {
        targetColumn = rawTargetColumn;
      }
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

      // Parse PDF w pamięci (pdf-parse na buforze - GCS-free).
      let arrayBuffer: ArrayBuffer | null = await file.arrayBuffer();
      let buffer: Buffer | null = Buffer.from(arrayBuffer);
      arrayBuffer = null;

      try {
        const parsed = await pdfParserService.parsePDFBuffer(buffer);
        pdfText = parsed.text;
        pdfPagesCount = parsed.pages || 1;
        // Natychmiastowe czyszczenie bufora i tablicy stron po ekstrakcji tekstu
        buffer = null;
        if (parsed.pagesText) {
          parsed.pagesText.length = 0;
          delete parsed.pagesText;
        }
        console.log(
          `📄 PDF sparsowany lokalnie: ${parsed.pages} stron, ${pdfText.length} znaków ("${fileName}")`
        );
      } catch (parseError) {
        buffer = null;
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
    // Podręcznik lub dodatek gracza jest analizowany wyłącznie lokalnie na urządzeniu w RAM.
    const rulebookProfile = detectRulebookProfile(pdfText, fileName);

    if (rulebookProfile.profile === 'unknown' && (targetColumn || type === 'rules')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Nie rozpoznano kompatybilnego podręcznika ani dodatku d100 / CoC 7e w tym pliku PDF.',
          rulebookProfile,
        },
        { status: 422 }
      );
    }

    const requestedColumn: 'rules' | 'optional' =
      targetColumn ?? (type === 'adventure' ? 'optional' : 'rules');

    // Jeśli wywołano bezpośrednio z AdventureSelector (type === 'adventure' bez targetColumn),
    // zachowaj ścieżkę przygody dla nieznanych/homebrew PDF, ale dla rozpoznanych podręczników zastosuj auto-routing.
    const isDetectedRulebook = isRulebookColumnProfile(rulebookProfile.profile);
    const actualColumn: 'rules' | 'optional' =
      rulebookProfile.profile === 'unknown'
        ? requestedColumn
        : isDetectedRulebook
          ? 'rules'
          : 'optional';

    const autoRouted = requestedColumn !== actualColumn;
    const routingKind: 'moved_to_optional' | 'moved_to_rules' | 'none' = !autoRouted
      ? 'none'
      : actualColumn === 'optional'
        ? 'moved_to_optional'
        : 'moved_to_rules';

    const overlay = generateSemanticOverlay(pdfText, rulebookProfile, fileName);

    // Ekstrakcja przygód (dla wszystkich pozycji z prawej kolumny oraz dla Startera d100 z wbudowanym scenariuszem)
    let adventures: CustomAdventure[] = [];
    const shouldExtractAdventures =
      actualColumn === 'optional' ||
      isAdventureBearingProfile(rulebookProfile.profile) ||
      type === 'adventure';

    if (shouldExtractAdventures) {
      adventures = buildLocalCustomAdventures(
        pdfText,
        rulebookProfile,
        overlay,
        fileName,
        pdfPagesCount,
        adventureId
      );

      const dataDir = path.join(getWritableDataDir(), 'adventures');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      for (const adv of adventures) {
        const filePath = path.join(dataDir, `${adv.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(adv, null, 2), 'utf-8');
        console.log(`💾 Zapisano ustrukturyzowane dane przygody: ${filePath}`);
      }

      for (const adv of adventures) {
        const semanticTags = overlay.tags.map((t) => `TAG:${t}`).join(',');
        const combinedTags = semanticTags
          ? `ADVENTURE:${adv.id},${semanticTags}`
          : `ADVENTURE:${adv.id}`;

        const syntheticVectors = Array.from({ length: pdfPagesCount }, (_, i) => ({
          id: `adv-${adv.id}-p${i + 1}`,
          values: [0],
          metadata: {
            contentType: 'adventure-page' as const,
            summary: `Strona ${i + 1} scenariusza ${adv.title}`,
            sourceFile: fileName,
            chunkIndex: i,
            gameTimestamp: '',
            realTimestamp: new Date().toISOString(),
            tags: combinedTags,
            sessionId: '',
            messageRange: '',
          },
        }));

        const targetNamespace = LOCAL_RAG_NAMESPACES.adventure(adv.id);
        await localVectorStore.replaceNamespace(targetNamespace, syntheticVectors);
      }
    }

    const adventureIds = adventures.map((a) => a.id);
    const capabilities = registerOverlay(overlay, {
      column: actualColumn,
      pageCount: pdfPagesCount,
      adventureIds,
    });
    console.log(
      `🧩 Nakładka DLC zarejestrowana: ${overlay.id} (kolumna: ${actualColumn}, tagi: ${overlay.tags.join(', ')})`
    );

    if (actualColumn === 'rules') {
      const ragDir = writableRagDirectory();
      syncRulesProfileJson(ragDir, capabilities, rulebookProfile);
      console.log(
        `📜 Profil podręcznika wykryty i zapisany: ${rulebookProfile.profile} (${rulebookProfile.title})`
      );

      const ruleVectors = buildRulebookVectorsFromCapabilities(capabilities, {
        id: overlay.id,
        title: overlay.title,
        fileName,
        profile: rulebookProfile.profile,
        tags: overlay.tags,
        pageCount: pdfPagesCount,
      });

      await localVectorStore.replaceNamespace('rules', ruleVectors);

      return NextResponse.json({
        success: true,
        indexed: pdfPagesCount,
        failed: 0,
        totalChunks: ruleVectors.length,
        namespace: 'rules',
        durationMs: Date.now() - start,
        rulebookProfile,
        overlay,
        capabilities,
        adventure: adventures[0],
        adventures,
        multipleAdventures: adventures.length > 1,
        actualColumn,
        requestedColumn,
        autoRouted,
        routingKind,
      });
    }

    // actualColumn === 'optional'
    const primaryAdv = adventures[0];
    const targetNamespace = primaryAdv
      ? LOCAL_RAG_NAMESPACES.adventure(primaryAdv.id)
      : LOCAL_RAG_NAMESPACES.ADVENTURES;

    return NextResponse.json({
      success: true,
      indexed: pdfPagesCount,
      failed: 0,
      totalChunks: pdfPagesCount,
      namespace: targetNamespace,
      durationMs: Date.now() - start,
      adventure: primaryAdv,
      adventures,
      multipleAdventures: adventures.length > 1,
      rulebookProfile,
      overlay,
      capabilities,
      actualColumn,
      requestedColumn,
      autoRouted,
      routingKind,
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

// DELETE /api/pdf/ingest-local?overlayId=...&fileName=...
// Usuwa wgrany podręcznik lub dodatek z lokalnego rejestru nakładek, czyści wektory RAG
// oraz kaskadowo usuwa powiązane pliki przygód z data/adventures/.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost/api/pdf/ingest-local');
    let overlayId = searchParams.get('overlayId')?.trim() || '';
    let fileName = searchParams.get('fileName')?.trim() || '';

    if (!overlayId && !fileName) {
      try {
        const body = await request.json();
        if (typeof body?.overlayId === 'string') overlayId = body.overlayId.trim();
        if (typeof body?.fileName === 'string') fileName = body.fileName.trim();
      } catch {
        // brak body JSON
      }
    }

    if (!overlayId && !fileName) {
      return NextResponse.json(
        { success: false, error: 'Wymagany parametr overlayId lub fileName' },
        { status: 400 }
      );
    }

    const currentCaps = loadCapabilities();
    const targetOverlay: InstalledOverlayInfo | undefined =
      currentCaps.installedOverlays.find(
        (o) => (overlayId && o.id === overlayId) || (fileName && o.fileName === fileName)
      );

    const deletedAdventureIds = new Set<string>(targetOverlay?.adventureIds ?? []);
    const targetFileName = targetOverlay?.fileName || fileName;

    // Kaskadowe usunięcie plików przygód z data/adventures/ powiązanych z tym plikiem PDF
    const adventuresDir = path.join(getWritableDataDir(), 'adventures');
    if (fs.existsSync(adventuresDir)) {
      for (const entry of fs.readdirSync(adventuresDir)) {
        if (!entry.endsWith('.json')) continue;
        const fullPath = path.join(adventuresDir, entry);
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Partial<CustomAdventure>;
          const idFromFile = parsed.id || entry.slice(0, -'.json'.length);
          if (
            deletedAdventureIds.has(idFromFile) ||
            (targetFileName && parsed.fileName === targetFileName)
          ) {
            deletedAdventureIds.add(idFromFile);
            fs.unlinkSync(fullPath);
          }
        } catch {
          // ignoruj uszkodzone pliki
        }
      }
    }

    // Usunięcie namespace'ów wektorowych dla usuniętych przygód
    for (const advId of deletedAdventureIds) {
      const advNs = LOCAL_RAG_NAMESPACES.adventure(advId);
      if (typeof localVectorStore.deleteNamespace === 'function') {
        await localVectorStore.deleteNamespace(advNs);
      } else {
        await localVectorStore.replaceNamespace(advNs, []);
      }
    }

    const resolvedOverlayId = targetOverlay?.id || overlayId;
    const capabilities = resolvedOverlayId
      ? removeOverlay(resolvedOverlayId)
      : currentCaps;

    // Przeliczamy wektory 'rules' oraz rules-profile.json dla pozostałych podręczników zasad
    const ragDir = writableRagDirectory();
    const updatedRulebookProfile = syncRulesProfileJson(ragDir, capabilities);
    const remainingRuleVectors = buildRulebookVectorsFromCapabilities(capabilities);

    if (remainingRuleVectors.length > 0) {
      await localVectorStore.replaceNamespace('rules', remainingRuleVectors);
    } else if (typeof localVectorStore.deleteNamespace === 'function') {
      await localVectorStore.deleteNamespace('rules');
    } else {
      await localVectorStore.replaceNamespace('rules', []);
    }

    return NextResponse.json({
      success: true,
      removedOverlay: targetOverlay ?? null,
      deletedAdventureIds: Array.from(deletedAdventureIds),
      deletedFileName: targetFileName || null,
      capabilities,
      rulebookProfile: updatedRulebookProfile,
      recordCount: remainingRuleVectors.length,
    });
  } catch (error) {
    console.error('❌ DELETE ingest-local error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nie udało się usunąć pozycji PDF',
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

    let rulebookProfile: RulebookFingerprintResult | null = null;
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

    const capabilities = loadCapabilities();
    const hasInstalledOverlays = capabilities.installedOverlays.length > 0;
    const hasBaseRules = hasInstalledOverlays
      ? capabilities.flags.hasBaseRules
      : recordCount > 0 &&
        (!rulebookProfile?.profile || isBaseRulebookProfile(rulebookProfile.profile));

    return NextResponse.json({
      success: true,
      type,
      recordCount,
      rulebookProfile,
      capabilities,
      hasBaseRules,
    });
  } catch (error) {
    console.error('Błąd GET ingest-local:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rules count', recordCount: 0 },
      { status: 500 }
    );
  }
}
