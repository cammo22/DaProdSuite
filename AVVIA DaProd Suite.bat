@echo off
setlocal
title DaProd Suite - avvio
cd /d "%~dp0"

echo ==========================================================
echo   DaProd Suite
echo ==========================================================
echo.

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] pnpm non e' installato o non e' nel PATH.
    echo          Installalo con:  npm install -g pnpm
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo ==^> Prima volta: installo le dipendenze...
    call pnpm install || goto fail
    echo.
)

echo ==^> Compilo...
call pnpm run build || goto fail

echo.
echo ==^> Avvio la suite. Chiudi la finestra per uscire.
echo.
cd apps\shell
call ".\node_modules\.bin\electron.CMD" .
exit /b 0

:fail
echo.
echo [ERRORE] Qualcosa e' andato storto qui sopra.
echo.
pause
exit /b 1
