@echo off
title Cross-Diary - Generador de Instalador
cd /d "%~dp0"
echo =======================================================
echo   CROSS-DIARY // GENERADOR DE INSTALADOR (.EXE UNICO)
echo =======================================================
echo.
echo 1. Compilando aplicacion web con Vite...
"C:\Users\walyo\.gemini\antigravity\bin\node-v20.12.0-win-x64\node.exe" ./node_modules/vite/bin/vite.js build
if %errorlevel% neq 0 (
    echo Error al compilar con Vite.
    pause
    exit /b %errorlevel%
)

echo.
echo 1.1 Compilando detector nativo C# (game-detector.exe)...
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize+ /out:game-detector.exe game-detector.cs
if %errorlevel% neq 0 (
    echo Error al compilar game-detector.exe
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Creando instalador setup con Electron-Builder...
"C:\Users\walyo\.gemini\antigravity\bin\node-v20.12.0-win-x64\node.exe" ./node_modules/electron-builder/cli.js --win

echo.
echo =======================================================
echo   INSTALADOR GENERADO CON EXITO!
echo   Archivo para compartir:
echo   dist-installer\Cross-Diary Setup 0.2.0.exe
echo =======================================================
pause
