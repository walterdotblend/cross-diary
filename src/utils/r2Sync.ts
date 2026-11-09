import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DiaryState, Note, FolderGroup, ClipboardEntry, ResourceShare } from '../types/diary';
import { createDefaultWelcomeWidgets } from './storage';

export interface DiaryDeletionInfo {
  pairingCode: string;
  diaryId: string;
  deviceId?: string;
  requestedAt: string;
  expiresAt: string;
  status: 'pending_deletion';
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

export type R2SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
let currentStatus: R2SyncStatus = 'idle';
let lastSyncTimestamp: string | null = null;
const statusListeners = new Set<(status: R2SyncStatus, timestamp: string | null) => void>();

export function subscribeR2Status(listener: (status: R2SyncStatus, timestamp: string | null) => void) {
  statusListeners.add(listener);
  listener(currentStatus, lastSyncTimestamp);
  return () => {
    statusListeners.delete(listener);
  };
}

function notifyStatus(status: R2SyncStatus) {
  currentStatus = status;
  statusListeners.forEach((fn) => fn(currentStatus, lastSyncTimestamp));
}

let syncTimeout: any = null;
let isCurrentlyUploading = false;
let isCurrentlyChecking = false;
let lastUploadedHash: string = '';
let lastLocalEditTime: number = 0;

export function recordLocalEdit() {
  lastLocalEditTime = Date.now();
}

export async function r2UploadDiary(state: DiaryState): Promise<{ success: boolean; error?: string }> {
  if (!state.pairingCode || !state.isInitialized) return { success: false, error: 'Sin código de emparejamiento' };
  if (isCurrentlyUploading) return { success: false, error: 'Subida en curso' };

  try {
    isCurrentlyUploading = true;
    notifyStatus('syncing');

    const clean = state.pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const keysToUpload = new Set<string>([
      `diaries/${clean}.json`,
      `diaries/${state.pairingCode.toUpperCase().trim()}.json`,
    ]);
    if (clean.length === 8) {
      keysToUpload.add(`diaries/${clean.slice(0, 4)}-${clean.slice(4)}.json`);
    }

    const isoNow = new Date().toISOString();
    const payloadObj = {
      version: '0.2.0',
      pairingCode: state.pairingCode,
      diaryId: state.diaryId,
      updatedAt: state.updatedAt || isoNow,
      groups: state.groups,
      notes: state.notes,
      vaultNotes: state.vaultNotes,
      decoyNotes: state.decoyNotes,
      globalStickers: state.globalStickers,
      clipboardHistory: state.clipboardHistory || [],
      shares: state.shares || [],
      settings: state.settings,
    };
    const payload = JSON.stringify(payloadObj);
    lastUploadedHash = `${state.notes.length}-${state.groups.length}-${state.clipboardHistory?.length || 0}-${state.clipboardHistory?.[0]?.id || ''}-${state.settings?.userAvatar || ''}-${payload.length}`;

    for (const key of keysToUpload) {
      try {
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: key,
            Body: payload,
            ContentType: 'application/json',
          })
        );
      } catch (uploadErr) {
        console.warn(`Failed to upload to key ${key}:`, uploadErr);
      }
    }

    lastSyncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notifyStatus('synced');
    return { success: true };
  } catch (err: any) {
    console.error('R2 Upload failed:', err);
    notifyStatus('error');
    return { success: false, error: err?.message || 'Error de sincronización con la nube' };
  } finally {
    isCurrentlyUploading = false;
  }
}

async function streamToString(body: any): Promise<string> {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (typeof body.transformToString === 'function') {
    try {
      const str = await body.transformToString();
      if (str) return str;
    } catch {}
  }
  if (typeof Response !== 'undefined') {
    try {
      return await new Response(body).text();
    } catch {}
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    try {
      return await body.text();
    } catch {}
  }
  if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
    return new TextDecoder('utf-8').decode(body);
  }
  return String(body);
}

export async function r2PermanentlyDeleteDiary(pairingCode: string): Promise<boolean> {
  try {
    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const keysToDelete = [
      `diaries/${clean}.json`,
      `diaries/${clean}_deletion.json`,
      clean.length === 8 ? `diaries/${clean.slice(0, 4)}-${clean.slice(4)}.json` : null,
      `diaries/${pairingCode.toUpperCase().trim()}.json`,
    ].filter(Boolean) as string[];

    for (const key of keysToDelete) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: key,
          })
        );
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}

