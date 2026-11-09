const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'electron-preload.cjs'),
    },
  });

  win.webContents.on('console-message', (e, level, message, line, src) => {
    console.log(`RENDERER_LOG [${level}]: ${message} at ${src}:${line}`);
  });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.error(`FAILED_LOAD: ${code} - ${desc}`);
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).then(() => {
    console.log('INDEX_HTML_LOADED_SUCCESSFULLY');
  });

  setTimeout(() => {
    console.log('TEST_TIMEOUT_CLOSING');
    app.quit();
  }, 4000);
});
