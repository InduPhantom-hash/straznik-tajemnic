import fs from 'fs';
import path from 'path';

/**
 * Pipeline ingestu wiedzy o epoce (PL 1990s-2000s i przyszłe epoki)
 * Przetwarza katalogi źródłowe z podkatalogami 01..16 na zunifikowany format bazy danych epokowych w aplikacji.
 */

const SOURCE_DIR = '/Volumes/Karta/Zew - materiały/DeepResearch_Prompty/1990s-2000s/PL';
const TARGET_DIR = path.join(process.cwd(), 'data', 'epochs', 'pl-1990s-2000s');

async function runIngest() {
  console.log(`[Epoch Ingest] Rozpoczynanie przetwarzania materiałów z: ${SOURCE_DIR}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`[Error] Katalog źródłowy nie istnieje: ${SOURCE_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  const categoryDirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

  console.log(`[Epoch Ingest] Znaleziono ${categoryDirs.length} kategorii tematycznych.`);

  const manifest = {
    id: 'pl-1990s-2000s',
    name: 'Polska (lata 1990–2000)',
    period: '1990-2005',
    country: 'PL',
    categories: [],
    updatedAt: new Date().toISOString(),
    totalArticles: 0
  };

  const wikiDictionary = [];
  const immersionNotes = [];

  for (const catDir of categoryDirs) {
    const fullCatPath = path.join(SOURCE_DIR, catDir);
    const catFiles = fs.readdirSync(fullCatPath).filter(f => !f.startsWith('.'));

    manifest.categories.push({
      id: catDir,
      title: formatCategoryTitle(catDir),
      fileCount: catFiles.length
    });

    for (const file of catFiles) {
      const filePath = path.join(fullCatPath, file);
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      manifest.totalArticles++;

      // Tworzymy strukturę wpisu dla encyklopedii
      const entryId = `${catDir}_${path.basename(file, path.extname(file))}`;
      const articleTitle = formatArticleTitle(file);

      wikiDictionary.push({
        id: entryId,
        category: catDir,
        categoryTitle: formatCategoryTitle(catDir),
        term: articleTitle,
        shortDefinition: content.slice(0, 300).replace(/\n/g, ' ') + '...',
        fullContent: content,
        tags: extractTags(catDir, articleTitle)
      });

      // Wyciągamy kluczowe wytyczne dla MG
      immersionNotes.push({
        category: catDir,
        title: articleTitle,
        summary: content.slice(0, 500).replace(/\n/g, ' ')
      });
    }
  }

  // Zapis manifestu i słownika w katalogu danych oraz public
  const PUBLIC_TARGET_DIR = path.join(process.cwd(), 'public', 'data', 'epochs', 'pl-1990s-2000s');
  if (!fs.existsSync(PUBLIC_TARGET_DIR)) {
    fs.mkdirSync(PUBLIC_TARGET_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(TARGET_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(TARGET_DIR, 'dictionary_wiki.json'), JSON.stringify(wikiDictionary, null, 2));
  fs.writeFileSync(path.join(PUBLIC_TARGET_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(PUBLIC_TARGET_DIR, 'dictionary_wiki.json'), JSON.stringify(wikiDictionary, null, 2));

  // Zapis kapsułki immersyjnej MG
  const summaryImmersion = {
    epochId: 'pl-1990s-2000s',
    instructions: "Używaj realiów Polski z lat 90. i 2000. (waluta, samochody, technologia, procedury) wyłącznie jako tła narracyjnego i sensorycznego. Nie cytuj dokumentów źródłowych w czacie, chyba że postać odczytuje prawa lub oficjalny nakaz.",
    highlights: immersionNotes.slice(0, 30) // Podsumowanie kluczowych realiów
  };
  fs.writeFileSync(path.join(TARGET_DIR, 'summary_immersion.json'), JSON.stringify(summaryImmersion, null, 2));
  fs.writeFileSync(path.join(PUBLIC_TARGET_DIR, 'summary_immersion.json'), JSON.stringify(summaryImmersion, null, 2));

  console.log(`[Epoch Ingest] Zakończono pomyślnie! Przetworzono ${manifest.totalArticles} artykułów w ${manifest.categories.length} kategoriach.`);
  console.log(`[Epoch Ingest] Zapisano w: ${TARGET_DIR}`);
}

function formatCategoryTitle(dirName) {
  return dirName
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function formatArticleTitle(fileName) {
  return path.basename(fileName, path.extname(fileName))
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function extractTags(catDir, title) {
  const words = `${catDir} ${title}`.toLowerCase().split(/[\s_]+/);
  return Array.from(new Set(words.filter(w => w.length > 3)));
}

runIngest().catch(err => {
  console.error('[Epoch Ingest Error]', err);
  process.exit(1);
});
