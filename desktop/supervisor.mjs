#!/usr/bin/env node
/**
 * Strażnik Tajemnic AI - Cross-Platform Desktop Process Supervisor
 *
 * Odpowiada za:
 * 1. Wykrywanie i dynamiczny przydział portu (Single Instance & Port Collision Fallback).
 * 2. Zarządzanie grupą procesów serwera (Next.js) i eliminację procesów zombie (Tree Kill).
 * 3. Nadzór nad oknem aplikacji (Chrome / Edge / system browser).
 * 4. Obsługę sygnałów systemowych (SIGINT, SIGTERM, SIGHUP) oraz flagi zimnego startu.
 */

import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Ścieżki i Izolacja Środowiska ---
export function resolvePaths(customAppDir) {
  let appDir = customAppDir || path.resolve(__dirname, '..');
  if (!fs.existsSync(path.join(appDir, 'package.json')) && !fs.existsSync(path.join(appDir, '_tester/_base/.silnik/package.json'))) {
    appDir = path.resolve(__dirname, '..');
  }

  let gameDir = appDir;
  const enginePackage = path.join(appDir, '_tester/_base/.silnik/package.json');
  if (fs.existsSync(enginePackage)) {
    gameDir = path.join(appDir, '_tester/_base/.silnik');
  }

  const platform = process.platform;
  let defaultDataRoot;
  if (platform === 'darwin') {
    defaultDataRoot = path.join(os.homedir(), 'Library', 'Application Support', 'ZewCthulhu');
  } else if (platform === 'win32') {
    defaultDataRoot = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ZewCthulhu');
  } else {
    defaultDataRoot = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'ZewCthulhu');
  }

  const dataRoot = process.env.ZEW_DATA_DIR || defaultDataRoot;
  const runtimeDir = path.join(dataRoot, 'desktop');
  const profileDir = path.join(runtimeDir, 'chrome-profile');
  const pidFile = path.join(runtimeDir, 'server.pid');
  const coldStartFlag = path.join(runtimeDir, 'cold-start-requested');

  let defaultLog;
  if (platform === 'darwin') {
    defaultLog = path.join(os.homedir(), 'Library', 'Logs', 'straznik-tajemnic-ai.log');
  } else {
    defaultLog = path.join(dataRoot, 'logs', 'straznik-tajemnic-ai.log');
  }
  const logFile = process.env.ZEW_LOG_FILE || defaultLog;

  return {
    appDir,
    gameDir,
    dataRoot,
    runtimeDir,
    profileDir,
    pidFile,
    coldStartFlag,
    logFile
  };
}

// --- Funkcje pomocnicze sieci i portów ---

/**
 * Sprawdza czy dany port jest wolny do nasłuchiwania.
 */
export function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(false);
    });
    server.listen({ port, host }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

/**
 * Przeszukuje wolne porty zaczynając od startPort.
 */
export async function findAvailablePort(startPort = 4050, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`Nie znaleziono wolnego portu w zakresie ${startPort} - ${startPort + maxAttempts - 1}`);
}

/**
 * Sprawdza czy na wskazanym porcie działa już serwer Strażnika Tajemnic (Single Instance Check).
 */
export function checkExistingInstance(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/desktop/cold-start',
        timeout: timeoutMs
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.available === true) {
              return resolve({ running: true, isStraznik: true });
            }
          } catch (_) {}
          // Jeśli odpowiedź HTTP 200/300 ale nie json zimnego startu, sprawdź nagłówki
          resolve({ running: true, isStraznik: false });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false, isStraznik: false });
    });

    req.on('error', () => {
      resolve({ running: false, isStraznik: false });
    });
  });
}

/**
 * Kaskadowe ubijanie grupy procesów (Tree Kill) zapobiegające powstawaniu zombie.
 */
