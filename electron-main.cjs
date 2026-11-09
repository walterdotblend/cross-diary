const { app, BrowserWindow, screen, ipcMain, clipboard, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn, execFile } = require('child_process');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

const R2_CONFIG = {
  accountId: '1de2c446943ed08e0c9ddf857b2d4ab2',
  bucketName: 'crosdiari',
  accessKeyId: 'af0216991a930efce80f0a866cb47fde',
  secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
};

async function scheduleUninstallDeletionHeadless() {
  console.log('[Headless] Scheduling 30-day diary deletion from uninstaller...');
  try {
    const metaPath = path.join(app.getPath('userData'), 'diary-meta.json');
    if (!fs.existsSync(metaPath)) {
      console.warn('[Headless] No diary-meta.json found in userData');
      app.exit(0);
      return;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const pairingCode = meta.pairingCode;
    if (!pairingCode) {
      console.warn('[Headless] No pairingCode found');
      app.exit(0);
      return;
    }

    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });

    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const deletionRecord = {
      pairingCode: clean,
      diaryId: meta.diaryId || '',
      deviceId: meta.deviceId || '',
      requestedAt,
      expiresAt,
      status: 'pending_deletion',
    };

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `diaries/${clean}_deletion.json`,
        Body: JSON.stringify(deletionRecord, null, 2),
        ContentType: 'application/json',
      })
    );

    try {
      const getRes = await s3.send(
        new GetObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: `diaries/${clean}.json`,
        })
      );
      if (getRes && getRes.Body) {
        let bodyStr = '';
        if (typeof getRes.Body.transformToString === 'function') {
          bodyStr = await getRes.Body.transformToString();
        }
        if (bodyStr) {
          const parsed = JSON.parse(bodyStr);
          parsed.pendingDeletion = deletionRecord;
          await s3.send(
            new PutObjectCommand({
              Bucket: R2_CONFIG.bucketName,
              Key: `diaries/${clean}.json`,
              Body: JSON.stringify(parsed),
              ContentType: 'application/json',
            })
          );
        }
      }
    } catch {}

    console.log('[Headless] 30-day deletion scheduled successfully');
  } catch (err) {
    console.error('[Headless] Error scheduling deletion:', err);
  } finally {
    app.exit(0);
  }
}

// Check if headless uninstall deletion argument was passed
if (process.argv.includes('--schedule-uninstall-deletion')) {
  scheduleUninstallDeletionHeadless();
} else {
  // Enforce single instance so two Cross-Diary processes can never open simultaneously
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  }
}

process.on('uncaughtException', (err) => {
  console.warn('[Electron Main uncaughtException]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Electron Main unhandledRejection]:', reason);
});

let mainWindow = null;
let tray = null;
let mediaDaemon = null;
let cachedMediaState = { found: false, peak: 0 };
let interactiveBounds = [];
let isIgnoringMouse = false;
let cursorTrackingTimer = null;
let isGameDetected = false;
let isManuallyHidden = false;
let isAppQuitting = false;
let lastGameDetectorTick = 0;

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isManuallyHidden = false;
    isGameDetected = false;
    mainWindow.setOpacity(1);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    try {
      mainWindow.webContents.send('open-island');
    } catch {}
    updateTrayMenu();
  }
});

function applyWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const shouldBeHidden = isManuallyHidden || isGameDetected;

  if (shouldBeHidden) {
    try {
      isIgnoringMouse = true;
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.webContents.send('game-mode-change', true);
      mainWindow.setOpacity(0);
      mainWindow.hide();
    } catch {}
  } else {
    try {
      mainWindow.setOpacity(1);
      if (!mainWindow.isVisible()) {
        mainWindow.showInactive();
      }
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.webContents.send('game-mode-change', false);
    } catch {}
  }
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const isCurrentlyHidden =
    !mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible() || isManuallyHidden || isGameDetected;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isCurrentlyHidden
        ? '🟢 Mostrar Isla Dinámica (Ctrl+Alt+H)'
        : '🔴 Modo Juego / Ocultar Isla (Ctrl+Alt+H)',
      click: () => {
        if (isCurrentlyHidden) {
          isManuallyHidden = false;
          isGameDetected = false;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
          }
        } else {
          isManuallyHidden = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
          }
        }
        applyWindowVisibility();
      },
    },
    { type: 'separator' },
    {
      label: 'Traer al Frente',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          isManuallyHidden = false;
          isGameDetected = false;
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          updateTrayMenu();
        }
      },
    },
    {
      label: 'Recargar Interfaz',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Salir de Cross-Diary',
      click: () => {
        stopMediaDaemon();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  if (tray) return;
  try {
    // 16x16 red/amber diary icon
    const icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0jk7OAAAAaklEQVQ4T2NkYGD4z0ABYBw1gGE0DBiA+D8Qv0bi/0dD839sBsA0MDIyMvz//x+bJmQA4kGg+B+aAbB+iAeD4n9sBsD6IR4Miv9jcwA2B2BzAKyG4n8kNyDXAFgNhe8/cg1ANoxh1AD6GgA7ySwpAeb3zQAAAABJRU5ErkJggg==',
        'base64'
      )
    );
    tray = new Tray(icon);
    tray.setToolTip('Cross-Diary (Isla Flotante)');
    updateTrayMenu();
    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        isManuallyHidden = false;
        isGameDetected = false;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        updateTrayMenu();
      }
    });
  } catch (err) {
    console.warn('Tray icon error:', err);
  }
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.register('CommandOrControl+Alt+H', () => {
      isManuallyHidden = !isManuallyHidden;
      if (!isManuallyHidden) isGameDetected = false;
      applyWindowVisibility();
    });
    globalShortcut.register('CommandOrControl+Shift+G', () => {
      isManuallyHidden = !isManuallyHidden;
      if (!isManuallyHidden) isGameDetected = false;
      applyWindowVisibility();
    });
  } catch (err) {
    console.warn('Failed to register global shortcuts:', err);
  }
}

let lastInteractiveOver = false;

function startCursorTracking() {
  if (cursorTrackingTimer) clearInterval(cursorTrackingTimer);
  cursorTrackingTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible() || isGameDetected || isManuallyHidden) {
      return;
    }

    // Safety: If no interactive elements registered, ALWAYS ignore mouse events so Windows clicks pass through 100%
    if (!interactiveBounds || interactiveBounds.length === 0) {
      if (!isIgnoringMouse) {
        isIgnoringMouse = true;
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      }
      if (lastInteractiveOver) {
        lastInteractiveOver = false;
        try {
          mainWindow.webContents.send('cursor-interactive-change', false);
        } catch {}
      }
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    let winBounds = { x: 0, y: 0, width: 0, height: 0 };
    try {
      winBounds = mainWindow.getBounds();
    } catch {}

    // Check if cursor is over any registered interactive rectangle (in global screen coordinates)
    const isOver = interactiveBounds.some((b) => {
      const left = winBounds.x + (b.x || 0);
      const right = left + (b.width || 0);
      const top = winBounds.y + (b.y || 0);
      const bottom = top + (b.height || 0);
      return (
        cursor.x >= left &&
        cursor.x <= right &&
        cursor.y >= top &&
        cursor.y <= bottom
      );
    });

    const shouldIgnore = !isOver;
    if (shouldIgnore !== isIgnoringMouse) {
      isIgnoringMouse = shouldIgnore;
      mainWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
    }

    if (isOver !== lastInteractiveOver) {
      lastInteractiveOver = isOver;
      try {
        mainWindow.webContents.send('cursor-interactive-change', isOver);
      } catch {}
    }
  }, 16);
}

let gameDetectorProcess = null;

function getGameDetectorPath() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'game-detector.exe');
    if (fs.existsSync(unpacked)) return unpacked;
    const direct = path.join(process.resourcesPath, 'game-detector.exe');
    if (fs.existsSync(direct)) return direct;
  }
  return path.join(__dirname, 'game-detector.exe');
}

