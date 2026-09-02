import fs from 'node:fs';
import path from 'node:path';

const pages = [
  ['Home', 'README.md'],
  ['Instalacja', 'SETUP.md'],
  ['Przewodnik-gracza', 'docs/USER_GUIDE.md'],
  ['Architektura', 'docs/ARCHITECTURE.md'],
  ['Katalog-systemow', 'docs/SYSTEMS-CATALOG.md'],
  ['Mapa-runtime', 'docs/MAPA-POWIAZAN.md'],
  ['Testowanie', 'docs/TESTING.md'],
  ['Roadmapa', 'docs/ROADMAP-MECHANIKI-AI.md'],
  ['Workflow', 'docs/PROJECT-WORKFLOW.md'],
  ['Wklad-w-projekt', 'CONTRIBUTING.md'],
];

const pageForSource = new Map(pages.map(([page, source]) => [source, page]));
const argumentsMap = new Map(process.argv.slice(2).filter((_, index) => index % 2 === 0)
  .map((argument, index) => [argument, process.argv.slice(2)[index * 2 + 1]]));
const outputDirectory = argumentsMap.get('--output');
const sourceSha = argumentsMap.get('--sha');
const repository = argumentsMap.get('--repository');

if (!outputDirectory || !sourceSha || !repository) {
  throw new Error('Użycie: node render-wiki.mjs --output <katalog> --sha <sha> --repository <owner/repo>');
}

fs.mkdirSync(outputDirectory, { recursive: true });

for (const [page, source] of pages) {
  if (!fs.existsSync(source)) throw new Error(`Brak kanonicznego źródła Wiki: ${source}`);

  const markdown = fs.readFileSync(source, 'utf8');
  const rendered = `${rewriteLinks(markdown, source)}\n\n---\n\n` +
    `_Ta strona jest generowana z [\`${source}\`](https://github.com/${repository}/blob/${sourceSha}/${source}) ` +
    `z commitu [\`${sourceSha.slice(0, 12)}\`](https://github.com/${repository}/commit/${sourceSha}). ` +
    `Edytuj źródło przez Pull Request do repozytorium; nie edytuj Wiki ręcznie._\n`;

  fs.writeFileSync(path.join(outputDirectory, `${page}.md`), rendered);
}

fs.writeFileSync(path.join(outputDirectory, '.straznik-wiki-managed'), `${pages.map(([page]) => `${page}.md`).join('\n')}\n`);

function rewriteLinks(markdown, source) {
  const sourceDirectory = path.posix.dirname(source);
  return markdown.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (whole, prefix, target, suffix) => {
    if (/^(?:[a-z]+:|#)/i.test(target)) return whole;

    const [targetPath, anchor = ''] = target.split('#', 2);
    const resolved = path.posix.normalize(path.posix.join(sourceDirectory, targetPath));
    const wikiPage = pageForSource.get(resolved);
    if (wikiPage && !prefix.startsWith('!')) return `${prefix}${wikiPage}${anchor ? `#${anchor}` : ''}${suffix}`;

    const githubTarget = `https://github.com/${repository}/blob/${sourceSha}/${resolved}${anchor ? `#${anchor}` : ''}`;
    const rawTarget = `https://raw.githubusercontent.com/${repository}/${sourceSha}/${resolved}`;
    return `${prefix}${prefix.startsWith('!') ? rawTarget : githubTarget}${suffix}`;
  });
}
