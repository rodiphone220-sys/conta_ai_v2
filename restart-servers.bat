@echo off
title Restart Servers
color 0E

echo.
echo ========================================
echo   RESTARTING ALL SERVERS
echo ========================================
echo.

echo Stopping existing servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ollama.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Starting servers...
call "%~dp0start-servers.bat"