function startGameDetector() {
  if (gameDetectorProcess) return;
  const detectorPath = getGameDetectorPath();
  if (!fs.existsSync(detectorPath)) {
    return;
  }

  try {
    gameDetectorProcess = spawn(detectorPath, [], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';
    gameDetectorProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('GAME_ACTIVE:')) {
          lastGameDetectorTick = Date.now();
          const isGame = line.slice('GAME_ACTIVE:'.length).trim().toLowerCase() === 'true';
          if (isGame !== isGameDetected) {
            isGameDetected = isGame;
            applyWindowVisibility();
          }
        }
      }
    });

    gameDetectorProcess.on('exit', () => {
      gameDetectorProcess = null;
      if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
        setTimeout(startGameDetector, 2000);
      }
    });
  } catch (err) {
    console.warn('[gameDetector spawn error]:', err);
    gameDetectorProcess = null;
  }
}

function stopGameDetector() {
  if (gameDetectorProcess) {
    try {
      gameDetectorProcess.kill();
    } catch {}
    gameDetectorProcess = null;
  }
}

function getMediaHelperPath() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'media-helper.ps1');
    if (fs.existsSync(unpacked)) return unpacked;
    const direct = path.join(process.resourcesPath, 'media-helper.ps1');
    if (fs.existsSync(direct)) return direct;
  }
  return path.join(__dirname, 'media-helper.ps1');
}

function startMediaDaemon() {
  if (mediaDaemon) return;
  const helperPath = getMediaHelperPath();
  try {
    mediaDaemon = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath, 'daemon'],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let buffer = '';
    mediaDaemon.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const idx = line.indexOf('MEDIA_SNAPSHOT:');
        if (idx !== -1) {
          const rawJson = line.slice(idx + 'MEDIA_SNAPSHOT:'.length).trim();
          try {
            const parsed = JSON.parse(rawJson);
            if (parsed && typeof parsed === 'object') {
              cachedMediaState = parsed;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('system-media-changed', cachedMediaState);
              }
              if (typeof parsed.isGameActive === 'boolean') {
                const wasGame = isGameDetected;
                if (!gameDetectorProcess || Date.now() - lastGameDetectorTick > 1500) {
                  isGameDetected = parsed.isGameActive;
                  if (wasGame !== isGameDetected) {
                    applyWindowVisibility();
                  }
                }
              }
            }
          } catch {
            // ignore partial line
          }
        }
      }
    });

    mediaDaemon.stderr.on('data', (d) => {
      console.warn('[mediaDaemon warning]:', d.toString('utf8'));
    });

    mediaDaemon.on('exit', () => {
      mediaDaemon = null;
      if (!isAppQuitting && mainWindow && !mainWindow.isDestroyed()) {
        setTimeout(startMediaDaemon, 3500);
      }
    });
  } catch {
    mediaDaemon = null;
  }
}

function stopMediaDaemon() {
  stopGameDetector();
  if (cursorTrackingTimer) {
    clearInterval(cursorTrackingTimer);
    cursorTrackingTimer = null;
  }
  try {
    globalShortcut.unregisterAll();
  } catch {}
  if (mediaDaemon) {
    try {
      mediaDaemon.kill();
    } catch {}
    mediaDaemon = null;
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    title: 'Cross-Diary',
    type: 'toolbar', // Adds WS_EX_TOOLWINDOW: completely excluded from Alt+Tab on Windows!
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true, // Strips WS_EX_APPWINDOW: completely excluded from Taskbar!
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows direct R2 sync requests from desktop without CORS blocks
      preload: path.join(__dirname, 'electron-preload.cjs'),
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setMenuBarVisibility(false);
  
  // Default to 100% click-through immediately so user can NEVER get locked out
  isIgnoringMouse = true;
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (!isManuallyHidden && !isGameDetected) {
      mainWindow.setOpacity(1);
      mainWindow.showInactive();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Also show immediately so no latency in appearing
  mainWindow.showInactive();

  // Enforce OS-level removal from Alt+Tab via Windows API
  try {
    const hwndBuf = mainWindow.getNativeWindowHandle();
    const hwndVal = process.arch === 'x64' ? hwndBuf.readBigInt64LE(0).toString() : hwndBuf.readInt32LE(0).toString();
    const helperPath = getMediaHelperPath();
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath, 'removeFromAltTab', hwndVal],
      { timeout: 3000, windowsHide: true },
      () => {}
    );
  } catch (err) {
    console.warn('Native Alt+Tab removal error:', err);
  }

  // Create system tray icon for tray access
  createTray();

  // Register hotkeys (Ctrl+Alt+H / Ctrl+Shift+G)
  registerGlobalShortcuts();

  // Start native cursor tracking for robust Windows click-through
  startCursorTracking();

  // Start high-frequency native game/borderless window detector
  startGameDetector();

  // Start background media snapshot daemon immediately
  startMediaDaemon();

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.warn('Renderer process gone:', details);
    isIgnoringMouse = true;
    try {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } catch {}
    interactiveBounds = [];
    if (details.reason !== 'clean-exit' && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
      }, 500);
    }
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Renderer unresponsive, ensuring mouse passthrough');
    isIgnoringMouse = true;
    try {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } catch {}
  });
}

