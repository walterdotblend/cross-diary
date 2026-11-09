import React, { useState } from 'react';
import { UserExtension } from '../types/diary';
import { ExtensionProps } from '../extensions/types';
import { renderExtensionWidget, getExtensionIcon } from '../extensions/registry';
import { ArrowLeft, Pin, Check, Sparkles } from 'lucide-react';

interface ExtensionsHubViewProps {
  extensions: UserExtension[];
  currentNote: any;
  onUpdateNote: (note: any) => void;
  globalStickers: any[];
  onUpdateGlobalStickers: (stk: any[]) => void;
  vaultNotes: any[];
  decoyNotes: any[];
  vaultMode: any;
  onUnlockVault: (m: any) => void;
  onAddVaultNote: (title: string, content: string) => any;
  onDeleteVaultNote: (id: string) => void;
  onPanicLock: () => void;
  clipboardHistory: any[];
  onAddClipboardEntry: (text: string) => void;
  onDeleteClipboardEntry: (id: string) => void;
  extensionConfigs: any;
  onUpdateExtensionConfig: (k: any, patch: any) => void;
  pinnedQuickExtensionId?: string;
  onPinQuickExtension: (extId: string) => void;
  initialExtensionId?: string | null;
}

export const ExtensionsHubView: React.FC<ExtensionsHubViewProps> = (props) => {
  const [selectedExtId, setSelectedExtId] = useState<string | null>(props.initialExtensionId || null);

  React.useEffect(() => {
    setSelectedExtId(props.initialExtensionId || null);
  }, [props.initialExtensionId]);

  const selectedExt = props.extensions.find((e) => e.id === selectedExtId);

  const extensionProps: ExtensionProps = {
    currentNote: props.currentNote,
    onUpdateNote: props.onUpdateNote,
    globalStickers: props.globalStickers,
    onUpdateGlobalStickers: props.onUpdateGlobalStickers,
    vaultNotes: props.vaultNotes,
    decoyNotes: props.decoyNotes,
    vaultMode: props.vaultMode,
    vaultSecondsLeft: 0,
    onUnlockVault: props.onUnlockVault,
    onAddVaultNote: (isDecoy) => props.onAddVaultNote(isDecoy ? 'Nota Decoy' : 'Nota Bóveda', ''),
    onSelectVaultNote: () => {},
    onDeleteVaultNote: (id) => props.onDeleteVaultNote(id),
    onPanicLock: props.onPanicLock,
    clipboardHistory: props.clipboardHistory || [],
    onAddClipboardEntry: props.onAddClipboardEntry,
    onDeleteClipboardEntry: props.onDeleteClipboardEntry,
    extensionConfigs: props.extensionConfigs,
    onUpdateExtensionConfig: props.onUpdateExtensionConfig,
    allExtensions: props.extensions,
    onSelectExtension: (id) => setSelectedExtId(id),
  };

  if (selectedExt) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-main)]">
        <div
          className="p-3 border-b flex items-center justify-between shrink-0 bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={() => setSelectedExtId(null)}
            className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <ArrowLeft size={14} />
            <span>Extensiones</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-display-brutal uppercase">
              {selectedExt.name}
            </span>
            <button
              type="button"
              onClick={() => props.onPinQuickExtension(selectedExt.id)}
              className="p-1.5 rounded-xl border hover:scale-105 active:scale-95 transition-transform"
              style={{
                background: props.pinnedQuickExtensionId === selectedExt.id ? 'var(--bg-pill)' : 'var(--bg-card)',
                color: props.pinnedQuickExtensionId === selectedExt.id ? 'var(--accent-fg)' : 'inherit',
                borderColor: 'var(--border-color)',
              }}
              title="Fijar en acceso rápido de la barra inferior"
            >
              <Pin size={13} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {renderExtensionWidget(selectedExt, extensionProps)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
      <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h2 className="text-xs font-display-brutal uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            Centro de Extensiones
          </h2>
          <p className="text-[10px] opacity-65">
            Módulos modulares e independientes para Cross-Diary
          </p>
        </div>
        <Sparkles size={16} style={{ color: 'var(--accent)' }} />
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {props.extensions.map((ext) => {
          const isPinned = props.pinnedQuickExtensionId === ext.id;
          return (
            <div
              key={ext.id}
              className="p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 shadow-sm"
              style={{
                background: 'var(--bg-card)',
                borderColor: isPinned ? 'var(--accent)' : 'var(--border-color)',
              }}
            >
              <div
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => setSelectedExtId(ext.id)}
              >
                <div
                  className="w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--accent)',
                  }}
                >
                  {getExtensionIcon(ext.type)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-display-brutal uppercase truncate flex items-center gap-1.5">
                    <span>{ext.name}</span>
                    {isPinned && (
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[8px] font-bold uppercase"
                        style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                      >
                        En Barra
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-65 truncate leading-tight">
                    {ext.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => props.onPinQuickExtension(ext.id)}
                  className={`p-2 rounded-xl border text-[10px] font-bold flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform ${
                    isPinned ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    background: isPinned ? 'var(--bg-pill)' : 'var(--bg-surface)',
                    color: isPinned ? 'var(--accent-fg)' : 'inherit',
                    borderColor: 'var(--border-color)',
                  }}
                  title={isPinned ? 'Fijada en acceso rápido' : 'Fijar en acceso rápido de la barra inferior'}
                >
                  <Pin size={12} />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedExtId(ext.id)}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-extrabold uppercase hover:scale-105 active:scale-95 transition-transform"
                  style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--accent)',
                  }}
                >
                  Abrir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
