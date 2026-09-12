#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

const [archiveArg, outputArg, downloadUrl, releaseNotesUrl = ''] = process.argv.slice(2);
if (!archiveArg || !outputArg || !downloadUrl) {
  console.error('Usage: node desktop/create-update-manifest.mjs <archive> <output> <download-url> [release-notes-url]');
  process.exit(2);
}

const root = path.resolve(import.meta.dirname, '..');
const runtime = path.join(root, '_tester', '_base', '.silnik');
const pkg = JSON.parse(fs.readFileSync(path.join(runtime, 'package.json'), 'utf8'));
const archive = path.resolve(archiveArg);
const bytes = fs.readFileSync(archive);
const manifest = {
  schemaVersion: 1,
  version: pkg.version,
  channel: 'stable',
  bundleId: 'com.aios.straznik-tajemnic-ai',
  minimumMacOSVersion: '11.0',
  package: {
    name: path.basename(archive),
    url: downloadUrl,
    size: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  },
  releaseNotes: releaseNotesUrl,
};

fs.writeFileSync(path.resolve(outputArg), `${JSON.stringify(manifest, null, 2)}\n`);
