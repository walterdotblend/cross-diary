import mqtt, { MqttClient } from 'mqtt';
import { DiaryState, Note, ClipboardEntry } from '../types/diary';
import { getOrCreateDeviceId, LinkedDevice } from './deviceNetwork';

export type LiveConnectionState = 'disconnected' | 'connecting' | 'connected' | 'lan_connected';

interface NoteUpdatePayload {
  type: 'NOTE_UPDATE';
  senderDeviceId: string;
  note: Partial<Note>;
  timestamp: number;
}

interface FullSyncPayload {
  type: 'FULL_SYNC';
  senderDeviceId: string;
  diary: DiaryState;
  timestamp: number;
}

interface DeviceAnnouncePayload {
  type: 'DEVICE_ANNOUNCE';
  senderDeviceId: string;
  device: LinkedDevice;
}

export interface ClipboardUpdatePayload {
  type: 'CLIPBOARD_UPDATE';
  senderDeviceId: string;
  action: 'add' | 'delete' | 'sync_all';
  entry?: ClipboardEntry;
  history?: ClipboardEntry[];
  timestamp: number;
}

type LiveMessage = NoteUpdatePayload | FullSyncPayload | DeviceAnnouncePayload | ClipboardUpdatePayload;

let activeClient: MqttClient | null = null;
let currentPairingCode: string | null = null;
let connectionState: LiveConnectionState = 'disconnected';
let lanPeerUrl: string | null = null;
let lanPingInterval: any = null;

const stateListeners = new Set<(state: LiveConnectionState, details?: { lanUrl?: string }) => void>();
const noteListeners = new Set<(note: Partial<Note>, senderDeviceId: string) => void>();
const fullSyncListeners = new Set<(diary: DiaryState, senderDeviceId: string) => void>();
const peerAnnounceListeners = new Set<(device: LinkedDevice) => void>();
const clipboardListeners = new Set<(payload: ClipboardUpdatePayload) => void>();

function notifyState(st: LiveConnectionState) {
  connectionState = st;
  stateListeners.forEach((fn) => fn(connectionState, { lanUrl: lanPeerUrl || undefined }));
}

export function subscribeLiveState(
  listener: (state: LiveConnectionState, details?: { lanUrl?: string }) => void
) {
  stateListeners.add(listener);
  listener(connectionState, { lanUrl: lanPeerUrl || undefined });
  return () => {
    stateListeners.delete(listener);
  };
}

export function subscribeLiveNoteUpdate(
  listener: (note: Partial<Note>, senderDeviceId: string) => void
) {
  noteListeners.add(listener);
  return () => {
    noteListeners.delete(listener);
  };
}

export function subscribeLiveFullSync(
  listener: (diary: DiaryState, senderDeviceId: string) => void
) {
  fullSyncListeners.add(listener);
  return () => {
    fullSyncListeners.delete(listener);
  };
}

export function subscribeLivePeerAnnounce(
  listener: (device: LinkedDevice) => void
) {
  peerAnnounceListeners.add(listener);
  return () => {
    peerAnnounceListeners.delete(listener);
  };
}

export function subscribeLiveClipboardUpdate(
  listener: (payload: ClipboardUpdatePayload) => void
) {
  clipboardListeners.add(listener);
  return () => {
    clipboardListeners.delete(listener);
  };
}

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

let pendingQueue: string[] = [];

function publishOrQueue(topic: string, messageStr: string, qos: 0 | 1 = 1) {
  if (activeClient && activeClient.connected) {
    try {
      activeClient.publish(topic, messageStr, { qos });
    } catch {}
  } else {
    pendingQueue.push(messageStr);
    if (pendingQueue.length > 30) pendingQueue.shift();
  }
}

/**
 * Connects to the real-time MQTT WebSocket channel for this diary pairing code
 */
