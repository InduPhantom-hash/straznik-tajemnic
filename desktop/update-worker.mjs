#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync, spawn } from 'node:child_process';
import http from 'node:http';

// Parse CLI arguments
const rawArgs = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[++i] : 'true';
    args[key] = val;
  }
}

const target = path.resolve(args.target || args.bundle || '');
const url = args.url || '';
const expectedSha256 = (args.sha256 || '').toLowerCase();
const version = args.version || '';
const bundleId = args['bundle-id'] || 'com.aios.straznik-tajemnic-ai';
const expectedSize = parseInt(args.size || '0', 10);
const dataDir = path.resolve(args['data-dir'] || '');
const port = parseInt(args.port || '4050', 10);
const platform = args.platform || process.platform;
const minimumMacOS = args['minimum-macos'] || '';
const testMode = args['test-mode'] === 'true' || process.env.TEST_MODE === '1';

if (!target || !url || !expectedSha256 || !version || !dataDir) {
  console.error('Błąd: brakujące wymagane argumenty dla update-worker.');
  process.exit(2);
}

const updatesDir = path.join(dataDir, 'updates');
const statusFile = path.join(updatesDir, 'status.json');
const lockDir = path.join(updatesDir, 'update.lock');
const workDir = path.join(updatesDir, `work-${version}-${process.pid}`);
const operationId = `${version}-${Date.now()}-${process.pid}`;

let swapped = false;
let backupLocation = null;
let liveLocation = null;

