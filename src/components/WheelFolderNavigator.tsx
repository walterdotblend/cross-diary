import React, { useState, useRef, useEffect } from 'react';
import { FolderGroup, Note, TabColor, ResourceShare, PinnedNotificationItem } from '../types/diary';
import { ShareAndSettingsModal } from './ShareAndSettingsModal';
import { ColorPickerPopover } from './ColorPickerPopover';
import { getRainbowFolderColor, getRainbowSheetColor, getRainbowCssVars } from '../utils/rainbowColors';
import {
  Plus,
  Trash2,
  FolderPlus,
  Search,
  Share2,
  X,
  Pin,
} from 'lucide-react';

interface WheelFolderNavigatorProps {
  groups: FolderGroup[];
  notes: Note[];
  selectedGroupId: string;
  selectedNoteId: string | null;
  onSelectGroup: (groupId: string) => void;
  onSelectNote: (noteId: string) => void;
  onAddNote: (groupId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onAddGroup: (name: string, color: TabColor) => void;
  onUpdateGroup?: (groupId: string, patch: Partial<FolderGroup>) => void;
  onUpdateNote?: (noteId: string, patch: Partial<Note>) => void;
  shares?: ResourceShare[];
  onUpdateShares?: (shares: ResourceShare[]) => void;
  pinnedItems?: PinnedNotificationItem[];
  onUpdatePinnedItems?: (items: PinnedNotificationItem[]) => void;
  language?: string;
}

const VIBRANT_COLORS: TabColor[] = [
  '#FF2E00',
  '#FF5C93',
  '#00E5FF',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#3B82F6',
];

export const WheelFolderNavigator: React.FC<WheelFolderNavigatorProps> = ({
  groups,
  notes,
  selectedGroupId,
  selectedNoteId,
  onSelectGroup,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  onAddGroup,
  onUpdateGroup,
  onUpdateNote,
  shares = [],
  onUpdateShares,
  pinnedItems = [],
  onUpdatePinnedItems,
  language,
}) => {
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState<TabColor>(() => getRainbowFolderColor(groups.length) as TabColor);
  const [folderSearch, setFolderSearch] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [modalTargetGroup, setModalTargetGroup] = useState<FolderGroup | null>(null);

  const [currentLang, setCurrentLang] = useState(() =>
    language || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es')
  );

  useEffect(() => {
    if (language) setCurrentLang(language);
  }, [language]);

  useEffect(() => {
    const handler = (e: any) => {
      const l = e.detail || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es');
      setCurrentLang(l);
    };
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const ribbonRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const wheelCooldownRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);
  const didLongPressRef = useRef<boolean>(false);

  const activeGroupIndex = Math.max(
    0,
    groups.findIndex((g) => g.id === selectedGroupId)
  );
  const activeGroup = groups[activeGroupIndex] || groups[0];
  const groupNotes = notes.filter((n) => n.groupId === activeGroup?.id);
  const filteredGroupNotes = groupNotes.filter(
    (n) =>
      !folderSearch.trim() ||
      (n.title || '').toLowerCase().includes(folderSearch.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(folderSearch.toLowerCase())
  );

  // Keep active folder pill smoothly scrolled into view without clipping the first folder on the left edge!
  useEffect(() => {
    if (!ribbonRef.current) return;
    if (activeGroupIndex === 0) {
      ribbonRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (activeGroup && pillRefs.current[activeGroup.id]) {
      const el = pillRefs.current[activeGroup.id];
      const container = ribbonRef.current;
      if (el && container) {
        const targetLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
    }
  }, [activeGroup?.id, activeGroupIndex]);

  // Vertical OR Horizontal mouse wheel cycles folders, scrolls the ribbon & auto-unfolds sheets!
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const rawDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (rawDelta === 0 || groups.length === 0) return;

    const now = Date.now();
    if (now - wheelCooldownRef.current < 110) return;
    wheelCooldownRef.current = now;

    const direction = rawDelta > 0 ? 1 : -1;
    const nextIndex = (activeGroupIndex + direction + groups.length) % groups.length;
    const nextGroup = groups[nextIndex];

    if (nextGroup) {
      onSelectGroup(nextGroup.id);
      setIsUnfolded(true);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onAddGroup(folderName.trim().toUpperCase(), folderColor);
    setFolderName('');
    setIsCreatingFolder(false);
    setIsUnfolded(true);
  };

  const openFolderSettings = (grp: FolderGroup) => {
    setModalTargetGroup(grp);
    setIsShareModalOpen(true);
  };

  const handleFolderPressStart = (grp: FolderGroup) => {
    didLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      openFolderSettings(grp);
    }, 480);
  };

  const handleFolderPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      onWheel={handleWheel}
      onMouseLeave={() => {
        handleFolderPressEnd();
        setIsUnfolded(false);
        setIsCreatingFolder(false);
      }}
      className="relative z-30 select-none transition-all duration-300"
      style={{
        borderBottom: '2px solid var(--border-color)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Top Folder Pills Strip (Buttons placed at the end of the scrollable row so they never block as fixed buttons) */}
      <div className="px-1.5 py-2 flex items-center">
        <div
          ref={ribbonRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-3 flex-1 scroll-smooth"
        >
          {groups.map((grp, grpIdx) => {
            const isActive = grp.id === activeGroup?.id;
            const count = notes.filter((n) => n.groupId === grp.id).length;
            const isPinnedInNoti = pinnedItems.some((p) => p.type === 'folder' && p.id === grp.id);
            const defaultRainbow = getRainbowFolderColor(grpIdx);
            const effectiveColor = grp.color || defaultRainbow;

            return (
              <button
                key={grp.id}
                ref={(el) => {
                  pillRefs.current[grp.id] = el;
                }}
                onMouseDown={() => handleFolderPressStart(grp)}
                onMouseUp={handleFolderPressEnd}
                onMouseLeave={handleFolderPressEnd}
                onTouchStart={() => handleFolderPressStart(grp)}
                onTouchEnd={handleFolderPressEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFolderPressEnd();
                  openFolderSettings(grp);
                }}
                onClick={() => {
                  if (didLongPressRef.current) {
                    didLongPressRef.current = false;
                    return;
                  }
                  onSelectGroup(grp.id);
                  setIsUnfolded((prev) => (isActive ? !prev : true));
                }}
                title={isEnglish ? "Click: Open folder | Right-click or hold: Settings & color" : "Clic: Abrir carpeta | Clic derecho o mantener pulsado: Ajustes y color"}
                data-rainbow-index={grpIdx}
                data-rainbow-color={effectiveColor}
                className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase transition-all duration-200 shrink-0 ${
                  grpIdx === 0 ? 'ml-0.5' : ''
                } ${
                  isActive ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  ...getRainbowCssVars(grpIdx, effectiveColor),
                  backgroundColor: isActive ? 'var(--item-color)' : 'var(--bg-card)',
                  color: isActive ? '#FFFFFF' : 'var(--text-main)',
                  border: '2px solid var(--item-color)',
                  boxShadow: isActive ? '0 4px 14px -2px var(--item-color)' : 'none',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full transition-transform duration-200 group-hover:scale-125"
                  style={{ backgroundColor: isActive ? '#FFFFFF' : 'var(--item-color)' }}
                />
                <span className="truncate max-w-[110px]">{grp.name}</span>
                {isPinnedInNoti && <Pin size={9} className="shrink-0" />}
                <span
                  className="text-[9px] px-1.5 py-0.2 rounded-full font-dot-matrix"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.25)' : 'color-mix(in srgb, var(--item-color) 18%, transparent)',
                    color: isActive ? '#FFFFFF' : 'var(--item-color)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* New Folder Button (at the end of the folder row) */}
          <button
            type="button"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 text-[10px] font-extrabold uppercase transition-transform hover:scale-105 active:scale-95 opacity-80 hover:opacity-100"
            style={{
              background: 'var(--bg-card)',
              border: '2px dashed var(--border-strong)',
              color: 'var(--text-main)',
            }}
            title={isEnglish ? "New folder" : "Nueva carpeta"}
          >
            <FolderPlus size={12} />
            <span>+</span>
          </button>

          {/* Share / Folder Settings Button (at the end of the folder row, allows selecting which folder to share) */}
          {activeGroup && (
            <button
              type="button"
              onClick={() => openFolderSettings(activeGroup)}
              className="px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 text-[10px] font-extrabold uppercase border transition-transform hover:scale-105 active:scale-95 opacity-85 hover:opacity-100 whitespace-nowrap"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
              title={isEnglish ? "Folder settings and share" : "Ajustes y compartir carpeta"}
            >
              <Share2 size={11} style={{ color: 'var(--accent)' }} />
              <span>{isEnglish ? "Share" : "Compartir"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline New Folder Creator */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="px-3 py-2 flex items-center gap-2 animate-folder-unfold"
          style={{
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <input
            type="text"
            placeholder={isEnglish ? "FOLDER..." : "CARPETA..."}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="flex-1 px-3 py-1 rounded-full text-xs font-bold uppercase focus:outline-none"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              border: `2px solid ${folderColor}`,
            }}
            autoFocus
          />
          <ColorPickerPopover
            color={folderColor}
            onChange={setFolderColor}
            mode="inline"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase text-white"
            style={{ backgroundColor: folderColor }}
          >
            OK
          </button>
        </form>
      )}

      {/* AUTO-UNFOLDED SHEETS DRAWER */}
      {isUnfolded && activeGroup && (
        <div
          className="absolute left-0 right-0 top-full z-40 px-3 py-3 space-y-2 animate-folder-unfold overflow-y-auto no-scrollbar max-h-64"
          style={{
            background: 'var(--bg-card)',
            borderBottom: `3px solid ${activeGroup.color}`,
            boxShadow: '0 18px 36px -6px rgba(0,0,0,0.28)',
          }}
        >
          <div
            key={`hdr-${activeGroup.id}`}
            className="flex items-center justify-between text-[10px] font-dot-matrix uppercase tracking-wider px-1 animate-sheet-cascade"
          >
            <span style={{ color: activeGroup.color }} className="font-bold">
              ● {activeGroup.name} ({groupNotes.length} {isEnglish ? 'SHEETS' : 'HOJAS'})
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFolderSettings(activeGroup);
                }}
                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center gap-1 transition-transform hover:scale-105 active:scale-95"
                style={{
                  borderColor: activeGroup.color,
                  color: activeGroup.color,
                  background: 'var(--bg-surface)',
                }}
                title={isEnglish ? "Folder settings and share" : "Ajustes y compartir carpeta"}
              >
                <Share2 size={10} />
                <span>{isEnglish ? "Settings / Share" : "Ajustes / Compartir"}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote(activeGroup.id);
                  setIsUnfolded(true);
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase text-white flex items-center gap-1 transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: activeGroup.color }}
              >
                <Plus size={10} />
                <span>{isEnglish ? "New Sheet" : "Nueva Hoja"}</span>
              </button>
            </div>
          </div>

          {/* In-Folder Search Input */}
          <div
            className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <Search size={11} className="opacity-50 shrink-0" style={{ color: activeGroup.color }} />
            <input
              type="text"
              placeholder={isEnglish ? `Search in ${activeGroup.name}...` : `Buscar en ${activeGroup.name}...`}
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className="flex-1 bg-transparent text-[10px] font-bold focus:outline-none placeholder:opacity-50"
              style={{ color: 'var(--text-main)' }}
            />
            {folderSearch && (
              <button
                type="button"
                onClick={() => setFolderSearch('')}
                className="opacity-50 hover:opacity-100"
              >
                <X size={10} />
              </button>
            )}
          </div>

          <div
            key={`list-${activeGroup.id}`}
            className="grid grid-cols-1 gap-1.5 pt-0.5"
          >
            {filteredGroupNotes.length === 0 ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote(activeGroup.id);
                  setIsUnfolded(true);
                }}
                className="p-2.5 rounded-2xl border-2 border-dashed text-center text-xs font-bold cursor-pointer animate-sheet-cascade"
                style={{ borderColor: activeGroup.color, color: activeGroup.color }}
              >
                {folderSearch
                  ? `No hay hojas que coincidan con "${folderSearch}"`
                  : `+ CREAR HOJA EN ${activeGroup.name}`}
              </div>
            ) : (
              filteredGroupNotes.map((note, idx) => {
                const isSelected = note.id === selectedNoteId;
                const sheetColor = note.color || getRainbowSheetColor(activeGroupIndex, idx);
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note.id);
                      setIsUnfolded(false);
                    }}
                    data-rainbow-index={idx}
                    data-rainbow-color={sheetColor}
                    style={{
                      ...getRainbowCssVars(idx, sheetColor),
                      backgroundColor: isSelected ? 'color-mix(in srgb, var(--item-color) 16%, transparent)' : 'var(--bg-surface)',
                      borderColor: isSelected ? 'var(--item-color)' : 'var(--border-color)',
                      animationDelay: `${idx * 42}ms`,
                    }}
                    className="group flex items-center justify-between px-3 py-2 rounded-2xl border-2 cursor-pointer transition-all hover:translate-x-1 animate-sheet-cascade"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: isSelected ? 'var(--item-color)' : 'var(--bg-card)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                          border: '1.5px solid var(--item-color)',
                        }}
                      >
                        {note.icon || '⚡'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold truncate uppercase tracking-tight flex items-center gap-1.5">
                          <span>{note.title || (isEnglish ? 'UNTITLED SHEET' : 'HOJA SIN TÍTULO')}</span>
                          <span
                            className="w-2 h-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: 'var(--item-color)' }}
                          />
                        </div>
                        <div className="text-[10px] opacity-60 truncate">
                          {note.content.replace(/[#*`>-]/g, '').slice(0, 55) || (isEnglish ? 'Click to open...' : 'Haz clic para abrir...')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-500 hover:text-white transition-all ml-2"
                      title={isEnglish ? "Delete sheet" : "Eliminar hoja"}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Folder Share & Settings Modal */}
      <ShareAndSettingsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        targetType="folder"
        group={modalTargetGroup || activeGroup}
        groups={groups}
        allNotes={notes}
        notesInGroup={groupNotes}
        shares={shares || []}
        onUpdateShares={onUpdateShares || (() => {})}
        onUpdateGroup={onUpdateGroup}
        onUpdateNote={onUpdateNote ? (patch) => {
          if (selectedNoteId) onUpdateNote(selectedNoteId, patch);
        } : undefined}
        pinnedItems={pinnedItems}
        onUpdatePinnedItems={onUpdatePinnedItems}
        language={language}
      />
    </div>
  );
};
