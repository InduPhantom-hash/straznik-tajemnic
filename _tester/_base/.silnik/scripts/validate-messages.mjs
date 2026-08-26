#!/usr/bin/env node
/**
 * Walidacja struktury plików tłumaczeń (messages/*.json).
 *
 * Maszynowo upewnia się, że messages/pl.json oraz messages/en.json
 * posiadają IDENTYCZNE drzewo kluczy (kolejność liści nieistotna,
 * ale zbiór ścieżek musi być 1:1). Niespójności => exit code 1.
 *
 * Użycie: node scripts/validate-messages.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [join(root, 'messages', 'pl.json'), join(root, 'messages', 'en.json')];

/** Zbiera ścieżki wszystkich liści (i pustych gałęzi) drzewa JSON. */
function collectKeys(value, prefix = '', acc = []) {
  if (value !== null && typeof value === 'object' && Object.keys(value).length > 0) {
    for (const key of Object.keys(value)) {
      collectKeys(value[key], prefix ? `${prefix}.${key}` : key, acc);
    }
    return acc;
  }
  acc.push(prefix);
  return acc;
}

let failed = false;

const trees = files.map((file) => {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`✗ ${file}: niepoprawny JSON - ${error.message}`);
    process.exit(1);
  }
  return { file, keys: new Set(collectKeys(parsed)) };
});

for (const { file, keys } of trees) {
  console.log(`✓ ${file}: ${keys.size} kluczy`);
}

const [, base] = trees;
for (let i = 1; i < trees.length; i++) {
  const other = trees[i];
  const missingInOther = [...base.keys].filter((key) => !other.keys.has(key));
  const missingInBase = [...other.keys].filter((key) => !base.keys.has(key));

  for (const key of missingInOther) {
    console.error(`✗ Brak klucza "${key}" w ${other.file}`);
    failed = true;
  }
  for (const key of missingInBase) {
    console.error(`✗ Brak klucza "${key}" w ${base.file}`);
    failed = true;
  }
}

if (failed) {
  console.error('\n✗ Drzewa kluczy nie są zgodne 1:1.');
  process.exit(1);
}

console.log('\n✓ Drzewa kluczy pl.json i en.json są identyczne (1:1).');