ipcMain.on('set-interactive-bounds', (_event, bounds) => {
  interactiveBounds = Array.isArray(bounds) ? bounds : [];
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !isGameDetected && !isManuallyHidden) {
    const cursor = screen.getCursorScreenPoint();
    let winBounds = { x: 0, y: 0, width: 0, height: 0 };
    try {
      winBounds = mainWindow.getBounds();
    } catch {}
    const isOver = interactiveBounds.some((b) => {
      const left = winBounds.x + (b.x || 0);
      const right = left + (b.width || 0);
      const top = winBounds.y + (b.y || 0);
      const bottom = top + (b.height || 0);
      return (
        cursor.x >= left &&
        cursor.x <= right &&
        cursor.y >= top &&
        cursor.y <= bottom
      );
    });
    if (isOver !== lastInteractiveOver) {
      lastInteractiveOver = isOver;
      try {
        mainWindow.webContents.send('cursor-interactive-change', isOver);
      } catch {}
    }
  }
});

ipcMain.handle('is-cursor-inside-window', () => {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return false;
  if (!interactiveBounds || interactiveBounds.length === 0) return false;
  const cursor = screen.getCursorScreenPoint();
  let winBounds = { x: 0, y: 0, width: 0, height: 0 };
  try {
    winBounds = mainWindow.getBounds();
  } catch {}
  return interactiveBounds.some((b) => {
    const left = winBounds.x + (b.x || 0);
    const right = left + (b.width || 0);
    const top = winBounds.y + (b.y || 0);
    const bottom = top + (b.height || 0);
    return (
      cursor.x >= left &&
      cursor.x <= right &&
      cursor.y >= top &&
      cursor.y <= bottom
    );
  });
});

ipcMain.on('set-ignore-mouse-events', (_event, ignore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (ignore !== isIgnoringMouse) {
    isIgnoringMouse = ignore;
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.on('quit-app', () => {
  stopMediaDaemon();
  app.quit();
});

let lastDirectMediaCheck = 0;
ipcMain.handle('get-now-playing', async () => {
  if (!mediaDaemon) startMediaDaemon();
  if ((!cachedMediaState || !cachedMediaState.found) && Date.now() - lastDirectMediaCheck > 1200) {
    lastDirectMediaCheck = Date.now();
    const helperPath = getMediaHelperPath();
    execFile(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath, 'get'],
      { timeout: 2000, windowsHide: true },
      (_err, stdout) => {
        if (stdout) {
          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed && typeof parsed === 'object') {
              cachedMediaState = { ...cachedMediaState, ...parsed };
              if (typeof parsed.isGameActive === 'boolean') {
                const wasGame = isGameDetected;
                if (!gameDetectorProcess || Date.now() - lastGameDetectorTick > 1500) {
                  isGameDetected = parsed.isGameActive;
                  if (wasGame !== isGameDetected) {
                    applyWindowVisibility();
                  }
                }
              }
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('system-media-changed', cachedMediaState);
              }
            }
          } catch {}
        }
      }
    );
  }
  return cachedMediaState;
});

