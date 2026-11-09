import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Boxes,
  Settings,
  Plus,
  Search,
  Bell,
  FolderPlus,
  MoreVertical,
  Pin,
  Sparkles,
  Share2,
} from 'lucide-react';
import {
  DiaryState,
  Note,
  NoteSticker,
  FolderGroup,
  VaultUnlockState,
  DiarySettings,
  ResourceShare,
  PinnedNotificationItem,
} from '../types/diary';
import { LANGUAGES } from '../utils/i18n';
import { AdBanner } from './AdBanner';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ShareAndSettingsModal } from './ShareAndSettingsModal';
import { MobileAdBanner } from './MobileAdBanner';
import { MobileNotificationModal, MobileNotificationType } from './MobileNotificationModal';
import { QRScannerModal } from './QRScannerModal';
import { IslandSettingsView } from './IslandSettingsView';
import { ErrorBoundary } from './ErrorBoundary';
import { NotionEditor } from './NotionEditor';
import { ExtensionsHubView } from './ExtensionsHubView';
import { NewFolderModal } from './NewFolderModal';
import { NoteActionModal } from './NoteActionModal';
import { OnboardingView } from './OnboardingView';
import { FreeStickerLayer } from './FreeStickerLayer';
import { getExtensionIcon } from '../extensions/registry';
import {
  syncMobileNotification,
  registerNotificationNavigationHandler,
} from '../utils/mobileNotifications';

interface MobileDiaryAppProps {
  diary: DiaryState;
  onUpdateSettings: (newSettings: Partial<DiarySettings>) => void;
  onAddNewNote: (groupId?: string) => Note;
  onUpdateNote: (note: Partial<Note>) => void;
  onSelectNote?: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAddGroup: (name: string, color: string) => FolderGroup;
  onPanicLock: () => void;
  onAddVaultNote: (title: string, content: string) => Note;
  onDeleteVaultNote: (id: string) => void;
  onAddClipboardEntry: (text: string) => void;
  onDeleteClipboardEntry: (id: string) => void;
  onCompleteNewDiary: (name: string, theme: any, icon: string, lang?: any) => void;
  onLinkExistingDiary: (code: string) => boolean | Promise<boolean>;
  globalStickers: NoteSticker[];
  onUpdateGlobalStickers: (stickers: NoteSticker[]) => void;
  r2Status?: string;
  onResetDiary?: () => void;
  onUpdateShares?: (shares: ResourceShare[]) => void;
  onUpdateGroup?: (groupId: string, patch: Partial<FolderGroup>) => void;
}

type MobileTab = 'notes' | 'extensions' | 'quick_extension' | 'settings';

