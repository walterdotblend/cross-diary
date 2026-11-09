import React, { useState } from 'react';
import { 
  FolderGroup, 
  Note, 
  TabColor 
} from '../types/diary';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  MoreHorizontal, 
  FileText, 
  Trash2,
  FolderPlus,
  Palette
} from 'lucide-react';

interface ChromiumTabsProps {
  groups: FolderGroup[];
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: (groupId: string) => void;
  onDeleteNote: (id: string) => void;
  onAddGroup: (name: string, color: TabColor) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onUpdateGroupColor: (groupId: string, color: TabColor) => void;
}

const COLOR_OPTIONS: TabColor[] = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const ChromiumTabs: React.FC<ChromiumTabsProps> = ({
  groups,
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  onAddGroup,
  onToggleGroupCollapse,
  onUpdateGroupColor,
}) => {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<TabColor>('#3b82f6');
  const [activePaletteGroup, setActivePaletteGroup] = useState<string | null>(null);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim(), newGroupColor);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  return (
    <div className="w-full flex flex-col h-full bg-surface/80 border-r border-border backdrop-blur-md select-none">
      {/* Header bar */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">
            Hojas y Carpetas
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border">
            {notes.length}
          </span>
        </div>
        <button
          onClick={() => setIsAddingGroup(true)}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors text-xs flex items-center gap-1"
          title="Crear nueva carpeta temática"
        >
          <FolderPlus size={14} />
          <span className="text-xs">Carpeta</span>
        </button>
      </div>

      {/* New group form if active */}
      {isAddingGroup && (
        <form onSubmit={handleCreateGroup} className="p-3 bg-surface-hover border-b border-border space-y-2 animate-slide-in-right">
          <input
            type="text"
            placeholder="Nombre de la carpeta..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-background border border-border rounded text-text placeholder-text-muted focus:outline-none focus:border-accent"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewGroupColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform ${newGroupColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setIsAddingGroup(false)}
                className="text-[11px] px-2 py-0.5 rounded text-text-muted hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-[11px] px-2 py-0.5 rounded bg-accent text-white font-medium hover:opacity-90"
              >
                Crear
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Groups and notes list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {groups.map((group) => {
          const groupNotes = notes.filter((n) => n.groupId === group.id);
          const isCollapsed = !!group.collapsed;

          return (
            <div key={group.id} className="space-y-1">
              {/* Chromium Tab Group Capsule Header */}
              <div 
                className="group/capsule flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-surface-hover/80"
                style={{
                  borderLeft: `3px solid ${group.color}`,
                }}
              >
                <div 
                  className="flex items-center space-x-1.5 flex-1 min-w-0"
                  onClick={() => onToggleGroupCollapse(group.id)}
                >
                  <span className="text-text-muted">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>

                  {/* Chromium style color pill tag */}
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide transition-opacity"
                    style={{
                      backgroundColor: `${group.color}20`,
                      color: group.color,
                      border: `1px solid ${group.color}40`,
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="truncate max-w-[120px]">{group.name}</span>
                  </div>

                  <span className="text-[10px] text-text-muted ml-1">
                    {groupNotes.length}
                  </span>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover/capsule:opacity-100 transition-opacity">
                  {/* Change color palette trigger */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePaletteGroup(activePaletteGroup === group.id ? null : group.id);
                      }}
                      className="p-1 rounded text-text-muted hover:text-text hover:bg-background"
                      title="Cambiar color"
                    >
                      <Palette size={12} />
                    </button>
                    {activePaletteGroup === group.id && (
                      <div 
                        className="absolute right-0 top-6 z-30 p-1.5 bg-surface border border-border rounded-lg shadow-xl flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              onUpdateGroupColor(group.id, color);
                              setActivePaletteGroup(null);
                            }}
                            className="w-3.5 h-3.5 rounded-full hover:scale-125 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add note inside this group */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNote(group.id);
                    }}
                    className="p-1 rounded text-text-muted hover:text-text hover:bg-background"
                    title="Añadir hoja a este grupo"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* Group notes */}
              {!isCollapsed && (
                <div className="pl-3.5 space-y-0.5 border-l border-border/40 ml-2">
                  {groupNotes.length === 0 ? (
                    <div 
                      onClick={() => onAddNote(group.id)}
                      className="px-2 py-2 text-[11px] text-text-muted/60 italic hover:text-text cursor-pointer hover:bg-surface-hover/40 rounded transition-colors"
                    >
                      + Hoja vacía. Haz clic para redactar.
                    </div>
                  ) : (
                    groupNotes.map((note) => {
                      const isSelected = selectedNoteId === note.id;
                      const dateFormatted = new Date(note.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      });

                      return (
                        <div
                          key={note.id}
                          onClick={() => onSelectNote(note.id)}
                          className={`group/note flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-accent/15 text-text font-medium border border-accent/30 shadow-sm'
                              : 'text-text-muted hover:text-text hover:bg-surface-hover/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <FileText 
                              size={12} 
                              className={isSelected ? 'text-accent' : 'text-text-muted/70'} 
                            />
                            <span className="truncate text-xs">
                              {note.title || 'Hoja sin título'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 ml-2">
                            <span className="text-[10px] text-text-muted/60 group-hover/note:hidden">
                              {dateFormatted}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note.id);
                              }}
                              className="hidden group-hover/note:block p-0.5 text-text-muted hover:text-red-400 hover:bg-background/80 rounded transition-colors"
                              title="Eliminar hoja"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
