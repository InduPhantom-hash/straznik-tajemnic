@echo off
set "ROOT_DIR=%~dp0"
if exist "%ROOT_DIR%runtime\desktop\launcher.cmd" (
    call "%ROOT_DIR%runtime\desktop\launcher.cmd"
) else if exist "%ROOT_DIR%desktop\launcher.cmd" (
    call "%ROOT_DIR%desktop\launcher.cmd"
) else (
    echo [BLAD] Nie znaleziono plikow wykonawczych gry w katalogu runtime\desktop.
    echo Upewnij sie, ze archiwum ZIP zostalo poprawnie wypakowane w calosci.
    pause
)
