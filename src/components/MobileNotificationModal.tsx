import React, { useState } from 'react';
import {
  Bell,
  Pin,
  ClipboardList,
  Check,
  X,
  Copy,
  FileText,
  Folder,
  BellOff,
  ExternalLink,
} from 'lucide-react';
import {
  Note,
  FolderGroup,
  ClipboardEntry,
  PinnedNotificationItem,
} from '../types/diary';
import { writeTextToClipboardSafe } from '../extensions/ClipboardExtension';
import {
  getColorEmojiDot,
  getRainbowFolderColor,
  getRainbowSheetColor,
} from '../utils/rainbowColors';

export type MobileNotificationType =
  | 'pinned_items'
  | 'live_clipboard'
  | 'recent_3_sheets'
  | 'pinned_sheet'
  | 'none';

interface MobileNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOption: MobileNotificationType;
  pinnedItems?: PinnedNotificationItem[];
  notes: Note[];
  groups?: FolderGroup[];
  clipboardHistory?: ClipboardEntry[];
  onSelectOption: (
    option: MobileNotificationType,
    pinnedItems?: PinnedNotificationItem[]
  ) => void;
  onOpenNote?: (noteId: string) => void;
  onOpenGroup?: (groupId: string) => void;
  language?: string;
}

export const MobileNotificationModal: React.FC<MobileNotificationModalProps> = ({
  isOpen,
  onClose,
  selectedOption,
  pinnedItems = [],
  notes,
  groups = [],
  clipboardHistory = [],
  onSelectOption,
  onOpenNote,
  onOpenGroup,
  language,
}) => {
  const isEnglish = (language === 'en') || (typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en');
  const normalizedInitial: 'pinned_items' | 'live_clipboard' | 'none' =
    selectedOption === 'live_clipboard'
      ? 'live_clipboard'
      : selectedOption === 'none'
      ? 'none'
      : 'pinned_items';

  const [currentOption, setCurrentOption] = useState<'pinned_items' | 'live_clipboard' | 'none'>(
    normalizedInitial
  );
  const [localPinned, setLocalPinned] = useState<PinnedNotificationItem[]>(pinnedItems);
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [addSelectorValue, setAddSelectorValue] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setCurrentOption(
        selectedOption === 'live_clipboard'
          ? 'live_clipboard'
          : selectedOption === 'none'
          ? 'none'
          : 'pinned_items'
      );
      setLocalPinned(pinnedItems);
    }
  }, [isOpen, selectedOption, pinnedItems]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSelectOption(currentOption, localPinned);
    onClose();
  };

  const handleAddPinnedFromSelect = (val: string) => {
    if (!val) return;
    const [type, id] = val.split('::') as ['sheet' | 'folder', string];
    if (!type || !id) return;
    if (localPinned.some((p) => p.type === type && p.id === id)) return;
    const next = [...localPinned, { type, id }].slice(-3);
    setLocalPinned(next);
    setAddSelectorValue('');
  };

  const handleRemovePinned = (item: PinnedNotificationItem) => {
    setLocalPinned((prev) =>
      prev.filter((p) => !(p.type === item.type && p.id === item.id))
    );
  };

  const handleCopyClipboard = (clip: ClipboardEntry) => {
    writeTextToClipboardSafe(clip.text);
    setCopiedClipId(clip.id);
    setTimeout(() => setCopiedClipId(null), 1500);
  };

  const getItemDetails = (item: PinnedNotificationItem) => {
    if (item.type === 'sheet') {
      const n = notes.find((note) => note.id === item.id);
      const grpIdx = groups.findIndex((g) => g.id === n?.groupId);
      const sheetIdx = notes
        .filter((x) => x.groupId === n?.groupId)
        .findIndex((x) => x.id === item.id);
      const rainbowCol = getRainbowSheetColor(grpIdx >= 0 ? grpIdx : 0, sheetIdx >= 0 ? sheetIdx : 0);
      const effectiveColor = n?.color || rainbowCol;
      return {
        label: n?.title || 'Hoja',
        icon: n?.icon || '📄',
        sub: isEnglish ? 'Sheet' : 'Hoja',
        color: effectiveColor,
        colorDot: getColorEmojiDot(effectiveColor),
      };
    } else {
      const grpIdx = groups.findIndex((grp) => grp.id === item.id);
      const g = grpIdx >= 0 ? groups[grpIdx] : undefined;
      const rainbowCol = getRainbowFolderColor(grpIdx >= 0 ? grpIdx : 0);
      const effectiveColor = g?.color || rainbowCol;
      return {
        label: g?.name || 'Carpeta',
        icon: '📁',
        sub: isEnglish ? 'Folder' : 'Carpeta',
        color: effectiveColor,
        colorDot: getColorEmojiDot(effectiveColor),
      };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[32px] border-2 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
            >
              <Bell size={16} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-display-brutal uppercase">
                Modos de Notificación
              </div>
              <div className="text-[10px] opacity-70">
                Elige uno de los 2 modos de acceso rápido en notificaciones
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full border hover:scale-105 active:scale-95"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto no-scrollbar flex-1">
          {/* MODO 1: 3 HOJAS O CARPETAS FIJADAS */}
          <div
            onClick={() => setCurrentOption('pinned_items')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2.5 ${
              currentOption === 'pinned_items'
                ? 'shadow-md scale-[1.01]'
                : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              background:
                currentOption === 'pinned_items' ? 'var(--bg-surface)' : 'var(--bg-card)',
              borderColor:
                currentOption === 'pinned_items' ? 'var(--accent)' : 'var(--border-color)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-xl shrink-0 mt-0.5"
                style={{ background: 'var(--bg-card)' }}
              >
                <Pin size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase">
                    1. 3 Hojas o Carpetas Fijadas
                  </span>
                  {currentOption === 'pinned_items' && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: 'var(--accent)' }}
                    >
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
                  Acceso rápido a hasta 3 hojas o carpetas fijadas desde los ajustes de cada hoja o carpeta.
                </p>
              </div>
            </div>

            {currentOption === 'pinned_items' && (
              <div
                className="pt-2.5 border-t space-y-2"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-80">
                  <span>{isEnglish ? `Pinned Items (${localPinned.length}/3)` : `Elementos fijados (${localPinned.length}/3)`}</span>
                </div>

                {/* 3 DISTINCT NUMBERED SLOTS */}
                <div className="space-y-1.5">
                  {[0, 1, 2].map((slotIndex) => {
                    const item = localPinned[slotIndex];
                    const info = item ? getItemDetails(item) : null;
                    return (
                      <div
                        key={`slot-${slotIndex}`}
                        className="p-2 rounded-xl border flex items-center justify-between gap-2 transition-all"
                        style={{
                          background: item ? 'var(--bg-main)' : 'rgba(0,0,0,0.03)',
                          borderColor: item ? 'var(--border-strong)' : 'var(--border-color)',
                          borderStyle: item ? 'solid' : 'dashed',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border"
                            style={{
                              background: item ? 'var(--bg-pill)' : 'var(--bg-card)',
                              color: item ? 'var(--accent-fg)' : 'var(--text-main)',
                              borderColor: 'var(--border-color)',
                            }}
                          >
                            {slotIndex + 1}
                          </span>

                          {item && info ? (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20 shadow-sm"
                                  style={{ backgroundColor: info.color }}
                                  title={info.color}
                                />
                                <span className="text-xs">{info.icon}</span>
                                <span className="text-[11px] font-extrabold truncate">{info.label}</span>
                              </div>
                              <div className="text-[8px] opacity-60 font-mono uppercase flex items-center gap-1">
                                <span>{info.sub}</span>
                                <span>•</span>
                                <span style={{ color: info.color }} className="font-bold">{info.colorDot}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-50 italic">
                              {isEnglish ? `Slot #${slotIndex + 1} empty` : `Espacio #${slotIndex + 1} libre`}
                            </div>
                          )}
                        </div>

                        {item ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.type === 'sheet' && onOpenNote) {
                                  onOpenNote(item.id);
                                  onClose();
                                } else if (item.type === 'folder' && onOpenGroup) {
                                  onOpenGroup(item.id);
                                  onClose();
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border flex items-center gap-1"
                              style={{
                                background: 'var(--bg-pill)',
                                color: 'var(--accent-fg)',
                                borderColor: 'var(--border-strong)',
                              }}
                            >
                              <span>{isEnglish ? 'Open' : 'Abrir'}</span>
                              <ExternalLink size={8} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePinned(item)}
                              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:text-red-500"
                              title={isEnglish ? "Unpin" : "Desfijar"}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0 text-[9px] font-bold opacity-75" style={{ color: 'var(--accent)' }}>
                            {isEnglish ? 'Pick below ↓' : 'Asignar abajo ↓'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* LIVE NOTIFICATION PREVIEW */}
                <div
                  className="p-2.5 rounded-2xl border space-y-1"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
                    <Bell size={10} />
                    <span>{isEnglish ? 'Notification Live Preview' : 'Vista Previa en Notificación'}</span>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2.5 text-[10px] space-y-1 font-mono">
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>📌</span>
                      <span>Cross-Diary • {isEnglish ? 'Quick Access' : 'Acceso Rápido'}</span>
                    </div>
                    {localPinned.length === 0 ? (
                      <div className="text-neutral-400 italic text-[9px]">
                        {isEnglish ? 'No items pinned yet' : 'Sin elementos fijados todavía'}
                      </div>
                    ) : (
                      localPinned.map((p, i) => {
                        const inf = getItemDetails(p);
                        return (
                          <div key={`prev-${i}`} className="text-neutral-200 truncate flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">{i + 1}.</span>
                            <span>{inf.colorDot}</span>
                            <span>{inf.icon}</span>
                            <span className="font-semibold">{inf.label}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {localPinned.length < 3 && (
                  <div className="pt-1">
                    <select
                      value={addSelectorValue}
                      onChange={(e) => handleAddPinnedFromSelect(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none"
                      style={{
                        background: 'var(--bg-main)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value="">+ Fijar hoja o carpeta ({3 - localPinned.length} libres)...</option>
                      {groups.length > 0 && (
                        <optgroup label="Carpetas">
                          {groups.map((g) => (
                            <option key={`folder::${g.id}`} value={`folder::${g.id}`}>
                              📁 Carpeta: {g.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {notes.length > 0 && (
                        <optgroup label="Hojas">
                          {notes.map((n) => (
                            <option key={`sheet::${n.id}`} value={`sheet::${n.id}`}>
                              {n.icon || '📄'} Hoja: {n.title || 'Sin título'}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODO 2: PORTAPAPELES Y BOTONES PARA COPIAR */}
          <div
            onClick={() => setCurrentOption('live_clipboard')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all space-y-2.5 ${
              currentOption === 'live_clipboard'
                ? 'shadow-md scale-[1.01]'
                : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              background:
                currentOption === 'live_clipboard' ? 'var(--bg-surface)' : 'var(--bg-card)',
              borderColor:
                currentOption === 'live_clipboard' ? 'var(--accent)' : 'var(--border-color)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-xl shrink-0 mt-0.5"
                style={{ background: 'var(--bg-card)' }}
              >
                <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase">
                    2. Clipboards & Botones para Copiar
                  </span>
                  {currentOption === 'live_clipboard' && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: 'var(--accent)' }}
                    >
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
                  Muestra tus últimos textos sincronizados del portapapeles con botones rápidos para copiar cualquiera al instante.
                </p>
              </div>
            </div>

            {currentOption === 'live_clipboard' && (
              <div
                className="pt-2.5 border-t space-y-1.5"
                style={{ borderColor: 'var(--border-color)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-black uppercase opacity-80">
                  Clipboards sincronizados (Toca para copiar):
                </div>

                {clipboardHistory.length === 0 ? (
                  <div className="p-2.5 rounded-xl border border-dashed text-[10px] opacity-65 text-center">
                    Aún no hay textos en el portapapeles sincronizado.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
                    {clipboardHistory.slice(0, 5).map((clip, i) => {
                      const isCopied = copiedClipId === clip.id;
                      return (
                        <div
                          key={clip.id || i}
                          className="p-2 rounded-xl border flex items-center justify-between gap-2"
                          style={{
                            background: 'var(--bg-main)',
                            borderColor: 'var(--border-color)',
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-mono truncate">{clip.text}</div>
                            <div className="text-[8px] font-mono opacity-60">
                              {clip.deviceName} •{' '}
                              {new Date(clip.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyClipboard(clip)}
                            className="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                            style={{
                              background: isCopied ? '#10B981' : 'var(--bg-pill)',
                              color: isCopied ? '#FFFFFF' : 'var(--accent-fg)',
                            }}
                          >
                            {isCopied ? <Check size={10} /> : <Copy size={10} />}
                            <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DESACTIVAR NOTIFICACIONES */}
          <div
            onClick={() => setCurrentOption('none')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              currentOption === 'none' ? 'border-[var(--accent)] opacity-100' : 'opacity-60 hover:opacity-90'
            }`}
            style={{
              background: 'var(--bg-card)',
              borderColor: currentOption === 'none' ? 'var(--accent)' : 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <BellOff size={15} className=" opacity-70" />
              <span className="text-[11px] font-bold uppercase">
                Desactivar notificaciones fijas
              </span>
            </div>
            {currentOption === 'none' && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                style={{ background: 'var(--accent)' }}
              >
                <Check size={11} strokeWidth={3} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex gap-2.5 shrink-0"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-xs font-extrabold uppercase border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full text-xs font-display-brutal uppercase text-white shadow-md transition-transform active:scale-95"
            style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
          >
            Guardar Modo
          </button>
        </div>
      </div>
    </div>
  );
};
