@echo off
setlocal enabledelayedexpansion

title Strażnik Tajemnic AI - Launcher

echo ====================================================
echo   Strażnik Tajemnic AI (Zew Cthulhu 7e RAW)
echo   Desktop Process Supervisor - Windows Runtime
echo ====================================================

REM Sprawdzenie czy Node.js jest zainstalowany i dostępny w PATH
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    ) else if exist "%LocalAppData%\Programs\node\node.exe" (
        set "PATH=%LocalAppData%\Programs\node;%PATH%"
    ) else (
        echo [BLAD] Nie znaleziono srodowiska Node.js w systemie.
        echo Zainstaluj Node.js ze strony https://nodejs.org/ aby uruchomic gre.
        pause
        exit /b 1
    )
)

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."

echo Uruchamianie supervisora procesow...
node "%SCRIPT_DIR%supervisor.mjs"

if %ERRORLEVEL% NEQ 0 (
    echo [OSTRZEZENIE] Supervisor zakonczyl dzialanie z kodem bledu %ERRORLEVEL%.
    pause
)

endlocal
