import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '../../../..');
const base = process.env.GITHUB_BASE_REF;

if (!base) {
  console.log('SKIP: kontrola zmian nawigacji działa tylko w pull requeście.');
  process.exit(0);
}

const changed = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], {
  cwd: repositoryRoot,
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);
const isUiFile = (file) => file.startsWith('_tester/_base/.silnik/src/app/') || file.startsWith('_tester/_base/.silnik/src/components/');
const registryChanged = changed.includes('_tester/_base/.silnik/navigation/navigation-registry.json');

if (changed.some(isUiFile) && !registryChanged) {
  throw new Error('Zmiana UI wymaga aktualizacji navigation/navigation-registry.json i docs/NAVIGATION_MAP.md.');
}
console.log('PASS: rejestr nawigacji odpowiada zmianom UI w pull requeście.');
