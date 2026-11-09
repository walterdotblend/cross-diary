import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DiaryState, Note } from '../types/diary';

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

export type P2PConnectionStatus = 'disconnected' | 'connecting' | 'connected';

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let connectionStatus: P2PConnectionStatus = 'disconnected';
const statusListeners = new Set<(status: P2PConnectionStatus) => void>();
const remoteUpdateListeners = new Set<(note: Partial<Note>) => void>();
let signalingInterval: any = null;

export function subscribeP2PStatus(listener: (status: P2PConnectionStatus) => void) {
  statusListeners.add(listener);
  listener(connectionStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function subscribeP2PRemoteUpdate(listener: (note: Partial<Note>) => void) {
  remoteUpdateListeners.add(listener);
  return () => {
    remoteUpdateListeners.delete(listener);
  };
}

function updateStatus(status: P2PConnectionStatus) {
  connectionStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function setupDataChannel(channel: RTCDataChannel) {
  dataChannel = channel;
  channel.onopen = () => {
    updateStatus('connected');
  };
  channel.onclose = () => {
    updateStatus('disconnected');
  };
  channel.onerror = () => {
    updateStatus('disconnected');
  };
  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.type === 'NOTE_UPDATE' && data.note) {
        remoteUpdateListeners.forEach((fn) => fn(data.note));
      }
    } catch {
      // ignore
    }
  };
}

/**
 * Broadcasts an instant note edit to all connected peers in <20ms
 */
export function p2pBroadcastNoteUpdate(note: Partial<Note>) {
  if (dataChannel && dataChannel.readyState === 'open') {
    try {
      dataChannel.send(
        JSON.stringify({
          type: 'NOTE_UPDATE',
          note,
          timestamp: Date.now(),
        })
      );
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Starts P2P WebRTC handshake using Cloudflare R2 as the zero-server signaling relay
 */
export function startP2PSignaling(pairingCode: string, isDesktop: boolean) {
  if (!pairingCode || typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    return;
  }

  const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 6) return;

  if (signalingInterval) clearInterval(signalingInterval);

  try {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    peerConnection = new RTCPeerConnection(RTC_CONFIG);
    updateStatus('connecting');

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection?.connectionState === 'connected') {
        updateStatus('connected');
      } else if (
        peerConnection?.connectionState === 'disconnected' ||
        peerConnection?.connectionState === 'failed'
      ) {
        updateStatus('disconnected');
      }
    };

    if (isDesktop) {
      // Desktop acts as Offer initiator
      const channel = peerConnection.createDataChannel('cross-diary-p2p', {
        ordered: true,
      });
      setupDataChannel(channel);

      peerConnection.onicecandidate = async (e) => {
        if (!e.candidate && peerConnection?.localDescription) {
          // All ICE candidates gathered, write Offer signal
          try {
            await r2Client.send(
              new PutObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: `signals/${clean}-offer.json`,
                Body: JSON.stringify(peerConnection.localDescription),
                ContentType: 'application/json',
              })
            );
          } catch {}
        }
      };

      peerConnection.createOffer().then((offer) => {
        peerConnection?.setLocalDescription(offer);
      });

      // Poll for Answer from mobile
      signalingInterval = setInterval(async () => {
        if (connectionStatus === 'connected') {
          clearInterval(signalingInterval);
          return;
        }
        try {
          const res = await r2Client.send(
            new GetObjectCommand({
              Bucket: R2_CONFIG.bucketName,
              Key: `signals/${clean}-answer.json`,
            })
          );
          const answerStr = await res.Body?.transformToString();
          if (answerStr && peerConnection && !peerConnection.currentRemoteDescription) {
            const answer = JSON.parse(answerStr);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } catch {}
      }, 3000);
    } else {
      // Mobile acts as Answer respondent
      peerConnection.ondatachannel = (e) => {
        setupDataChannel(e.channel);
      };

      peerConnection.onicecandidate = async (e) => {
        if (!e.candidate && peerConnection?.localDescription) {
          try {
            await r2Client.send(
              new PutObjectCommand({
                Bucket: R2_CONFIG.bucketName,
                Key: `signals/${clean}-answer.json`,
                Body: JSON.stringify(peerConnection.localDescription),
                ContentType: 'application/json',
              })
            );
          } catch {}
        }
      };

      // Poll for Offer from desktop
      signalingInterval = setInterval(async () => {
        if (connectionStatus === 'connected') {
          clearInterval(signalingInterval);
          return;
        }
        try {
          const res = await r2Client.send(
            new GetObjectCommand({
              Bucket: R2_CONFIG.bucketName,
              Key: `signals/${clean}-offer.json`,
            })
          );
          const offerStr = await res.Body?.transformToString();
          if (offerStr && peerConnection && !peerConnection.currentRemoteDescription) {
            const offer = JSON.parse(offerStr);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
          }
        } catch {}
      }, 3000);
    }
  } catch (err) {
    updateStatus('disconnected');
  }
}

export function stopP2P() {
  if (signalingInterval) clearInterval(signalingInterval);
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  updateStatus('disconnected');
}
