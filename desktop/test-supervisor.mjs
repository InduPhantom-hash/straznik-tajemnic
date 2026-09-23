/**
 * Testy jednostkowe i integracyjne dla Desktop Process Supervisor (desktop/supervisor.mjs)
 * Uruchamianie: node desktop/test-supervisor.mjs
 */

import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  resolvePaths,
  isPortAvailable,
  findAvailablePort,
  checkExistingInstance,
  killProcessTree
} from './supervisor.mjs';

async function runTests() {
  console.log('=== Rozpoczynam testy modułu desktop/supervisor.mjs ===\n');

  // Test 1: Izolacja ścieżek platformowych
  console.log('[1/4] Test: resolvePaths() i izolacja danych');
  const paths = resolvePaths();
  assert.ok(paths.appDir, 'appDir powinien być zdefiniowany');
  assert.ok(paths.gameDir, 'gameDir powinien być zdefiniowany');
  assert.ok(paths.dataRoot, 'dataRoot powinien być zdefiniowany');
  assert.ok(paths.runtimeDir.includes('desktop'), 'runtimeDir powinien wskazywać na podkatalog desktop');
  assert.ok(paths.profileDir.includes('chrome-profile'), 'profileDir powinien wskazywać na chrome-profile');
  assert.ok(paths.pidFile.endsWith('server.pid'), 'pidFile powinien kończyć się na server.pid');

  if (process.platform === 'darwin') {
    assert.ok(
      paths.dataRoot.includes('Library/Application Support/ZewCthulhu'),
      'Na macOS katalog danych musi być w Library/Application Support/ZewCthulhu'
    );
  }
  console.log('  PASS: resolvePaths poprawnie mapuje ścieżki i separuje dane użytkownika.\n');

  // Test 2: Wykrywanie wolnego portu i obsługa kolizji (findAvailablePort)
  console.log('[2/4] Test: isPortAvailable() oraz findAvailablePort()');
  // Zarezerwujmy tymczasowy port
  const tempServer = net.createServer();
  const testPort = 49990;

  await new Promise((resolve) => tempServer.listen(testPort, '127.0.0.1', resolve));
  const isAvailableBlocked = await isPortAvailable(testPort);
  assert.equal(isAvailableBlocked, false, `Port ${testPort} powinien być zajęty`);

  const nextFreePort = await findAvailablePort(testPort);
  assert.ok(nextFreePort > testPort, `Kolejny wolny port (${nextFreePort}) powinien być wyższy niż ${testPort}`);
  const isNextAvailable = await isPortAvailable(nextFreePort);
  assert.equal(isNextAvailable, true, `Znaleziony port ${nextFreePort} musi być wolny`);

  await new Promise((resolve) => tempServer.close(resolve));
  const isAvailableAfterClose = await isPortAvailable(testPort);
  assert.equal(isAvailableAfterClose, true, `Po zamknięciu serwera port ${testPort} musi być wolny`);
  console.log('  PASS: detekcja kolizji i alokacja kolejnego portu działają deterministycznie.\n');

  // Test 3: Single Instance Check (checkExistingInstance)
  console.log('[3/4] Test: checkExistingInstance()');
  // 3a: Port bez serwera
  const deadCheck = await checkExistingInstance(49995, 300);
  assert.equal(deadCheck.running, false, 'Nieaktywny port powinien zwrócić running=false');
  assert.equal(deadCheck.isStraznik, false, 'Nieaktywny port powinien zwrócić isStraznik=false');

  // 3b: Serwer imitujący Strażnika (/api/desktop/cold-start -> {"available":true})
  const mockStraznikServer = http.createServer((req, res) => {
    if (req.url === '/api/desktop/cold-start') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ available: true, version: '0.9.5' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const straznikPort = 49996;
  await new Promise((resolve) => mockStraznikServer.listen(straznikPort, '127.0.0.1', resolve));

  const liveCheck = await checkExistingInstance(straznikPort, 1000);
  assert.equal(liveCheck.running, true, 'Aktywny serwer gry powinien zwrócić running=true');
  assert.equal(liveCheck.isStraznik, true, 'Serwer gry z trasą cold-start musi być rozpoznany jako Strażnik');

  await new Promise((resolve) => mockStraznikServer.close(resolve));

  // 3c: Obcy serwer (np. inny proces systemowy)
  const mockAlienServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Foreign system service');
  });

  const alienPort = 49997;
  await new Promise((resolve) => mockAlienServer.listen(alienPort, '127.0.0.1', resolve));

  const alienCheck = await checkExistingInstance(alienPort, 1000);
  assert.equal(alienCheck.running, true, 'Obcy serwer powinien zwrócić running=true');
  assert.equal(alienCheck.isStraznik, false, 'Obcy serwer nie może być rozpoznany jako Strażnik');

  await new Promise((resolve) => mockAlienServer.close(resolve));
  console.log('  PASS: rozpoznawanie instancji Strażnika vs obcych procesów działa prawidłowo.\n');

  // Test 4: Kaskadowy Tree Kill i eliminacja procesów zombie
  console.log('[4/4] Test: killProcessTree() - eliminacja procesów zombie');
  const dummyChild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    detached: process.platform !== 'win32'
  });

  assert.ok(dummyChild.pid, 'Podproces testowy powinien mieć przypisany PID');

  // Weryfikacja że proces żyje
  let isAliveBefore = true;
  try {
    process.kill(dummyChild.pid, 0);
  } catch (_) {
    isAliveBefore = false;
  }
  assert.equal(isAliveBefore, true, 'Proces testowy musi początkowo żyć');

  // Zabicie drzewa procesów
  killProcessTree(dummyChild.pid, 'SIGKILL');

  // Poczekaj chwilę na propagację sygnału
  await new Promise((r) => setTimeout(r, 200));

  let isAliveAfter = true;
  try {
    process.kill(dummyChild.pid, 0);
  } catch (_) {
    isAliveAfter = false;
  }
  assert.equal(isAliveAfter, false, 'Po killProcessTree proces testowy musi zostać bezwzględnie ubity');
  console.log('  PASS: killProcessTree skutecznie eliminuje procesy potomne.\n');

  console.log('====================================================');
  console.log('Wszystkie testy supervisora zakończone SUKCESEM (4/4)!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\nBŁĄD TESTU:', err);
  process.exit(1);
});
