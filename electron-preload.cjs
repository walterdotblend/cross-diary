const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crossDiaryNative', {
  isDesktopApp: true,
  setIgnoreMouseEvents: (ignore) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore);
  },
  sendInteractiveBounds: (bounds) => {
    ipcRenderer.send('set-interactive-bounds', bounds);
  },
  getNowPlaying: () => ipcRenderer.invoke('get-now-playing'),
  controlMedia: (action) => ipcRenderer.invoke('control-media', action),
  onSystemMediaChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('system-media-changed', handler);
    return () => ipcRenderer.removeListener('system-media-changed', handler);
  },
  getSystemClipboard: () => ipcRenderer.invoke('get-system-clipboard'),
  writeSystemClipboard: (text) => ipcRenderer.invoke('write-system-clipboard', text),
  onSystemClipboardChanged: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on('system-clipboard-changed', handler);
    return () => ipcRenderer.removeListener('system-clipboard-changed', handler);
  },
  onGameModeChange: (callback) => {
    const handler = (_event, isGame) => callback(isGame);
    ipcRenderer.on('game-mode-change', handler);
    return () => ipcRenderer.removeListener('game-mode-change', handler);
  },
  onCursorInteractiveChange: (callback) => {
    const handler = (_event, isOver) => callback(isOver);
    ipcRenderer.on('cursor-interactive-change', handler);
    return () => ipcRenderer.removeListener('cursor-interactive-change', handler);
  },
  isCursorInsideWindow: () => ipcRenderer.invoke('is-cursor-inside-window'),
  onOpenIsland: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-island', handler);
    return () => ipcRenderer.removeListener('open-island', handler);
  },
  setAutostart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  getLanServerInfo: () => ipcRenderer.invoke('get-lan-server-info'),
  onLanSyncReceived: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('lan-sync-received', handler);
    return () => ipcRenderer.removeListener('lan-sync-received', handler);
  },
  saveDiaryMeta: (meta) => ipcRenderer.invoke('save-diary-meta', meta),
  scheduleUninstallDeletion: () => ipcRenderer.invoke('schedule-uninstall-deletion'),
  deleteLocalData: () => ipcRenderer.invoke('delete-local-data'),
  quitApp: () => ipcRenderer.send('quit-app'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setTargetMonitor: (target) => ipcRenderer.invoke('set-target-monitor', target),
  getDeviceName: () => ipcRenderer.invoke('get-device-name'),
});
