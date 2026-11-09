// Cross-Diary Automatic Update Checker
export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export const CURRENT_APP_VERSION = '0.2.0';

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  try {
    // Check against GitHub releases or R2 endpoint
    const res = await fetch('https://raw.githubusercontent.com/walterdotblend/cross-diary/main/package.json', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const remoteVer = data.version || CURRENT_APP_VERSION;
      const isNewer = compareVersions(remoteVer, CURRENT_APP_VERSION) > 0;
      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: remoteVer,
        releaseNotes: isNewer ? `¡Nueva versión ${remoteVer} disponible con mejoras de rendimiento y sincronización en la nube!` : undefined,
        downloadUrl: 'https://github.com/walterdotblend/cross-diary/releases',
      };
    }
  } catch {
    // If offline or network blocked
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
  };
}

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
  const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
