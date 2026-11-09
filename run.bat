@echo off
setlocal
title INIT.AI - Local Dev

REM One-click local development:
REM   * FastAPI backend  -> http://localhost:8000  (docs at /docs)
REM   * Vite frontend    -> http://localhost:5173  (opens automatically)
REM
REM Both run in their own console windows; close a window to stop that
REM service. The frontend is pointed at the LOCAL backend here (overriding
REM the production URL in .env) so changes are testable end-to-end.

cd /d "%~dp0"

echo.
echo   INIT.AI - starting local stack
echo   ------------------------------------------------
echo   API : http://localhost:8000  (docs: /docs)
echo   Web : http://localhost:5173
echo.

if not exist "package.json" (
    echo [error] package.json not found. Run this file from the repository root.
    pause
    exit /b 1
)

echo [1/3] Starting FastAPI backend...
start "INIT.AI API" /D "%~dp0backend" cmd /k python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

echo [2/3] Starting Vite frontend (pointing at the local API)...
start "INIT.AI Web" /D "%~dp0" cmd /k "set VITE_API_URL=http://localhost:8000&& npm run dev"

echo [3/3] Opening the app in your browser...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Both services launched. Close their console windows to stop them.
echo (This window can be closed.)
endlocal