let lastElectronClipboard = '';
setInterval(() => {
  try {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoading()) {
      return;
    }
    const current = clipboard.readText();
    if (current && current.trim() && current.trim() !== lastElectronClipboard) {
      lastElectronClipboard = current.trim();
      mainWindow.webContents.send('system-clipboard-changed', lastElectronClipboard);
    }
  } catch {}
}, 400);

ipcMain.handle('get-system-clipboard', async () => {
  try {
    const txt = clipboard.readText() || '';
    if (txt) lastElectronClipboard = txt.trim();
    return txt;
  } catch {
    return '';
  }
});

ipcMain.handle('write-system-clipboard', async (_event, text) => {
  try {
    const str = String(text || '');
    lastElectronClipboard = str.trim();
    clipboard.writeText(str);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('control-media', async (_event, action) => {
  const act = action || 'playPause';

  // 1. Instant native hardware media key dispatch (<1ms via game-detector stdin daemon or <10ms via native exe)
  try {
    if (gameDetectorProcess && !gameDetectorProcess.killed && gameDetectorProcess.stdin && gameDetectorProcess.stdin.writable) {
      gameDetectorProcess.stdin.write(`ACTION:${act}\n`);
    } else {
      const detectorExe = getGameDetectorPath();
      if (fs.existsSync(detectorExe)) {
        execFile(detectorExe, [`--media-${act}`], { windowsHide: true }, () => {});
      }
    }
  } catch (err) {
    console.warn('Native media key dispatch error:', err);
  }

  // 2. Optimistically update cached media state and broadcast immediately
  if (act === 'playPause') {
    cachedMediaState = {
      ...cachedMediaState,
      status: cachedMediaState.status === 'Playing' ? 'Paused' : 'Playing',
    };
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-media-changed', cachedMediaState);
  }

  return cachedMediaState;
});

let lanServer = null;

function getSystemLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function startLanSyncServer() {
  if (lanServer) return;
  const PORT = 48921;
  try {
    lanServer = http.createServer((req, res) => {
      // Allow local CORS from mobile app
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          platform: 'windows',
          version: '0.2.0',
          localIp: getSystemLocalIp(),
          port: PORT,
        }));
        return;
      }

      if (req.url === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('lan-sync-received', payload);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, received: true }));
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'invalid json' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    lanServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[LAN Sync Server] Listening on http://0.0.0.0:${PORT}`);
    });

    lanServer.on('error', (err) => {
      console.warn('[LAN Sync Server error]:', err.message);
    });
  } catch (err) {
    console.warn('[LAN Sync Server launch failed]:', err);
  }
}

ipcMain.handle('get-local-ip', () => getSystemLocalIp());
ipcMain.handle('get-lan-server-info', () => ({ ip: getSystemLocalIp(), port: 48921 }));
ipcMain.handle('get-device-name', () => {
  return os.hostname() || process.env.COMPUTERNAME || 'PC Windows';
});

function configureAutostart(enable = true) {
  try {
    // Remove duplicate Electron default login item so Windows never launches 2 instances at boot
    try {
      app.setLoginItemSettings({
        openAtLogin: false,
        path: process.execPath,
        args: ['--hidden'],
      });
      app.setLoginItemSettings({
        openAtLogin: false,
      });
    } catch {}

    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      // Always clean up duplicate electron.app.* keys
      exec('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Cross-Diary" /f', { windowsHide: true }, () => {});
      exec('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Electron" /f', { windowsHide: true }, () => {});

      if (app.isPackaged) {
        const appPath = `"${process.execPath}"`;
        const regCmd = enable
          ? `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CrossDiary" /t REG_SZ /d "${appPath}" /f`
          : `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CrossDiary" /f`;
        exec(regCmd, { windowsHide: true }, () => {});
      }
    }
  } catch (err) {
    console.warn('Autostart configuration error:', err);
  }
}

ipcMain.handle('set-autostart', (_event, enable) => {
  configureAutostart(enable);
  return true;
});