export function startLiveSync(
  pairingCode: string,
  initialDevice?: LinkedDevice,
  knownDevices?: LinkedDevice[]
) {
  if (!pairingCode) return;
  const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 6) return;

  if (Array.isArray(knownDevices)) {
    const myId = getOrCreateDeviceId();
    for (const dev of knownDevices) {
      if (dev && dev.deviceId !== myId && dev.localIp && dev.platform === 'windows') {
        tryConnectLanP2P(dev.localIp, dev.port || 48921);
      }
    }
  }

  if (activeClient && currentPairingCode === clean && connectionState === 'connected') {
    return;
  }

  stopLiveSync();
  currentPairingCode = clean;
  notifyState('connecting');

  const topic = `crossdiary/v4/${clean}/live`;
  const myDeviceId = getOrCreateDeviceId();

  let brokerIdx = 0;
  const brokerUrl = BROKERS[brokerIdx];

  try {
    const client = mqtt.connect(brokerUrl, {
      clientId: `${myDeviceId}-${Math.random().toString(36).slice(2, 6)}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 2500,
      connectTimeout: 8000,
    });

    activeClient = client;

    client.on('connect', () => {
      notifyState(lanPeerUrl ? 'lan_connected' : 'connected');
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          if (initialDevice) {
            sendLiveDeviceAnnounce(initialDevice);
          }
          // Flush any messages queued while connecting
          while (pendingQueue.length > 0) {
            const msg = pendingQueue.shift();
            if (msg) {
              try {
                client.publish(topic, msg, { qos: 1 });
              } catch {}
            }
          }
        }
      });
    });

    client.on('message', (_t, payload) => {
      try {
        const data = JSON.parse(payload.toString()) as LiveMessage;
        if (!data || !data.type) return;

        // Ignore messages sent by this same device to avoid feedback loops
        if (data.senderDeviceId === myDeviceId) return;

        if (data.type === 'NOTE_UPDATE' && data.note) {
          noteListeners.forEach((fn) => fn(data.note, data.senderDeviceId));
        } else if (data.type === 'FULL_SYNC' && data.diary) {
          fullSyncListeners.forEach((fn) => fn(data.diary, data.senderDeviceId));
        } else if (data.type === 'CLIPBOARD_UPDATE') {
          clipboardListeners.forEach((fn) => fn(data));
        } else if (data.type === 'DEVICE_ANNOUNCE' && data.device) {
          peerAnnounceListeners.forEach((fn) => fn(data.device));
          // If the announced device is a PC with a local IP, check if reachable via direct LAN!
          if (data.device.localIp && data.device.platform === 'windows') {
            tryConnectLanP2P(data.device.localIp, data.device.port || 48921);
          }
        }
      } catch (err) {
        // ignore parse error
      }
    });

    client.on('error', () => {
      // Rotate broker if connection failed
      if (brokerIdx < BROKERS.length - 1) {
        brokerIdx++;
        try {
          client.end(true);
          activeClient = mqtt.connect(BROKERS[brokerIdx], {
            clientId: `${myDeviceId}-${Math.random().toString(36).slice(2, 6)}`,
            clean: true,
            keepalive: 30,
            reconnectPeriod: 3000,
          });
        } catch {}
      }
    });

    client.on('close', () => {
      if (connectionState !== 'lan_connected') {
        notifyState('disconnected');
      }
    });
  } catch (err) {
    notifyState('disconnected');
  }
}

/**
 * Broadcasts an instant note edit to all paired devices in <25ms
 */
export function sendLiveNoteUpdate(note: Partial<Note>): boolean {
  if (!currentPairingCode) return false;
  const myDeviceId = getOrCreateDeviceId();

  const payload: NoteUpdatePayload = {
    type: 'NOTE_UPDATE',
    senderDeviceId: myDeviceId,
    note,
    timestamp: Date.now(),
  };

  // 1. Send via active WebSocket broker (or queue until connected)
  const topic = `crossdiary/v4/${currentPairingCode}/live`;
  publishOrQueue(topic, JSON.stringify(payload), 0);

  // 2. Also send via direct LAN if connected to local peer
  if (lanPeerUrl) {
    try {
      fetch(`${lanPeerUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }

  return true;
}

/**
 * Broadcasts a full diary state update (folder change, deletion, batch update)
 */
export function sendLiveFullSync(diary: DiaryState): boolean {
  if (!currentPairingCode) return false;
  const myDeviceId = getOrCreateDeviceId();

  const payload: FullSyncPayload = {
    type: 'FULL_SYNC',
    senderDeviceId: myDeviceId,
    diary,
    timestamp: Date.now(),
  };

  const topic = `crossdiary/v4/${currentPairingCode}/live`;
  publishOrQueue(topic, JSON.stringify(payload), 1);

  if (lanPeerUrl) {
    try {
      fetch(`${lanPeerUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }

  return true;
}

/**
 * Broadcasts an instant clipboard addition, deletion, or sync to paired devices
 */
export function sendLiveClipboardUpdate(
  action: 'add' | 'delete' | 'sync_all',
  data: { entry?: ClipboardEntry; history?: ClipboardEntry[] }
): boolean {
  if (!currentPairingCode) return false;
  const myDeviceId = getOrCreateDeviceId();

  const payload: ClipboardUpdatePayload = {
    type: 'CLIPBOARD_UPDATE',
    senderDeviceId: myDeviceId,
    action,
    entry: data.entry,
    history: data.history,
    timestamp: Date.now(),
  };

  const topic = `crossdiary/v4/${currentPairingCode}/live`;
  publishOrQueue(topic, JSON.stringify(payload), 1);

  if (lanPeerUrl) {
    try {
      fetch(`${lanPeerUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }

  return true;
}

/**
 * Announces this device network presence to other peers
 */
export function sendLiveDeviceAnnounce(device: LinkedDevice) {
  if (!currentPairingCode || !activeClient || !activeClient.connected) return;
  const myDeviceId = getOrCreateDeviceId();

  const payload: DeviceAnnouncePayload = {
    type: 'DEVICE_ANNOUNCE',
    senderDeviceId: myDeviceId,
    device,
  };

  try {
    const topic = `crossdiary/v4/${currentPairingCode}/live`;
    activeClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  } catch {}
}

/**
 * Attempts to connect directly to a peer via local LAN HTTP (0ms latency, zero cloud)
 */
export async function tryConnectLanP2P(localIp: string, port = 48921): Promise<boolean> {
  if (!localIp || localIp === '127.0.0.1') return false;
  const url = `http://${localIp}:${port}`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 1800);
    const res = await fetch(`${url}/api/status`, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (res.ok) {
      lanPeerUrl = url;
      notifyState('lan_connected');

      // Keep polling LAN peer every 3 seconds to verify connection remains active
      if (lanPingInterval) clearInterval(lanPingInterval);
      lanPingInterval = setInterval(async () => {
        try {
          const pingRes = await fetch(`${lanPeerUrl}/api/status`, { cache: 'no-store' });
          if (!pingRes.ok) {
            lanPeerUrl = null;
            notifyState(activeClient?.connected ? 'connected' : 'disconnected');
          }
        } catch {
          lanPeerUrl = null;
          notifyState(activeClient?.connected ? 'connected' : 'disconnected');
        }
      }, 5000);

      return true;
    }
  } catch {
    // LAN peer unreachable (not on same Wi-Fi)
  }
  return false;
}

export function stopLiveSync() {
  if (lanPingInterval) {
    clearInterval(lanPingInterval);
    lanPingInterval = null;
  }
  lanPeerUrl = null;

  if (activeClient) {
    try {
      activeClient.end(true);
    } catch {}
    activeClient = null;
  }
  notifyState('disconnected');
}