export function killProcessTree(pid, signal = 'SIGTERM') {
  if (!pid) return;

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${pid} /T /F 2>nul`);
    } catch (_) {}
  } else {
    // POSIX: wysłanie sygnału do ujemnego PID zabija całą grupę procesów (process group)
    try {
      process.kill(-pid, signal);
    } catch (_) {
      try {
        process.kill(pid, signal);
      } catch (_) {}
    }
  }
}

/**
 * Logowanie do pliku i konsoli.
 */
export function writeLog(logFile, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, line);
  } catch (_) {}
  if (!process.env.ZEW_SUPERVISOR_QUIET) {
    process.stdout.write(line);
  }
}

// --- Główna logika supervisora ---

export async function runSupervisor(options = {}) {
  const paths = resolvePaths(options.appDir);
  const log = (msg) => writeLog(paths.logFile, msg);

  log(`=== Supervisor start (PID: ${process.pid}, platform: ${process.platform}) ===`);

  // Przygotowanie katalogów
  fs.mkdirSync(paths.runtimeDir, { recursive: true });
  fs.mkdirSync(paths.profileDir, { recursive: true });
  fs.mkdirSync(paths.dataRoot, { recursive: true });

  const basePort = options.basePort || 4050;
  let targetPort = basePort;

  // 1. Sprawdzenie Single Instance
  log(`Sprawdzam stan portu ${basePort}...`);
  const instanceCheck = await checkExistingInstance(basePort);

  if (instanceCheck.running && instanceCheck.isStraznik) {
    log(`Strażnik Tajemnic AI już działa na porcie ${basePort}. Aktywuję istniejące okno.`);
    activateExistingWindow(paths, `http://localhost:${basePort}`);
    return { status: 'reused_existing', port: basePort };
  }

  // 2. Jeśli port bazowy jest zajęty przez obcy proces -> szukaj wolnego portu
  const baseAvailable = await isPortAvailable(basePort);
  if (!baseAvailable) {
    log(`Port ${basePort} jest zajęty przez inny proces. Wyszukuję wolny port...`);
    targetPort = await findAvailablePort(basePort + 1);
    log(`Przydzielono alternatywny port: ${targetPort}`);
  } else {
    targetPort = basePort;
    log(`Port ${targetPort} jest wolny i gotowy.`);
  }

  // 3. Uruchomienie serwera Next.js
  log(`Uruchamiam serwer Next.js w katalogu: ${paths.gameDir} na porcie ${targetPort}...`);

  let serverProcess = null;
  let serverStartedByUs = false;

  const env = {
    ...process.env,
    PORT: String(targetPort),
    ZEW_APP_PORT: String(targetPort),
    ZEW_DATA_DIR: paths.dataRoot,
    RAG_DATA_DIR: path.join(paths.dataRoot, 'rag'),
    STRAZNIK_DESKTOP_COLD_START: '1'
  };

  let serverStdio = 'ignore';
  try {
    const logFd = fs.openSync(paths.logFile, 'a');
    serverStdio = ['ignore', logFd, logFd];
  } catch (err) {
    log(`Nie udało się otworzyć pliku logów serwera: ${err.message}`);
  }

  // Uruchomienie jako osobna grupa procesów (detached)
  if (process.platform === 'win32') {
    serverProcess = spawn('cmd.exe', ['/c', 'npm', 'start'], {
      cwd: paths.gameDir,
      env,
      detached: false,
      stdio: serverStdio
    });
  } else {
    serverProcess = spawn('npm', ['start'], {
      cwd: paths.gameDir,
      env,
      detached: true,
      stdio: serverStdio
    });
  }

  serverStartedByUs = true;
  fs.writeFileSync(paths.pidFile, String(serverProcess.pid));
  log(`Serwer wystartował z PID: ${serverProcess.pid}`);

  // 4. Oczekiwanie na gotowość serwera (Health Check)
  const isHealthy = await waitForServerReady(targetPort, 45000);
  if (!isHealthy) {
    log(`BŁĄD: Serwer nie odpowiedział w wyznaczonym czasie. Zatrzymuję proces.`);
    killProcessTree(serverProcess.pid);
    try { fs.unlinkSync(paths.pidFile); } catch (_) {}
    process.exit(1);
  }
  log(`Serwer odpowiada pod adresem http://localhost:${targetPort}`);

  // 5. Otwarcie okna UI
  const windowUrl = `http://localhost:${targetPort}`;
  const windowProc = launchAppWindow(paths, windowUrl, log);

  // 6. Centralny mechanizm czyszczenia (Cleanup Trap)
  let cleanedUp = false;
  const cleanup = (reason) => {
    if (cleanedUp) return;
    cleanedUp = true;
    log(`Zamykanie aplikacji (powód: ${reason}). Sprzątam procesy...`);

    if (serverStartedByUs && serverProcess && serverProcess.pid) {
      log(`Zabijam grupę procesów serwera (PID: ${serverProcess.pid})...`);
      killProcessTree(serverProcess.pid, 'SIGTERM');
      setTimeout(() => {
        killProcessTree(serverProcess.pid, 'SIGKILL');
      }, 1500);
    }

    try {
      if (fs.existsSync(paths.pidFile)) {
        fs.unlinkSync(paths.pidFile);
      }
    } catch (_) {}

    log(`=== Supervisor zakończony ===`);
  };

  // Przechwytywanie sygnałów systemowych
  process.on('SIGINT', () => { cleanup('SIGINT'); process.exit(0); });
  process.on('SIGTERM', () => { cleanup('SIGTERM'); process.exit(0); });
  if (process.platform !== 'win32') {
    process.on('SIGHUP', () => { cleanup('SIGHUP'); process.exit(0); });
  }
  process.on('exit', () => cleanup('exit'));

  // 7. Monitorowanie cyklu życia okna
  if (windowProc) {
    windowProc.on('exit', (code) => {
      log(`Okno aplikacji zostało zamknięte (kod: ${code}).`);
      cleanup('window_closed');
      process.exit(0);
    });
  } else {
    // Jeśli użyto systemowego 'open'/'start', monitorujemy okresowo procesy profilu
    log(`Monitorowanie stanu profilu przeglądarki...`);
    const interval = setInterval(() => {
      // Sprawdzanie czy flaga zimnego startu została podniesiona
      if (fs.existsSync(paths.coldStartFlag)) {
        log(`Wykryto flagę zimnego startu.`);
        try { fs.unlinkSync(paths.coldStartFlag); } catch (_) {}
        // restart
      }
    }, 1000);
    interval.unref();
  }

  return { status: 'running', port: targetPort, pid: serverProcess?.pid };
}

