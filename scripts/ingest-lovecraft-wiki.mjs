import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * Lekki Parser MediaWiki XML bez zewnętrznych zależności
 * Ekstrahuje artykuły ze zrzutu MediaWiki XML do zunifikowanego formatu encyklopedii (lovecraft-mythos).
 */

const ARCHIVE_PATH = '/Volumes/Karta/Zew - materiały/wiki-lovecraft_pages_current.xml.7z';
const TARGET_DIR = path.join(process.cwd(), 'data', 'epochs', 'lovecraft-mythos');
const PUBLIC_TARGET_DIR = path.join(process.cwd(), 'public', 'data', 'epochs', 'lovecraft-mythos');

const CATEGORY_RULES = [
  { id: 'great_old_ones', title: 'Wielcy Przedwieczni i Bóstwa', keywords: ['great old one', 'outer god', 'elder god', 'deity', 'god'] },
  { id: 'creatures', title: 'Stwory i Istoty', keywords: ['creature', 'species', 'monster', 'beast', 'race', 'servitor'] },
  { id: 'grimoires', title: 'Księgi i Arkanum', keywords: ['grimoire', 'book', 'tome', 'manuscript', 'text', 'necronomicon'] },
  { id: 'characters', title: 'Postacie i Badacze', keywords: ['character', 'human', 'cultist', 'doctor', 'professor', 'author'] },
  { id: 'locations', title: 'Mroczne Lokacje', keywords: ['location', 'city', 'town', 'island', 'planet', 'arkham', 'innsmouth', 'r\'lyeh'] },
  { id: 'stories', title: 'Opowiadania i Mitologia', keywords: ['story', 'work', 'tale', 'novel', 'mythos'] }
];

