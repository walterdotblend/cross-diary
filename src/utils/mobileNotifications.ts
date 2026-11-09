import { LocalNotifications } from '@capacitor/local-notifications';
import { DiaryState, PinnedNotificationItem } from '../types/diary';
import { writeTextToClipboardSafe } from '../extensions/ClipboardExtension';
import { formatCleanDeviceName } from './deviceNetwork';
import {
  getColorEmojiDot,
  getRainbowFolderColor,
  getRainbowSheetColor,
} from './rainbowColors';

let isChannelCreated = false;
let isActionListenerRegistered = false;
let lastScheduledKey = '';
let latestStateRef: DiaryState | null = null;
let onNavigateCallback: ((item: PinnedNotificationItem) => void) | null = null;

export function registerNotificationNavigationHandler(
  cb: (item: PinnedNotificationItem) => void
) {
  onNavigateCallback = cb;
}

// Keep notification synchronized when app resumes from background or notification tap
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && latestStateRef) {
      lastScheduledKey = '';
      syncMobileNotification(latestStateRef).catch(() => {});
    }
  });
  window.addEventListener('focus', () => {
    if (latestStateRef) {
      lastScheduledKey = '';
      syncMobileNotification(latestStateRef).catch(() => {});
    }
  });
}

async function ensureSilentChannel() {
  if (isChannelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: 'cross_diary_silent',
      name: 'Acceso Rápido Cross-Diary',
      description: 'Notificación fija silenciosa para acceder a 3 hojas/carpetas o copiar clipboards',
      importance: 2, // Low importance: Silent, no sound, no vibration, stays in tray
      visibility: 1,
      vibration: false,
    });
    isChannelCreated = true;
  } catch (err) {
    console.warn('Could not create notification channel:', err);
  }
}

async function ensureActionListener() {
  if (isActionListenerRegistered) return;
  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const actionId = event.actionId;
      const state = latestStateRef;
      if (!state) return;

      if (actionId.startsWith('copy_clip_')) {
        const idx = parseInt(actionId.replace('copy_clip_', ''), 10);
        const clip = state.clipboardHistory?.[idx];
        if (clip?.text) {
          writeTextToClipboardSafe(clip.text);
        }
      } else if (actionId.startsWith('open_pinned_')) {
        const idx = parseInt(actionId.replace('open_pinned_', ''), 10);
        const pinned = state.settings?.pinnedNotificationItems?.[idx];
        if (pinned && onNavigateCallback) {
          onNavigateCallback(pinned);
        }
      }

      // Re-schedule immediately so notification remains persistent and active!
      lastScheduledKey = '';
      if (latestStateRef) {
        setTimeout(() => {
          if (latestStateRef) {
            syncMobileNotification(latestStateRef).catch(() => {});
          }
        }, 150);
      }
    });
    isActionListenerRegistered = true;
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    console.warn('Error checking notification permissions:', err);
    return false;
  }
}

export async function syncMobileNotification(state: DiaryState): Promise<void> {
  latestStateRef = state;
  const rawOpt = state.settings?.mobileNotificationOption;
  const opt =
    rawOpt === 'recent_3_sheets' || rawOpt === 'pinned_sheet'
      ? 'pinned_items'
      : rawOpt;

  if (!opt || opt === 'none') {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
      lastScheduledKey = '';
    } catch {}
    return;
  }

  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return;

    await ensureSilentChannel();
    await ensureActionListener();

    const isEnglish =
      state.settings?.language === 'en' ||
      (typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en');

    let title = 'Cross-Diary';
    let body = '';
    let actionTypeId = '';

    if (opt === 'pinned_items') {
      const pinnedList = (state.settings?.pinnedNotificationItems || []).slice(0, 3);
      title = isEnglish ? '📌 Quick Access • Cross-Diary' : '📌 Acceso Rápido • Cross-Diary';

      if (pinnedList.length === 0) {
        body = isEnglish
          ? 'Pin up to 3 sheets or folders from the settings of any sheet or folder.'
          : 'Fija hasta 3 hojas o carpetas desde los ajustes de cualquier hoja o carpeta.';
      } else {
        const lines: string[] = [];
        const actions: Array<{ id: string; title: string }> = [];

        pinnedList.forEach((item, idx) => {
          if (item.type === 'sheet') {
            const n = state.notes.find((note) => note.id === item.id);
            const label = n?.title || (isEnglish ? 'Sheet' : 'Hoja');
            const grpIdx = state.groups.findIndex((g) => g.id === n?.groupId);
            const sheetIdx = state.notes
              .filter((x) => x.groupId === n?.groupId)
              .findIndex((x) => x.id === item.id);
            const effectiveColor =
              n?.color ||
              getRainbowSheetColor(grpIdx >= 0 ? grpIdx : 0, sheetIdx >= 0 ? sheetIdx : 0);
            const dot = getColorEmojiDot(effectiveColor);

            lines.push(`${idx + 1}. ${dot} 📄 ${label}`);
            actions.push({
              id: `open_pinned_${idx}`,
              title: `${dot} 📄 ${label.slice(0, 12)}`,
            });
          } else {
            const grpIdx = state.groups.findIndex((grp) => grp.id === item.id);
            const g = grpIdx >= 0 ? state.groups[grpIdx] : undefined;
            const label = g?.name || (isEnglish ? 'Folder' : 'Carpeta');
            const effectiveColor = g?.color || getRainbowFolderColor(grpIdx >= 0 ? grpIdx : 0);
            const dot = getColorEmojiDot(effectiveColor);

            lines.push(`${idx + 1}. ${dot} 📁 ${label}`);
            actions.push({
              id: `open_pinned_${idx}`,
              title: `${dot} 📁 ${label.slice(0, 12)}`,
            });
          }
        });

        body = lines.join('\n');
        actionTypeId = 'CROSS_DIARY_PINNED_ACTIONS';
        try {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: actionTypeId,
                actions,
              },
            ],
          });
        } catch {}
      }
    } else if (opt === 'live_clipboard') {
      const topClips = (state.clipboardHistory || []).slice(0, 3);
      title = isEnglish ? '📋 Clipboard • Tap to copy' : '📋 Portapapeles • Toca para copiar';

      if (topClips.length === 0) {
        body = isEnglish
          ? 'Waiting for copied text from your PC or phone...'
          : 'Esperando texto copiado desde tu PC o celular...';
      } else {
        const lines = topClips.map((c) => {
          const dev = formatCleanDeviceName(c.deviceName, c.deviceType, isEnglish);
          return `[${dev}]: ${c.text.replace(/\s+/g, ' ').slice(0, 42)}`;
        });
        body = lines.join('\n');
        actionTypeId = 'CROSS_DIARY_CLIPBOARD_ACTIONS';
        try {
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: actionTypeId,
                actions: topClips.map((c, i) => {
                  const dev = formatCleanDeviceName(c.deviceName, c.deviceType, isEnglish);
                  return {
                    id: `copy_clip_${i}`,
                    title: `${isEnglish ? 'Copy' : 'Copiar'}: ${dev}`,
                  };
                }),
              },
            ],
          });
        } catch {}
      }
    }

    const currentKey = `${opt}:${title}:${body}`;
    if (currentKey === lastScheduledKey) {
      return;
    }

    try {
      await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    } catch {}

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 101,
          title,
          body,
          channelId: 'cross_diary_silent',
          actionTypeId: actionTypeId || undefined,
          ongoing: true,
          autoCancel: false,
          summaryText: 'Cross-Diary',
        },
      ],
    });

    lastScheduledKey = currentKey;
  } catch (err) {
    console.warn('Failed to sync mobile notification:', err);
  }
}
