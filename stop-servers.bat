@echo off
title Stop Servers
color 0C

echo.
echo ========================================
echo   STOPPING ALL SERVERS
echo ========================================
echo.

echo Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo Servers stopped successfully.
) else (
    echo No running servers found.
)

echo.
echo ========================================
pause
