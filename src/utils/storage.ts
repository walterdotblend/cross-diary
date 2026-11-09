import {
  DiaryState,
  Note,
  FolderGroup,
  UserExtension,
  ClipboardEntry,
} from '../types/diary';

const STORAGE_KEY = 'cross_diary_state_v4';

export function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const BUILTIN_STICKER_PACK = [
  {
    id: 'stk-kawaii-star',
    name: 'Estrella Mochi',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76" viewBox="0 0 76 76"><path d="M38 4l9.8 20.2L70 27.4 53.9 43l3.9 22.1L38 54.6 18.2 65.1 22.1 43 6 27.4l22.2-3.2L38 4z" fill="#FF85B3" stroke="#4A152B" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="36" r="3" fill="#4A152B"/><circle cx="46" cy="36" r="3" fill="#4A152B"/><path d="M34 43q4 4 8 0" fill="none" stroke="#4A152B" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="24" cy="40" rx="3.5" ry="2" fill="#FF2E7E"/><ellipse cx="52" cy="40" rx="3.5" ry="2" fill="#FF2E7E"/></svg>`)}`
  },
  {
    id: 'stk-cat-mochi',
    name: 'Gato Crema',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="70" viewBox="0 0 80 70"><path d="M16 28L12 8l18 10c6-2 14-2 20 0L68 8l-4 20c8 7 10 18 6 28-5 10-18 12-30 12S15 66 10 56c-4-10-2-21 6-28z" fill="#FFF0F6" stroke="#4A152B" stroke-width="3"/><circle cx="28" cy="40" r="3.5" fill="#4A152B"/><circle cx="52" cy="40" r="3.5" fill="#4A152B"/><path d="M36 44q4 4 8 0" fill="none" stroke="#FF5C93" stroke-width="2.5" stroke-linecap="round"/></svg>`)}`
  },
  {
    id: 'stk-coffee-cup',
    name: 'Taza Matcha',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" viewBox="0 0 68 68"><rect x="14" y="22" width="34" height="34" rx="8" fill="#10B981" stroke="#0A0A0A" stroke-width="3"/><path d="M48 28h6a6 6 0 0 1 0 12h-6" fill="none" stroke="#0A0A0A" stroke-width="3"/><path d="M24 14q0-5 4-5t4 5M36 14q0-5 4-5t4 5" fill="none" stroke="#FF2E00" stroke-width="2.5" stroke-linecap="round"/></svg>`)}`
  }
];

export const DEFAULT_GROUPS: FolderGroup[] = [
  { id: 'grp-diario', name: 'BITÁCORA', color: '#FF2E00', icon: 'Flame', collapsed: false },
];

export function createDefaultWelcomeWidgets(isEnglish: boolean): NoteWidgetBlock[] {
  return [
    {
      id: 'wdg-checklist-welcome',
      type: 'checklist',
      title: isEnglish ? 'CHECKLIST // QUICK TIPS' : 'CHECKLIST // PRIMEROS PASOS',
      shape: 'wide',
      align: 'left',
      transparentBg: false,
      strokeColor: '#FF2E00',
      checklistItems: isEnglish
        ? [
            { id: 'item-1', text: 'Scroll mouse wheel over folders or extensions to browse smoothly', done: true },
            { id: 'item-2', text: 'Click anywhere in empty space to write immediately at the end', done: true },
            { id: 'item-3', text: 'Insert interactive NoteBlocks or type / for quick commands', done: false },
            { id: 'item-4', text: 'Pin sheets or folders in settings for rapid access in notification', done: false },
          ]
        : [
            { id: 'item-1', text: 'Gira la rueda del ratón sobre carpetas o extensiones para moverte', done: true },
            { id: 'item-2', text: 'Haz clic en cualquier espacio vacío para escribir inmediatamente al final', done: true },
            { id: 'item-3', text: 'Inserta bloques interactivos desde NoteBlocks o tecleando /', done: false },
            { id: 'item-4', text: 'Fija hojas o carpetas en ajustes para tener acceso rápido en la notificación', done: false },
          ],
    },
    {
      id: 'wdg-timer-welcome',
      type: 'timer',
      title: isEnglish ? 'FOCUS // 25 MIN' : 'ENFOQUE // 25 MIN',
      shape: 'square',
      align: 'left',
      transparentBg: false,
      strokeColor: '#FF2E00',
      timerDurationMinutes: 25,
      timerDurationSeconds: 0,
      timerSecondsLeft: 25 * 60,
      timerIsRunning: false,
    },
  ];
}

