import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Ładujemy zmienne środowiskowe z .env.local głównego katalogu
dotenv.config({ path: path.join(process.cwd(), '../../../../.env.local') });

import { embeddingService } from '../src/lib/embedding-service';
import { localVectorStore } from '../src/lib/vector-db/local-vector-store';
import { UpsertVector } from '../src/lib/vector-db/vector-types';

const DICTIONARY_PATH = path.join(
  process.cwd(),
  '../../../../data/epochs/lovecraft-mythos/dictionary_wiki.json'
);

const BATCH_SIZE = 20; // limit by avoid rate-limiting
const DELAY_MS = 2000;

interface MythosEntry {
  id: string;
  term: string;
  shortDefinition: string;
  fullContent: string;
  tags?: string[];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEmbed() {
  console.log('[Embed Mythos] Rozpoczynam indeksację Encyklopedii Mitów...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Brak GEMINI_API_KEY w .env.local!');
    process.exit(1);
  }

  if (!fs.existsSync(DICTIONARY_PATH)) {
    console.error(`❌ Nie znaleziono pliku: ${DICTIONARY_PATH}`);
    process.exit(1);
  }

  embeddingService.initialize(process.env.GEMINI_API_KEY);
  localVectorStore.initialize();

  const entries: MythosEntry[] = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf-8'));
  console.log(`[Embed Mythos] Wczytano ${entries.length} haseł do zindeksowania.`);

  // To avoid memory limits or API key exhaustion, we will batch upset to localVectorStore
  // We will read existing mythos namespace so we can skip already embedded items
  let existingCount = 0;
  try {
    existingCount = localVectorStore.getNamespaceCount('mythos');
  } catch(e) { }

  if (existingCount >= entries.length) {
    console.log(`[Embed Mythos] Wszystkie ${existingCount} hasła już istnieją w bazie RAG! Anulowanie.`);
    process.exit(0);
  }
  
  console.log(`[Embed Mythos] Znaleziono ${existingCount} wektorów w bazie. Kontynuacja od miejsca przerwania...`);

  const vectors: UpsertVector[] = [];
  
  for (let i = existingCount; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    console.log(`[Embed Mythos] Przetwarzanie batcha ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(entries.length / BATCH_SIZE)} (hasła ${i} - ${i + batch.length - 1})...`);

    const textsToEmbed = batch.map((entry) => 
      `${entry.term} - ${entry.shortDefinition}\n\n${entry.fullContent}`.slice(0, 5000)
    );

    const embeddings = await embeddingService.generateBatchEmbeddings(textsToEmbed, 'RETRIEVAL_DOCUMENT');
    
    for (let j = 0; j < batch.length; j++) {
      const entry = batch[j];
      const embedding = embeddings[j];
      
      if (embedding) {
        vectors.push({
          id: entry.id,
          values: embedding,
          text: textsToEmbed[j],
          metadata: {
            contentType: 'mythos',
            summary: `${entry.term}: ${entry.shortDefinition}`,
            tags: JSON.stringify(entry.tags || []),
            gameTimestamp: '',
            realTimestamp: '',
            sessionId: '',
            messageRange: '',
          }
        });
      } else {
        console.warn(`⚠️ Pominięto wektor dla: ${entry.term} (błąd API)`);
      }
    }
    
    // UPSERT TO LOCAL STORE
    await localVectorStore.upsert('mythos', vectors);
    // Wyczyść vectors po wrzuceniu żeby nie dublować
    vectors.length = 0;
    
    if (i + BATCH_SIZE < entries.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n[Embed Mythos] 🎉 Zakończono! Zapisano wektory do data/rag/mythos.json`);
}

runEmbed().catch((err) => {
  console.error('[Embed Mythos Error]', err);
  process.exit(1);
});
