import React, { useState } from 'react';
import { Note } from '../types/diary';
import { Trash2, Copy, Pin, X, AlertTriangle } from 'lucide-react';

interface NoteActionModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onPinNoteForNotifications: (noteId: string) => void;
}

export const NoteActionModal: React.FC<NoteActionModalProps> = ({
  isOpen,
  note,
  onClose,
  onDeleteNote,
  onDuplicateNote,
  onPinNoteForNotifications,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm select-none">
      <div
        className="w-full max-w-[360px] p-4 rounded-3xl border-2 shadow-2xl flex flex-col gap-3 animate-slideUp"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-base">{note.icon || '📄'}</span>
            <span className="text-xs font-display-brutal uppercase truncate">
              {note.title || 'Hoja sin título'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onClose();
            }}
            className="p-1 rounded-xl opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>

        {confirmDelete ? (
          <div className="p-3 rounded-2xl border space-y-3 bg-red-500/10 border-red-500/30 text-center">
            <AlertTriangle size={24} className="mx-auto text-red-500" />
            <p className="text-xs font-bold text-red-500">
              ¿Seguro que deseas eliminar esta hoja permanentemente?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold"
                style={{ borderColor: 'var(--border-color)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(note.id);
                  setConfirmDelete(false);
                  onClose();
                }}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-black"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                onPinNoteForNotifications(note.id);
                onClose();
              }}
              className="p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold hover:bg-black/5 active:scale-[0.98] transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Pin size={16} style={{ color: 'var(--accent)' }} />
              <span>Fijar en Notificaciones</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDuplicateNote(note);
                onClose();
              }}
              className="p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold hover:bg-black/5 active:scale-[0.98] transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Copy size={16} style={{ color: 'var(--accent)' }} />
              <span>Duplicar Hoja</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition-all"
              style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <Trash2 size={16} />
              <span>Eliminar Hoja</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