/**
 * Czeka aż serwer HTTP odpowie kodem 200/300.
 */
function waitForServerReady(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 400);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 400);
        }
      });
    };
    check();
  });
}

/**
 * Aktywuje okno jeśli aplikacja już działa.
 */
function activateExistingWindow(paths, url) {
  if (process.platform === 'darwin') {
    try {
      execSync(`osascript -e 'tell application "Google Chrome" to activate' 2>/dev/null`);
    } catch (_) {
      try {
        execSync(`open "${url}"`);
      } catch (_) {}
    }
  } else if (process.platform === 'win32') {
    try {
      execSync(`start "" "${url}"`);
    } catch (_) {}
  } else {
    try {
      execSync(`xdg-open "${url}"`);
    } catch (_) {}
  }
}

/**
 * Odpala dedykowane okno aplikacji bez pasków nawigacyjnych (Chrome/Edge --app).
 */
function launchAppWindow(paths, url, log) {
  const platform = process.platform;

  if (platform === 'darwin') {
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(chromePath)) {
      log(`Otwieram okno Google Chrome w trybie --app...`);
      return spawn(
        chromePath,
        [
          `--app=${url}`,
          '--start-fullscreen',
          `--user-data-dir=${paths.profileDir}`,
          '--no-first-run',
          '--no-default-browser-check'
        ],
        { stdio: 'ignore', detached: false }
      );
    }
    log(`Brak Chrome pod ${chromePath}, używam systemowego open.`);
    execSync(`open "${url}"`);
    return null;
  }

  if (platform === 'win32') {
    const edgePaths = [
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ];
    const chromePaths = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ];

    const browserCandidate = [...edgePaths, ...chromePaths].find((p) => fs.existsSync(p));

    if (browserCandidate) {
      log(`Otwieram okno przeglądarki Windows (${browserCandidate}) w trybie --app...`);
      return spawn(
        browserCandidate,
        [
          `--app=${url}`,
          '--start-maximized',
          `--user-data-dir=${paths.profileDir}`,
          '--no-first-run',
          '--no-default-browser-check'
        ],
        { stdio: 'ignore', detached: false }
      );
    }

    log(`Brak dedykowanego Edge/Chrome, otwieram domyślną przeglądarkę systemową.`);
    execSync(`start "" "${url}"`);
    return null;
  }

  // Linux fallback
  try {
    execSync(`xdg-open "${url}"`);
  } catch (_) {}
  return null;
}

// Jeśli uruchomiono bezpośrednio:
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSupervisor().catch((err) => {
    console.error('Błąd krytyczny supervisora:', err);
    process.exit(1);
  });
}