export const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-welcome',
    groupId: 'grp-diario',
    title: 'NOTAS DEL DÍA // 01',
    icon: '⚡',
    content: `# NOTAS DEL DÍA // 01

¡Bienvenido a tu nuevo Cross-Diary! Aquí tienes un ejemplo práctico de bloques interactivos NoteBlock integrados directamente en tu hoja:

[[bloque:wdg-checklist-welcome]]

[[bloque:wdg-timer-welcome]]

Escribe aquí tus ideas, notas rápidas o escribe '/' para insertar más bloques interactivos como cronómetros, dibujos a mano alzada o tablas de cálculo.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['inicio'],
    stickers: [],
    widgets: createDefaultWelcomeWidgets(false),
    resetMode: 'manual',
    lastResetDate: new Date().toISOString().slice(0, 10),
  },
];

export const DEFAULT_VAULT_NOTES: Note[] = [
  {
    id: 'vault-note-1',
    groupId: 'grp-vault',
    title: 'ACCESOS & NOTAS PRIVADAS',
    icon: '🔐',
    color: '#8B5CF6',
    content: `# ACCESOS & NOTAS PRIVADAS

Esta hoja está dentro de tu **Bóveda Personal**.
Su temporizador de desbloqueo se mantiene activo aunque ocultes la isla dinámica.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isVault: true,
  }
];

export const DEFAULT_DECOY_NOTES: Note[] = [
  {
    id: 'decoy-note-1',
    groupId: 'grp-vault',
    title: 'LISTA DE COMPRAS DEL SÚPER',
    icon: '🛒',
    color: '#10B981',
    content: `# LISTA DE COMPRAS DEL SÚPER

- [x] Leche y cereales
- [x] Café molido
- [ ] Fruta fresca`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDecoy: true,
  }
];

export const DEFAULT_CLIPBOARD: ClipboardEntry[] = [];

export const CANONICAL_EXT_ORDER = [
  'ext-music',
  'ext-clipboard',
  'ext-note-widgets',
  'ext-chrono',
  'ext-calculator',
  'ext-stickers',
  'ext-vault',
];

export const DEFAULT_EXTENSIONS: UserExtension[] = [
  {
    id: 'ext-music',
    name: 'PulseAudio // Detector en Vivo',
    description: 'Muestra miniatura, onda exagerada en vivo y botones para adelantar/retroceder segundos.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Music',
    type: 'music_waveform',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-clipboard',
    name: 'ClipBoard // Vivo Automático',
    description: 'Captura automáticamente y en tiempo real todo lo que copias en tu PC.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Clipboard',
    type: 'clipboard_hub',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-note-widgets',
    name: 'NoteBlocks // Widgets de Hoja',
    description: 'Inserta bloques anchos o cuadrados (Reloj, Temp, Pizarra Excalidraw sin fondo, Hoja Cálculo) donde quieras en tu nota.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'LayoutGrid',
    type: 'note_widgets',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-chrono',
    name: 'ChronoTimer // Temp & Crono',
    description: 'Temporizador en caliente con alarma personalizable, presets rápidos y cronómetro con vueltas.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Timer',
    type: 'chrono_calc',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-calculator',
    name: 'CalcPro // Calculadora',
    description: 'Calculadora científica y financiera independiente con historial e inserción en nota.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Calculator',
    type: 'calculator_pro',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-stickers',
    name: 'StickerCanvas // Pegatinas Libres',
    description: 'Coloca stickers con giro 360° real, opacidad, escala y bloqueo de posición.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Sticker',
    type: 'sticker_studio',
    target: 'external_dock',
    enabled: true,
    installed: true,
  },
  {
    id: 'ext-vault',
    name: 'Bóveda // Clave & Señuelo',
    description: 'Configura tu clave la primera vez que entras; incluye temporizador persistente y clave señuelo.',
    version: '4.0.0',
    author: 'Cross-Diary Core',
    icon: 'Lock',
    type: 'vault_boveda',
    target: 'external_dock',
    enabled: true,
    installed: true,
  }
];

