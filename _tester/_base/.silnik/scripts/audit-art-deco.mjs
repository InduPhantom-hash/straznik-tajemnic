#!/usr/bin/env node

/**
 * audit-art-deco.mjs
 * 
 * Skrypt audytujący zgodność stylizacji z kanonem Dark Art Déco 1920s
 * dla projektu Strażnik Tajemnic AI (Issue #165).
 * 
 * Zasady kanonu:
 * 1. Zakaz nowoczesnych szarości Tailwind (bg-gray-*, text-slate-*, border-zinc-*, stone, neutral).
 *    Używamy tokenów semantycznych: bg-background, bg-card, bg-input, bg-muted, text-foreground, text-muted-foreground, border-border.
 * 2. Zakaz generycznych kolorów modern-flat (blue-*, indigo-*, purple-*, violet-*).
 * 3. Zakaz niespójnego amber-* na rzecz zdefiniowanych tokenów déco: text-brass, text-gold, border-brass/..., bg-brass/...
 * 4. Zakaz nowoczesnych obłych zaokrągleń (rounded-xl, rounded-2xl, rounded-3xl). Używamy rounded-sm, rounded-md, rounded-lg, rounded-full lub deco-corners.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

// Wzorce zakazanych klas Tailwind
const VIOLATION_PATTERNS = [
  { name: 'modern-gray-bg', regex: /\bbg-(slate|gray|zinc|neutral|stone)-[0-9]+/g },
  { name: 'modern-gray-text', regex: /\btext-(slate|gray|zinc|neutral|stone)-[0-9]+/g },
  { name: 'modern-gray-border', regex: /\bborder-(slate|gray|zinc|neutral|stone)-[0-9]+/g },
  { name: 'modern-colored-tailwind', regex: /\b(bg|text|border)-(blue|indigo|purple|violet)-[0-9]+/g },
  { name: 'amber-inconsistent', regex: /\b(bg|text|border)-amber-[0-9]+/g },
  { name: 'modern-oversized-rounded', regex: /\brounded-(xl|2xl|3xl)\b/g },
];

function scanDirectory(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        files = files.concat(scanDirectory(fullPath));
      }
    } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
      files.push(fullPath);
    }
  }

  return files;
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  for (const pattern of VIOLATION_PATTERNS) {
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      violations.push({
        type: pattern.name,
        match: match[0],
        index: match.index,
      });
    }
  }

  return violations;
}

function run() {
  const targetFiles = process.argv.slice(2);
  let filesToScan = [];

  if (targetFiles.length > 0) {
    filesToScan = targetFiles.map((f) => path.resolve(process.cwd(), f));
  } else {
    filesToScan = scanDirectory(SRC_DIR);
  }

  let totalViolations = 0;
  const fileReports = [];

  for (const file of filesToScan) {
    const relativePath = path.relative(process.cwd(), file);
    const violations = auditFile(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      fileReports.push({
        file: relativePath,
        count: violations.length,
        violations: violations.map((v) => v.match),
      });
    }
  }

  fileReports.sort((a, b) => b.count - a.count);

  console.log(`\n======================================================`);
  console.log(`🏺 Audyt Stylu Dark Art Déco 1920s (Issue #165)`);
  console.log(`======================================================`);
  console.log(`Przeskanowano plików: ${filesToScan.length}`);
  console.log(`Pliki z naruszeniami: ${fileReports.length}`);
  console.log(`Wszystkich naruszeń: ${totalViolations}\n`);

  if (targetFiles.length > 0) {
    for (const report of fileReports) {
      console.log(`❌ ${report.file}: ${report.count} naruszeń: [${Array.from(new Set(report.violations)).join(', ')}]`);
    }
    if (totalViolations > 0) {
      process.exit(1);
    } else {
      console.log(`✅ Wszystkie sprawdzane pliki spełniają kanon Dark Art Déco 1920s!\n`);
      process.exit(0);
    }
  } else {
    console.log(`Top 15 plików o największym długu wizualnym:`);
    fileReports.slice(0, 15).forEach((r, idx) => {
      console.log(` ${idx + 1}. ${r.file} (${r.count})`);
    });
    console.log(`\nAby sprawdzić konkretne pliki (z kodem wyjścia 0/1):`);
    console.log(`node scripts/audit-art-deco.mjs src/components/sidebar/CthulhuSidebar.tsx\n`);
  }
}

run();
