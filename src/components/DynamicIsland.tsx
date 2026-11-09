import React, { useState, useEffect, useRef } from 'react';
import {
  Pin,
  PinOff,
  Settings,
  Palette,
  LayoutGrid,
  Sun,
  Power,
  Search,
} from 'lucide-react';
import {
  Note,
  NoteSticker,
  FolderGroup,
  UserExtension,
  TabColor,
  ClipboardEntry,
  ExtensionConfigMap,
  ThemeId,
  DiarySettings,
  ResourceShare,
} from '../types/diary';
import { WheelFolderNavigator } from './WheelFolderNavigator';
import { NotionEditor } from './NotionEditor';
import { ExternalExtensionHub, VaultUnlockState } from './ExternalExtensionHub';
import { OnboardingView } from './OnboardingView';
import { FreeStickerLayer } from './FreeStickerLayer';
import { IslandSettingsView } from './IslandSettingsView';
import { ErrorBoundary } from './ErrorBoundary';
import { AdBanner } from './AdBanner';
import { GlobalSearchModal } from './GlobalSearchModal';

import { SupportedLang } from '../utils/i18n';
import { R2SyncStatus } from '../utils/r2Sync';

interface DynamicIslandProps {
  isInitialized: boolean;
  onCompleteNewDiary: (name: string, theme: ThemeId, icon: string, language?: SupportedLang) => void;
  onLinkExistingDiary: (code: string) => boolean | Promise<boolean>;
  r2Status?: R2SyncStatus;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  pairingCode: string;
  diaryId?: string;
  settings: DiarySettings;
  onUpdateSettings: (newSettings: Partial<DiarySettings>) => void;
  onCycleTheme: () => void;
  groups: FolderGroup[];
  notes: Note[];
  vaultNotes: Note[];
  decoyNotes: Note[];
  globalStickers: NoteSticker[];
  onUpdateGlobalStickers: (stickers: NoteSticker[]) => void;
  clipboardHistory: ClipboardEntry[];
  selectedGroupId: string;
  selectedNoteId: string | null;
  activeExternalExtensionId: string | null;
  onSelectGroup: (groupId: string) => void;
  onSelectNote: (noteId: string) => void;
  onSelectExternalExtension: (extId: string) => void;
  onUpdateNote: (updated: Partial<Note>) => void;
  onAddNewNote: (groupId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onAddGroup: (name: string, color: TabColor) => void;
  onAddVaultNote: (isDecoy: boolean) => void;
  onSelectVaultNote: (note: Note) => void;
  onDeleteVaultNote: (id: string, isDecoy: boolean) => void;
  onPanicLock: () => void;
  onAddClipboardEntry: (text: string, deviceName?: string) => void;
  onDeleteClipboardEntry: (id: string) => void;
  extensions: UserExtension[];
  extensionConfigs: ExtensionConfigMap;
  onUpdateExtensionConfig: <K extends keyof ExtensionConfigMap>(
    key: K,
    newConfig: Partial<ExtensionConfigMap[K]>
  ) => void;
  onToggleExtension: (id: string) => void;
  onSaveExtension: (ext: UserExtension) => void;
  onDeleteExtension: (id: string) => void;
  onReorderExtensions: (fromIndex: number, toIndex: number) => void;
  onResetDiary?: () => void;
  shares?: ResourceShare[];
  onUpdateShares?: (shares: ResourceShare[]) => void;
  onUpdateGroup?: (groupId: string, patch: Partial<FolderGroup>) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  isInitialized,
  onCompleteNewDiary,
  onLinkExistingDiary,
  r2Status = 'idle',
  isOpen,
  onToggleOpen,
  pairingCode,
  diaryId,
  settings,
  onUpdateSettings,
  onCycleTheme,
  groups,
  notes,
  vaultNotes,
  decoyNotes,
  globalStickers,
  onUpdateGlobalStickers,
  clipboardHistory,
  selectedGroupId,
  selectedNoteId,
  activeExternalExtensionId,
  onSelectGroup,
  onSelectNote,
  onSelectExternalExtension,
  onUpdateNote,
  onUpdateGroup,
  onAddNewNote,
  onDeleteNote,
  onAddGroup,
  onAddVaultNote,
  onSelectVaultNote,
  onDeleteVaultNote,
  onPanicLock,
  onAddClipboardEntry,
  onDeleteClipboardEntry,
  extensions,
  extensionConfigs,
  onUpdateExtensionConfig,
  onToggleExtension,
  onSaveExtension,
  onDeleteExtension,
  onReorderExtensions,
  onResetDiary,
  shares = [],
  onUpdateShares,
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [showExternalCompanion, setShowExternalCompanion] = useState(true);
  const [showInternalSettings, setShowInternalSettings] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [currentLang, setCurrentLang] = useState(() =>
    settings?.language || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es')
  );
  const isEnglish = currentLang === 'en';
  const [isGameActive, setIsGameActive] = useState(false);

  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Hover & tolerance management refs
  const isMouseInIslandRef = useRef(false);
  const isStickerActiveRef = useRef(false);
  const hideTimerRef = useRef<any>(null);
  const closeAnimTimerRef = useRef<any>(null);

  // Persistent Vault Auto-Lock State (survives hiding the Dynamic Island!)
  const [vaultMode, setVaultMode] = useState<VaultUnlockState>('locked');
  const [vaultUnlockExpiresAt, setVaultUnlockExpiresAt] = useState<number | null>(null);
  const [vaultSecondsLeft, setVaultSecondsLeft] = useState(0);

  const dockPosition = settings?.dockPosition || 'right';
  const triggerMode = settings?.deploymentTrigger || 'hover';

  const cancelPendingHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = null;
    }
    setIsClosing(false);
  };

  const scheduleHideIfOutside = () => {
    if (isPinned || !isInitialized) return;
    if (triggerMode === 'click') return; // In click mode, never auto-hide on mouse leave!
    if (isMouseInIslandRef.current || isStickerActiveRef.current) return;

    cancelPendingHide();
    // 350ms comfortable tolerance delay so crossing elements never causes accidental closing!
    hideTimerRef.current = setTimeout(() => {
      if (isMouseInIslandRef.current || isStickerActiveRef.current || isPinned) return;
      setIsClosing(true);
      closeAnimTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setShowInternalSettings(false);
        onToggleOpen(false);
      }, 125);
    }, 350);
  };

  useEffect(() => {
    if (settings?.language) setCurrentLang(settings.language);
  }, [settings?.language]);

  useEffect(() => {
    const handler = (e: any) => {
      const l = e.detail || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es');
      setCurrentLang(l);
    };
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  // Global search shortcut (Ctrl+K or Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setShowGlobalSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track fullscreen game status (Electron main process adjusts alwaysOnTop automatically)
  useEffect(() => {
    if (!window.crossDiaryNative?.onGameModeChange) return;
    return window.crossDiaryNative.onGameModeChange((gameRunning) => {
      setIsGameActive(gameRunning);
      if (gameRunning) {
        onToggleOpen(false);
      }
    });
  }, [onToggleOpen]);

  // Listen for cursor leaving interactive elements / window (e.g. moving mouse to another monitor)
  useEffect(() => {
    if (!window.crossDiaryNative?.onCursorInteractiveChange) return;
    return window.crossDiaryNative.onCursorInteractiveChange((isOver) => {
      if (!isOver) {
        isMouseInIslandRef.current = false;
        if (!isPinned && isInitialized && triggerMode === 'hover') {
          cancelPendingHide();
          setIsClosing(true);
          closeAnimTimerRef.current = setTimeout(() => {
            setIsClosing(false);
            setShowInternalSettings(false);
            onToggleOpen(false);
          }, 125);
        }
      }
    });
  }, [isPinned, isInitialized, triggerMode, onToggleOpen]);

  // Window blur and mouse leave listeners so switching monitors or windows auto-collapses island
  useEffect(() => {
    const handleWindowBlur = () => {
      isMouseInIslandRef.current = false;
      if (!isPinned && isInitialized && triggerMode === 'hover') {
        cancelPendingHide();
        setIsClosing(true);
        closeAnimTimerRef.current = setTimeout(() => {
          setIsClosing(false);
          setShowInternalSettings(false);
          onToggleOpen(false);
        }, 125);
      }
    };
    const handleDocMouseLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && !e.toElement) {
        isMouseInIslandRef.current = false;
        if (!isPinned && isInitialized && triggerMode === 'hover') {
          cancelPendingHide();
          setIsClosing(true);
          closeAnimTimerRef.current = setTimeout(() => {
            setIsClosing(false);
            setShowInternalSettings(false);
            onToggleOpen(false);
          }, 125);
        }
      }
    };
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('mouseleave', handleDocMouseLeave);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('mouseleave', handleDocMouseLeave);
    };
  }, [isPinned, isInitialized, triggerMode, onToggleOpen]);

  // Fast flick protection: after opening in hover mode, verify if cursor is actually still inside the island
  useEffect(() => {
    if (!isOpen || isPinned || !isInitialized || triggerMode !== 'hover') return;

    const timer = setTimeout(async () => {
      if (window.crossDiaryNative?.isCursorInsideWindow) {
        const isInside = await window.crossDiaryNative.isCursorInsideWindow();
        if (!isInside) {
          isMouseInIslandRef.current = false;
          cancelPendingHide();
          setIsClosing(true);
          closeAnimTimerRef.current = setTimeout(() => {
            setIsClosing(false);
            setShowInternalSettings(false);
            onToggleOpen(false);
          }, 125);
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, isPinned, isInitialized, triggerMode, onToggleOpen]);

  // If not initialized yet, ensure the Island stays permanently open so user sees the welcome screen!
  useEffect(() => {
    if (!isInitialized) {
      onToggleOpen(true);
    }
  }, [isInitialized, onToggleOpen]);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  // Persistent Vault countdown timer that continues even while the island is hidden
  useEffect(() => {
    if (vaultMode === 'locked' || !vaultUnlockExpiresAt) {
      setVaultSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((vaultUnlockExpiresAt - Date.now()) / 1000));
      setVaultSecondsLeft(remaining);
      if (remaining <= 0) {
        setVaultMode('locked');
        setVaultUnlockExpiresAt(null);
        onPanicLock();
      }
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [vaultMode, vaultUnlockExpiresAt, onPanicLock]);

  const handleUnlockVault = (mode: VaultUnlockState) => {
    setVaultMode(mode);
    if (mode === 'locked') {
      setVaultUnlockExpiresAt(null);
    } else {
      const durationMs = (extensionConfigs.vault.autoLockMinutes || 3) * 60 * 1000;
      setVaultUnlockExpiresAt(Date.now() + durationMs);
    }
  };

  const handleInstantPanic = () => {
    setVaultMode('locked');
    setVaultUnlockExpiresAt(null);
    onPanicLock();
  };

  const handleIslandMouseEnter = () => {
    isMouseInIslandRef.current = true;
    cancelPendingHide();
    if (!isOpen && triggerMode === 'hover') {
      onToggleOpen(true);
    }
  };

  const handleIslandMouseLeave = () => {
    isMouseInIslandRef.current = false;
    scheduleHideIfOutside();
  };

  const handleGuideMouseEnter = () => {
    if (triggerMode === 'hover') {
      isMouseInIslandRef.current = true;
      cancelPendingHide();
      if (!isOpen) onToggleOpen(true);
    }
  };

  const handleGuideClick = () => {
    if (!isOpen) {
      isMouseInIslandRef.current = true;
      cancelPendingHide();
      onToggleOpen(true);
    } else {
      // Toggle closed
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        onToggleOpen(false);
      }, 125);
    }
  };

  const handleStickerActivityChange = (active: boolean) => {
    isStickerActiveRef.current = active;
    if (active) {
      cancelPendingHide();
    } else {
      scheduleHideIfOutside();
    }
  };

  const allPossibleNotes = [...notes, ...vaultNotes, ...decoyNotes];
  const currentNote =
    allPossibleNotes.find((n) => n.id === selectedNoteId) || notes[0] || null;

  const enabledExtensions = extensions.filter((e) => e.enabled && e.installed);
  const activeExt =
    enabledExtensions.find((e) => e.id === activeExternalExtensionId) ||
    enabledExtensions[0] ||
    extensions[0];

  const handlePasteSticker = (dataUrl: string) => {
    const pasted: NoteSticker = {
      id: 'stk-' + Date.now(),
      name: 'Imagen Pegada',
      url: dataUrl,
      x: Math.max(80, window.innerWidth - 480),
      y: 180,
      width: extensionConfigs.stickers.defaultSize || 110,
      rotation: 0,
    };
    onUpdateGlobalStickers([...globalStickers, pasted]);
  };

  const islandAnimClass =
    dockPosition === 'top'
      ? isClosing
        ? 'animate-island-top-out'
        : 'animate-island-top'
      : dockPosition === 'bottom'
      ? isClosing
        ? 'animate-island-bottom-out'
        : 'animate-island-bottom'
      : dockPosition === 'right'
      ? isClosing
        ? 'animate-island-right-out'
        : 'animate-island-right'
      : isClosing
      ? 'animate-island-left-out'
      : 'animate-island-left';

  const isVerticalDock = dockPosition === 'top' || dockPosition === 'bottom';

  if (isGameActive) {
    return null;
  }

  return (
    <>
      {/* FREE STICKERS LAYER: Animates in and out TOGETHER with the Dynamic Island! */}
      {isOpen && isInitialized && (
        <FreeStickerLayer
          stickers={globalStickers}
          onUpdateStickers={onUpdateGlobalStickers}
          settings={extensionConfigs.stickers}
          onStickerActivityChange={handleStickerActivityChange}
          transitionClass={islandAnimClass}
          isEditing={activeExt?.id === 'ext-stickers' && isOpen}
        />
      )}

      {/* OUTER CONTAINER IS pointer-events-none SO EMPTY DESKTOP AREAS ARE NEVER BLOCKED! */}
      <div
        className={`fixed z-50 pointer-events-none ${
          dockPosition === 'top'
            ? 'top-0 left-0 right-0 flex flex-col items-center'
            : dockPosition === 'bottom'
            ? 'bottom-0 left-0 right-0 flex flex-col-reverse items-center'
            : dockPosition === 'right'
            ? 'top-0 bottom-0 right-0 flex items-center'
            : 'top-0 bottom-0 left-0 flex items-center'
        }`}
      >
        {/* EXPANDED DYNAMIC ISLAND ON THE DESKTOP (Separated animation & scale so scale is 100% robust) */}
        {isOpen && (
          <div className={`max-h-[96vh] max-w-[98vw] pointer-events-none ${islandAnimClass}`}>
            <div
              style={{
                zoom: settings.islandScale || 1.0,
              }}
              className={`flex items-start gap-2.5 pointer-events-none ${
                dockPosition === 'right'
                  ? 'flex-row'
                  : dockPosition === 'left'
                  ? 'flex-row-reverse'
                  : 'flex-row justify-center'
              }`}
            >
              {/* 1. EXTERNAL EXTENSION COMPANION MODULE (Only its own height captures mouse events; empty desktop below it is click-through!) */}
            {isInitialized && showExternalCompanion && activeExt && (
              <div
                data-interactive="true"
                onMouseEnter={handleIslandMouseEnter}
                onMouseLeave={handleIslandMouseLeave}
                className="w-[340px] flex flex-col gap-3 shrink-0 justify-start self-start pointer-events-auto p-2 -m-2"
              >
                {/* Clock & Status Pill */}
                <div
                  className="rounded-[24px] p-3.5 flex items-center justify-between transition-all"
                  style={{
                    background: 'var(--bg-card)',
                    border: '2.5px solid var(--border-strong)',
                    boxShadow: 'var(--pill-shadow)',
                  }}
                >
                  <div>
                    <div
                      className="text-3xl font-display-brutal leading-none tracking-tighter"
                      style={{ color: 'var(--accent)' }}
                    >
                      {currentTime}
                    </div>
                    <div className="text-[10px] font-dot-matrix font-bold uppercase tracking-widest mt-1 opacity-75">
                      {new Date().toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div
                    className="w-32 min-w-[128px] max-w-[128px] shrink-0 px-3 py-1.5 rounded-2xl text-right font-dot-matrix select-none"
                    style={{
                      background: 'var(--bg-pill)',
                      color: 'var(--accent-fg)',
                    }}
                  >
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1 justify-end truncate">
                      <Sun size={12} className={r2Status === 'syncing' ? 'animate-spin' : ''} />
                      <span className="truncate">
                        {r2Status === 'syncing'
                          ? (isEnglish ? 'SYNCING' : 'SINCRONIZA')
                          : (isEnglish ? 'ONLINE' : 'EN LÍNEA')}
                      </span>
                    </div>
                    <div className="text-[9px] opacity-85 uppercase truncate">
                      {vaultMode !== 'locked'
                        ? `${isEnglish ? 'VAULT' : 'BÓVEDA'} ${Math.floor(vaultSecondsLeft / 60)}:${String(
                            vaultSecondsLeft % 60
                          ).padStart(2, '0')}`
                        : (isEnglish ? 'ACTIVE' : 'ACTIVO')}
                    </div>
                  </div>
                </div>

                {/* External Extension Widget */}
                <ExternalExtensionHub
                  activeExtension={activeExt}
                  allExtensions={extensions}
                  onSelectExtension={onSelectExternalExtension}
                  currentNote={currentNote}
                  onUpdateNote={onUpdateNote}
                  globalStickers={globalStickers}
                  onUpdateGlobalStickers={onUpdateGlobalStickers}
                  vaultNotes={vaultNotes}
                  decoyNotes={decoyNotes}
                  vaultMode={vaultMode}
                  vaultSecondsLeft={vaultSecondsLeft}
                  onUnlockVault={handleUnlockVault}
                  onAddVaultNote={onAddVaultNote}
                  onSelectVaultNote={onSelectVaultNote}
                  onDeleteVaultNote={onDeleteVaultNote}
                  onPanicLock={handleInstantPanic}
                  clipboardHistory={clipboardHistory}
                  onAddClipboardEntry={onAddClipboardEntry}
                  onDeleteClipboardEntry={onDeleteClipboardEntry}
                  extensionConfigs={extensionConfigs}
                  onUpdateExtensionConfig={onUpdateExtensionConfig}
                  language={currentLang}
                />
              </div>
            )}

            {/* 2. MAIN DYNAMIC ISLAND CARD (Mobile Proportions ~412px x 88vh) */}
            <div
              data-interactive="true"
              onMouseEnter={handleIslandMouseEnter}
              onMouseLeave={handleIslandMouseLeave}
              className="w-[412px] h-[88vh] max-h-[860px] flex flex-col overflow-hidden transition-all duration-200 relative self-start pointer-events-auto"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderRadius: 'var(--card-radius)',
                border: '3px solid var(--border-strong)',
                boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.42), var(--pill-shadow)',
              }}
            >
              {/* IF NOT INITIALIZED: RENDER WELCOME / ONBOARDING SCREEN INSIDE THE DYNAMIC ISLAND! */}
              {!isInitialized ? (
                <OnboardingView
                  onCompleteNewDiary={onCompleteNewDiary}
                  onLinkExistingDiary={onLinkExistingDiary}
                />
              ) : (
                <>
                  {/* Top Pill Header */}
                  <div
                    className="px-3 py-2.5 flex items-center justify-between gap-2 border-b-2 shrink-0"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div
                      onClick={() => setShowInternalSettings(false)}
                      className="px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-display-brutal uppercase tracking-wider truncate max-w-[175px] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--accent-fg)',
                        boxShadow: 'var(--pill-shadow)',
                      }}
                    >
                      {settings.userAvatar?.startsWith('data:image/') || settings.userAvatar?.startsWith('http') ? (
                        <img src={settings.userAvatar} alt="avatar" className="w-4 h-4 rounded-full object-cover inline-block shrink-0" />
                      ) : (
                        <span>{settings.userAvatar || '⚡'}</span>
                      )}
                      <span className="truncate">{settings.diaryName || 'DIARIO'}</span>
                    </div>

                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-full border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-color)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowExternalCompanion(!showExternalCompanion)}
                        className="p-1 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: showExternalCompanion ? 'var(--bg-pill)' : 'transparent',
                          color: showExternalCompanion ? 'var(--accent-fg)' : 'var(--text-main)',
                        }}
                        title={
                          showExternalCompanion
                            ? (isEnglish ? 'Hide external companion' : 'Ocultar complemento externo')
                            : (isEnglish ? 'Show external companion' : 'Mostrar complemento externo')
                        }
                      >
                        <LayoutGrid size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={onCycleTheme}
                        className="p-1 rounded-full hover:scale-110 transition-transform"
                        style={{ color: 'var(--accent)' }}
                        title={isEnglish ? "Change theme" : "Cambiar diseño estético"}
                      >
                        <Palette size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPinned(!isPinned)}
                        className="p-1 rounded-full hover:scale-110 transition-transform"
                        style={{
                          color: isPinned ? 'var(--accent)' : 'var(--text-main)',
                        }}
                        title={isPinned ? (isEnglish ? 'Unpin island' : 'Desfijar isla lateral') : (isEnglish ? 'Pin island open' : 'Fijar isla abierta')}
                      >
                        {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowGlobalSearch(true)}
                        className="p-1 rounded-full hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: showGlobalSearch ? 'var(--bg-pill)' : 'transparent',
                          color: showGlobalSearch ? 'var(--accent-fg)' : 'var(--text-main)',
                        }}
                        title={isEnglish ? "Global search (Ctrl+K)" : "Búsqueda global en notas y carpetas (Ctrl+K)"}
                      >
                        <Search size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowInternalSettings(!showInternalSettings)}
                        className="p-1 rounded-full hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: showInternalSettings ? 'var(--bg-pill)' : 'transparent',
                          color: showInternalSettings ? 'var(--accent-fg)' : 'var(--text-main)',
                        }}
                        title={isEnglish ? "General Settings & Extensions" : "Ajustes Generales y Extensiones (dentro de la Isla)"}
                      >
                        <Settings size={13} />
                      </button>

                      {window.crossDiaryNative?.quitApp && (
                        <button
                          type="button"
                          onClick={() => window.crossDiaryNative?.quitApp()}
                          className="p-1 rounded-full hover:text-red-500 hover:scale-110 transition-transform"
                          title={isEnglish ? "Quit Cross-Diary" : "Cerrar Cross-Diary"}
                        >
                          <Power size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* IF GENERAL SETTINGS OPEN: RENDER GENERAL SETTINGS DIRECTLY INSIDE THE DYNAMIC ISLAND! */}
                  {showInternalSettings ? (
                    <ErrorBoundary fallbackTitle={isEnglish ? "General Settings" : "Ajustes Generales"} language={currentLang} onReset={() => setShowInternalSettings(false)}>
                      <IslandSettingsView
                        onClose={() => setShowInternalSettings(false)}
                        pairingCode={pairingCode}
                        diaryId={diaryId}
                        settings={settings}
                        onUpdateSettings={onUpdateSettings}
                        onUpdateExtensionConfig={onUpdateExtensionConfig}
                        onLinkRemoteCode={onLinkExistingDiary}
                        extensions={extensions}
                        onToggleExtension={onToggleExtension}
                        onSaveExtension={onSaveExtension}
                        onDeleteExtension={onDeleteExtension}
                        onReorderExtensions={onReorderExtensions}
                        onResetDiary={onResetDiary}
                      />
                    </ErrorBoundary>
                  ) : (
                    <>
                      {/* MOUSE WHEEL FOLDER & SHEET NAVIGATOR */}
                      <WheelFolderNavigator
                        groups={groups}
                        notes={notes}
                        selectedGroupId={selectedGroupId}
                        selectedNoteId={selectedNoteId}
                        onSelectGroup={onSelectGroup}
                        onSelectNote={onSelectNote}
                        onAddNote={(gid) => onAddNewNote(gid)}
                        onDeleteNote={onDeleteNote}
                        onAddGroup={onAddGroup}
                        onUpdateGroup={onUpdateGroup}
                        onUpdateNote={(noteId, patch) => onUpdateNote({ ...patch, id: noteId })}
                        shares={shares}
                        onUpdateShares={onUpdateShares}
                        pinnedItems={settings.pinnedNotificationItems || []}
                        onUpdatePinnedItems={(nextPinned) =>
                          onUpdateSettings({
                            pinnedNotificationItems: nextPinned,
                            mobileNotificationOption:
                              nextPinned.length > 0 && (!settings.mobileNotificationOption || settings.mobileNotificationOption === 'none')
                                ? 'pinned_items'
                                : settings.mobileNotificationOption,
                          })
                        }
                        language={currentLang}
                      />

                      {/* MAIN SHEET WRITING CANVAS */}
                      <NotionEditor
                        note={currentNote}
                        onUpdateNote={(patch) => onUpdateNote({ ...patch, id: currentNote?.id || patch.id })}
                        onUpdateGroup={onUpdateGroup}
                        onPasteImageSticker={handlePasteSticker}
                        showPanicButton={extensionConfigs.vault.showPanicButton}
                        onPanicLock={handleInstantPanic}
                        chronoSettings={extensionConfigs.chrono}
                        shares={shares}
                        onUpdateShares={onUpdateShares}
                        groups={groups}
                        allNotes={notes}
                        pinnedItems={settings.pinnedNotificationItems || []}
                        onUpdatePinnedItems={(nextPinned) =>
                          onUpdateSettings({
                            pinnedNotificationItems: nextPinned,
                            mobileNotificationOption:
                              nextPinned.length > 0 && (!settings.mobileNotificationOption || settings.mobileNotificationOption === 'none')
                                ? 'pinned_items'
                                : settings.mobileNotificationOption,
                          })
                        }
                        language={currentLang}
                      />

                      {/* BOTTOM AD BANNER (Desktop view) */}
                      <AdBanner containerClassName="shrink-0 p-2 border-t border-[var(--border-color)] bg-[var(--bg-card)]" />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        )}

        {/* SLEEK EDGE GUIDE BAR (Hidden automatically when in Fullscreen/Borderless Game Mode) */}
        {!isGameActive && (
          <div
            data-interactive="true"
            onMouseEnter={handleGuideMouseEnter}
            onMouseLeave={handleIslandMouseLeave}
            onClick={handleGuideClick}
            className={`flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-200 z-50 ${
              isVerticalDock
                ? dockPosition === 'top'
                  ? 'order-first h-3.5 w-64 pt-0.5'
                  : 'order-first h-3.5 w-64 pb-0.5'
                : dockPosition === 'right'
                ? 'order-last justify-end pr-0.5 h-64 w-3.5'
                : 'order-first justify-start pl-0.5 h-64 w-3.5'
            }`}
            title={
              triggerMode === 'click'
                ? isOpen
                  ? (isEnglish ? 'Click to close Dynamic Island' : 'Clic para cerrar Isla Dinámica')
                  : (isEnglish ? 'Click to expand Dynamic Island' : 'Clic para desplegar tu Isla Dinámica')
                : (isEnglish ? 'Hover over guide to expand Dynamic Island' : 'Pasa el cursor por la guía para desplegar tu Isla Dinámica')
            }
          >
            <div
              className={`rounded-full transition-all duration-200 ${
                isVerticalDock
                  ? `h-[4.5px] ${isOpen ? 'w-36 opacity-90' : 'w-28 opacity-75 hover:opacity-100 hover:h-2 hover:w-36'}`
                  : `w-[4.5px] ${isOpen ? 'h-36 opacity-90' : 'h-28 opacity-75 hover:opacity-100 hover:w-2 hover:h-36'}`
              }`}
              style={{
                backgroundColor: 'var(--bg-pill)',
                boxShadow: 'var(--pill-shadow)',
              }}
            />
          </div>
        )}
      </div>

      {/* GLOBAL SEARCH MODAL (Desktop) */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        diary={{
          isInitialized,
          diaryId: 'local',
          pairingCode,
          groups,
          notes,
          vaultNotes,
          decoyNotes,
          globalStickers,
          clipboardHistory,
          selectedGroupId,
          selectedNoteId,
          activeExternalExtensionId,
          settings,
          extensions,
          shares,
        }}
        onSelectGroup={onSelectGroup}
        onSelectNote={onSelectNote}
        language={currentLang}
      />
    </>
  );
};
