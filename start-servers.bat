@echo off
title My Conta AI Facturador - Server Manager
color 0A

echo.
echo ========================================
echo   MY CONTA AI FACTURADOR
echo   Server Manager
echo ========================================
echo.

:: Kill any running servers
echo [1/4] Stopping existing servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ollama.exe 2>nul
timeout /t 2 /nobreak >nul
echo Done.
echo.

:: Check and Start Ollama (AI Assistant Local Model)
echo [2/4] Checking Ollama...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting Ollama AI Service...
    start "OLLAMA AI SERVICE" cmd /k "echo Ollama AI Service Started && ollama serve"
    timeout /t 3 /nobreak >nul
    echo Ollama started.
) else (
    echo WARNING: Ollama not found. AI Assistant will use Gemini API instead.
    echo To install Ollama: https://ollama.com/download
)
echo.

:: Start Backend Server
echo [3/4] Starting Backend Server (port 3001)...
start "BACKEND SERVER" cmd /k "echo Starting Backend Server... && npm run server"
timeout /t 3 /nobreak >nul

:: Start Frontend Dev Server
echo [4/4] Starting Frontend Server (port 3000)...
start "FRONTEND SERVER" cmd /k "echo Starting Frontend Server... && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ALL SERVERS STARTED!
echo ========================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   Ollama:    http://localhost:11434 (if available)
echo.
echo   Close the terminal windows to stop.
echo ========================================
echo.
pause
