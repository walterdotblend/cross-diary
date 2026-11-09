@echo off
setlocal
echo ========================================================
echo          Compilador Automatico de APK - Cross-Diary
echo ========================================================
echo.

set JAVA_HOME=C:\Users\walyo\.jdks\temurin-17\jdk-17.0.21+9
set ANDROID_HOME=C:\Users\walyo\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;C:\Users\walyo\.gemini\antigravity\bin;%PATH%

cd /d "%~dp0"

echo [1/3] Compilando frontend web optimizado...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error al compilar frontend con Vite.
    rem pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Sincronizando con Capacitor Android...
node ./node_modules/@capacitor/cli/bin/capacitor sync android
if %ERRORLEVEL% NEQ 0 (
    echo Error al sincronizar assets con Capacitor.
    rem pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Compilando APK con Gradle y Java 17...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo Error durante la compilacion de Gradle.
    rem pause
    exit /b %ERRORLEVEL%
)

cd ..
if not exist "dist-release" mkdir dist-release
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist-release\Cross-Diary-Android.apk"

echo.
echo ========================================================
echo   EXITO: APK compilada correctamente!
echo   Ubicacion: dist-release\Cross-Diary-Android.apk (~3.7 MB)
echo ========================================================
rem pause
