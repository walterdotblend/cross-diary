import React, { useState, useEffect } from 'react';
import { ExtensionProps } from './types';
import { BUILTIN_STICKER_PACK } from '../utils/storage';
import { NoteSticker } from '../types/diary';
import {
  Sticker,
  Upload,
  RotateCcw,
  Lock,
  Unlock,
  Trash2,
  Plus,
} from 'lucide-react';

export const StickersExtension: React.FC<ExtensionProps> = ({
  globalStickers,
  onUpdateGlobalStickers,
  extensionConfigs,
  onUpdateExtensionConfig,
  language,
}) => {
  const [currentLang, setCurrentLang] = useState(() =>
    language || (typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es')
  );

  useEffect(() => {
    if (language) setCurrentLang(language);
  }, [language]);

  useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const customPack = extensionConfigs.stickers.customPack || [];
  const fullPack = [...BUILTIN_STICKER_PACK, ...customPack];

  const handleAddSticker = (template: { name: string; url: string }) => {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    const defaultX = isSmallScreen
      ? Math.max(20, Math.floor((window.innerWidth - 96) / 2) + Math.floor(Math.random() * 40 - 20))
      : Math.max(80, window.innerWidth - 500 + Math.floor(Math.random() * 180));
    const defaultY = isSmallScreen
      ? Math.max(90, Math.floor(window.innerHeight * 0.28) + Math.floor(Math.random() * 60))
      : Math.floor(140 + Math.random() * 200);

    const newStk: NoteSticker = {
      id: 'stk-' + Date.now(),
      name: template.name,
      url: template.url,
      x: defaultX,
      y: defaultY,
      width: 96,
      rotation: 0,
    };
    onUpdateGlobalStickers([...globalStickers, newStk]);
  };

  const handleUploadCustom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        const newPackItem = {
          id: 'custom-stk-' + Date.now(),
          name: file.name.slice(0, 16),
          url: dataUrl,
        };
        // Add to permanent integrated pack
        const nextCustomPack = [...customPack, newPackItem];
        onUpdateExtensionConfig('stickers', { customPack: nextCustomPack });
        // Also place it on canvas immediately
        handleAddSticker(newPackItem);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFromPack = (packId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCustomPack = customPack.filter((item) => item.id !== packId);
    onUpdateExtensionConfig('stickers', { customPack: nextCustomPack });
  };

  const handleStraightenAll = () => {
    onUpdateGlobalStickers(globalStickers.map((s) => ({ ...s, rotation: 0 })));
  };

  const handleClearAll = () => {
    onUpdateGlobalStickers([]);
  };

  return (
    <div className="space-y-3">
      {/* Header and Quick Actions */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <Sticker size={13} style={{ color: 'var(--accent)' }} />
          <span>{isEnglish ? `Canvas Stickers (${globalStickers.length})` : `Pegatinas en Lienzo (${globalStickers.length})`}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleStraightenAll}
            className="p-1 rounded-lg border hover:bg-black/5"
            style={{ borderColor: 'var(--border-color)' }}
            title={isEnglish ? "Straighten all stickers (0°)" : "Enderezar todas las pegatinas (0°)"}
          >
            <RotateCcw size={11} />
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateExtensionConfig('stickers', {
                lockPositions: !extensionConfigs.stickers.lockPositions,
              })
            }
            className="p-1 rounded-lg border hover:bg-black/5"
            style={{
              borderColor: 'var(--border-color)',
              color: extensionConfigs.stickers.lockPositions ? 'var(--accent)' : undefined,
            }}
            title={
              extensionConfigs.stickers.lockPositions
                ? (isEnglish ? 'Unlock positions' : 'Desbloquear movimiento')
                : (isEnglish ? 'Lock positions to prevent accidental drag' : 'Bloquear posiciones para no moverlas por error')
            }
          >
            {extensionConfigs.stickers.lockPositions ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          {globalStickers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 rounded-lg opacity-40 hover:opacity-100 text-red-500"
              title={isEnglish ? "Clear all canvas stickers" : "Borrar todas las pegatinas del lienzo"}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Opacity Control */}
      <div className="space-y-1 text-[9px] font-bold uppercase opacity-85">
        <div className="flex justify-between">
          <span>{isEnglish ? 'Sticker Opacity:' : 'Opacidad de Pegatinas:'}</span>
          <span>{extensionConfigs.stickers.opacity ?? 100}%</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={extensionConfigs.stickers.opacity ?? 100}
          onChange={(e) =>
            onUpdateExtensionConfig('stickers', {
              opacity: Number(e.target.value),
            })
          }
          className="w-full accent-[var(--accent)] cursor-pointer"
        />
      </div>

      {/* Upload Custom Sticker Button */}
      <label className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed cursor-pointer hover:bg-black/5 transition-colors">
        <Upload size={12} style={{ color: 'var(--accent)' }} />
        <span className="text-[10px] font-bold uppercase">{isEnglish ? 'Upload Image to Sticker Pack...' : 'Subir Imagen al Pack Integrado...'}</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleUploadCustom}
          className="hidden"
        />
      </label>

      {/* Integrated Sticker Pack Grid */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold opacity-60 uppercase">
          {isEnglish ? `Built-in Pack (${fullPack.length}):` : `Pack Integrado (${fullPack.length}):`}
        </div>
        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {fullPack.map((item) => {
            const isCustom = item.id.startsWith('custom-stk-');
            return (
              <div
                key={item.id}
                onClick={() => handleAddSticker(item)}
                className="p-1.5 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer relative group"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                title={isEnglish ? `Add ${item.name} to canvas` : `Añadir ${item.name} al lienzo`}
              >
                <img src={item.url} alt={item.name} className="h-10 w-auto object-contain select-none pointer-events-none" />
                {isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFromPack(item.id, e)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isEnglish ? "Delete from my pack" : "Eliminar de mi pack"}
                  >
                    <Trash2 size={8} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
