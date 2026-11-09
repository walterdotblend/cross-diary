import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface LinkedDevice {
  deviceId: string;
  deviceName: string;
  platform: 'windows' | 'android' | 'web';
  localIp: string;
  publicIp: string;
  port: number;
  lastSeen: string;
  isThisDevice?: boolean;
}

const R2_CONFIG = {
  accountId: '1de2c446943ed08e0c9ddf857b2d4ab2',
  bucketName: 'crosdiari',
  accessKeyId: 'af0216991a930efce80f0a866cb47fde',
  secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
};

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem('cross_diary_device_id');
    if (!id) {
      const isDesktop = typeof window !== 'undefined' && !!(window as any).crossDiaryNative?.isDesktopApp;
      const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
      const prefix = isDesktop ? 'pc-' : isAndroid ? 'mob-' : 'web-';
      id = prefix + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('cross_diary_device_id', id);
    }
    return id;
  } catch {
    return 'dev-' + Math.random().toString(36).substring(2, 9);
  }
}

export function getDevicePlatform(): 'windows' | 'android' | 'web' {
  if (typeof window !== 'undefined' && !!(window as any).crossDiaryNative?.isDesktopApp) {
    return 'windows';
  }
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return 'android';
  }
  return 'web';
}

export function detectPhoneModel(): string {
  if (typeof navigator === 'undefined') return 'Android';
  const ua = navigator.userAgent;
  // Match Android device model e.g. "SM-G998B", "Pixel 7 Pro", "M2102J20SG"
  const match = ua.match(/Android\s+[^;]+;\s*([^;)]+?)(?:\s+Build|[;)])/i);
  if (match && match[1]) {
    let raw = match[1].trim();
    if (raw && !/wv|mobile|kiosk/i.test(raw)) {
      raw = raw.replace(/^samsung\s+/i, '').replace(/^google\s+/i, '').replace(/^xiaomi\s+/i, '').trim();
      if (raw.length > 12) raw = raw.slice(0, 12);
      return raw;
    }
  }
  return 'Android';
}

export function formatCleanDeviceName(rawName?: string, type?: 'desktop' | 'mobile', isEnglish = false): string {
  if (!rawName) return type === 'desktop' ? 'PC' : (isEnglish ? 'Phone' : 'Móvil');
  let clean = rawName
    .replace(/\(En Vivo\)/gi, '')
    .replace(/\(Live\)/gi, '')
    .replace(/Windows\s+PC/gi, 'PC')
    .replace(/PC\s+Windows/gi, 'PC')
    .replace(/^Celular\s*\((.*?)\)$/i, '$1')
    .replace(/^Celular\s+/i, isEnglish ? 'Phone ' : 'Móvil ')
    .trim();
  if (clean.startsWith('DESKTOP-')) {
    clean = 'PC-' + clean.slice(8, 14);
  } else if (clean.startsWith('LAPTOP-')) {
    clean = 'Laptop-' + clean.slice(7, 13);
  } else if (clean.startsWith('PC (') && clean.endsWith(')')) {
    clean = clean.slice(4, -1).trim();
  }
  if (clean.length > 12) {
    clean = clean.slice(0, 12);
  }
  return clean || (type === 'desktop' ? 'PC' : (isEnglish ? 'Phone' : 'Móvil'));
}

let cachedDeviceName = '';

export function getDeviceDisplayNameSync(isEnglish = false): string {
  if (cachedDeviceName) return formatCleanDeviceName(cachedDeviceName, undefined, isEnglish);
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('cross_diary_device_name');
    if (stored) {
      cachedDeviceName = stored;
      return formatCleanDeviceName(stored, undefined, isEnglish);
    }
    const plat = getDevicePlatform();
    if (plat === 'android') {
      const model = detectPhoneModel();
      const name = model === 'Android' ? (isEnglish ? 'Phone' : 'Móvil') : model;
      cachedDeviceName = name;
      localStorage.setItem('cross_diary_device_name', name);
      return name;
    }
    if (plat === 'windows') {
      cachedDeviceName = 'PC';
      localStorage.setItem('cross_diary_device_name', 'PC');
      return 'PC';
    }
  }
  return isEnglish ? 'Device' : 'Dispositivo';
}

export async function initDeviceDisplayName(): Promise<string> {
  if (typeof window !== 'undefined') {
    if ((window as any).crossDiaryNative?.getDeviceName) {
      try {
        const pc = await (window as any).crossDiaryNative.getDeviceName();
        if (pc) {
          const finalName = formatCleanDeviceName(pc, 'desktop');
          cachedDeviceName = finalName;
          localStorage.setItem('cross_diary_device_name', finalName);
          return finalName;
        }
      } catch {}
    }
  }
  return getDeviceDisplayNameSync();
}

export function getDefaultDeviceName(): string {
  return getDeviceDisplayNameSync();
}

/**
 * Detects public IP via external IP reflection service
 */
export async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    const data = await res.json();
    return data.ip || '127.0.0.1';
  } catch {
    try {
      const res = await fetch('https://icanhazip.com', { cache: 'no-store' });
      const text = await res.text();
      return text.trim() || '127.0.0.1';
    } catch {
      return '127.0.0.1';
    }
  }
}

/**
 * Detects local LAN IP (e.g. 192.168.1.X) via Electron native or WebRTC candidate reflection
 */
