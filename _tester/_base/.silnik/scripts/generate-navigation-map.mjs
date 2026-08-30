import { access, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = path.resolve(scriptDir, '..');
const repositoryRoot = path.resolve(runtimeDir, '../../..');
const registryPath = path.join(runtimeDir, 'navigation/navigation-registry.json');
const outputPath = path.join(repositoryRoot, 'docs/NAVIGATION_MAP.md');
const checkOnly = process.argv.includes('--check');

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const errors = [];
const ids = new Set();
for (const node of registry.nodes) {
  if (!node.id || ids.has(node.id)) errors.push(`Nieprawidłowe lub powtórzone id węzła: ${node.id}`);
  ids.add(node.id);
  if (!node.label?.pl || !node.label?.en) errors.push(`Brak etykiety PL/EN: ${node.id}`);
  if (node.kind === 'route' && !node.path) errors.push(`Route bez path: ${node.id}`);
}
for (const action of registry.actions) {
  if (!ids.has(action.source) || !ids.has(action.target)) errors.push(`Akcja wskazuje nieznany węzeł: ${action.source} -> ${action.target}`);
  if (!action.label?.pl || !action.label?.en) errors.push(`Brak etykiety akcji PL/EN: ${action.source} -> ${action.target}`);
  if (!action.component?.startsWith('src/')) errors.push(`Brak komponentu źródłowego: ${action.source} -> ${action.target}`);
  if (action.component?.startsWith('src/')) {
    try {
      await access(path.join(runtimeDir, action.component));
    } catch {
      errors.push(`Nie istnieje komponent źródłowy: ${action.component}`);
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'));

const mermaidId = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_');
const nodeLines = registry.nodes.map((node) => {
  const route = node.path ? `<br/>\`${node.path}\`` : '';
  return `    ${mermaidId(node.id)}["${node.label.pl} / ${node.label.en}${route}"]`;
});
const edgeLines = registry.actions.map((action) =>
  `    ${mermaidId(action.source)} -->|${action.label.pl} / ${action.label.en}| ${mermaidId(action.target)}`,
);
const routeRows = registry.nodes.filter((node) => node.kind === 'route').map((node) =>
  `| \`/${'{locale}'}${node.path === '/' ? '' : node.path}\` | ${node.label.pl} | ${node.label.en} | ${node.e2e ? 'tak' : 'nie'} |`,
);
const actionRows = registry.actions.map((action) =>
  `| ${registry.nodes.find((node) => node.id === action.source).label.pl} | ${action.label.pl} / ${action.label.en} | ${registry.nodes.find((node) => node.id === action.target).label.pl} | \`${action.component}\` |`,
);
const content = `# Mapa nawigacji PL/EN\n\nŹródło: \`_tester/_base/.silnik/navigation/navigation-registry.json\`. Nie edytuj\nręcznie grafu. Po zmianie rejestru uruchom \`npm run navigation:generate\` w\n\`_tester/_base/.silnik\`.\n\n\`PL / EN\` w każdym węźle i na każdej krawędzi oznacza etykiety dwóch wersji\njęzykowych tego samego działania.\n\n\`\`\`mermaid\ngraph TD\n${nodeLines.join('\n')}\n\n${edgeLines.join('\n')}\n\`\`\`\n\n## Routy\n\n| URL | PL | EN | E2E |\n| --- | --- | --- | --- |\n${routeRows.join('\n')}\n\n## Kluczowe akcje\n\n| Z widoku | Akcja PL / EN | Otwiera lub wykonuje | Źródło |\n| --- | --- | --- | --- |\n${actionRows.join('\n')}\n\n## Zasady aktualizacji\n\n- Każda zmiana routingu, modala lub przycisku prowadzącego do innego widoku\n  aktualizuje rejestr, ten dokument i właściwy test E2E.\n- \`npm run navigation:check\` sprawdza strukturę rejestru i zgodność\n  wygenerowanego dokumentu.\n- CI odrzuca zmianę \`src/app\` lub \`src/components\`, gdy pull request nie\n  zmienia rejestru nawigacji.\n`;

if (checkOnly) {
  const existing = await readFile(outputPath, 'utf8');
  if (existing !== content) throw new Error('docs/NAVIGATION_MAP.md nie odpowiada rejestrowi. Uruchom npm run navigation:generate.');
  console.log('PASS: rejestr nawigacji i Mermaid są zgodne.');
} else {
  await writeFile(outputPath, content);
  console.log(`Wygenerowano ${outputPath}`);
}
