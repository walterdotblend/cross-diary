import React, { useState, useEffect } from 'react';
import { ExtensionProps } from './types';
import { NoteWidgetBlock, NoteWidgetType } from '../types/diary';
import {
  LayoutGrid,
  Clock,
  Timer,
  Gauge,
  Table,
  PenTool,
  ListChecks,
  Square,
  RectangleHorizontal,
  Plus,
  Image as ImageIcon,
  AlignLeft,
  AlignRight,
} from 'lucide-react';

export const NoteBlocksExtension: React.FC<ExtensionProps> = ({
  currentNote,
  onUpdateNote,
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

  const [shape, setShape] = useState<'wide' | 'square'>('square');
  const [align, setAlign] = useState<'left' | 'right' | 'center'>('left');

  const handleInsertWidget = (type: NoteWidgetType, imageUrl?: string) => {
    if (!currentNote) return;

    const titles: Record<NoteWidgetType, string> = {
      clock: isEnglish ? 'DIGITAL CLOCK' : 'RELOJ',
      timer: isEnglish ? 'TIMER' : 'TEMPORIZADOR',
      stopwatch: isEnglish ? 'STOPWATCH' : 'CRONÓMETRO',
      spreadsheet: isEnglish ? 'SPREADSHEET' : 'HOJA CÁLCULO',
      drawing: isEnglish ? 'SKETCH DRAWING' : 'BOCETO LÁPIZ',
      checklist: isEnglish ? 'CHECKLIST' : 'CHECKLIST',
      image: isEnglish ? 'IMAGE' : 'IMAGEN',
    };

    const newId = 'wdg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    const newWidget: NoteWidgetBlock = {
      id: newId,
      type,
      title: titles[type],
      shape,
      align: shape === 'square' ? align : 'center',
      imageUrl,
      transparentBg: true,
      strokeColor: '#FF2E00',
      timerDurationMinutes: 15,
      timerDurationSeconds: 0,
      timerSecondsLeft: 15 * 60,
      timerIsRunning: false,
      stopwatchMs: 0,
      gridData:
        type === 'spreadsheet'
          ? shape === 'square'
            ? [
                [isEnglish ? 'ITEM' : 'ITEM', isEnglish ? 'VAL' : 'VAL'],
                ['A', '100'],
                [isEnglish ? 'SUM' : 'SUMA', '=SUM()'],
              ]
            : [
                [isEnglish ? 'ITEM' : 'ITEM', isEnglish ? 'QTY' : 'CANT', isEnglish ? 'TOTAL' : 'TOTAL'],
                ['A', '10', '100'],
                ['B', '5', '50'],
                [isEnglish ? 'SUM' : 'SUMA', '', '=SUM()'],
              ]
          : undefined,
      checklistItems:
        type === 'checklist'
          ? [
              { id: 'ci-1-' + Date.now(), text: isEnglish ? 'Task 1' : 'Tarea 1', done: false },
              { id: 'ci-2-' + Date.now(), text: isEnglish ? 'Task 2' : 'Tarea 2', done: false },
            ]
          : undefined,
    };

    const token = `[[bloque:${newId}]]`;
    const nextContent = (currentNote.content || '').trimEnd() + `\n\n${token}\n`;

    onUpdateNote({
      content: nextContent,
      widgets: [...(currentNote.widgets || []), newWidget],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleInsertImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        handleInsertWidget('image', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const blocksList: {
    type: NoteWidgetType;
    label: string;
    detail: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: 'drawing',
      label: isEnglish ? 'Sketch / Drawing' : 'Boceto / Lápiz',
      detail: isEnglish ? 'Excalidraw-style, color wheel + transparent background' : 'Estilo Excalidraw, color wheel + sin fondo',
      icon: <PenTool size={13} />,
    },
    {
      type: 'timer',
      label: isEnglish ? 'Timer' : 'Temporizador',
      detail: isEnglish ? 'Editable duration, background countdown' : 'Tiempo editable por escrito, persiste en fondo',
      icon: <Timer size={13} />,
    },
    {
      type: 'checklist',
      label: isEnglish ? 'Task Checklist' : 'Checklist Tareas',
      detail: isEnglish ? 'Interactive tasks with optional daily reset' : 'Tareas interactivas con reinicio diario',
      icon: <ListChecks size={13} />,
    },
    {
      type: 'clock',
      label: isEnglish ? 'Live Digital Clock' : 'Reloj en Vivo',
      detail: isEnglish ? 'Real-time time and date display' : 'Hora y fecha sincronizada',
      icon: <Clock size={13} />,
    },
    {
      type: 'stopwatch',
      label: isEnglish ? 'Stopwatch' : 'Cronómetro',
      detail: isEnglish ? 'Millisecond precision lap counter' : 'Contador de tiempo en milisegundos',
      icon: <Gauge size={13} />,
    },
    {
      type: 'spreadsheet',
      label: isEnglish ? 'Spreadsheet' : 'Hoja de Cálculo',
      detail: isEnglish ? 'Mini table with formulas like =SUM()' : 'Mini tabla con fórmulas =SUM()',
      icon: <Table size={13} />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header and Layout Config */}
      <div className="space-y-2 pb-1 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase">
            <LayoutGrid size={13} style={{ color: 'var(--accent)' }} />
            <span>{isEnglish ? 'Insert NoteBlocks in Sheet' : 'Insertar Bloques en Hoja'}</span>
          </div>
        </div>

        {/* Shape and Alignment Controls */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div
            className="flex items-center p-0.5 rounded-xl border"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
          >
            <button
              type="button"
              onClick={() => setShape('square')}
              className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
              style={{
                background: shape === 'square' ? 'var(--bg-pill)' : 'transparent',
                color: shape === 'square' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <Square size={10} />
              <span>{isEnglish ? 'Square' : 'Cuadrado'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShape('wide')}
              className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
              style={{
                background: shape === 'wide' ? 'var(--bg-pill)' : 'transparent',
                color: shape === 'wide' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <RectangleHorizontal size={10} />
              <span>{isEnglish ? 'Wide' : 'Ancho'}</span>
            </button>
          </div>

          {shape === 'square' && (
            <div
              className="flex items-center p-0.5 rounded-xl border"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              title={isEnglish ? "Text alignment wrap: places text to the right or left" : "Ajuste de texto tipo Word: ubica el texto a la derecha o a la izquierda"}
            >
              <button
                type="button"
                onClick={() => setAlign('left')}
                className="px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase flex items-center gap-0.5 transition-all"
                style={{
                  background: align === 'left' ? 'var(--bg-pill)' : 'transparent',
                  color: align === 'left' ? 'var(--accent-fg)' : 'var(--text-main)',
                }}
              >
                <AlignLeft size={10} />
                <span>{isEnglish ? 'Left' : 'Izq'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAlign('right')}
                className="px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase flex items-center gap-0.5 transition-all"
                style={{
                  background: align === 'right' ? 'var(--bg-pill)' : 'transparent',
                  color: align === 'right' ? 'var(--accent-fg)' : 'var(--text-main)',
                }}
              >
                <AlignRight size={10} />
                <span>{isEnglish ? 'Right' : 'Der'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Insert Image Block */}
      <label className="flex items-center justify-between p-2 rounded-xl border border-dashed cursor-pointer hover:bg-black/5 transition-all">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} style={{ color: 'var(--accent)' }} />
          <div>
            <div className="text-[10px] font-extrabold uppercase">
              {isEnglish ? 'Insert Image in Sheet' : 'Insertar Imagen en Hoja'}
            </div>
            <div className="text-[9px] opacity-60">
              {isEnglish ? 'Smooth text wrap layout' : 'Ajuste de texto fluido como en Word'}
            </div>
          </div>
        </div>
        <Plus size={12} className="opacity-60" />
        <input
          type="file"
          accept="image/*"
          onChange={handleInsertImageFile}
          className="hidden"
        />
      </label>

      {/* Available Blocks List */}
      <div className="space-y-1.5">
        {blocksList.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => handleInsertWidget(b.type)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl border text-left hover:border-[var(--accent)] hover:translate-x-0.5 active:scale-[0.99] transition-all"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                {b.icon}
              </span>
              <div className="truncate">
                <div className="text-[11px] font-bold uppercase truncate">{b.label}</div>
                <div className="text-[9px] opacity-60 truncate">{b.detail}</div>
              </div>
            </div>
            <Plus size={12} style={{ color: 'var(--accent)' }} />
          </button>
        ))}
      </div>
    </div>
  );
};
