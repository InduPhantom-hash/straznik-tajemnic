#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Backup script for Zew Cthulhu RPG Application
 * Creates backups of application data, sessions, and configuration
 */

const BACKUP_DIR = path.join(__dirname, 'backups');
const DATA_DIR = path.join(__dirname, 'data');
const SRC_DIR = path.join(__dirname, 'src');
const APP_DIR = path.join(__dirname, 'app');
const COMPONENTS_DIR = path.join(__dirname, 'components');
const LIB_DIR = path.join(__dirname, 'lib');
const HOOKS_DIR = path.join(__dirname, 'hooks');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a timestamped backup
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupName = `zew-app-backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  console.log(`📦 Creating backup: ${backupName}`);

  try {
    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });

    // Backup data directory
    if (fs.existsSync(DATA_DIR)) {
      copyDirectory(DATA_DIR, path.join(backupPath, 'data'));
      console.log('✅ Data directory backed up');
    }

    // Backup source code directories
    const sourceDirs = [
      { src: SRC_DIR, dest: 'src' },
      { src: APP_DIR, dest: 'app' },
      { src: COMPONENTS_DIR, dest: 'components' },
      { src: LIB_DIR, dest: 'lib' },
      { src: HOOKS_DIR, dest: 'hooks' },
      { src: PUBLIC_DIR, dest: 'public' },
    ];

    sourceDirs.forEach(({ src, dest }) => {
      if (fs.existsSync(src)) {
        copyDirectory(src, path.join(backupPath, dest));
        console.log(`✅ ${dest} directory backed up`);
      }
    });

    // Backup configuration files
    const configFiles = [
      'package.json',
      'package-lock.json',
      'next.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'postcss.config.js',
      'components.json',
      'eslint.config.mjs',
      'jest.config.js',
      'jest.setup.ts',
      'playwright.config.ts',
    ];

    configFiles.forEach((file) => {
      const srcPath = path.join(__dirname, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(backupPath, file));
        console.log(`✅ ${file} backed up`);
      }
    });

    // Backup environment variables (without sensitive data)
    backupEnvironmentVariables(backupPath);

    // Create backup manifest
    createBackupManifest(backupPath, timestamp);

    console.log(`🎉 Backup completed successfully: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Copy directory recursively
 */
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Backup environment variables (excluding sensitive data)
 */
function backupEnvironmentVariables(backupPath) {
  const envFile = path.join(__dirname, '.env');
  const envLocalFile = path.join(__dirname, '.env.local');

  const envBackup = [];

  // Read .env files if they exist
  [envFile, envLocalFile].forEach((file) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line) => {
        // Only backup non-sensitive variables
        if (line.trim() && !line.startsWith('#')) {
          const [key] = line.split('=');
          if (
            key &&
            !key.includes('SECRET') &&
            !key.includes('KEY') &&
            !key.includes('TOKEN')
          ) {
            envBackup.push(line);
          } else {
            // Create placeholder for sensitive data
            envBackup.push(`${key}=***REDACTED***`);
          }
        } else {
          envBackup.push(line);
        }
      });
    }
  });

  if (envBackup.length > 0) {
    fs.writeFileSync(path.join(backupPath, 'env.backup'), envBackup.join('\n'));
  }
}

/**
 * Create backup manifest with metadata
 */