export function getInitialState(): DiaryState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DiaryState;
      if (parsed.diaryId && parsed.groups && parsed.notes) {
        const existingIds = new Set((parsed.extensions || []).map((e) => e.id));
        const mergedExtensions = [...(parsed.extensions || [])];
        for (const defExt of DEFAULT_EXTENSIONS) {
          if (!existingIds.has(defExt.id)) {
            mergedExtensions.push(defExt);
          }
        }
        // Canonical sort: pulseaudio - clipboard - noteblocks - chronotimer - calcpro - stickercanvas - boveda
        mergedExtensions.sort((a, b) => {
          const idxA = CANONICAL_EXT_ORDER.indexOf(a.id);
          const idxB = CANONICAL_EXT_ORDER.indexOf(b.id);
          return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
        });
        parsed.extensions = mergedExtensions;

        if (!parsed.settings.islandScale) {
          parsed.settings.islandScale = 1.0;
        }
        if (!parsed.settings.deploymentTrigger) {
          parsed.settings.deploymentTrigger = 'hover';
        }
        if (!parsed.settings.extensionConfigs) {
          (parsed.settings as any).extensionConfigs = {};
        }
        if (!parsed.settings.extensionConfigs.chrono) {
          parsed.settings.extensionConfigs.chrono = {
            defaultFocusMinutes: 25,
            soundAlerts: true,
            timerPresets: [5, 10, 15, 25, 45, 60],
            alarmTone: 'cristal-bell',
            alarmVolume: 85,
          };
        } else {
          if (!Array.isArray(parsed.settings.extensionConfigs.chrono.timerPresets)) {
            parsed.settings.extensionConfigs.chrono.timerPresets = [5, 10, 15, 25, 45, 60];
          }
          if (!parsed.settings.extensionConfigs.chrono.alarmTone) {
            parsed.settings.extensionConfigs.chrono.alarmTone = 'cristal-bell';
          }
        }
        if (!parsed.settings.extensionConfigs.stickers) {
          parsed.settings.extensionConfigs.stickers = {
            opacity: 100,
            lockPositions: false,
            defaultSize: 96,
          };
        } else if (!parsed.settings.extensionConfigs.stickers.defaultSize) {
          parsed.settings.extensionConfigs.stickers.defaultSize = 96;
        }

        if (!parsed.settings.extensionConfigs.clipboard) {
          parsed.settings.extensionConfigs.clipboard = {
            autoCaptureSystem: true,
            maxHistory: 50,
            syncAcrossDevices: true,
          };
        }
        if (!parsed.settings.extensionConfigs.music) {
          parsed.settings.extensionConfigs.music = {
            waveformStyle: 'bars',
            detectSystemMedia: true,
            volume: 75,
          };
        }

        // Clean up legacy stray default stickers (flying star)
        if (Array.isArray(parsed.globalStickers)) {
          parsed.globalStickers = parsed.globalStickers.filter((s) => s.id !== 'stk-global-1');
        } else {
          parsed.globalStickers = [];
        }

        if (!Array.isArray(parsed.shares)) {
          parsed.shares = [];
        }

        if (!Array.isArray(parsed.clipboardHistory)) {
          parsed.clipboardHistory = [];
        } else {
          parsed.clipboardHistory = parsed.clipboardHistory.filter(
            (c: any) =>
              c &&
              c.text &&
              !c.text.includes('Fragmento sincronizado') &&
              !c.text.includes('Sample synced snippet') &&
              c.id !== 'clip-sample'
          );
        }

        // Migrate legacy notification options to the 2 new modes ('pinned_items' | 'live_clipboard' | 'none')
        if (
          parsed.settings.mobileNotificationOption === 'recent_3_sheets' ||
          parsed.settings.mobileNotificationOption === 'pinned_sheet'
        ) {
          parsed.settings.mobileNotificationOption = 'pinned_items';
        }
        if (!Array.isArray(parsed.settings.pinnedNotificationItems)) {
          if (parsed.settings.pinnedSheetId) {
            parsed.settings.pinnedNotificationItems = [
              { type: 'sheet', id: parsed.settings.pinnedSheetId },
            ];
          } else {
            parsed.settings.pinnedNotificationItems = [];
          }
        }

        // Migrate welcome note to interactive NoteBlock checklist & timer if it still has legacy text checklist
        const welcomeNotes = (parsed.notes || []).filter((n) => n.id.startsWith('note-welcome'));
        for (const welcomeNote of welcomeNotes) {
          const isEn = parsed.settings?.language === 'en';
          const hasLegacyChecklist =
            welcomeNote.content.includes('- [ ] Conectar dispositivo') ||
            welcomeNote.content.includes('- [ ] Connect mobile device') ||
            welcomeNote.content.includes('- [ ] Probar modo de juego') ||
            welcomeNote.content.includes('- [ ] Gira la rueda') ||
            welcomeNote.content.includes('- [ ] Scroll mouse wheel');
          const hasChecklistWidget = (welcomeNote.widgets || []).some(
            (w) => w.type === 'checklist'
          );
          const hasCorruptedToken =
            welcomeNote.content.includes('uygugu') ||
            !welcomeNote.content.includes('[[bloque:wdg-checklist-welcome]]') ||
            !welcomeNote.content.includes('[[bloque:wdg-timer-welcome]]');

          if (hasLegacyChecklist || !hasChecklistWidget || hasCorruptedToken) {
            welcomeNote.content = isEn
              ? `# DAILY NOTES // 01\n\nWelcome to your new Cross-Diary! Here is a live example of NoteBlock interactive widgets embedded directly into your sheet:\n\n[[bloque:wdg-checklist-welcome]]\n\n[[bloque:wdg-timer-welcome]]\n\nType your thoughts or quick notes here, or type '/' to insert more interactive blocks like stopwatches, sketch drawings, or mini spreadsheets.`
              : `# NOTAS DEL DÍA // 01\n\n¡Bienvenido a tu nuevo Cross-Diary! Aquí tienes un ejemplo práctico de bloques interactivos NoteBlock integrados directamente en tu hoja:\n\n[[bloque:wdg-checklist-welcome]]\n\n[[bloque:wdg-timer-welcome]]\n\nEscribe aquí tus ideas, notas rápidas o escribe '/' para insertar más bloques interactivos como cronómetros, dibujos a mano alzada o tablas de cálculo.`;
            welcomeNote.widgets = createDefaultWelcomeWidgets(isEn);
          }
        }

        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading state:', e);
  }

  return {
    isInitialized: false,
    diaryId: 'cd-' + Math.random().toString(36).substring(2, 9),
    pairingCode: generatePairingCode(),
    groups: DEFAULT_GROUPS,
    notes: DEFAULT_NOTES,
    vaultNotes: DEFAULT_VAULT_NOTES,
    decoyNotes: DEFAULT_DECOY_NOTES,
    globalStickers: [],
    shares: [],
    clipboardHistory: DEFAULT_CLIPBOARD,
    selectedNoteId: DEFAULT_NOTES[0].id,
    selectedGroupId: DEFAULT_GROUPS[0].id,
    activeExternalExtensionId: 'ext-music',
    settings: {
      theme: 'solar-flare',
      customCss: '',
      autostart: true,
      dockPosition: 'right',
      islandScale: 1.0,
      deploymentTrigger: 'hover',
      diaryName: 'MI DIARIO',
      userAvatar: '⚡',
      googleDriveLinked: false,
      syncConnected: true,
      extensionConfigs: {
        vault: {
          isConfigured: false,
          primaryPin: '',
          alternativePin: '',
          autoLockMinutes: 3,
          showPanicButton: true,
        },
        music: {
          waveformStyle: 'bars',
          detectSystemMedia: true,
          volume: 75,
        },
        stickers: {
          opacity: 100,
          lockPositions: false,
          defaultSize: 96,
        },
        clipboard: {
          autoCaptureSystem: true,
          maxHistory: 25,
          syncAcrossDevices: true,
        },
        chrono: {
          defaultFocusMinutes: 25,
          soundAlerts: true,
          timerPresets: [5, 10, 15, 25, 45, 60],
          alarmTone: 'cristal-bell',
          alarmVolume: 85,
        }
      }
    },
    extensions: DEFAULT_EXTENSIONS,
  };
}

const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cross_diary_sync_v4') : null;

export function saveDiaryState(state: DiaryState, broadcast = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (broadcast && syncChannel) {
      syncChannel.postMessage({ type: 'STATE_SYNC', payload: state });
    }
    if (typeof window !== 'undefined' && window.crossDiaryNative?.saveDiaryMeta && state.pairingCode) {
      window.crossDiaryNative.saveDiaryMeta({
        pairingCode: state.pairingCode,
        diaryId: state.diaryId,
        deviceId: (state.settings as any)?.deviceId || '',
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving diary state:', e);
  }
}

export function resetLocalDiaryStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('cross_diary_vault_unlocked');
    sessionStorage.clear();
  } catch (e) {
    console.error('Error resetting local diary storage:', e);
  }
}

export function subscribeToCrossDeviceSync(callback: (newState: DiaryState) => void): () => void {
  if (!syncChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'STATE_SYNC') {
      callback(event.data.payload);
    }
  };
  syncChannel.addEventListener('message', handler);
  return () => syncChannel.removeEventListener('message', handler);
}