export const MobileDiaryApp: React.FC<MobileDiaryAppProps> = ({
  diary,
  onUpdateSettings,
  onAddNewNote,
  onUpdateNote,
  onSelectNote,
  onDeleteNote,
  onAddGroup,
  onPanicLock,
  onAddVaultNote,
  onDeleteVaultNote,
  onAddClipboardEntry,
  onDeleteClipboardEntry,
  onCompleteNewDiary,
  onLinkExistingDiary,
  globalStickers,
  onUpdateGlobalStickers,
  r2Status,
  onResetDiary,
  onUpdateShares,
  onUpdateGroup,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('notes');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(diary.groups[0]?.id || 'grp-main');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [shareFolderGroup, setShareFolderGroup] = useState<FolderGroup | null>(null);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [actionNote, setActionNote] = useState<Note | null>(null);
  const [vaultMode, setVaultMode] = useState<VaultUnlockState>('locked');

  const currentLang = diary.settings.language || 'es';
  const isEnglish = currentLang === 'en';
  const t = LANGUAGES[currentLang] || LANGUAGES.es;

  // Music extension is excluded from mobile per user request
  const mobileExtensions = useMemo(() => {
    return diary.extensions.filter((e) => e.id !== 'ext-music' && e.type !== 'music_waveform');
  }, [diary.extensions]);

  const rawPinnedId = diary.settings.quickAccessExtensionId || 'ext-stickers';
  const pinnedExtId = rawPinnedId === 'ext-music' ? 'ext-stickers' : rawPinnedId;
  const pinnedExtension = mobileExtensions.find((e) => e.id === pinnedExtId) || mobileExtensions[0];

  // Long press timer refs
  const touchTimerRef = useRef<any>(null);
  const folderTouchTimerRef = useRef<any>(null);
  const didFolderLongPressRef = useRef<boolean>(false);

  // Register navigation from Android Quick-Access Notification
  useEffect(() => {
    registerNotificationNavigationHandler((item) => {
      setActiveTab('notes');
      if (item.type === 'sheet') {
        setActiveNoteId(item.id);
        onSelectNote?.(item.id);
      } else if (item.type === 'folder') {
        setActiveNoteId(null);
        setSelectedGroupId(item.id);
      }
    });
  }, [onSelectNote]);

  // Native Android Hardware / Gesture Back Button Handling
  useEffect(() => {
    let unlisten: any = null;
    const registerBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        unlisten = await CapApp.addListener('backButton', () => {
          // 1. Close open modals first
          if (showQRScanner) {
            setShowQRScanner(false);
            return;
          }
          if (showNotificationModal) {
            setShowNotificationModal(false);
            return;
          }
          if (isNewFolderModalOpen) {
            setIsNewFolderModalOpen(false);
            return;
          }
          if (actionNote) {
            setActionNote(null);
            return;
          }

          // 2. If inside a note, return to notes list
          if (activeNoteId) {
            setActiveNoteId(null);
            return;
          }

          // 3. If in another tab, return to notes tab
          if (activeTab !== 'notes') {
            setActiveTab('notes');
            return;
          }

          // 4. At root notes list, exit app
          CapApp.exitApp();
        });
      } catch {
        // Not running on Capacitor native platform
      }
    };

    registerBackButton();
    return () => {
      if (unlisten && typeof unlisten.remove === 'function') {
        unlisten.remove();
      }
    };
  }, [
    showQRScanner,
    showNotificationModal,
    isNewFolderModalOpen,
    actionNote,
    activeNoteId,
    activeTab,
  ]);

  // Keep mobile notifications up-to-date with Android notification shade (Debounced, never while typing!)
  useEffect(() => {
    if (!diary.isInitialized || !diary.settings.mobileNotificationOption) return;
    if (activeNoteId) return; // Do NOT notify or interrupt while actively writing!

    const timer = setTimeout(() => {
      syncMobileNotification(diary);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    diary.isInitialized,
    diary.settings.mobileNotificationOption,
    diary.settings.pinnedSheetId,
    diary.settings.pinnedNotificationItems,
    diary.clipboardHistory,
    activeNoteId,
  ]);

  if (!diary.isInitialized) {
    return (
      <div className="h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col overflow-hidden">
        <OnboardingView
          onCompleteNewDiary={onCompleteNewDiary}
          onLinkExistingDiary={onLinkExistingDiary}
        />
      </div>
    );
  }

  const activeNote = diary.notes.find((n) => n.id === activeNoteId);

  // Filtered notes in selected group
  const filteredNotes = diary.notes
    .filter((n) => !selectedGroupId || n.groupId === selectedGroupId)
    .filter((n) =>
      searchQuery.trim()
        ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const handleCreateNewNote = () => {
    const newNote = onAddNewNote(selectedGroupId);
    setActiveNoteId(newNote.id);
  };

  const handleNotificationOptionSelected = (
    opt: MobileNotificationType,
    nextPinned?: PinnedNotificationItem[]
  ) => {
    onUpdateSettings({
      mobileNotificationOption: opt,
      pinnedNotificationItems: nextPinned ?? (diary.settings.pinnedNotificationItems || []),
    });
  };

  const handleUpdatePinnedItems = (nextPinned: PinnedNotificationItem[]) => {
    onUpdateSettings({
      pinnedNotificationItems: nextPinned,
      mobileNotificationOption:
        nextPinned.length > 0 &&
        (!diary.settings.mobileNotificationOption || diary.settings.mobileNotificationOption === 'none')
          ? 'pinned_items'
          : diary.settings.mobileNotificationOption,
    });
  };

  const handleFolderPressStart = (grp: FolderGroup) => {
    didFolderLongPressRef.current = false;
    if (folderTouchTimerRef.current) clearTimeout(folderTouchTimerRef.current);
    folderTouchTimerRef.current = setTimeout(() => {
      didFolderLongPressRef.current = true;
      setShareFolderGroup(grp);
    }, 480);
  };

  const handleFolderPressEnd = () => {
    if (folderTouchTimerRef.current) {
      clearTimeout(folderTouchTimerRef.current);
      folderTouchTimerRef.current = null;
    }
  };

  const handlePinQuickExtension = (extId: string) => {
    onUpdateSettings({ quickAccessExtensionId: extId });
  };

  const handleDuplicateNote = (noteToDup: Note) => {
    const duplicated: Note = {
      ...noteToDup,
      id: 'note-' + Date.now(),
      title: `${noteToDup.title} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateNote(duplicated);
  };

  const handleTouchStart = (note: Note) => {
    touchTimerRef.current = setTimeout(() => {
      setActionNote(note);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handlePlaceStickerOnScreen = (stk: { name: string; url: string }) => {
    const newSticker: NoteSticker = {
      id: 'stk-' + Date.now(),
      name: stk.name,
      url: stk.url,
      x: Math.max(20, Math.floor(window.innerWidth / 2 - 45)),
      y: Math.max(100, Math.floor(window.innerHeight / 3)),
      width: 90,
      rotation: Math.floor(Math.random() * 20) - 10,
    };
    onUpdateGlobalStickers([...(globalStickers || []), newSticker]);
  };

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden select-none relative"
      style={{
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
      }}
    >
      {/* Visual Draggable & Resizable Free Stickers Layer on Mobile (never mounted inside note editor to prevent touch interference) */}
      {!activeNoteId && (
        <FreeStickerLayer
          stickers={globalStickers || []}
          onUpdateStickers={onUpdateGlobalStickers}
          settings={diary.settings.extensionConfigs.stickers}
          isEditing={
            activeTab === 'extensions' || (activeTab === 'quick_extension' && pinnedExtId === 'ext-stickers')
          }
        />
      )}

      {/* 1. TOP MOBILE HEADER (Only shown outside of active sheet view) */}
      {!activeNoteId && (
        <header
          className="pt-3 pb-2.5 px-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 overflow-hidden"
              style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
            >
              {diary.settings.userAvatar?.startsWith('data:image/') || diary.settings.userAvatar?.startsWith('http') ? (
                <img src={diary.settings.userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{diary.settings.userAvatar || '⚡'}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-display-brutal uppercase tracking-wider truncate">
                {diary.settings.diaryName || 'CROSS-DIARY'}
              </h1>
              <div className="flex items-center gap-1.5 text-[9px] font-mono opacity-65">
                <span className={`w-1.5 h-1.5 rounded-full ${r2Status === 'error' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span>{r2Status === 'syncing' ? 'Sincronizando...' : r2Status === 'error' ? 'Sin conexión' : 'En Línea ✓'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Global Search Button */}
            <button
              type="button"
              onClick={() => setShowGlobalSearch(true)}
              className="p-2 rounded-xl border hover:scale-105 active:scale-95 transition-transform"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              title="Buscar en todo el diario"
            >
              <Search size={15} style={{ color: 'var(--accent)' }} />
            </button>

            {/* Notification Preferences Button */}
            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="p-2 rounded-xl border hover:scale-105 active:scale-95 transition-transform relative"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              title="Configurar notificaciones fijadas"
            >
              <Bell size={15} style={{ color: 'var(--accent)' }} />
              {diary.settings.mobileNotificationOption && diary.settings.mobileNotificationOption !== 'none' && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </header>
      )}

      {/* 2. BODY CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        {/* VIEW A: NOTE EDITOR (Single Unified Bar, No outer duplicate header, Ad at bottom of screen outside sheet) */}
        {activeNoteId && activeNote ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-main)]">
            <div className="flex-1 overflow-hidden flex flex-col">
              <NotionEditor
                note={activeNote}
                onUpdateNote={(patch) => onUpdateNote({ ...patch, id: activeNote.id })}
                onBack={() => setActiveNoteId(null)}
                shares={diary.shares || []}
                onUpdateShares={onUpdateShares}
                groups={diary.groups}
                allNotes={diary.notes}
                pinnedItems={diary.settings.pinnedNotificationItems || []}
                onUpdatePinnedItems={handleUpdatePinnedItems}
              />
            </div>
            {/* Banner publicitario en la parte inferior de la pantalla (fuera de la hoja) */}
            <MobileAdBanner containerClassName="shrink-0 p-2 border-t border-[var(--border-color)] bg-[var(--bg-card)]" />
          </div>
        ) : activeTab === 'notes' ? (
          /* VIEW B: NOTES LIST WITH FOLDERS & SEARCH */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Folder Tabs Horizontal Carousel */}
            <div
              className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              {diary.groups.map((grp) => {
                const count = diary.notes.filter((n) => n.groupId === grp.id).length;
                const isSelected = selectedGroupId === grp.id;
                const isPinnedInNoti = (diary.settings.pinnedNotificationItems || []).some(
                  (p) => p.type === 'folder' && p.id === grp.id
                );
                return (
                  <button
                    key={grp.id}
                    onMouseDown={() => handleFolderPressStart(grp)}
                    onMouseUp={handleFolderPressEnd}
                    onMouseLeave={handleFolderPressEnd}
                    onTouchStart={() => handleFolderPressStart(grp)}
                    onTouchEnd={handleFolderPressEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleFolderPressEnd();
                      setShareFolderGroup(grp);
                    }}
                    onClick={() => {
                      if (didFolderLongPressRef.current) {
                        didFolderLongPressRef.current = false;
                        return;
                      }
                      setSelectedGroupId(grp.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'shadow-sm font-black'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      background: isSelected ? 'var(--bg-pill)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-fg)' : 'var(--text-main)',
                      borderColor: isSelected ? 'var(--border-strong)' : 'var(--border-color)',
                    }}
                    title="Toca: Abrir carpeta | Mantén pulsado: Ajustes y compartir carpeta"
                  >
                    <span>{grp.name}</span>
                    {isPinnedInNoti && <Pin size={10} />}
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9px] font-mono opacity-80"
                      style={{ background: isSelected ? 'rgba(0,0,0,0.18)' : 'var(--bg-surface)' }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(true)}
                className="px-2.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 opacity-70 hover:opacity-100 whitespace-nowrap"
                style={{ borderColor: 'var(--border-color)' }}
                title="Nueva carpeta"
              >
                <FolderPlus size={13} />
                <span>+</span>
              </button>

              {/* Share Active Folder Button */}
              {diary.groups.find((g) => g.id === selectedGroupId) && (
                <button
                  type="button"
                  onClick={() =>
                    setShareFolderGroup(
                      diary.groups.find((g) => g.id === selectedGroupId) || diary.groups[0]
                    )
                  }
                  className="px-2.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1 opacity-80 hover:opacity-100 whitespace-nowrap"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                  }}
                  title={isEnglish ? "Share active folder" : "Compartir carpeta activa"}
                >
                  <Share2 size={12} style={{ color: 'var(--accent)' }} />
                  <span>{isEnglish ? 'Share' : 'Compartir'}</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="p-3 pb-1">
              <div
                className="px-3 py-2 rounded-2xl border flex items-center gap-2"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                <Search size={14} className="opacity-50" />
                <input
                  type="text"
                  placeholder={isEnglish ? "Search notes..." : "Buscar notas..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Notes Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredNotes.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center opacity-60 space-y-2">
                  <FileText size={32} />
                  <p className="text-xs">{isEnglish ? 'No sheets in this folder' : 'No hay notas en esta carpeta'}</p>
                  <button
                    onClick={handleCreateNewNote}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ background: 'var(--bg-pill)' }}
                  >
                    + {isEnglish ? 'Create first sheet' : 'Crear primera hoja'}
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      onSelectNote?.(note.id);
                    }}
                    onTouchStart={() => handleTouchStart(note)}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setActionNote(note);
                    }}
                    className="p-3.5 rounded-2xl border-2 cursor-pointer transition-all hover:border-[var(--accent)] active:scale-[0.99] shadow-sm flex flex-col justify-between gap-1.5 relative group"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-display-brutal uppercase truncate flex items-center gap-1.5">
                        <span>{note.icon || '📄'}</span>
                        <span>{note.title || (isEnglish ? 'Untitled sheet' : 'Hoja sin título')}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-mono opacity-50">
                          {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionNote(note);
                          }}
                          className="p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                          title={isEnglish ? "Sheet options" : "Opciones de la hoja"}
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">
                      {note.content.replace(/^#+\s+/gm, '').trim() || (isEnglish ? 'Empty sheet...' : 'Hoja vacía...')}
                    </p>

                    <div className="flex items-center gap-2 pt-1 border-t border-black/5 text-[9px] opacity-60 font-mono">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.widgets && note.widgets.length > 0 && (
                        <span>• {note.widgets.length} {isEnglish ? 'blocks' : 'bloques'}</span>
                      )}
                      {(diary.settings.pinnedNotificationItems || []).some(
                        (p) => p.type === 'sheet' && p.id === note.id
                      ) && (
                        <span className="flex items-center gap-0.5 text-emerald-500 font-bold">
                          <Pin size={9} />
                          <span>{isEnglish ? 'Pinned in Notis' : 'Fijada en Notis'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Main Bottom Banner */}
              <MobileAdBanner />
            </div>

            {/* Floating Action Button (FAB) */}
            <button
              type="button"
              onClick={handleCreateNewNote}
              className="absolute right-4 bottom-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 text-white"
              style={{ background: 'var(--bg-pill)', boxShadow: 'var(--pill-shadow)' }}
              title={isEnglish ? "New Sheet" : "Nueva Hoja"}
            >
              <Plus size={26} strokeWidth={2.8} />
            </button>
          </div>
        ) : activeTab === 'extensions' ? (
          /* VIEW C: EXTENSIONS HUB */
          <ExtensionsHubView
            key="extensions-hub-main"
            extensions={mobileExtensions}
            currentNote={activeNote || null}
            onUpdateNote={onUpdateNote}
            globalStickers={globalStickers || []}
            onUpdateGlobalStickers={onUpdateGlobalStickers}
            vaultNotes={diary.vaultNotes}
            decoyNotes={diary.decoyNotes}
            vaultMode={vaultMode}
            onUnlockVault={setVaultMode}
            onAddVaultNote={onAddVaultNote}
            onDeleteVaultNote={onDeleteVaultNote}
            onPanicLock={onPanicLock}
            clipboardHistory={diary.clipboardHistory || []}
            onAddClipboardEntry={onAddClipboardEntry}
            onDeleteClipboardEntry={onDeleteClipboardEntry}
            extensionConfigs={diary.settings.extensionConfigs}
            onUpdateExtensionConfig={(k, patch) => {
              onUpdateSettings({
                extensionConfigs: {
                  ...diary.settings.extensionConfigs,
                  [k]: {
                    ...(diary.settings.extensionConfigs as any)[k],
                    ...patch,
                  },
                },
              });
            }}
            pinnedQuickExtensionId={pinnedExtId}
            onPinQuickExtension={handlePinQuickExtension}
          />
        ) : activeTab === 'quick_extension' ? (
          /* VIEW D: PINNED QUICK-ACCESS EXTENSION */
          <ExtensionsHubView
            key={`quick-ext-${pinnedExtId}`}
            extensions={mobileExtensions}
            initialExtensionId={pinnedExtId}
            currentNote={activeNote || null}
            onUpdateNote={onUpdateNote}
            globalStickers={globalStickers || []}
            onUpdateGlobalStickers={onUpdateGlobalStickers}
            vaultNotes={diary.vaultNotes}
            decoyNotes={diary.decoyNotes}
            vaultMode={vaultMode}
            onUnlockVault={setVaultMode}
            onAddVaultNote={onAddVaultNote}
            onDeleteVaultNote={onDeleteVaultNote}
            onPanicLock={onPanicLock}
            clipboardHistory={diary.clipboardHistory || []}
            onAddClipboardEntry={onAddClipboardEntry}
            onDeleteClipboardEntry={onDeleteClipboardEntry}
            extensionConfigs={diary.settings.extensionConfigs}
            onUpdateExtensionConfig={(k, patch) => {
              onUpdateSettings({
                extensionConfigs: {
                  ...diary.settings.extensionConfigs,
                  [k]: {
                    ...(diary.settings.extensionConfigs as any)[k],
                    ...patch,
                  },
                },
              });
            }}
            pinnedQuickExtensionId={pinnedExtId}
            onPinQuickExtension={handlePinQuickExtension}
          />
        ) : (
          /* VIEW E: SETTINGS */
          <div className="flex-1 overflow-hidden flex flex-col">
            <ErrorBoundary fallbackTitle={currentLang === 'en' ? 'General Settings' : 'Ajustes Generales'} language={currentLang} onReset={() => setActiveTab('notes')}>
              <IslandSettingsView
                onClose={() => setActiveTab('notes')}
                pairingCode={diary.pairingCode}
                diaryId={diary.diaryId}
                settings={diary.settings}
                onUpdateSettings={onUpdateSettings}
                onLinkRemoteCode={onLinkExistingDiary}
                extensions={diary.extensions}
                onToggleExtension={() => {}}
                onSaveExtension={() => {}}
                onDeleteExtension={() => {}}
                onReorderExtensions={() => {}}
                onResetDiary={onResetDiary}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* 3. MODULAR BOTTOM NAVIGATION BAR */}
      {!activeNoteId && (
        <nav
          className="px-2 py-2 border-t flex items-center justify-around shrink-0 z-20"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          {/* Tab 1: Notes / Hojas */}
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              activeTab === 'notes' ? 'font-black scale-105' : 'opacity-60'
            }`}
            style={{ color: activeTab === 'notes' ? 'var(--accent)' : 'inherit' }}
          >
            <FileText size={18} />
            <span className="text-[10px]">{t.notesHeading || 'Hojas'}</span>
          </button>

          {/* Tab 2: Extensiones Hub */}
          <button
            type="button"
            onClick={() => setActiveTab('extensions')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              activeTab === 'extensions' ? 'font-black scale-105' : 'opacity-60'
            }`}
            style={{ color: activeTab === 'extensions' ? 'var(--accent)' : 'inherit' }}
          >
            <Boxes size={18} />
            <span className="text-[10px]">{t.tabExtensions || 'Extensiones'}</span>
          </button>

          {/* Tab 3: Customizable Quick Access Slot */}
          <button
            type="button"
            onClick={() => setActiveTab('quick_extension')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              activeTab === 'quick_extension' ? 'font-black scale-105' : 'opacity-60'
            }`}
            style={{ color: activeTab === 'quick_extension' ? 'var(--accent)' : 'inherit' }}
            title={`Acceso Rápido: ${pinnedExtension?.name || 'Extensión'}`}
          >
            <div className="relative">
              {pinnedExtension ? getExtensionIcon(pinnedExtension.type) : <Sparkles size={18} />}
            </div>
            <span className="text-[10px] truncate max-w-[65px]">
              {pinnedExtension ? pinnedExtension.name.split(' ')[0] : 'Rápido'}
            </span>
          </button>

          {/* Tab 4: Settings / Ajustes */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              activeTab === 'settings' ? 'font-black scale-105' : 'opacity-60'
            }`}
            style={{ color: activeTab === 'settings' ? 'var(--accent)' : 'inherit' }}
          >
            <Settings size={18} />
            <span className="text-[10px]">{t.generalSettings || 'Ajustes'}</span>
          </button>
        </nav>
      )}

      {/* QR Scanner Modal (Available from Settings or Onboarding, not cluttered in header) */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={(code) => {
          onLinkExistingDiary(code);
        }}
      />

      {/* Mobile Notification Modal */}
      <MobileNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        selectedOption={diary.settings.mobileNotificationOption || 'none'}
        pinnedItems={diary.settings.pinnedNotificationItems || []}
        notes={diary.notes}
        groups={diary.groups}
        clipboardHistory={diary.clipboardHistory || []}
        onSelectOption={handleNotificationOptionSelected}
        onOpenNote={(nid) => {
          setActiveNoteId(nid);
          onSelectNote?.(nid);
        }}
        onOpenGroup={(gid) => {
          setActiveNoteId(null);
          setSelectedGroupId(gid);
        }}
        language={currentLang}
      />

      {/* Custom Themed New Folder Modal (Replaces browser prompt) */}
      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onCreateFolder={(name, color) => {
          const newGrp = onAddGroup(name, color);
          setSelectedGroupId(newGrp.id);
        }}
      />

      {/* Note Card Long-Press / Options Action Modal (Replaces browser confirm) */}
      <NoteActionModal
        isOpen={Boolean(actionNote)}
        note={actionNote}
        onClose={() => setActionNote(null)}
        onDeleteNote={(id) => {
          onDeleteNote(id);
          if (activeNoteId === id) setActiveNoteId(null);
        }}
        onDuplicateNote={handleDuplicateNote}
        onPinNoteForNotifications={(noteId) => {
          const currentPinned = diary.settings.pinnedNotificationItems || [];
          const exists = currentPinned.some((p) => p.type === 'sheet' && p.id === noteId);
          const nextPinned = exists
            ? currentPinned.filter((p) => !(p.type === 'sheet' && p.id === noteId))
            : [...currentPinned, { type: 'sheet' as const, id: noteId }].slice(-3);
          handleUpdatePinnedItems(nextPinned);
        }}
      />

      {/* Folder Share & Settings Modal (Mobile) */}
      <ShareAndSettingsModal
        isOpen={Boolean(shareFolderGroup)}
        onClose={() => setShareFolderGroup(null)}
        targetType="folder"
        group={shareFolderGroup}
        groups={diary.groups}
        allNotes={diary.notes}
        notesInGroup={diary.notes.filter((n) => n.groupId === shareFolderGroup?.id)}
        shares={diary.shares || []}
        onUpdateShares={onUpdateShares || (() => {})}
        onUpdateGroup={onUpdateGroup}
        onUpdateNote={onUpdateNote}
        pinnedItems={diary.settings.pinnedNotificationItems || []}
        onUpdatePinnedItems={handleUpdatePinnedItems}
        language={currentLang}
      />

      {/* Global Search Modal (Mobile) */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        diary={diary}
        onSelectGroup={(gid) => setSelectedGroupId(gid)}
        onSelectNote={(nid) => {
          setActiveNoteId(nid);
          onSelectNote?.(nid);
        }}
      />
    </div>
  );
};
