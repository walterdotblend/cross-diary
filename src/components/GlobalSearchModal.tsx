import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Folder, Lock, ArrowRight, CornerDownLeft } from 'lucide-react';
import { DiaryState, Note, FolderGroup } from '../types/diary';
import { SupportedLang } from '../utils/i18n';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  diary: DiaryState;
  onSelectGroup: (groupId: string) => void;
  onSelectNote: (noteId: string) => void;
  language?: SupportedLang;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  diary,
  onSelectGroup,
  onSelectNote,
  language,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentLang, setCurrentLang] = useState<SupportedLang>(() =>
    language || diary?.settings?.language || (typeof window !== 'undefined' ? (localStorage.getItem('cross_diary_language') as SupportedLang) || 'es' : 'es')
  );

  useEffect(() => {
    if (language) setCurrentLang(language);
    else if (diary?.settings?.language) setCurrentLang(diary.settings.language);
  }, [language, diary?.settings?.language]);

  useEffect(() => {
    const handler = (e: any) => {
      const l = e.detail || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es');
      setCurrentLang(l);
    };
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Global keyboard shortcut listener for Escape & Arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQ = query.trim().toLowerCase();

  // Search through all notes
  const matchingNotes: Array<{
    note: Note;
    group?: FolderGroup;
    matchedSnippet?: string;
  }> = [];

  const allNotes = [...diary.notes, ...(diary.vaultNotes || [])];

  for (const n of allNotes) {
    if (!cleanQ) {
      // If query is empty, show recently updated notes
      const grp = diary.groups.find((g) => g.id === n.groupId);
      matchingNotes.push({ note: n, group: grp });
      if (matchingNotes.length >= 8) break;
      continue;
    }

    const titleMatch = (n.title || '').toLowerCase().includes(cleanQ);
    const contentIndex = (n.content || '').toLowerCase().indexOf(cleanQ);

    if (titleMatch || contentIndex !== -1) {
      const grp = diary.groups.find((g) => g.id === n.groupId);
      let snippet = '';
      if (contentIndex !== -1) {
        const start = Math.max(0, contentIndex - 30);
        const end = Math.min(n.content.length, contentIndex + cleanQ.length + 50);
        snippet = (start > 0 ? '...' : '') + n.content.slice(start, end).replace(/\n/g, ' ') + (end < n.content.length ? '...' : '');
      }
      matchingNotes.push({ note: n, group: grp, matchedSnippet: snippet });
      if (matchingNotes.length >= 20) break;
    }
  }

  // Search matching folders
  const matchingGroups = cleanQ
    ? diary.groups.filter((g) => g.name.toLowerCase().includes(cleanQ))
    : [];

  const handleSelectResult = (note: Note, groupId?: string) => {
    if (groupId) {
      onSelectGroup(groupId);
    } else {
      onSelectGroup(note.groupId);
    }
    onSelectNote(note.id);
    onClose();
  };

  const handleSelectGroup = (group: FolderGroup) => {
    onSelectGroup(group.id);
    const firstNote = diary.notes.find((n) => n.groupId === group.id);
    if (firstNote) {
      onSelectNote(firstNote.id);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 backdrop-blur-md select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden max-h-[75vh] animate-scale-up"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <Search size={18} className="opacity-60 shrink-0" style={{ color: 'var(--accent)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder={isEnglish ? "Search notes, titles, text or folders... (Esc to exit)" : "Buscar notas, títulos, texto o carpetas... (Esc para salir)"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm font-bold focus:outline-none placeholder:opacity-40"
            style={{ color: 'var(--text-main)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full opacity-50 hover:opacity-100"
            >
              <X size={14} />
            </button>
          )}
          <span
            className="px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold opacity-60 hidden sm:inline"
            style={{ borderColor: 'var(--border-color)' }}
          >
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Matching Folders */}
          {matchingGroups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono font-bold uppercase opacity-60 px-1">
                {isEnglish ? 'Folders' : 'Carpetas'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matchingGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGroup(g)}
                    className="px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: g.color || 'var(--border-color)',
                    }}
                  >
                    <Folder size={13} style={{ color: g.color }} />
                    <span>{g.name}</span>
                    <ArrowRight size={11} className="opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Notes */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono font-bold uppercase opacity-60 px-1 flex items-center justify-between">
              <span>{cleanQ ? `${isEnglish ? 'Found sheets' : 'Hojas encontradas'} (${matchingNotes.length})` : (isEnglish ? 'Recent sheets' : 'Hojas recientes')}</span>
              <span className="text-[8px]">{isEnglish ? 'Click or Enter to open' : 'Haz clic o Enter para abrir'}</span>
            </div>

            {matchingNotes.length === 0 ? (
              <div className="p-8 text-center opacity-50 text-xs font-bold uppercase">
                {isEnglish ? `No sheets found matching "${query}"` : `No se encontraron notas que coincidan con "${query}"`}
              </div>
            ) : (
              matchingNotes.map(({ note, group, matchedSnippet }, idx) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectResult(note, group?.id)}
                  className="p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group hover:border-[var(--accent)] hover:translate-x-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm shadow-sm"
                      style={{
                        backgroundColor: group?.color ? `${group.color}22` : 'var(--bg-surface)',
                        color: group?.color || 'var(--text-main)',
                      }}
                    >
                      {note.isVault ? <Lock size={13} /> : note.icon || '📄'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-black uppercase tracking-tight truncate group-hover:text-[var(--accent)]">
                          {note.title || (isEnglish ? 'Untitled Sheet' : 'Hoja sin título')}
                        </span>
                        {group && (
                          <span
                            className="px-1.5 py-0.2 rounded-full text-[8px] font-bold uppercase shrink-0"
                            style={{
                              backgroundColor: `${group.color}18`,
                              color: group.color,
                              border: `1px solid ${group.color}44`,
                            }}
                          >
                            {group.name}
                          </span>
                        )}
                      </div>

                      {matchedSnippet ? (
                        <p className="text-[10px] opacity-75 font-mono truncate leading-tight">
                          {matchedSnippet}
                        </p>
                      ) : (
                        <p className="text-[10px] opacity-50 truncate leading-tight">
                          {note.content.slice(0, 70) || (isEnglish ? 'Empty content' : 'Sin contenido')}
                        </p>
                      )}
                    </div>
                  </div>

                  <CornerDownLeft
                    size={13}
                    className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