function writeStatus(state, message) {
  const payload = {
    id: operationId,
    state,
    version,
    message,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(updatesDir, { recursive: true });
  const tmp = path.join(updatesDir, `status.${process.pid}.tmp`);
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
  fs.renameSync(tmp, statusFile);
}

function cleanup() {
  try {
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  } catch (_) {}
  try {
    if (fs.existsSync(lockDir)) {
      fs.rmdirSync(lockDir);
    }
  } catch (_) {}
}

function rollback(reason) {
  writeStatus('rolled_back', reason);
  if (swapped && backupLocation && fs.existsSync(backupLocation)) {
    try {
      if (liveLocation && fs.existsSync(liveLocation)) {
        const failedTarget = path.join(workDir, 'failed-install');
        try { fs.renameSync(liveLocation, failedTarget); } catch (_) {}
      }
      fs.renameSync(backupLocation, liveLocation);
      console.log(`Pomyślnie przywrócono poprzednią wersję z: ${backupLocation}`);
      // Próba ponownego uruchomienia starej wersji
      launchApplication(liveLocation);
    } catch (err) {
      console.error(`Błąd podczas rollbacku: ${err.message}`);
    }
  }
  cleanup();
  process.exit(1);
}

function onSignal(signal) {
  console.log(`Odebrano sygnał ${signal}`);
  if (swapped) {
    rollback('update interrupted; previous version restored');
  } else {
    writeStatus('failed', 'update interrupted');
    cleanup();
    process.exit(130);
  }
}

process.on('SIGINT', () => onSignal('SIGINT'));
process.on('SIGTERM', () => onSignal('SIGTERM'));
process.on('SIGHUP', () => onSignal('SIGHUP'));

// 1. Sprawdzenie i zajęcie blokady (Lock)
try {
  fs.mkdirSync(updatesDir, { recursive: true });
  fs.mkdirSync(lockDir);
} catch (err) {
  console.error('Inna operacja aktualizacji jest już w toku.');
  process.exit(1);
}

// 2. Weryfikacja minimalnej wersji macOS (jeśli dotyczy)
if (platform === 'darwin' && minimumMacOS) {
  let currentMacOs = '';
  try {
    const swVersBin = process.env.SW_VERS_BIN || '/usr/bin/sw_vers';
    currentMacOs = execSync(`${swVersBin} -productVersion`, { encoding: 'utf8' }).trim();
  } catch (_) {}

  if (currentMacOs) {
    const currParts = currentMacOs.split('.').map((n) => parseInt(n, 10) || 0);
    const minParts = minimumMacOS.split('.').map((n) => parseInt(n, 10) || 0);
    let meets = true;
    for (let i = 0; i < 3; i++) {
      const c = currParts[i] || 0;
      const m = minParts[i] || 0;
      if (c > m) { meets = true; break; }
      if (c < m) { meets = false; break; }
    }
    if (!meets) {
      writeStatus('failed', 'minimum macOS version not met');
      cleanup();
      process.exit(1);
    }
  }
}

// 3. Sprawdzenie miejsca na dysku (lub wymuszony błąd w teście)
if (process.env.MOCK_DISK_FULL === '1' || args['mock-disk-full'] === 'true') {
  writeStatus('failed', 'insufficient disk space');
  cleanup();
  process.exit(1);
}

// 4. Pobieranie archiwum aktualizacji
fs.mkdirSync(workDir, { recursive: true });
const archivePath = path.join(workDir, 'update.zip');

writeStatus('downloading', 'downloading update');

async function downloadArchive() {
  if (process.env.DOWNLOAD_FAIL === '1' || process.env.MOCK_DOWNLOAD_FAIL === '1' || args['mock-download-fail'] === 'true') {
    throw new Error('download failed');
  }

  // Wsparcia dla lokalnego pliku testowego
  const testArchive = process.env.TEST_ARCHIVE || args['test-archive'];
  if (testArchive && fs.existsSync(testArchive)) {
    fs.copyFileSync(testArchive, archivePath);
    return;
  }

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`download failed with status ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(archivePath, buffer);
}

async function run() {
  try {
    await downloadArchive();
  } catch (err) {
    writeStatus('failed', 'download failed');
    cleanup();
    process.exit(1);
  }

  // Weryfikacja rozmiaru
  const stats = fs.statSync(archivePath);
  if (expectedSize > 0 && stats.size !== expectedSize) {
    writeStatus('failed', 'package size mismatch');
    cleanup();
    process.exit(1);
  }

  // Weryfikacja sumy SHA-256
  const hash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex').toLowerCase();
  if (hash !== expectedSha256) {
    writeStatus('failed', 'checksum mismatch');
    cleanup();
    process.exit(1);
  }

  // 5. Wypakowanie archiwum i weryfikacja zawartości (Stage)
  writeStatus('verifying', 'verifying package');
  const unpackedDir = path.join(workDir, 'unpacked');
  fs.mkdirSync(unpackedDir, { recursive: true });

  try {
    if (process.platform === 'darwin') {
      execSync(`ditto -x -k "${archivePath}" "${unpackedDir}"`);
    } else {
      // Windows / Linux
      try {
        execSync(`tar -xf "${archivePath}" -C "${unpackedDir}"`);
      } catch (_) {
        execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${unpackedDir}' -Force"`);
      }
    }
  } catch (err) {
    writeStatus('failed', 'archive extraction failed');
    cleanup();
    process.exit(1);
  }

  let stagedNewApp = null;
  let stagedNewRuntime = null;

  if (platform === 'darwin') {
    // Szukamy bundle'a .app
    function findApp(dir) {
      const entries = fs.readdirSync(dir);
      for (const e of entries) {
        if (e.endsWith('.app')) return path.join(dir, e);
      }
      return null;
    }
    stagedNewApp = findApp(unpackedDir);
    if (!stagedNewApp) {
      writeStatus('failed', 'application bundle missing');
      cleanup();
      process.exit(1);
    }

    // Weryfikacja Info.plist
    const plist = path.join(stagedNewApp, 'Contents', 'Info.plist');
    if (!fs.existsSync(plist)) {
      writeStatus('failed', 'bundle metadata missing');
      cleanup();
      process.exit(1);
    }

    let plistContent = '';
    try {
      plistContent = fs.readFileSync(plist, 'utf8');
    } catch (_) {}

    // Odczyt właściwości plist
    let actualId = '';
    let actualVersion = '';
    let actualExecutable = '';
    try {
      actualId = execSync(`/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${plist}" 2>/dev/null`, { encoding: 'utf8' }).trim();
      actualVersion = execSync(`/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "${plist}" 2>/dev/null`, { encoding: 'utf8' }).trim();
      actualExecutable = execSync(`/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "${plist}" 2>/dev/null`, { encoding: 'utf8' }).trim();
    } catch (_) {
      // Fallback prosty parser XML
      const idMatch = plistContent.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
      const verMatch = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
      const exeMatch = plistContent.match(/<key>CFBundleExecutable<\/key>\s*<string>([^<]+)<\/string>/);
      if (idMatch) actualId = idMatch[1];
      if (verMatch) actualVersion = verMatch[1];
      if (exeMatch) actualExecutable = exeMatch[1];
    }

    if (bundleId && actualId && actualId !== bundleId) {
      writeStatus('failed', 'bundle id mismatch');
      cleanup();
      process.exit(1);
    }

    if (version && actualVersion && actualVersion !== version) {
      writeStatus('failed', 'version mismatch');
      cleanup();
      process.exit(1);
    }

    const exePath = path.join(stagedNewApp, 'Contents', 'MacOS', actualExecutable || 'launcher');
    if (!fs.existsSync(exePath)) {
      writeStatus('failed', 'executable missing');
      cleanup();
      process.exit(1);
    }
  } else {
    // Windows: Szukamy struktury runtime / package.json
    function findWindowsRuntime(dir) {
      const candidates = [
        path.join(dir, 'runtime'),
        path.join(dir, 'straznik-tajemnic-windows', 'runtime'),
        dir,
      ];
      for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'package.json'))) return c;
      }
      return null;
    }

    stagedNewRuntime = findWindowsRuntime(unpackedDir);
    if (!stagedNewRuntime) {
      writeStatus('failed', 'runtime directory missing');
      cleanup();
      process.exit(1);
    }

    const pkgPath = path.join(stagedNewRuntime, 'package.json');
    let pkgVersion = '';
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkgVersion = pkg.version;
    } catch (_) {}

    if (version && pkgVersion && pkgVersion !== version) {
      writeStatus('failed', 'version mismatch');
      cleanup();
      process.exit(1);
    }
  }

  // 6. Zatrzymanie działających procesów serwera i zwalnianie blokad plików
  writeStatus('installing', 'installing update');
  stopRunningServer();

  // 7. Dwufazowa atomowa podmiana (Swap)
  if (platform === 'darwin') {
    liveLocation = target;
    backupLocation = `${target}.rollback`;

    try {
      if (fs.existsSync(backupLocation)) {
        fs.rmSync(backupLocation, { recursive: true, force: true });
      }
      fs.renameSync(liveLocation, backupLocation);
    } catch (err) {
      writeStatus('failed', 'cannot preserve previous bundle');
      cleanup();
      process.exit(1);
    }

    swapped = true;

    try {
      fs.renameSync(stagedNewApp, liveLocation);
    } catch (err) {
      rollback('cannot install new bundle');
    }
  } else {
    // Windows: podmiana katalogu runtime
    const targetHasRuntime = fs.existsSync(path.join(target, 'runtime'));
    liveLocation = targetHasRuntime ? path.join(target, 'runtime') : target;
    backupLocation = `${liveLocation}.rollback`;

    try {
      if (fs.existsSync(backupLocation)) {
        fs.rmSync(backupLocation, { recursive: true, force: true });
      }
      fs.renameSync(liveLocation, backupLocation);
    } catch (err) {
      writeStatus('failed', 'cannot preserve previous runtime');
      cleanup();
      process.exit(1);
    }

    swapped = true;

    try {
      fs.renameSync(stagedNewRuntime, liveLocation);
    } catch (err) {
      rollback('cannot install new runtime');
    }

    // Aktualizacja Graj - Strażnik Tajemnic.cmd jeśli występuje
    const stagedLauncher = path.join(unpackedDir, 'straznik-tajemnic-windows', 'Graj - Strażnik Tajemnic.cmd');
    const liveLauncher = path.join(target, 'Graj - Strażnik Tajemnic.cmd');
    if (fs.existsSync(stagedLauncher) && fs.existsSync(liveLauncher)) {
      try {
        fs.copyFileSync(stagedLauncher, liveLauncher);
      } catch (_) {}
    }
  }

  // 8. Uruchomienie nowej wersji i weryfikacja zdrowia (Health Check)
  writeStatus('restarting', 'restarting application');
  launchApplication(liveLocation);

  const healthy = await pollHealthCheck();
  if (healthy) {
    swapped = false;
    writeStatus('succeeded', 'update installed');
    cleanup();
    process.exit(0);
  } else {
    rollback('health check failed');
  }
}

