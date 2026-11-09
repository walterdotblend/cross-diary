import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { ColorPickerPopover } from './ColorPickerPopover';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF2E00');

  const isEnglish = typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim(), selectedColor);
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fadeIn">
      <div
        className="w-full max-w-[360px] p-5 rounded-3xl border-2 shadow-2xl flex flex-col gap-4 animate-scaleUp"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 text-xs font-display-brutal uppercase" style={{ color: 'var(--accent)' }}>
            <FolderPlus size={16} />
            <span>{isEnglish ? 'New Folder' : 'Nueva Carpeta'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase opacity-65 mb-1.5">
              {isEnglish ? 'Folder Name' : 'Nombre de la carpeta'}
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={isEnglish ? 'e.g. Projects, Daily, Ideas...' : 'Ej. Proyectos, Diario, Ideas...'}
              className="w-full px-3.5 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase opacity-65 mb-1.5">
              {isEnglish ? 'Folder Color' : 'Color identificativo'}
            </label>
            <ColorPickerPopover
              color={selectedColor}
              onChange={setSelectedColor}
              mode="inline"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-2xl border text-xs font-bold opacity-75 hover:opacity-100 transition-opacity"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {isEnglish ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="flex-1 py-2 rounded-2xl text-xs font-extrabold text-white transition-transform active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--bg-pill)', boxShadow: 'var(--pill-shadow)' }}
            >
              {isEnglish ? 'Create Folder' : 'Crear Carpeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