export async function r2ScheduleDiaryDeletion(
  pairingCode: string,
  diaryId: string,
  deviceId?: string
): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
  try {
    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const requestedAt = new Date().toISOString();
    // 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const deletionRecord: DiaryDeletionInfo = {
      pairingCode: clean,
      diaryId,
      deviceId,
      requestedAt,
      expiresAt,
      status: 'pending_deletion',
    };

    const payload = JSON.stringify(deletionRecord, null, 2);

    // 1. Write deletion request record
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `diaries/${clean}_deletion.json`,
        Body: payload,
        ContentType: 'application/json',
      })
    );

    // 2. Also inject pendingDeletion into the active diary payload
    try {
      const existing = await r2DownloadDiary(clean, false); // false = do not auto-cancel during deletion request
      if (existing.success && existing.state) {
        const updated = {
          ...existing.state,
          pendingDeletion: deletionRecord,
        };
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: `diaries/${clean}.json`,
            Body: JSON.stringify(updated),
            ContentType: 'application/json',
          })
        );
      }
    } catch {}

    return { success: true, expiresAt };
  } catch (err: any) {
    console.error('r2ScheduleDiaryDeletion error:', err);
    return { success: false, error: err?.message || 'Error al solicitar borrado del diario' };
  }
}

export async function r2CancelDiaryDeletion(
  pairingCode: string,
  diaryId?: string
): Promise<{ success: boolean }> {
  try {
    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // 1. Remove deletion request marker
    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: `diaries/${clean}_deletion.json`,
        })
      );
    } catch {}

    // 2. Clear pendingDeletion field from main diary payload
    try {
      const existing = await r2DownloadDiary(clean, false);
      if (existing.success && existing.state && (existing.state as any).pendingDeletion) {
        const updated = { ...existing.state };
        delete (updated as any).pendingDeletion;
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: `diaries/${clean}.json`,
            Body: JSON.stringify(updated),
            ContentType: 'application/json',
          })
        );
      }
    } catch {}

    return { success: true };
  } catch (err) {
    console.warn('r2CancelDiaryDeletion error:', err);
    return { success: false };
  }
}

export async function r2CheckDiaryDeletionStatus(
  pairingCode: string
): Promise<{
  isPendingDeletion: boolean;
  isExpired: boolean;
  expiresAt?: string;
  daysRemaining?: number;
}> {
  try {
    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let deletionData: DiaryDeletionInfo | null = null;

    try {
      const res = await r2Client.send(
        new GetObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: `diaries/${clean}_deletion.json`,
        })
      );
      const str = await streamToString(res.Body);
      if (str) {
        deletionData = JSON.parse(str);
      }
    } catch {}

    if (!deletionData) {
      const diaryRes = await r2DownloadDiary(clean, false);
      if (diaryRes.success && diaryRes.state && (diaryRes.state as any).pendingDeletion) {
        deletionData = (diaryRes.state as any).pendingDeletion;
      }
    }

    if (!deletionData || !deletionData.expiresAt) {
      return { isPendingDeletion: false, isExpired: false };
    }

    const now = Date.now();
    const expiry = new Date(deletionData.expiresAt).getTime();

    if (now >= expiry) {
      await r2PermanentlyDeleteDiary(clean);
      return { isPendingDeletion: false, isExpired: true };
    }

    const daysRemaining = Math.max(1, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
    return {
      isPendingDeletion: true,
      isExpired: false,
      expiresAt: deletionData.expiresAt,
      daysRemaining,
    };
  } catch {
    return { isPendingDeletion: false, isExpired: false };
  }
}

