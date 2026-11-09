export type TabColor =
  | '#FF2E00' // Vermilion Pulse
  | '#FF5C93' // Berry Mochi
  | '#00E5FF' // Volt Cyan
  | '#10B981' // Emerald Flux
  | '#F59E0B' // Solar Oxide
  | '#8B5CF6' // Amethyst
  | '#EC4899' // Magenta
  | '#3B82F6'; // Cobalt

export type ThemeId =
  | 'solar-flare'   // Vermilion Pulse // 01 (Crisp White + #FF2E00 + Carbon Ink)
  | 'milk-sakura'   // Mochi Cream & Berry (Pastel Pink + Cream + Bubbly)
  | 'velvet-nebula' // Amethyst Horizon (Deep Dark + Luminous Orchid)
  | 'amber-oxide'   // Phosphor Oxide 84 (Retro Charcoal + Molten Amber + Hard Shadow)
  | 'cyber-mirage'; // Acid Mirage (Abyssal Night + Laser Crimson + Volt Cyan)

export interface NoteSticker {
  id: string;
  url: string;
  name: string;
  x: number;        // px from left of viewport
  y: number;        // px from top of viewport
  width: number;    // px width (default 95)
  rotation: number; // degrees (-180 to 180)
  flipX?: boolean;
}

export type NoteWidgetType =
  | 'clock'
  | 'timer'
  | 'stopwatch'
  | 'spreadsheet'
  | 'drawing'
  | 'checklist'
  | 'image';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteWidgetBlock {
  id: string;
  type: NoteWidgetType;
  title: string;
  shape?: 'wide' | 'square';
  align?: 'left' | 'right' | 'center'; // Word/Office text-wrap alignment
  imageUrl?: string;                  // For pasted/inserted image blocks
  transparentBg?: boolean;
  strokeColor?: string;
  timerDurationMinutes?: number;
  timerDurationSeconds?: number;
  timerTargetEndTime?: number;        // Global epoch ms for un-pausable background countdown
  timerIsRunning?: boolean;
  timerSecondsLeft?: number;
  stopwatchMs?: number;
  gridData?: string[][];
  drawingDataUrl?: string;
  checklistItems?: ChecklistItem[];
}

export type NoteResetMode = 'none' | 'daily' | 'weekly' | 'monthly' | 'manual';

export interface ShareAccessDevice {
  deviceId: string;
  deviceName?: string;
  platform?: 'windows' | 'android' | 'web';
  ip?: string;
  connectedAt: string;
  lastAccess?: string;
}

export interface ResourceShare {
  id: string;
  code: string; // e.g. "SH-8K2P9A"
  targetType: 'sheet' | 'folder';
  targetId: string; // note.id or group.id
  targetName: string; // note.title or group.name
  permission: 'read' | 'read_write';
  createdAt: string;
  revoked: boolean;
  accessibleSheetIds: string[];
  connectedDevices: ShareAccessDevice[];
}

export interface Note {
  id: string;
  groupId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  color?: string;
  tags?: string[];
  stickers?: NoteSticker[];
  widgets?: NoteWidgetBlock[];
  resetMode?: NoteResetMode;
  lastResetDate?: string;
  isVault?: boolean;
  isDecoy?: boolean;
}

export interface FolderGroup {
  id: string;
  name: string;
  color: TabColor;
  icon?: string;
  collapsed?: boolean;
  isVaultGroup?: boolean;
}

export interface ClipboardEntry {
  id: string;
  text: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile';
  timestamp: string;
  pinned?: boolean;
}

export interface VaultSettings {
  isConfigured?: boolean;  // False until user sets their own key for the first time
  primaryPin: string;      // Any numeric key chosen by the user
  alternativePin: string;  // Any alternative numeric key (shows decoy list)
  autoLockMinutes: number; // Minutes before auto-lock
  showPanicButton: boolean;// Corner panic button to instantly lock
}

export interface MusicSettings {
  waveformStyle: 'bars' | 'dots' | 'mirror';
  detectSystemMedia: boolean;
  volume: number;
}

export interface StickerSettings {
  opacity: number;
  lockPositions: boolean;
  defaultSize?: number;
  customPack?: Array<{ id: string; name: string; url: string }>;
}

export interface ClipboardSettings {
  autoCaptureSystem: boolean;
  maxHistory: number;
  syncAcrossDevices: boolean;
}

export type AlarmToneId =
  | 'cyber-beep'
  | 'cristal-bell'
  | 'arcade-up'
  | 'soft-chime'
  | 'custom';

export interface ChronoSettings {
  defaultFocusMinutes: number;
  soundAlerts: boolean;
  timerPresets: number[];
  alarmTone?: AlarmToneId;
  customAlarmDataUrl?: string;
  customAlarmName?: string;
  alarmVolume?: number;
}