export async function fetchLocalIp(): Promise<string> {
  // If in Electron, use native Node os.networkInterfaces()
  if (typeof window !== 'undefined' && (window as any).crossDiaryNative?.getLocalIp) {
    try {
      const ip = await (window as any).crossDiaryNative.getLocalIp();
      if (ip && ip !== '127.0.0.1') return ip;
    } catch {}
  }

  // Fallback: WebRTC ICE candidate local IP discovery
  return new Promise((resolve) => {
    try {
      if (typeof RTCPeerConnection === 'undefined') {
        resolve('127.0.0.1');
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      
      const timeout = setTimeout(() => {
        pc.close();
        resolve('127.0.0.1');
      }, 1000);

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const line = ice.candidate.candidate;
        // Search for IPv4 patterns like 192.168.x.x, 10.x.x.x, 172.x.x.x, 100.x.x.x
        const match = line.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
        if (match && match[1] && !match[1].startsWith('127.')) {
          clearTimeout(timeout);
          pc.close();
          resolve(match[1]);
        }
      };
    } catch {
      resolve('127.0.0.1');
    }
  });
}

/**
 * Fetches the list of all registered devices for this diary pairing code
 */
export async function getLinkedDevices(pairingCode: string): Promise<LinkedDevice[]> {
  if (!pairingCode) return [];
  const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const key = `devices/${clean}.json`;

  try {
    const res = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
      })
    );
    const bodyStr = await res.Body?.transformToString();
    if (!bodyStr) return [];
    const devices = JSON.parse(bodyStr) as LinkedDevice[];
    const myId = getOrCreateDeviceId();
    return devices.map((d) => ({
      ...d,
      isThisDevice: d.deviceId === myId,
    }));
  } catch {
    return [];
  }
}

/**
 * Registers this device's current network information (IPs, port, platform)
 * Checks if IP changed and updates the diary registry in Cloudflare R2
 */
export async function registerDeviceNetwork(pairingCode: string): Promise<{
  currentDevice: LinkedDevice;
  allDevices: LinkedDevice[];
  ipChanged: boolean;
}> {
  const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const deviceId = getOrCreateDeviceId();
  const platform = getDevicePlatform();
  const deviceName = await initDeviceDisplayName();

  const [localIp, publicIp] = await Promise.all([fetchLocalIp(), fetchPublicIp()]);
  const nowIso = new Date().toISOString();

  const thisDevice: LinkedDevice = {
    deviceId,
    deviceName,
    platform,
    localIp,
    publicIp,
    port: 48921,
    lastSeen: nowIso,
    isThisDevice: true,
  };

  // Compare with previously saved local info to detect network/ISP change
  let ipChanged = false;
  try {
    const prevNet = localStorage.getItem('cross_diary_last_net');
    if (prevNet) {
      const parsed = JSON.parse(prevNet);
      if (parsed.publicIp !== publicIp || parsed.localIp !== localIp) {
        ipChanged = true;
      }
    } else {
      ipChanged = true;
    }
    localStorage.setItem(
      'cross_diary_last_net',
      JSON.stringify({ publicIp, localIp, checkedAt: nowIso })
    );
  } catch {}

  // Fetch current registry from R2
  let existingDevices = await getLinkedDevices(pairingCode);

  // Update or append this device
  const otherDevices = existingDevices.filter((d) => d.deviceId !== deviceId);
  const updatedList = [thisDevice, ...otherDevices];

  // Save updated list to R2
  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `devices/${clean}.json`,
        Body: JSON.stringify(updatedList),
        ContentType: 'application/json',
      })
    );
  } catch (err) {
    console.warn('Failed to upload device registry to R2:', err);
  }

  // Legal audit logging
  recordAuditLog(pairingCode, 'register', { deviceName, ipChanged }).catch(() => {});

  return {
    currentDevice: thisDevice,
    allDevices: updatedList,
    ipChanged,
  };
}

/**
 * Legal Forensic Audit Trail:
 * Records an immutable audit log to R2 containing device ID, public/local IP,
 * timestamp, action, and platform. This protects the service provider / developer
 * under digital safe harbor regulations and enables compliance with legal court orders.
 */
export async function recordAuditLog(
  pairingCode: string,
  action: 'register' | 'sync' | 'share_create' | 'share_access' | 'report',
  details?: Record<string, any>
): Promise<void> {
  if (!pairingCode) return;
  const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const deviceId = getOrCreateDeviceId();
  const platform = getDevicePlatform();
  const [localIp, publicIp] = await Promise.all([fetchLocalIp(), fetchPublicIp()]);
  const nowIso = new Date().toISOString();
  const dateStr = nowIso.slice(0, 10);
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  const auditEntry = {
    cleanCode: clean,
    deviceId,
    platform,
    publicIp,
    localIp,
    action,
    timestamp: nowIso,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'CrossDiary-Desktop',
    details: details || {},
  };

  try {
    // 1. Diary-specific device audit record
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `audit/diaries/${clean}/${deviceId}.json`,
        Body: JSON.stringify(auditEntry),
        ContentType: 'application/json',
      })
    );

    // 2. Chronological compliance log
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `audit/events/${dateStr}/${clean}-${action}-${randomSuffix}.json`,
        Body: JSON.stringify(auditEntry),
        ContentType: 'application/json',
      })
    );
  } catch (err) {
    // Fail silently in background
    console.warn('Audit record failed:', err);
  }
}
