@echo off
cd /d "%~dp0"
taskkill /F /IM electron.exe >nul 2>&1
if exist "%~dp0node_modules\electron\dist\electron.exe" (
  start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0electron-main.cjs"
) else (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0dist/index.html" --window-size=860,880
)
