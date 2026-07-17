@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
REM ukryj folder silnika (zeby tester widzial tylko 4 pliki)
if exist ".silnik" attrib +h ".silnik" >nul 2>nul
if not exist ".silnik" ( echo Brak folderu .silnik obok launchera. & pause & exit /b 1 )
cd .silnik
set PORT=4040
set URL=http://localhost:%PORT%
set PROFILE=%CD%\.desktop\chrome-profile
set NODE_OPTIONS=--max-old-space-size=4096

REM Chrome nie ma pytac o zapisywanie hasel w profilu launchera.
if not exist "%PROFILE%\Default" mkdir "%PROFILE%\Default"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Join-Path '%PROFILE%' 'Default\Preferences'; if (Test-Path $p) { $j = Get-Content -Raw $p | ConvertFrom-Json } else { $j = [pscustomobject]@{} }; $j | Add-Member -NotePropertyName credentials_enable_service -NotePropertyValue $false -Force; if ($null -eq $j.profile) { $j | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force }; $j.profile | Add-Member -NotePropertyName password_manager_enabled -NotePropertyValue $false -Force; $j | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $p"

where node >nul 2>nul
if errorlevel 1 (
  echo Najpierw zainstaluj Node.js ^(wersja LTS^) z https://nodejs.org, potem uruchom ponownie.
  pause
  exit /b 1
)

cls
echo ===============================================
echo    Moj Straznik Tajemnic - uruchamianie
echo ===============================================

if not exist node_modules (
  echo.
  echo [1/3] Pierwsze uruchomienie: instaluje zaleznosci.
  echo       To potrwa kilka minut. NIE zamykaj tego okna.
  echo.
  call npm install
  if errorlevel 1 ( echo Blad instalacji - sprawdz internet i sprobuj ponownie. & pause & exit /b 1 )
) else (
  echo [1/3] Zaleznosci gotowe - pomijam.
)

if not exist ".next\BUILD_ID" (
  echo.
  echo [2/3] Buduje aplikacje ^(jednorazowo, kilka minut^)...
  echo.
  call npm run build
  if errorlevel 1 ( echo Blad budowania. & pause & exit /b 1 )
) else (
  echo [2/3] Aplikacja zbudowana - pomijam.
)

echo.
echo [3/3] Uruchamiam gre...
start "straznik-server" /min cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && set PORT=%PORT% && npx next start"

echo Czekam az gra wstanie...
:waitloop
timeout /t 1 /nobreak >nul
curl -sf %URL% >nul 2>nul
if errorlevel 1 goto waitloop

set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "!CHROME!" --app=%URL% --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check
) else (
  start "" %URL%
)

echo.
echo Gra dziala w osobnym oknie.
echo Aby zakonczyc: zamknij okno gry, a potem to okno.
pause