export interface ExtensionConfigMap {
  vault: VaultSettings;
  music: MusicSettings;
  stickers: StickerSettings;
  clipboard: ClipboardSettings;
  chrono: ChronoSettings;
  [key: string]: any;
}

export type BuiltinExtensionType =
  | 'music_waveform'
  | 'note_widgets'
  | 'chrono_calc'
  | 'calculator_pro'
  | 'sticker_studio'
  | 'clipboard_hub'
  | 'vault_boveda'
  | 'custom';

export interface UserExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  type: BuiltinExtensionType;
  target: 'external_dock' | 'note_overlay';
  enabled: boolean;
  installed: boolean;
  code?: string;
  settings?: Record<string, any>;
}

export interface PinnedNotificationItem {
  type: 'sheet' | 'folder';
  id: string;
}

export interface DiarySettings {
  language?: 'es' | 'en' | 'pt' | 'ja' | 'fr';
  mobileNotificationOption?: 'pinned_items' | 'live_clipboard' | 'recent_3_sheets' | 'pinned_sheet' | 'none';
  pinnedSheetId?: string;
  pinnedNotificationItems?: PinnedNotificationItem[]; // Up to 3 pinned sheets or folders for quick notification access
  quickAccessExtensionId?: string; // Pinned extension for quick bottom bar slot
  theme: ThemeId;
  targetMonitor?: 'primary' | 'all' | string;
  customCss: string;
  autostart: boolean;
  dockPosition: 'top' | 'bottom' | 'left' | 'right';
  islandScale?: number;               // Scale factor keeping fixed mobile aspect ratio (0.75 - 1.35)
  deploymentTrigger?: 'hover' | 'click'; // Deployment: hover guide vs click guide
  fontFamily?: 'default' | 'brutalist' | 'dot-matrix' | 'serif' | 'cyber-mono' | 'kawaii-hand';
  borderRadius?: 'sharp' | 'modern' | 'island' | 'super-curved';
  customAccentColor?: string;
  diaryName: string;
  userAvatar: string;
  googleDriveLinked: boolean;
  googleDriveEmail?: string;
  syncConnected: boolean;
  extensionConfigs: ExtensionConfigMap;
}

export interface DiaryState {
  isInitialized: boolean;
  diaryId: string;
  pairingCode: string;
  updatedAt?: string;
  groups: FolderGroup[];
  notes: Note[];
  vaultNotes: Note[];
  decoyNotes: Note[];
  globalStickers: NoteSticker[];
  clipboardHistory: ClipboardEntry[];
  selectedNoteId: string | null;
  selectedGroupId: string;
  activeExternalExtensionId: string | null;
  settings: DiarySettings;
  extensions: UserExtension[];
  shares?: ResourceShare[];
  pendingDeletion?: {
    pairingCode: string;
    diaryId: string;
    deviceId?: string;
    requestedAt: string;
    expiresAt: string;
    status: 'pending_deletion';
  };
}

declare global {
  interface Window {
    crossDiaryNative?: {
      isDesktopApp: boolean;
      setIgnoreMouseEvents: (ignore: boolean) => void;
      sendInteractiveBounds?: (bounds: Array<{ x: number; y: number; width: number; height: number }>) => void;
      getNowPlaying: () => Promise<{
        found: boolean;
        title?: string;
        artist?: string;
        status?: string;
        source?: string;
        peak?: number;
        thumbnail?: string;
      }>;
      controlMedia: (
        action: 'playPause' | 'next' | 'prev' | 'seekForward' | 'seekBackward'
      ) => Promise<any>;
      onSystemMediaChanged?: (callback: (data: any) => void) => () => void;
      getSystemClipboard?: () => Promise<string>;
      writeSystemClipboard?: (text: string) => Promise<boolean>;
      onSystemClipboardChanged?: (callback: (text: string) => void) => () => void;
      onGameModeChange?: (callback: (isGame: boolean) => void) => () => void;
      onCursorInteractiveChange?: (callback: (isOver: boolean) => void) => () => void;
      isCursorInsideWindow?: () => Promise<boolean>;
      onOpenIsland?: (callback: () => void) => () => void;
      getDisplays?: () => Promise<any[]>;
      setTargetMonitor?: (target: string) => Promise<boolean>;
      getDeviceName?: () => Promise<string>;
      saveDiaryMeta?: (meta: { pairingCode: string; diaryId: string; deviceId?: string }) => Promise<boolean>;
      scheduleUninstallDeletion?: () => Promise<{ success: boolean; expiresAt?: string; error?: string }>;
      deleteLocalData?: () => Promise<boolean>;
      setAutostart?: (enable: boolean) => Promise<boolean>;
      getAutostart?: () => Promise<boolean>;
      getLocalIp?: () => Promise<string>;
      getLanServerInfo?: () => Promise<{ ip: string; port: number }>;
      onLanSyncReceived?: (callback: (data: any) => void) => () => void;
      quitApp: () => void;
    };
  }
}