async function runIngest() {
  console.log(`[Lovecraft Wiki Ingest] Rozpoczynanie ekstrakcji archiwum: ${ARCHIVE_PATH}`);

  if (!fs.existsSync(ARCHIVE_PATH)) {
    console.error(`[Error] Plik źródłowy archiwum nie istnieje: ${ARCHIVE_PATH}`);
    process.exit(1);
  }

  [TARGET_DIR, PUBLIC_TARGET_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('[Lovecraft Wiki Ingest] Odczyt strumieniowy XML przez bsdtar...');
  const bsdtar = spawnSync('bsdtar', ['-xf', ARCHIVE_PATH, '-O'], {
    maxBuffer: 500 * 1024 * 1024,
    encoding: 'utf-8'
  });

  if (bsdtar.error || !bsdtar.stdout) {
    console.error('[Error] Błąd dekompresji pliku XML:', bsdtar.error);
    process.exit(1);
  }

  const xmlContent = bsdtar.stdout;
  console.log(`[Lovecraft Wiki Ingest] Wczytano XML (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB). Wyciąganie haseł...`);

  const wikiEntries = [];
  const categoriesCount = {};

  // Ekstrakcja stron poprzez wyrażenia regularne (szybkie i niezależne od zewnętrznych paczek XML)
  const pageRegex = /<page>([\s\S]*?)<\/page>/g;
  let match;
  let totalProcessedPages = 0;

  while ((match = pageRegex.exec(xmlContent)) !== null) {
    totalProcessedPages++;
    const pageBlock = match[1];

    const nsMatch = pageBlock.match(/<ns>(\d+)<\/ns>/);
    if (!nsMatch || nsMatch[1] !== '0') continue;

    const titleMatch = pageBlock.match(/<title>([\s\S]*?)<\/title>/);
    if (!titleMatch) continue;

    const title = unescapeXml(titleMatch[1].trim());
    if (!title || title.startsWith('List of') || title.startsWith('Category:')) continue;

    const textMatch = pageBlock.match(/<text[^>]*>([\s\S]*?)<\/text>/);
    if (!textMatch) continue;

    const text = unescapeXml(textMatch[1]);
    if (text.trim().startsWith('#REDIRECT') || text.trim().startsWith('#redirect') || text.length < 150) {
      continue;
    }

    const cleanContent = cleanWikitext(text);
    if (cleanContent.length < 100) continue;

    const categoryInfo = determineCategory(title, text);
    categoriesCount[categoryInfo.id] = (categoriesCount[categoryInfo.id] || 0) + 1;

    const isPublicDomainLovecraft = isOriginalLovecraftWork(text, title);
    const entryId = `mythos_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    wikiEntries.push({
      id: entryId,
      category: categoryInfo.id,
      categoryTitle: categoryInfo.title,
      term: title,
      shortDefinition: cleanContent.slice(0, 250).replace(/\n/g, ' ') + '...',
      fullContent: cleanContent.slice(0, 3000),
      tags: extractTags(title, categoryInfo.id),
      sourceAttribution: 'The H.P. Lovecraft Wiki (Fandom)',
      license: 'CC-BY-SA 3.0 / 4.0',
      isPublicDomain: isPublicDomainLovecraft
    });
  }

  wikiEntries.sort((a, b) => a.term.localeCompare(b.term));
  console.log(`[Lovecraft Wiki Ingest] Zanalizowano ${totalProcessedPages} stron XML. Wyekstrahowano ${wikiEntries.length} gotowych haseł Mitów Cthulhu.`);

  const manifest = {
    id: 'lovecraft-mythos',
    name: 'Mity Cthulhu & Świat Lovecrafta',
    period: 'Mitologia Kosmiczna',
    country: 'Global / Universe',
    categories: Object.keys(categoriesCount).map((catId) => ({
      id: catId,
      title: CATEGORY_RULES.find((r) => r.id === catId)?.title || catId,
      fileCount: categoriesCount[catId]
    })),
    updatedAt: new Date().toISOString(),
    totalArticles: wikiEntries.length,
    licenseNotice: 'Treść haseł udostępniana na licencji Creative Commons Attribution-ShareAlike (CC-BY-SA 3.0/4.0). Źródło: The H.P. Lovecraft Wiki na Fandom.com. Twórczość H.P. Lovecrafta w Domenie Publicznej.'
  };

  fs.writeFileSync(path.join(TARGET_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(TARGET_DIR, 'dictionary_wiki.json'), JSON.stringify(wikiEntries, null, 2));
  fs.writeFileSync(path.join(PUBLIC_TARGET_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(PUBLIC_TARGET_DIR, 'dictionary_wiki.json'), JSON.stringify(wikiEntries, null, 2));

  console.log(`[Lovecraft Wiki Ingest] Sukces! Zapisano bazy danych:\n - ${path.join(TARGET_DIR, 'dictionary_wiki.json')}\n - ${path.join(PUBLIC_TARGET_DIR, 'dictionary_wiki.json')}`);
}

function cleanWikitext(wikitext) {
  let cleaned = wikitext;
  cleaned = cleaned.replace(/\{\{[\s\S]*?\}\}/g, '');
  cleaned = cleaned.replace(/\[\[(Category|File|Image|Plik):[\s\S]*?\]\]/gi, '');
  cleaned = cleaned.replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1');
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');
  cleaned = cleaned.replace(/^==+\s*(.*?)\s*==+/gm, '### $1');
  cleaned = cleaned.replace(/'''''/g, '');
  cleaned = cleaned.replace(/'''/g, '');
  cleaned = cleaned.replace(/''/g, '');
  cleaned = cleaned.replace(/<ref[\s\S]*?<\/ref>/gi, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  return cleaned.trim();
}

function unescapeXml(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function determineCategory(title, text) {
  const lowerText = (title + ' ' + text).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lowerText.includes(kw))) {
      return rule;
    }
  }
  return { id: 'general_mythos', title: 'Ogólne Mity Cthulhu' };
}

function isOriginalLovecraftWork(text, title) {
  const lower = (text + ' ' + title).toLowerCase();
  return lower.includes('h. p. lovecraft') || lower.includes('lovecraft') || lower.includes('public domain');
}

function extractTags(title, categoryId) {
  const words = title.toLowerCase().split(/[\s_-]+/);
  words.push(categoryId);
  return Array.from(new Set(words.filter((w) => w.length > 3)));
}

runIngest().catch((err) => {
  console.error('[Ingest Error]', err);
  process.exit(1);
});