export async function r2DownloadDiary(
  pairingCode: string,
  autoCancelDeletion: boolean = true
): Promise<{ success: boolean; state?: Partial<DiaryState>; wasRestored?: boolean; error?: string }> {
  try {
    const clean = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const candidateKeys = Array.from(
      new Set([
        `diaries/${clean}.json`,
        clean.length === 8 ? `diaries/${clean.slice(0, 4)}-${clean.slice(4)}.json` : null,
        `diaries/${pairingCode.toUpperCase().trim()}.json`,
      ])
    ).filter(Boolean) as string[];

    let bodyStr: string | undefined;

    for (const key of candidateKeys) {
      try {
        const res = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: key,
          })
        );
        bodyStr = await streamToString(res.Body);
        if (bodyStr) break;
      } catch {
        // try next candidate
      }
    }

    if (!bodyStr) return { success: false, error: 'No se encontró el diario en la nube con este código' };
    const parsed = JSON.parse(bodyStr);

    // Check if there is a pending deletion request for this diary
    let deletionRecord = parsed.pendingDeletion as DiaryDeletionInfo | undefined;
    if (!deletionRecord) {
      try {
        const delRes = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: `diaries/${clean}_deletion.json`,
          })
        );
        const delStr = await streamToString(delRes.Body);
        if (delStr) deletionRecord = JSON.parse(delStr);
      } catch {}
    }

    if (deletionRecord && deletionRecord.expiresAt) {
      const now = Date.now();
      const expiry = new Date(deletionRecord.expiresAt).getTime();
      if (now >= expiry) {
        // Expired after 30 days! Permanently delete the diary
        await r2PermanentlyDeleteDiary(clean);
        return {
          success: false,
          error: 'Este diario ha expirado y ha sido eliminado de la nube tras 30 días de inactividad.',
        };
      }

      // Owner returned within the 30-day window!
      if (autoCancelDeletion) {
        await r2CancelDiaryDeletion(clean, parsed.diaryId);
        delete parsed.pendingDeletion;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('diary-restored-from-deletion', {
              detail: { pairingCode: clean, restoredAt: new Date().toISOString() },
            })
          );
        }
        return { success: true, state: parsed, wasRestored: true };
      }
    }

    return { success: true, state: parsed };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se encontró el diario en la nube' };
  }
}

/**
 * Merges local and remote diary states using Last-Write-Wins (LWW) per individual note and group.
 * Local active edits are ALWAYS protected from being overwritten by older remote states.
 */