function createBackupManifest(backupPath, timestamp) {
  const manifest = {
    backupDate: new Date().toISOString(),
    timestamp: timestamp,
    application: 'Zew Cthulhu RPG Application',
    version: JSON.parse(
      fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
    ).version,
    included: [
      'data/sessions/',
      'src/',
      'app/',
      'components/',
      'lib/',
      'hooks/',
      'public/',
      'package.json',
      'package-lock.json',
      'next.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'postcss.config.js',
      'components.json',
      'eslint.config.mjs',
      'jest.config.js',
      'jest.setup.ts',
      'playwright.config.ts',
      'env.backup',
    ],
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  fs.writeFileSync(
    path.join(backupPath, 'backup-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

/**
 * Restore from backup
 */
function restoreBackup(backupName) {
  // Defense-in-depth: backupName z process.argv[3] (CLI dev) — odrzuć path traversal
  // (`../../etc/passwd`, absolute paths, empty/dot). Resolve+relative jest standardem
  // anti-traversal pattern (Node.js docs).
  const resolved = path.resolve(BACKUP_DIR, backupName);
  const rel = path.relative(BACKUP_DIR, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Nieprawidłowa nazwa backupu (path traversal): ${backupName}`
    );
  }
  const backupPath = resolved;

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup ${backupName} not found`);
  }

  console.log(`🔄 Restoring from backup: ${backupName}`);

  try {
    // Restore data directory
    const dataBackup = path.join(backupPath, 'data');
    if (fs.existsSync(dataBackup)) {
      copyDirectory(dataBackup, DATA_DIR);
      console.log('✅ Data directory restored');
    }

    // Restore source code directories
    const sourceDirs = [
      { src: 'src', dest: SRC_DIR },
      { src: 'app', dest: APP_DIR },
      { src: 'components', dest: COMPONENTS_DIR },
      { src: 'lib', dest: LIB_DIR },
      { src: 'hooks', dest: HOOKS_DIR },
      { src: 'public', dest: PUBLIC_DIR },
    ];

    sourceDirs.forEach(({ src, dest }) => {
      const srcBackup = path.join(backupPath, src);
      if (fs.existsSync(srcBackup)) {
        copyDirectory(srcBackup, dest);
        console.log(`✅ ${src} directory restored`);
      }
    });

    // Restore configuration files
    const configFiles = [
      'package.json',
      'package-lock.json',
      'next.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'postcss.config.js',
      'components.json',
      'eslint.config.mjs',
      'jest.config.js',
      'jest.setup.ts',
      'playwright.config.ts',
    ];

    configFiles.forEach((file) => {
      const srcPath = path.join(backupPath, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(__dirname, file));
        console.log(`✅ ${file} restored`);
      }
    });

    console.log('🎉 Restore completed successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    throw error;
  }
}

/**
 * List available backups
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('📁 No backups found');
    return;
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((item) => fs.statSync(path.join(BACKUP_DIR, item)).isDirectory())
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('📁 No backups found');
    return;
  }

  console.log('📦 Available backups:');
  backups.forEach((backup, index) => {
    const backupPath = path.join(BACKUP_DIR, backup);
    const manifestPath = path.join(backupPath, 'backup-manifest.json');

    let info = backup;
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        info += ` (${manifest.backupDate})`;
      } catch (e) {
        // Ignore manifest read errors
      }
    }

    console.log(`  ${index + 1}. ${info}`);
  });
}

/**
 * Clean old backups (keep last 3)
 */
function cleanOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return;
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((item) => fs.statSync(path.join(BACKUP_DIR, item)).isDirectory())
    .sort()
    .reverse();

  if (backups.length <= 3) {
    console.log('🧹 No old backups to clean');
    return;
  }

  const toDelete = backups.slice(3);
  console.log(`🧹 Cleaning ${toDelete.length} old backups...`);

  toDelete.forEach((backup) => {
    const backupPath = path.join(BACKUP_DIR, backup);
    try {
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`  🗑️  Deleted: ${backup}`);
    } catch (error) {
      console.error(`  ❌ Failed to delete ${backup}:`, error.message);
    }
  });

  console.log('✅ Cleanup completed');
}

// Main CLI interface
const command = process.argv[2];

switch (command) {
  case 'create':
    createBackup();
    break;

  case 'restore':
    const backupName = process.argv[3];
    if (!backupName) {
      console.error('❌ Please specify backup name to restore');
      console.log('Usage: node backup.mjs restore <backup-name>');
      process.exit(1);
    }
    restoreBackup(backupName);
    break;

  case 'list':
    listBackups();
    break;

  case 'clean':
    cleanOldBackups();
    break;

  case 'auto':
    // Create backup and clean old ones
    createBackup();
    cleanOldBackups();
    break;

  default:
    console.log('🎮 Zew Cthulhu Backup Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node backup.mjs create          - Create new backup');
    console.log('  node backup.mjs restore <name>  - Restore from backup');
    console.log('  node backup.mjs list            - List available backups');
    console.log(
      '  node backup.mjs clean           - Clean old backups (keep last 10)'
    );
    console.log(
      '  node backup.mjs auto            - Create backup and clean old ones'
    );
    break;
}
