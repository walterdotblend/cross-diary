@echo off
title Cross-Diary - Servidor de Prueba Movil
cd /d "%~dp0"
echo =======================================================
echo   CROSS-DIARY // PRUEBA EN VIVO PARA CELULAR (SIN APK)
echo =======================================================
echo.
echo 1. Asegurate de que tu celular este conectado al mismo Wi-Fi que esta PC.
echo 2. Busca la direccion IP que aparecera abajo (ej: http://192.168.1.X:5173).
echo 3. Abre Chrome o Safari en tu celular y entra a esa direccion.
echo 4. En tu celular, pulsa "Agregar a pantalla de inicio" para verlo a pantalla completa como una app nativa.
echo 5. Cualquier cambio que hagas en el codigo se refrescara en tu celular al instante!
echo.
"C:\Users\walyo\.gemini\antigravity\bin\node-v20.12.0-win-x64\node.exe" ./node_modules/vite/bin/vite.js --host
pause