export function mergeDiaryStates(local: DiaryState, remote: Partial<DiaryState>): DiaryState {
  if (!remote) return local;

  // 1. Merge notes by id with Last-Write-Wins (LWW)
  const noteMap = new Map<string, Note>();
  // Seed with remote notes
  if (Array.isArray(remote.notes)) {
    for (const rNote of remote.notes) {
      if (rNote && rNote.id) {
        noteMap.set(rNote.id, rNote);
      }
    }
  }
  // Overlay with local notes: if local note has higher or equal timestamp, keep local!
  for (const lNote of local.notes) {
    const rNote = noteMap.get(lNote.id);
    if (!rNote) {
      noteMap.set(lNote.id, lNote);
    } else {
      const lTime = new Date(lNote.updatedAt || 0).getTime();
      const rTime = new Date(rNote.updatedAt || 0).getTime();
      if (lTime >= rTime) {
        noteMap.set(lNote.id, lNote);
      }
    }
  }

  // Ensure any welcome note has clean NoteBlock widgets and uncorrupted content
  for (const [id, noteItem] of noteMap.entries()) {
    if (id.startsWith('note-welcome')) {
      const isCorrupted =
        noteItem.content.includes('uygugu') ||
        noteItem.content.includes('- [ ] Conectar dispositivo') ||
        noteItem.content.includes('- [ ] Connect mobile device') ||
        noteItem.content.includes('- [ ] Gira la rueda') ||
        noteItem.content.includes('- [ ] Scroll mouse wheel') ||
        !noteItem.content.includes('[[bloque:wdg-checklist-welcome]]');
      if (isCorrupted) {
        const isEn = (local.settings?.language || remote.settings?.language) === 'en';
        noteItem.content = isEn
          ? `# DAILY NOTES // 01\n\nWelcome to your new Cross-Diary! Here is a live example of NoteBlock interactive widgets embedded directly into your sheet:\n\n[[bloque:wdg-checklist-welcome]]\n\n[[bloque:wdg-timer-welcome]]\n\nType your thoughts or quick notes here, or type '/' to insert more interactive blocks like stopwatches, sketch drawings, or mini spreadsheets.`
          : `# NOTAS DEL DÍA // 01\n\n¡Bienvenido a tu nuevo Cross-Diary! Aquí tienes un ejemplo práctico de bloques interactivos NoteBlock integrados directamente en tu hoja:\n\n[[bloque:wdg-checklist-welcome]]\n\n[[bloque:wdg-timer-welcome]]\n\nEscribe aquí tus ideas, notas rápidas o escribe '/' para insertar más bloques interactivos como cronómetros, dibujos a mano alzada o tablas de cálculo.`;
        noteItem.widgets = createDefaultWelcomeWidgets(isEn);
      }
    }
  }

  // 2. Merge groups by id
  const groupMap = new Map<string, FolderGroup>();
  if (Array.isArray(remote.groups)) {
    for (const g of remote.groups) {
      if (g && g.id) groupMap.set(g.id, g);
    }
  }
  for (const g of local.groups) {
    if (!groupMap.has(g.id)) groupMap.set(g.id, g);
  }

  // 3. Merge vault and decoy notes with LWW
  const mergeNoteList = (localList: Note[], remoteList?: Note[]) => {
    const map = new Map<string, Note>();
    if (Array.isArray(remoteList)) {
      for (const rn of remoteList) {
        if (rn && rn.id) map.set(rn.id, rn);
      }
    }
    for (const ln of localList) {
      const rn = map.get(ln.id);
      if (!rn || new Date(ln.updatedAt || 0).getTime() >= new Date(rn.updatedAt || 0).getTime()) {
        map.set(ln.id, ln);
      }
    }
    return Array.from(map.values());
  };

  const mergedNotes = Array.from(noteMap.values());
  const mergedGroups = Array.from(groupMap.values());
  const mergedVault = mergeNoteList(local.vaultNotes, remote.vaultNotes);
  const mergedDecoy = mergeNoteList(local.decoyNotes, remote.decoyNotes);

  const mergeClipboardHistories = (
    localClips: ClipboardEntry[] = [],
    remoteClips: ClipboardEntry[] = []
  ): ClipboardEntry[] => {
    const map = new Map<string, ClipboardEntry>();
    for (const c of [...localClips, ...remoteClips]) {
      if (!c || !c.text) continue;
      const existing = map.get(c.text);
      if (
        !existing ||
        new Date(c.timestamp || 0).getTime() > new Date(existing.timestamp || 0).getTime()
      ) {
        map.set(c.text, c);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 50);
  };

  const mergeSharesList = (
    localShares: ResourceShare[] = [],
    remoteShares: ResourceShare[] = []
  ): ResourceShare[] => {
    const map = new Map<string, ResourceShare>();
    for (const s of [...localShares, ...remoteShares]) {
      if (!s || !s.id) continue;
      const existing = map.get(s.id);
      if (
        !existing ||
        new Date(s.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime() ||
        s.revoked
      ) {
        map.set(s.id, s);
      }
    }
    return Array.from(map.values());
  };

  const remoteTime = new Date((remote as any).updatedAt || 0).getTime();
  const localTime = new Date(local.updatedAt || 0).getTime();
  const isRemoteNewer = remoteTime >= localTime;
  const mergedStickers =
    isRemoteNewer && Array.isArray(remote.globalStickers)
      ? remote.globalStickers
      : local.globalStickers;

  const mergedClipboard =
    Array.isArray(remote.clipboardHistory) && remote.clipboardHistory.length > 0
      ? mergeClipboardHistories(local.clipboardHistory, remote.clipboardHistory)
      : local.clipboardHistory;

  const maxTime = Math.max(remoteTime, localTime, Date.now());

  // Shared diary identity settings (icon, name, theme, pinned notifications) follow LWW
  const currentDeviceLang =
    local.settings?.language ||
    (typeof window !== 'undefined' ? (localStorage.getItem('cross_diary_language') as any) : null) ||
    remote.settings?.language ||
    'es';

  const mergedSettings = isRemoteNewer && remote.settings
    ? {
        ...local.settings,
        ...remote.settings,
        // Preserve strictly device-local UI geometry & language preferences on this device
        language: currentDeviceLang,
        dockPosition: local.settings.dockPosition || remote.settings.dockPosition,
        islandScale: local.settings.islandScale || remote.settings.islandScale,
        deploymentTrigger: local.settings.deploymentTrigger || remote.settings.deploymentTrigger,
        extensionConfigs: {
          ...(local.settings?.extensionConfigs || {}),
          ...(remote.settings?.extensionConfigs || {}),
        },
      }
    : {
        ...remote.settings,
        ...local.settings,
        language: currentDeviceLang,
        extensionConfigs: {
          ...(remote.settings?.extensionConfigs || {}),
          ...(local.settings?.extensionConfigs || {}),
        },
      };

  return {
    ...local,
    updatedAt: new Date(maxTime).toISOString(),
    notes: mergedNotes,
    groups: mergedGroups,
    vaultNotes: mergedVault,
    decoyNotes: mergedDecoy,
    globalStickers: mergedStickers,
    clipboardHistory: mergedClipboard,
    shares: mergeSharesList(local.shares, (remote as any).shares),
    settings: mergedSettings,
  };
}

/**
 * Checks R2 for remote updates in real-time. If remote has changes compared to local state,
 * returns the updated remote state.
 */
export async function r2CheckForRemoteUpdates(
  localDiary: DiaryState
): Promise<{ hasUpdate: boolean; remoteState?: Partial<DiaryState> }> {
  if (!localDiary.pairingCode || !localDiary.isInitialized || isCurrentlyUploading || isCurrentlyChecking) {
    return { hasUpdate: false };
  }

  // Do not pull remote while user is actively typing / editing locally on this device (cooldown)
  if (Date.now() - lastLocalEditTime < 1200) {
    return { hasUpdate: false };
  }

  try {
    isCurrentlyChecking = true;
    const res = await r2DownloadDiary(localDiary.pairingCode);
    if (!res.success || !res.state) {
      return { hasUpdate: false };
    }

    const remote = res.state;
    if (!Array.isArray(remote.notes) || !Array.isArray(remote.groups)) {
      return { hasUpdate: false };
    }

    // Check if remote has notes with different content / title / widgets / count
    let hasChanges = false;
    if (remote.notes.length !== localDiary.notes.length) {
      hasChanges = true;
    } else {
      const localMap = new Map(localDiary.notes.map((n) => [n.id, n]));
      for (const rNote of remote.notes) {
        const lNote = localMap.get(rNote.id);
        if (!lNote) {
          hasChanges = true;
          break;
        }
        if (
          rNote.title !== lNote.title ||
          rNote.content !== lNote.content ||
          rNote.icon !== lNote.icon ||
          (rNote.widgets?.length || 0) !== (lNote.widgets?.length || 0)
        ) {
          const rTime = new Date(rNote.updatedAt || 0).getTime();
          const lTime = new Date(lNote.updatedAt || 0).getTime();
          if (rTime > lTime || !lNote.updatedAt) {
            hasChanges = true;
            break;
          }
        }
      }
    }

    if (!hasChanges && Array.isArray(remote.groups) && remote.groups.length !== localDiary.groups.length) {
      hasChanges = true;
    }

    if (
      !hasChanges &&
      Array.isArray(remote.globalStickers) &&
      remote.globalStickers.length !== (localDiary.globalStickers?.length || 0)
    ) {
      hasChanges = true;
    }

    if (!hasChanges && Array.isArray(remote.clipboardHistory)) {
      const localClips = localDiary.clipboardHistory || [];
      if (
        remote.clipboardHistory.length !== localClips.length ||
        remote.clipboardHistory[0]?.id !== localClips[0]?.id ||
        remote.clipboardHistory[0]?.text !== localClips[0]?.text
      ) {
        hasChanges = true;
      } else {
        const localTexts = new Set(localClips.map((c) => c.text));
        if (remote.clipboardHistory.some((rc) => rc?.text && !localTexts.has(rc.text))) {
          hasChanges = true;
        }
      }
    }

    if (
      !hasChanges &&
      remote.settings &&
      (
        remote.settings.userAvatar !== localDiary.settings?.userAvatar ||
        remote.settings.diaryName !== localDiary.settings?.diaryName
      )
    ) {
      const rTime = new Date((remote as any).updatedAt || 0).getTime();
      const lTime = new Date(localDiary.updatedAt || 0).getTime();
      if (rTime >= lTime || !localDiary.updatedAt) {
        hasChanges = true;
      }
    }

    if (
      !hasChanges &&
      Array.isArray((remote as any).shares) &&
      (remote as any).shares.length !== (localDiary.shares?.length || 0)
    ) {
      hasChanges = true;
    }

    if (hasChanges) {
      lastSyncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notifyStatus('synced');
      return { hasUpdate: true, remoteState: remote };
    }

    return { hasUpdate: false };
  } catch (err) {
    return { hasUpdate: false };
  } finally {
    isCurrentlyChecking = false;
  }
}

export function scheduleR2Sync(state: DiaryState) {
  if (!state.isInitialized || !state.pairingCode) return;
  lastLocalEditTime = Date.now();
  if (syncTimeout) clearTimeout(syncTimeout);
  // Fast 600ms debounce so edits replicate immediately to other devices
  syncTimeout = setTimeout(() => {
    r2UploadDiary(state);
  }, 600);
}
