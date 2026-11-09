import {
  Note,
  NoteSticker,
  ClipboardEntry,
  ExtensionConfigMap,
  UserExtension,
} from '../types/diary';

export type VaultUnlockState = 'locked' | 'primary' | 'decoy';

export interface ExtensionProps {
  currentNote: Note | null;
  onUpdateNote: (updated: Partial<Note>) => void;
  globalStickers: NoteSticker[];
  onUpdateGlobalStickers: (stickers: NoteSticker[]) => void;
  vaultNotes: Note[];
  decoyNotes: Note[];
  vaultMode: VaultUnlockState;
  vaultSecondsLeft: number;
  onUnlockVault: (mode: VaultUnlockState) => void;
  onAddVaultNote: (isDecoy: boolean) => void;
  onSelectVaultNote: (note: Note) => void;
  onDeleteVaultNote: (id: string, isDecoy: boolean) => void;
  onPanicLock: () => void;
  clipboardHistory: ClipboardEntry[];
  onAddClipboardEntry: (text: string, deviceName?: string) => void;
  onDeleteClipboardEntry: (id: string) => void;
  extensionConfigs: ExtensionConfigMap;
  onUpdateExtensionConfig: <K extends keyof ExtensionConfigMap>(
    key: K,
    newConfig: Partial<ExtensionConfigMap[K]>
  ) => void;
  allExtensions: UserExtension[];
  onSelectExtension: (extId: string) => void;
  language?: string;
}

export interface ExtensionModule {
  id: string;
  name: string;
  renderWidget: (props: ExtensionProps) => React.ReactNode;
}
