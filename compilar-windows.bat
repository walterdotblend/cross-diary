@echo off
title Cross-Diary - Compilador Windows Standalone
cd /d "%~dp0"
echo =======================================================
echo   CROSS-DIARY // COMPILADOR STANDALONE PARA WINDOWS
echo =======================================================
echo.
echo 1. Compilando bundle de produccion con Vite...
"C:\Users\walyo\.gemini\antigravity\bin\node-v20.12.0-win-x64\node.exe" ./node_modules/vite/bin/vite.js build
if %errorlevel% neq 0 (
    echo Error al compilar con Vite.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Empaquetando ejecutable nativo (.exe)...
"C:\Users\walyo\.gemini\antigravity\bin\node-v20.12.0-win-x64\node.exe" ./node_modules/electron-packager/bin/electron-packager.js . Cross-Diary --platform=win32 --arch=x64 --out=release-builds --overwrite

echo.
echo =======================================================
echo   COMPILACION FINALIZADA CON EXITO!
echo   Tu ejecutable se encuentra en:
echo   release-builds\Cross-Diary-win32-x64\Cross-Diary.exe
echo =======================================================
pause
