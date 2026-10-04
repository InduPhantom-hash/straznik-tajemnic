#!/usr/bin/env node

import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
let runtime = path.join(root, '_tester', '_base', '.silnik');
if (!fs.existsSync(path.join(runtime, 'package.json'))) {
  runtime = root;
}
const pkg = JSON.parse(fs.readFileSync(path.join(runtime, 'package.json'), 'utf8'));

// Parse arguments (flags or legacy positional)
const rawArgs = process.argv.slice(2);
let outputArg = '';
let releaseNotesUrl = '';
let tag = '';
let repo = '';
let versionArg = '';
let commitArg = '';
let assetsDir = '';
let macosArchive = '';
let macosUrl = '';
let windowsArchive = '';
let windowsUrl = '';

// Check if flags are provided
let isFlagMode = false;
for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--')) {
    isFlagMode = true;
    const key = arg.slice(2);
    const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[++i] : '';
    if (key === 'output') outputArg = val;
    else if (key === 'release-notes') releaseNotesUrl = val;
    else if (key === 'tag') tag = val;
    else if (key === 'repo') repo = val;
    else if (key === 'version') versionArg = val;
    else if (key === 'commit') commitArg = val;
    else if (key === 'assets-dir') assetsDir = val;
    else if (key === 'macos-archive') macosArchive = val;
    else if (key === 'macos-url') macosUrl = val;
    else if (key === 'windows-archive') windowsArchive = val;
    else if (key === 'windows-url') windowsUrl = val;
  }
}

if (!isFlagMode) {
  const [archiveArg, outArg, downloadUrl, notesUrl = ''] = rawArgs;
  if (!archiveArg || !outArg || !downloadUrl) {
    console.error('Usage (legacy): node desktop/create-update-manifest.mjs <archive> <output> <download-url> [release-notes-url]');
    console.error('Usage (unified): node desktop/create-update-manifest.mjs --assets-dir <dir> --output <output> --tag <tag> --repo <repo> [--commit <sha>]');
    process.exit(2);
  }
  outputArg = outArg;
  releaseNotesUrl = notesUrl;
  const lower = path.basename(archiveArg).toLowerCase();
  if (lower.includes('win')) {
    windowsArchive = archiveArg;
    windowsUrl = downloadUrl;
  } else {
    macosArchive = archiveArg;
    macosUrl = downloadUrl;
  }
}

const targetVersion = versionArg || (tag ? tag.replace(/^v/, '') : pkg.version);

function resolveCommitSha(explicitCommit) {
  if (explicitCommit && /^[a-f0-9]{7,40}$/i.test(explicitCommit.trim())) {
    return explicitCommit.trim().toLowerCase();
  }
  if (process.env.GITHUB_SHA && /^[a-f0-9]{7,40}$/i.test(process.env.GITHUB_SHA.trim())) {
    return process.env.GITHUB_SHA.trim().toLowerCase();
  }
  try {
    const out = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^[a-f0-9]{7,40}$/i.test(out)) return out.toLowerCase();
  } catch (_) {}
  try {
    const buildInfoPath = path.join(runtime, 'build-info.json');
    if (fs.existsSync(buildInfoPath)) {
      const info = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      if (typeof info.commitSha === 'string' && /^[a-f0-9]{7,40}$/i.test(info.commitSha.trim())) {
        return info.commitSha.trim().toLowerCase();
      }
    }
  } catch (_) {}
  return '';
}

// Auto-discover from assets-dir if given
if (assetsDir && fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const repoName = repo || process.env.GITHUB_REPOSITORY || 'InduPhantom-hash/straznik-tajemnic';
  const tagName = tag || `v${targetVersion}`;
  if (!releaseNotesUrl) {
    releaseNotesUrl = `https://github.com/${repoName}/releases/tag/${tagName}`;
  }

  for (const file of files) {
    const fullPath = path.join(assetsDir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    const lower = file.toLowerCase();
    if (lower.includes('macos') && lower.endsWith('.zip')) {
      macosArchive = fullPath;
      if (!macosUrl) {
        macosUrl = `https://github.com/${repoName}/releases/download/${tagName}/${file}`;
      }
    } else if (lower.includes('windows') && lower.endsWith('.zip')) {
      windowsArchive = fullPath;
      if (!windowsUrl) {
        windowsUrl = `https://github.com/${repoName}/releases/download/${tagName}/${file}`;
      }
    }
  }
}

if (!outputArg) {
  console.error('Error: output manifest path not specified.');
  process.exit(2);
}

function packageInfo(archivePath, url) {
  if (!archivePath || !fs.existsSync(archivePath)) return null;
  const bytes = fs.readFileSync(archivePath);
  return {
    name: path.basename(archivePath),
    url: url || '',
    size: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

const macosPkg = packageInfo(macosArchive, macosUrl);
const windowsPkg = packageInfo(windowsArchive, windowsUrl);

if (!macosPkg && !windowsPkg) {
  console.error('Error: no archive found to include in manifest.');
  process.exit(1);
}

// Read existing manifest for safe merging if output exists
const outputPath = path.resolve(outputArg);
let existingManifest = null;
if (fs.existsSync(outputPath)) {
  try {
    existingManifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch (_) {}
}

const packages = {
  ...(existingManifest?.packages || {}),
};
const platforms = {
  ...(existingManifest?.platforms || {}),
};

if (macosPkg) {
  packages.darwin = macosPkg;
  platforms.macos = macosPkg;
}
if (windowsPkg) {
  packages.win32 = windowsPkg;
  platforms.windows = windowsPkg;
}

const defaultPkg = macosPkg || packages.darwin || windowsPkg || packages.win32;
const resolvedCommitSha = resolveCommitSha(commitArg) || existingManifest?.commitSha || '';
const publishedAt = new Date().toISOString();

const manifest = {
  schemaVersion: 1,
  version: targetVersion,
  ...(resolvedCommitSha ? { commitSha: resolvedCommitSha, shortCommit: resolvedCommitSha.slice(0, 7) } : {}),
  publishedAt,
  channel: 'stable',
  bundleId: 'com.aios.straznik-tajemnic-ai',
  minimumMacOSVersion: '11.0',
  package: defaultPkg,
  packages,
  platforms,
  releaseNotes: releaseNotesUrl || existingManifest?.releaseNotes || '',
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Pomyślnie wygenerowano manifest aktualizacji: ${outputPath}`);
console.log(`Wersja: ${manifest.version}${resolvedCommitSha ? ` (${resolvedCommitSha.slice(0, 7)})` : ''}, Pakiety: ${Object.keys(packages).join(', ')}`);
