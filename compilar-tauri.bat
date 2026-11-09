@echo off
setlocal
echo ========================================================
echo       Compilador Nativo Ultraligero de Cross-Diary
echo ========================================================
echo.

set PATH=C:\Users\walyo\.cargo\bin;C:\Users\walyo\.gemini\antigravity\bin;%PATH%

cd /d "%~dp0"

echo [1/3] Compilando frontend web optimizado...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error al compilar frontend con Vite.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Empaquetando binarios nativos con Tauri / Rust...
node ./node_modules/@tauri-apps/cli/tauri.js build
if %ERRORLEVEL% NEQ 0 (
    echo Error durante la compilacion de Tauri.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Copiando ejecutables a dist-release...
if not exist "dist-release" mkdir dist-release
copy /y "src-tauri\target\release\bundle\nsis\Cross-Diary_0.1.0_x64-setup.exe" "dist-release\Cross-Diary-Instalador.exe"
copy /y "src-tauri\target\release\cross-diary.exe" "dist-release\Cross-Diary-Portable.exe"
copy /y "src-tauri\target\release\bundle\msi\Cross-Diary_0.1.0_x64_en-US.msi" "dist-release\Cross-Diary.msi"

echo.
echo ========================================================
echo   EXITO: Aplicacion compilada correctamente!
echo   Ubicacion: dist-release\
echo     - Cross-Diary-Instalador.exe (~2 MB)
echo     - Cross-Diary-Portable.exe   (~9 MB)
echo     - Cross-Diary.msi            (~3 MB)
echo ========================================================
pause