ipcMain.handle('get-autostart', () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch {
    return true;
  }
});

ipcMain.handle('get-displays', () => {
  try {
    const all = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    return all.map((d, index) => ({
      id: String(d.id),
      index: index + 1,
      label: d.label || `Monitor ${index + 1} (${d.bounds.width}x${d.bounds.height})`,
      isPrimary: d.id === primaryId,
      bounds: d.bounds,
      workArea: d.workArea,
    }));
  } catch (err) {
    console.warn('get-displays error:', err);
    return [];
  }
});

ipcMain.handle('set-target-monitor', (_event, target) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try {
    const all = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    if (target === 'all') {
      const minX = Math.min(...all.map(d => d.bounds.x));
      const minY = Math.min(...all.map(d => d.bounds.y));
      const maxX = Math.max(...all.map(d => d.bounds.x + d.bounds.width));
      const maxY = Math.max(...all.map(d => d.bounds.y + d.bounds.height));
      mainWindow.setBounds({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    } else if (!target || target === 'primary') {
      mainWindow.setBounds(primary.bounds);
    } else {
      const targetIdStr = String(target).replace('display_', '');
      const found = all.find(d => String(d.id) === targetIdStr || String(d.id) === String(target));
      if (found) {
        mainWindow.setBounds(found.bounds);
      } else {
        mainWindow.setBounds(primary.bounds);
      }
    }
    return true;
  } catch (err) {
    console.warn('set-target-monitor error:', err);
    return false;
  }
});

ipcMain.handle('save-diary-meta', async (_event, meta) => {
  try {
    if (!meta || typeof meta !== 'object') return false;
    const metaPath = path.join(app.getPath('userData'), 'diary-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('save-diary-meta error:', err);
    return false;
  }
});

ipcMain.handle('schedule-uninstall-deletion', async () => {
  try {
    const metaPath = path.join(app.getPath('userData'), 'diary-meta.json');
    if (!fs.existsSync(metaPath)) return { success: false, error: 'No diary found' };
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (!meta.pairingCode) return { success: false, error: 'No pairing code found' };

    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });

    const clean = meta.pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const deletionRecord = {
      pairingCode: clean,
      diaryId: meta.diaryId || '',
      deviceId: meta.deviceId || '',
      requestedAt,
      expiresAt,
      status: 'pending_deletion',
    };

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `diaries/${clean}_deletion.json`,
        Body: JSON.stringify(deletionRecord, null, 2),
        ContentType: 'application/json',
      })
    );

    try {
      const getRes = await s3.send(
        new GetObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: `diaries/${clean}.json`,
        })
      );
      if (getRes && getRes.Body) {
        let bodyStr = '';
        if (typeof getRes.Body.transformToString === 'function') {
          bodyStr = await getRes.Body.transformToString();
        }
        if (bodyStr) {
          const parsed = JSON.parse(bodyStr);
          parsed.pendingDeletion = deletionRecord;
          await s3.send(
            new PutObjectCommand({
              Bucket: R2_CONFIG.bucketName,
              Key: `diaries/${clean}.json`,
              Body: JSON.stringify(parsed),
              ContentType: 'application/json',
            })
          );
        }
      }
    } catch {}

    return { success: true, expiresAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-local-data', async () => {
  try {
    const metaPath = path.join(app.getPath('userData'), 'diary-meta.json');
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
    return true;
  } catch {
    return false;
  }
});

ipcMain.on('quit-app', () => {
  stopMediaDaemon();
  app.quit();
});

app.whenReady().then(() => {
  createWindow();

  // Ensure Cross-Diary starts with Windows automatically on PC boot
  configureAutostart(true);

  // Start direct P2P local LAN Sync server for instantaneous local sync with mobile
  startLanSyncServer();

  // Background media daemon initialization
  setTimeout(() => {
    startMediaDaemon();
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
  stopMediaDaemon();
});

app.on('before-quit', () => {
  isAppQuitting = true;
  stopMediaDaemon();
});

app.on('window-all-closed', () => {
  stopMediaDaemon();
  if (process.platform !== 'darwin') app.quit();
});
