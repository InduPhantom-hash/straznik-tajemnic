import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runtime = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(runtime, '../../..');
const source = path.join(root, 'data/epochs/lovecraft-mythos/dictionary_wiki.json');
const sourceManifest = path.join(root, 'data/epochs/lovecraft-mythos/manifest.json');
const output = path.join(runtime, 'data/mythos');
const publicOutput = path.join(runtime, 'public/data/epochs/lovecraft-mythos');
const clean = (value) => String(value ?? '').replace(/\r/g, '').split('\n').filter((line) => !/^\s*(\{\{|\|[^\n]*=|<[^>]+>)\s*$/.test(line)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const urlFor = (term) => `https://lovecraft.fandom.com/wiki/${encodeURIComponent(term.replace(/\s+/g, '_'))}`;
if (!fs.existsSync(source) || !fs.existsSync(sourceManifest)) throw new Error('Brak źródła Mythos');
const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
const manifestSource = JSON.parse(fs.readFileSync(sourceManifest, 'utf8'));
const ids = new Set(); const content = new Set(); const rejected = []; const records = [];
for (const row of raw) {
  const id = clean(row.id); const term = clean(row.term); const fullContent = clean(row.fullContent);
  const fingerprint = crypto.createHash('sha256').update(`${term}\n${fullContent}`).digest('hex');
  if (!id || !term || fullContent.length < 80) { rejected.push({ id: id || null, reason: 'missing_required_content' }); continue; }
  if (ids.has(id) || content.has(fingerprint)) { rejected.push({ id, reason: 'duplicate' }); continue; }
  ids.add(id); content.add(fingerprint);
  records.push({ id, term, category: clean(row.category) || 'general_mythos', categoryTitle: clean(row.categoryTitle) || 'Mythos', shortDefinition: clean(row.shortDefinition) || fullContent.slice(0, 360), fullContent, tags: [...new Set((Array.isArray(row.tags) ? row.tags : []).map(clean).filter((tag) => tag.length >= 2 && tag.length <= 80))], sourceUrl: urlFor(term), sourceAttribution: clean(row.sourceAttribution) || 'The H.P. Lovecraft Wiki (Fandom)', license: clean(row.license) || 'CC-BY-SA 3.0 / 4.0', isPublicDomain: row.isPublicDomain === true, modified: true, datasetVersion: manifestSource.updatedAt || 'unknown' });
}
const manifest = { id: 'lovecraft-mythos', datasetVersion: manifestSource.updatedAt || 'unknown', source: 'The H.P. Lovecraft Wiki (Fandom)', license: 'CC-BY-SA 3.0 / 4.0', sourceArticles: raw.length, canonicalArticles: records.length, rejectedArticles: rejected.length, checksum: crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'), generatedAt: new Date().toISOString() };
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(publicOutput, { recursive: true });
fs.writeFileSync(path.join(output, 'canonical-mythos.json'), JSON.stringify(records));
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(output, 'rejected.json'), JSON.stringify(rejected, null, 2));
fs.writeFileSync(path.join(publicOutput, 'index.json'), JSON.stringify({ manifest, entries: records.map(({ fullContent, ...entry }) => entry) }));
console.log(`[mythos] ${records.length}/${raw.length} canonical records; rejected ${rejected.length}`);
