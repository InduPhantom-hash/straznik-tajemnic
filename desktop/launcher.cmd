@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Strażnik Tajemnic AI - Launcher

echo ====================================================
echo   Strażnik Tajemnic AI (Mechanika d100 Weird Fiction)
echo   Desktop Process Supervisor - Windows Runtime
echo ====================================================

set "SCRIPT_DIR=%~dp0"
set "NODE_BIN="

REM 1. Sprawdzenie wbudowanego srodowiska Node.js (Zero-Setup)
if exist "%SCRIPT_DIR%..\bin\node.exe" (
    set "NODE_BIN=%SCRIPT_DIR%..\bin\node.exe"
) else if exist "%SCRIPT_DIR%bin\node.exe" (
    set "NODE_BIN=%SCRIPT_DIR%bin\node.exe"
) else if exist "%SCRIPT_DIR%node\node.exe" (
    set "NODE_BIN=%SCRIPT_DIR%node\node.exe"
) else if exist "%SCRIPT_DIR%..\runtime\bin\node.exe" (
    set "NODE_BIN=%SCRIPT_DIR%..\runtime\bin\node.exe"
) else (
    REM 2. Fallback: srodowisko zainstalowane w systemie Windows
    where node >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set "NODE_BIN=node"
    ) else if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_BIN=%ProgramFiles%\nodejs\node.exe"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_BIN=%ProgramFiles(x86)%\nodejs\node.exe"
    ) else if exist "%LocalAppData%\Programs\node\node.exe" (
        set "NODE_BIN=%LocalAppData%\Programs\node\node.exe"
    ) else (
        echo [BLAD] Nie znaleziono srodowiska Node.js.
        echo Pobierz oficjalna samowystarczalna paczke gry ze strony:
        echo https://github.com/InduPhantom-hash/straznik-tajemnic/releases
        echo lub zainstaluj Node.js bezposrednio z https://nodejs.org/
        pause
        exit /b 1
    )
)

cd /d "%SCRIPT_DIR%.."

echo Uruchamianie gry Strażnik Tajemnic AI...
"%NODE_BIN%" "%SCRIPT_DIR%supervisor.mjs"

if %ERRORLEVEL% NEQ 0 (
    echo [OSTRZEZENIE] Supervisor zakonczyl dzialanie z kodem bledu %ERRORLEVEL%.
    pause
)

endlocal