function stopRunningServer() {
  const profile = path.join(dataDir, 'desktop', 'chrome-profile');
  const pidFile = path.join(dataDir, 'desktop', 'server.pid');

  if (process.platform === 'win32') {
    if (fs.existsSync(pidFile)) {
      try {
        const pid = fs.readFileSync(pidFile, 'utf8').trim();
        execSync(`taskkill /F /T /PID ${pid} 2>nul`);
      } catch (_) {}
    }
    // Zwolnienie portu
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const match = line.trim().match(/\s+(\d+)$/);
        if (match && match[1] && match[1] !== '0') {
          execSync(`taskkill /F /PID ${match[1]} 2>nul`);
        }
      }
    } catch (_) {}
  } else {
    // macOS / Linux
    try { execSync(`pkill -f "user-data-dir=${profile}" 2>/dev/null || true`); } catch (_) {}
    if (fs.existsSync(pidFile)) {
      try {
        const serverPid = fs.readFileSync(pidFile, 'utf8').trim();
        execSync(`pkill -P "${serverPid}" 2>/dev/null || true`);
        execSync(`kill "${serverPid}" 2>/dev/null || true`);
      } catch (_) {}
    }
    try {
      execSync(`lsof -ti :${port} 2>/dev/null | xargs kill 2>/dev/null || true`);
    } catch (_) {}
  }
}

function launchApplication(appPath) {
  if (testMode || process.env.TEST_MODE === '1') {
    return;
  }
  try {
    if (platform === 'darwin') {
      spawn('open', [appPath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      const launcherCmd = path.join(target, 'Graj - Strażnik Tajemnic.cmd');
      if (fs.existsSync(launcherCmd)) {
        spawn('cmd.exe', ['/c', 'start', '""', launcherCmd], { detached: true, stdio: 'ignore' }).unref();
      } else {
        const supervisorPath = path.join(appPath, 'desktop', 'supervisor.mjs');
        if (fs.existsSync(supervisorPath)) {
          spawn(process.execPath, [supervisorPath], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    }
  } catch (_) {}
}

async function pollHealthCheck() {
  if (process.env.HEALTH_FAIL === '1' || process.env.MOCK_HEALTH_FAIL === '1' || args['mock-health-fail'] === 'true') {
    return false;
  }
  if (testMode || process.env.TEST_MODE === '1') {
    return true;
  }

  const endpoint = `http://localhost:${port}/api/desktop/cold-start`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.available === true) {
          return true;
        }
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

run();
