import React, { useState, useMemo } from 'react';
import { ExtensionProps } from './types';
import { formatCleanDeviceName } from '../utils/deviceNetwork';
import {
  Clipboard,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Plus,
  Radio,
  FileText,
  Trash2,
  ClipboardPaste,
} from 'lucide-react';

export function writeTextToClipboardSafe(text: string): void {
  if (!text) return;
  if (window.crossDiaryNative?.writeSystemClipboard) {
    window.crossDiaryNative.writeSystemClipboard(text);
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackExecCopy(text);
    });
    return;
  }
  fallbackExecCopy(text);
}

function fallbackExecCopy(text: string): void {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch {}
}

export const ClipboardExtension: React.FC<ExtensionProps> = (props) => {
  const {
    currentNote,
    onUpdateNote,
    clipboardHistory,
    onAddClipboardEntry,
    onDeleteClipboardEntry,
  } = props;
  const [manualInput, setManualInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);

  const [currentLang, setCurrentLang] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es'
  );

  React.useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const safeHistory = Array.isArray(clipboardHistory)
    ? clipboardHistory
    : Array.isArray((props as any).history)
    ? (props as any).history
    : [];

  // Pinned entries: exactly one active card per distinct device that has copied something
  const pinnedByDevice = useMemo(() => {
    const map = new Map<string, typeof safeHistory[0]>();
    for (const item of safeHistory) {
      if (!item || !item.text || !item.text.trim()) continue;
      const deviceKey = formatCleanDeviceName(item.deviceName, item.deviceType, isEnglish);
      if (!map.has(deviceKey)) {
        map.set(deviceKey, item);
      }
    }
    return Array.from(map.values());
  }, [safeHistory]);

  const pinnedIds = useMemo(() => new Set(pinnedByDevice.map((p) => p.id)), [pinnedByDevice]);

  // Configurable history limit (default 10, persisted in localStorage)
  const [historyLimit, setHistoryLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('crossdiary_clip_history_limit');
      return saved ? Math.max(3, parseInt(saved, 10)) : 10;
    } catch {
      return 10;
    }
  });

  const handleLimitChange = (val: number) => {
    setHistoryLimit(val);
    try {
      localStorage.setItem('crossdiary_clip_history_limit', String(val));
    } catch {}
  };

  const olderItems = useMemo(
    () => safeHistory.filter((item) => !pinnedIds.has(item.id)).slice(0, historyLimit),
    [safeHistory, pinnedIds, historyLimit]
  );

  const handleCopyText = (id: string, text: string) => {
    writeTextToClipboardSafe(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsertIntoNote = (text: string) => {
    if (!currentNote) return;
    const snippet = `\n${text}\n`;
    onUpdateNote({
      content: (currentNote.content || '').trimEnd() + snippet,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleReadFromSystemClipboard = async () => {
    try {
      let text = '';
      if (window.crossDiaryNative?.getSystemClipboard) {
        text = await window.crossDiaryNative.getSystemClipboard();
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (text && text.trim()) {
        onAddClipboardEntry(text.trim());
        setCaptureStatus(isEnglish ? 'Synced!' : '¡Sincronizado!');
      } else {
        setCaptureStatus(isEnglish ? 'Empty' : 'Portapapeles vacío');
      }
    } catch {
      setCaptureStatus(isEnglish ? 'Paste below ↓' : 'Pega abajo ↓');
    }
    setTimeout(() => setCaptureStatus(null), 1800);
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Header and Live Status */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <Clipboard size={12} style={{ color: 'var(--accent)' }} />
          <span>{isEnglish ? 'Live Clipboard' : 'Portapapeles en Vivo'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReadFromSystemClipboard}
            className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
            title={isEnglish ? 'Capture and sync current clipboard content' : 'Capturar y sincronizar lo que tienes copiado ahora mismo'}
          >
            <ClipboardPaste size={10} style={{ color: 'var(--accent)' }} />
            <span>{captureStatus || (isEnglish ? 'Sync Now' : 'Sincronizar Ahora')}</span>
          </button>
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
            <Radio size={10} className="animate-pulse" />
            <span>{isEnglish ? 'LIVE' : 'EN VIVO'}</span>
          </div>
        </div>
      </div>

      {/* Pinned Active Items: One card per distinct device */}
      {pinnedByDevice.length > 0 ? (
        <div className="space-y-2">
          {pinnedByDevice.map((deviceItem) => {
            const isItemCopied = copiedId === deviceItem.id;
            return (
              <div
                key={deviceItem.id}
                className="p-2.5 rounded-2xl border space-y-2 transition-all shadow-sm"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-strong)' }}
              >
                <div className="flex items-center justify-between text-[9px] font-mono opacity-80">
                  <span className="flex items-center gap-1.5 font-bold">
                    {deviceItem.deviceType === 'desktop' ? <Monitor size={11} /> : <Smartphone size={11} />}
                    <span className="truncate max-w-[130px]">{formatCleanDeviceName(deviceItem.deviceName, deviceItem.deviceType, isEnglish)}</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-black/10 font-black uppercase">
                      {isEnglish ? 'PINNED' : 'FIJADO'}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>
                      {new Date(deviceItem.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {onDeleteClipboardEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteClipboardEntry(deviceItem.id)}
                        className="p-0.5 rounded hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                        title={isEnglish ? 'Delete clip' : 'Eliminar fragmento'}
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="p-2 rounded-xl border text-[11px] font-mono select-all leading-relaxed break-all max-h-24 overflow-y-auto no-scrollbar"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  {deviceItem.text}
                </div>

                {/* Compact buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  {currentNote && (
                    <button
                      type="button"
                      onClick={() => handleInsertIntoNote(deviceItem.text)}
                      className="py-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase border flex items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-main)',
                      }}
                      title={isEnglish ? 'Insert text into active sheet' : 'Insertar en hoja activa'}
                    >
                      <FileText size={10} />
                      <span>{isEnglish ? 'Insert' : 'Insertar'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyText(deviceItem.id, deviceItem.text)}
                    className="py-1 px-2.5 rounded-lg border text-[9px] font-extrabold uppercase flex items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform shadow-xs"
                    style={{
                      background: isItemCopied ? '#10B981' : 'var(--bg-pill)',
                      borderColor: 'var(--border-strong)',
                      color: isItemCopied ? '#FFFFFF' : 'var(--accent-fg)',
                    }}
                    title={isEnglish ? 'Copy text to clipboard' : 'Copiar texto al portapapeles'}
                  >
                    {isItemCopied ? <Check size={10} /> : <Copy size={10} />}
                    <span>{isItemCopied ? (isEnglish ? 'Copied!' : '¡Copiado!') : (isEnglish ? 'Copy' : 'Copiar')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="p-4 rounded-2xl border text-center space-y-1.5"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <Clipboard size={20} className="mx-auto opacity-35" style={{ color: 'var(--accent)' }} />
          <div className="text-xs font-bold uppercase opacity-80">{isEnglish ? 'Clipboard Empty' : 'Portapapeles Vacío'}</div>
          <p className="text-[10px] opacity-60 leading-relaxed">
            {isEnglish
              ? 'Copy any text on your PC or phone and it will appear here automatically in real time.'
              : 'Copia cualquier texto en tu PC o celular y aparecerá aquí automáticamente en tiempo real.'}
          </p>
        </div>
      )}

      {/* Manual Input / Quick Paste */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!manualInput.trim()) return;
          onAddClipboardEntry(manualInput.trim());
          setManualInput('');
        }}
        className="flex gap-1.5 pt-0.5"
      >
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={isEnglish ? 'Paste or send text to clipboard...' : 'Pegar o enviar texto al portapapeles...'}
          className="flex-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-medium focus:outline-none"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        />
        <button
          type="submit"
          className="px-2.5 py-1.5 rounded-xl border hover:scale-105 text-[10px] font-extrabold uppercase flex items-center gap-1"
          style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)', borderColor: 'var(--border-strong)' }}
          title={isEnglish ? 'Send to synced clipboard' : 'Enviar al portapapeles sincronizado'}
        >
          <Plus size={11} />
          <span>{isEnglish ? 'Send' : 'Enviar'}</span>
        </button>
      </form>

      {/* Previous Clipboard History List - Configurable limit and scrollable */}
      {olderItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <div className="text-[9px] font-black uppercase tracking-wider opacity-65 flex items-center gap-1.5">
              <span>{isEnglish ? 'Synced History' : 'Historial Sincronizado'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[8px] font-mono font-bold">
                {olderItems.length}
              </span>
            </div>

            {/* Configurable Limit Selector */}
            <div className="flex items-center gap-1 text-[9px] font-mono">
              <span className="opacity-50">{isEnglish ? 'Limit:' : 'Límite:'}</span>
              <select
                value={historyLimit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-1.5 py-0.5 rounded-lg border text-[9px] font-bold focus:outline-none cursor-pointer transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
                title={isEnglish ? 'Configure how many synced clips to display' : 'Configura cuántos clips sincronizados mostrar'}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {olderItems.map((item) => {
              const isItemCopied = copiedId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-2 rounded-xl border flex items-center justify-between gap-2 transition-all hover:border-[var(--border-strong)]"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono truncate select-all">{item.text}</div>
                    <div className="flex items-center gap-1.5 text-[8px] font-mono opacity-60 mt-0.5">
                      {item.deviceType === 'desktop' ? <Monitor size={8} /> : <Smartphone size={8} />}
                      <span>{formatCleanDeviceName(item.deviceName, item.deviceType, isEnglish)}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {currentNote && (
                      <button
                        type="button"
                        onClick={() => handleInsertIntoNote(item.text)}
                        className="p-1 rounded-lg border hover:scale-105 transition-transform"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                        title={isEnglish ? 'Insert in sheet' : 'Insertar en hoja'}
                      >
                        <FileText size={10} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyText(item.id, item.text)}
                      className="px-2 py-0.5 rounded-lg border text-[8.5px] font-extrabold uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform"
                      style={{
                        background: isItemCopied ? '#10B981' : 'var(--bg-pill)',
                        color: isItemCopied ? '#FFFFFF' : 'var(--accent-fg)',
                        borderColor: 'var(--border-strong)',
                      }}
                      title={isEnglish ? 'Copy this snippet' : 'Copiar este fragmento'}
                    >
                      {isItemCopied ? <Check size={9} /> : <Copy size={9} />}
                      <span>{isItemCopied ? (isEnglish ? 'Copied' : 'Copiado') : (isEnglish ? 'Copy' : 'Copiar')}</span>
                    </button>
                    {onDeleteClipboardEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteClipboardEntry(item.id)}
                        className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:text-red-500 transition-opacity"
                        title={isEnglish ? 'Delete' : 'Eliminar'}
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
