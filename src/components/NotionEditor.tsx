import React, { useState, useRef, useEffect } from 'react';
import {
  Note,
  NoteWidgetBlock,
  NoteResetMode,
  ChronoSettings,
  ResourceShare,
  PinnedNotificationItem,
  FolderGroup,
} from '../types/diary';
import { playTimerAlarm } from '../utils/sound';
import { BUILTIN_STICKER_PACK } from '../utils/storage';
import { ShareAndSettingsModal } from './ShareAndSettingsModal';
import { ColorPickerPopover } from './ColorPickerPopover';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Edit3,
  Eye,
  ShieldAlert,
  RotateCcw,
  CalendarClock,
  Play,
  Pause,
  Plus,
  Trash2,
  Clock,
  Timer,
  Table,
  PenTool,
  ListChecks,
  Gauge,
  ArrowUp,
  ArrowDown,
  Square,
  RectangleHorizontal,
  Eraser,
  Undo2,
  Circle,
  Slash,
  MoveUpRight,
  AlignLeft,
  AlignRight,
  Image as ImageIcon,
  ArrowLeft,
  LayoutGrid,
  Sticker,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  Share2,
  Settings,
} from 'lucide-react';

interface NotionEditorProps {
  note: Note | null;
  onUpdateNote: (updated: Partial<Note>) => void;
  onPasteImageSticker?: (dataUrl: string) => void;
  showPanicButton?: boolean;
  onPanicLock?: () => void;
  chronoSettings?: ChronoSettings;
  onBack?: () => void;
  onPlaceSticker?: (sticker: { name: string; url: string }) => void;
  shares?: ResourceShare[];
  onUpdateShares?: (updatedShares: ResourceShare[]) => void;
  pinnedItems?: PinnedNotificationItem[];
  onUpdatePinnedItems?: (items: PinnedNotificationItem[]) => void;
  groups?: FolderGroup[];
  allNotes?: Note[];
  language?: string;
  onUpdateGroup?: (groupId: string, patch: Partial<FolderGroup>) => void;
}

interface SlashCommand {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  template: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Título 1', detail: 'Encabezado gigante', icon: <Heading1 size={14} />, template: '\n# ' },
  { id: 'h2', label: 'Título 2', detail: 'Subtítulo de sección', icon: <Heading2 size={14} />, template: '\n## ' },
  { id: 'h3', label: 'Título 3', detail: 'Encabezado compacto', icon: <Heading3 size={14} />, template: '\n### ' },
  { id: 'todo', label: 'Casilla de tarea', detail: 'Checklist interactivo', icon: <CheckSquare size={14} />, template: '\n- [ ] ' },
  { id: 'quote', label: 'Cita / Callout', detail: 'Bloque resaltado', icon: <Quote size={14} />, template: '\n> ' },
  { id: 'code', label: 'Bloque de código', detail: 'Fragmento monospace', icon: <Code size={14} />, template: '\n```\n\n```' },
  { id: 'divider', label: 'Separador', detail: 'Línea divisoria', icon: <Minus size={14} />, template: '\n---\n' },
];

type DrawTool = 'pen' | 'line' | 'rect' | 'circle' | 'arrow' | 'eraser';

// --- Excalidraw-Style Drawing Widget (Edit Mode vs View Mode, Color Wheel + HEX + Transparent Background) ---
const NoteDrawingCanvas: React.FC<{
  widget: NoteWidgetBlock;
  isEditMode: boolean;
  onUpdate: (patch: Partial<NoteWidgetBlock>) => void;
  isEnglish?: boolean;
}> = ({ widget, isEditMode, onUpdate, isEnglish = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<string[]>([]);
  const isDrawingRef = useRef(false);
  const startPtRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [tool, setTool] = useState<DrawTool>('pen');
  const [strokeColor, setStrokeColor] = useState(widget.strokeColor || '#FF2E00');
  const [hexInput, setHexInput] = useState(widget.strokeColor || '#FF2E00');
  const [lineWidth, setLineWidth] = useState(3);

  const isSquare = widget.shape === 'square';
  const canvasW = isSquare ? 180 : 340;
  const canvasH = isSquare ? 150 : 165;
  const transparentBg = widget.transparentBg !== false; // Default transparent Excalidraw feel

  // Load saved drawing onto canvas when entering edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (widget.drawingDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = widget.drawingDataUrl;
    }
  }, [widget.id, isEditMode, isSquare]);

  // VIEW MODE (`LECTURA`): Only show the finished drawing! No editing controls, no accidental drawing!
  if (!isEditMode) {
    if (!widget.drawingDataUrl) {
      return (
        <div className="text-[10px] italic opacity-45 py-2 text-center">
          {typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en'
            ? '(Empty sketch — switch to WRITE to draw)'
            : '(Boceto vacío — cambia a ESCRIBIR para dibujar)'}
        </div>
      );
    }
    return (
      <div
        className={`w-full flex items-center justify-center overflow-hidden ${
          transparentBg ? 'bg-transparent py-1' : 'bg-white rounded-xl p-2 border border-[var(--border-color)]'
        }`}
      >
        <img
          src={widget.drawingDataUrl}
          alt={widget.title || 'Dibujo'}
          draggable={false}
          className="max-h-[145px] max-w-full h-auto object-contain select-none pointer-events-none"
        />
      </div>
    );
  }

  const applyColor = (newHex: string) => {
    setHexInput(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex) || /^#[0-9A-Fa-f]{3}$/.test(newHex)) {
      setStrokeColor(newHex);
      onUpdate({ strokeColor: newHex });
    }
  };

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save undo state
    historyRef.current = [...historyRef.current.slice(-12), canvas.toDataURL('image/png')];
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    isDrawingRef.current = true;
    const pt = getCoords(e);
    startPtRef.current = pt;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCoords(e);
    const start = startPtRef.current;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      return;
    }

    // Shape tools: restore snapshot first
    if (snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
    }
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    if (tool === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, pt.x - start.x, pt.y - start.y);
    } else if (tool === 'circle') {
      const rx = Math.abs(pt.x - start.x) / 2;
      const ry = Math.abs(pt.y - start.y) / 2;
      const cx = Math.min(start.x, pt.x) + rx;
      const cy = Math.min(start.y, pt.y) + ry;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'arrow') {
      const headLen = 10;
      const angle = Math.atan2(pt.y - start.y, pt.x - start.x);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(
        pt.x - headLen * Math.cos(angle - Math.PI / 6),
        pt.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(
        pt.x - headLen * Math.cos(angle + Math.PI / 6),
        pt.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.globalCompositeOperation = 'source-over';
      onUpdate({ drawingDataUrl: canvas.toDataURL('image/png') });
    }
  };

  const handleUndo = () => {
    const prevUrl = historyRef.current.pop();
    if (prevUrl === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      onUpdate({ drawingDataUrl: canvas.toDataURL('image/png') });
    };
    img.src = prevUrl;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.push(canvas.toDataURL('image/png'));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onUpdate({ drawingDataUrl: '' });
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Excalidraw Shape Tools + Transparent Background Toggle */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          {[
            { id: 'pen' as const, icon: <PenTool size={11} />, label: isEnglish ? 'Pencil' : 'Lápiz libre' },
            { id: 'line' as const, icon: <Slash size={11} />, label: isEnglish ? 'Line' : 'Línea' },
            { id: 'rect' as const, icon: <Square size={11} />, label: isEnglish ? 'Rectangle' : 'Rectángulo' },
            { id: 'circle' as const, icon: <Circle size={11} />, label: isEnglish ? 'Circle' : 'Círculo' },
            { id: 'arrow' as const, icon: <MoveUpRight size={11} />, label: isEnglish ? 'Arrow' : 'Flecha' },
            { id: 'eraser' as const, icon: <Eraser size={11} />, label: isEnglish ? 'Eraser' : 'Borrador' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: tool === t.id ? 'var(--bg-pill)' : 'transparent',
                color: tool === t.id ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ transparentBg: !transparentBg })}
            className="px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border transition-all"
            style={{
              background: transparentBg ? 'var(--bg-pill)' : 'var(--bg-card)',
              color: transparentBg ? 'var(--accent-fg)' : 'var(--text-main)',
              borderColor: 'var(--border-color)',
            }}
            title={isEnglish ? "Toggle transparent (view mode) or white background" : "Alternar dibujo sin fondo (transparente en modo lectura) o con fondo blanco"}
          >
            {transparentBg ? (isEnglish ? '✓ Transparent' : '✓ Sin Fondo') : (isEnglish ? 'White Bg' : 'Fondo Blanco')}
          </button>

          <button
            type="button"
            onClick={handleUndo}
            className="p-1 rounded-lg border hover:scale-105"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            title={isEnglish ? "Undo stroke" : "Deshacer trazo"}
          >
            <Undo2 size={11} />
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-1.5 py-1 rounded-lg text-[9px] font-bold uppercase bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white"
            title={isEnglish ? "Clear drawing" : "Borrar todo el dibujo"}
          >
            {isEnglish ? 'Clear' : 'Borrar'}
          </button>
        </div>
      </div>

      {/* Row 2: Chromatic Color Popover + Stroke Thickness */}
      <div className="flex items-center justify-between gap-1.5">
        <ColorPickerPopover
          color={strokeColor}
          onChange={applyColor}
          mode="button-only"
          align="left"
        />

        {/* Stroke Width Slider Bar */}
        <div className="flex items-center gap-1.5" title={`${isEnglish ? 'Stroke width:' : 'Grosor del trazo:'} ${lineWidth}px`}>
          <span className="text-[9px] font-bold opacity-60">{isEnglish ? 'Stroke:' : 'Grosor:'}</span>
          <input
            type="range"
            min="1"
            max="24"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-16 accent-[var(--accent)] cursor-pointer h-1.5"
          />
          <span className="text-[9px] font-mono font-bold w-4 text-right">{lineWidth}px</span>
        </div>
      </div>

      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          borderColor: 'var(--border-strong)',
          backgroundImage: transparentBg
            ? 'radial-gradient(rgba(128,128,128,0.22) 1px, transparent 1px)'
            : 'none',
          backgroundSize: '10px 10px',
          backgroundColor: transparentBg ? 'transparent' : '#FFFFFF',
        }}
        className={`w-full rounded-xl border-2 border-dashed cursor-crosshair touch-none ${
          isSquare ? 'h-[145px]' : 'h-[160px]'
        }`}
      />
    </div>
  );
};

// --- Single In-Note Widget Card (Supports Edit vs View Mode & Square vs Wide Layout!) ---
const SingleNoteWidgetCard: React.FC<{
  widget: NoteWidgetBlock;
  isEditMode: boolean;
  onUpdate: (patch: Partial<NoteWidgetBlock>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  nowTime: Date;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  isStopwatchRunning: boolean;
  onToggleStopwatch: () => void;
  isEnglish?: boolean;
  onDragWidget?: (sourceId: string, targetId: string) => void;
}> = ({
  widget,
  isEditMode,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  nowTime,
  isTimerRunning,
  onToggleTimer,
  isStopwatchRunning,
  onToggleStopwatch,
  isEnglish = false,
  onDragWidget,
}) => {
  const [newCheckText, setNewCheckText] = useState('');
  const isSquare = widget.shape === 'square';

  const evalCell = (raw: string, grid: string[][]): string => {
    if (!raw || !raw.startsWith('=')) return raw;
    try {
      const expr = raw.slice(1).toUpperCase().trim();
      if (expr.startsWith('SUM(')) {
        let sum = 0;
        for (const r of grid) {
          for (const c of r) {
            if (!c.startsWith('=')) {
              const n = parseFloat(c);
              if (!isNaN(n)) sum += n;
            }
          }
        }
        return String(Math.round(sum * 100) / 100);
      }
      if (/^[0-9+\-*/().\s]+$/.test(expr)) {
        const res = Function(`"use strict"; return (${expr})`)();
        return String(Math.round(Number(res) * 100) / 100);
      }
    } catch {}
    return raw;
  };

  // Borderless transparent container when viewing a transparent drawing in LECTURA mode
  if (!isEditMode && widget.type === 'drawing' && widget.transparentBg !== false) {
    return (
      <div className="my-1">
        <NoteDrawingCanvas widget={widget} isEditMode={false} onUpdate={onUpdate} isEnglish={isEnglish} />
      </div>
    );
  }

  return (
    <div
      data-widget-card="true"
      draggable={isEditMode}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', widget.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        const src = e.dataTransfer.getData('text/plain');
        if (src && src !== widget.id) {
          onDragWidget?.(src, widget.id);
        }
      }}
      className={`p-2.5 rounded-2xl border-2 space-y-2 transition-all flex flex-col justify-between ${
        isSquare ? 'min-h-[155px]' : ''
      }`}
      style={{
        background: 'var(--bg-surface)',
        borderColor: isEditMode ? 'var(--border-strong)' : 'var(--border-color)',
      }}
    >
      {/* Header: Full controls in Edit mode, minimal title in View mode */}
      <div className="flex items-center justify-between gap-1">
        <div
          className="flex items-center gap-1 text-[10px] font-dot-matrix font-bold uppercase min-w-0 flex-1"
          style={{ color: 'var(--accent)' }}
        >
          {widget.type === 'clock' && <Clock size={11} className="shrink-0" />}
          {widget.type === 'timer' && <Timer size={11} className="shrink-0" />}
          {widget.type === 'stopwatch' && <Gauge size={11} className="shrink-0" />}
          {widget.type === 'spreadsheet' && <Table size={11} className="shrink-0" />}
          {widget.type === 'drawing' && <PenTool size={11} className="shrink-0" />}
          {widget.type === 'checklist' && <ListChecks size={11} className="shrink-0" />}
          {widget.type === 'image' && <ImageIcon size={11} className="shrink-0" />}
          {isEditMode ? (
            <input
              type="text"
              value={widget.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="bg-transparent font-extrabold uppercase focus:outline-none truncate w-full"
              style={{ color: 'var(--text-main)' }}
            />
          ) : (
            <span className="truncate font-extrabold" style={{ color: 'var(--text-main)' }}>
              {widget.title}
            </span>
          )}
        </div>

        {isEditMode && (
          <div className="flex items-center gap-0.5 shrink-0">
            {isSquare && (
              <>
                <button
                  type="button"
                  onClick={() => onUpdate({ align: 'left' })}
                  className={`p-1 rounded-lg hover:bg-black/10 transition-colors ${
                    (widget.align || 'left') === 'left' ? 'text-[var(--accent)] font-bold' : 'opacity-60'
                  }`}
                  title={isEnglish ? "Word wrap: Float left (text on right)" : "Ajuste Word: Flotar a la izquierda (texto a la derecha)"}
                >
                  <AlignLeft size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ align: 'right' })}
                  className={`p-1 rounded-lg hover:bg-black/10 transition-colors ${
                    widget.align === 'right' ? 'text-[var(--accent)] font-bold' : 'opacity-60'
                  }`}
                  title={isEnglish ? "Word wrap: Float right (text on left)" : "Ajuste Word: Flotar a la derecha (texto a la izquierda)"}
                >
                  <AlignRight size={11} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onUpdate({ shape: isSquare ? 'wide' : 'square' })}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
              title={isSquare ? (isEnglish ? 'Switch to wide layout' : 'Cambiar a versión ancha') : (isEnglish ? 'Switch to square layout' : 'Cambiar a versión cuadrada')}
            >
              {isSquare ? <RectangleHorizontal size={11} /> : <Square size={11} />}
            </button>
            {onMoveUp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className="p-1 rounded-lg hover:bg-[var(--accent)] hover:text-white transition-all active:scale-90"
                title={isEnglish ? "Move block up in note" : "Subir bloque en la nota"}
              >
                <ArrowUp size={12} />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className="p-1 rounded-lg hover:bg-[var(--accent)] hover:text-white transition-all active:scale-90"
                title={isEnglish ? "Move block down in note" : "Bajar bloque en la nota"}
              >
                <ArrowDown size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors"
              title={isEnglish ? "Delete block" : "Eliminar bloque"}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* 1. CLOCK */}
      {widget.type === 'clock' && (
        <div
          className={`flex ${
            isSquare ? 'flex-col justify-center items-center py-3 text-center' : 'items-center justify-between px-3 py-2'
          } rounded-xl flex-1`}
          style={{ background: 'var(--bg-card)' }}
        >
          <div
            className={`${isSquare ? 'text-xl' : 'text-2xl'} font-display-brutal tracking-wider`}
            style={{ color: 'var(--accent)' }}
          >
            {nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[9px] font-dot-matrix font-bold uppercase opacity-75 mt-0.5">
            {nowTime.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        </div>
      )}

      {/* 2. TIMER (Duration editable ONLY by direct writing/typing numbers!) */}
      {widget.type === 'timer' && (() => {
        const totalSec = widget.timerSecondsLeft ?? (widget.timerDurationMinutes || 15) * 60;
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return (
          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            <div
              className={`flex ${
                isSquare ? 'flex-col items-center justify-center gap-2 py-2' : 'items-center justify-between px-3 py-2'
              } rounded-xl`}
              style={{ background: 'var(--bg-card)' }}
            >
              <span
                className={`${isSquare ? 'text-xl' : 'text-2xl'} font-display-brutal tracking-wider`}
                style={{ color: 'var(--accent)' }}
              >
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleTimer}
                  className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  {isTimerRunning ? <Pause size={9} /> : <Play size={9} />}
                  <span>{isTimerRunning ? (isEnglish ? 'Pause' : 'Pausa') : (isEnglish ? 'Start' : 'Iniciar')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const resetDuration = (widget.timerDurationMinutes || 15) * 60 + (widget.timerDurationSeconds || 0);
                    onUpdate({
                      timerSecondsLeft: resetDuration,
                      timerIsRunning: false,
                      timerTargetEndTime: undefined,
                    });
                  }}
                  className="p-1 rounded-full border"
                  style={{ borderColor: 'var(--border-color)' }}
                  title={isEnglish ? "Reset" : "Reiniciar"}
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            </div>

            {/* Duration settings editable ONLY by typing numbers directly in Edit Mode (`ESCRIBIR`)! */}
            {isEditMode && (
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--border-color)]">
                <span className="text-[9px] font-bold uppercase opacity-70">{isEnglish ? "Set time:" : "Escribir tiempo:"}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={mins}
                    onChange={(e) => {
                      const newM = Math.max(0, parseInt(e.target.value, 10) || 0);
                      const total = newM * 60 + secs;
                      onUpdate({
                        timerDurationMinutes: newM,
                        timerDurationSeconds: secs,
                        timerSecondsLeft: total,
                        timerTargetEndTime: isTimerRunning ? Date.now() + total * 1000 : undefined,
                      });
                    }}
                    className="w-10 px-1 py-0.5 rounded text-center text-[10px] font-mono font-bold border focus:outline-none"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                    title={isEnglish ? "Minutes" : "Minutos"}
                  />
                  <span className="text-[9px] font-bold opacity-60">m</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={secs}
                    onChange={(e) => {
                      const newS = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                      const total = mins * 60 + newS;
                      onUpdate({
                        timerDurationMinutes: mins,
                        timerDurationSeconds: newS,
                        timerSecondsLeft: total,
                        timerTargetEndTime: isTimerRunning ? Date.now() + total * 1000 : undefined,
                      });
                    }}
                    className="w-8 px-1 py-0.5 rounded text-center text-[10px] font-mono font-bold border focus:outline-none"
                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
                    title={isEnglish ? "Seconds" : "Segundos"}
                  />
                  <span className="text-[9px] font-bold opacity-60">s</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. STOPWATCH */}
      {widget.type === 'stopwatch' && (() => {
        const totalSec = Math.floor((widget.stopwatchMs || 0) / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return (
          <div
            className={`flex ${
              isSquare ? 'flex-col items-center justify-center gap-2 py-2' : 'items-center justify-between px-3 py-2'
            } rounded-xl flex-1`}
            style={{ background: 'var(--bg-card)' }}
          >
            <span
              className={`${isSquare ? 'text-xl' : 'text-2xl'} font-display-brutal tracking-wider`}
              style={{ color: 'var(--accent)' }}
            >
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleStopwatch}
                className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1"
                style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
              >
                {isStopwatchRunning ? <Pause size={9} /> : <Play size={9} />}
                <span>{isStopwatchRunning ? (isEnglish ? 'Stop' : 'Parar') : (isEnglish ? 'Start' : 'Contar')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isStopwatchRunning) onToggleStopwatch();
                  onUpdate({ stopwatchMs: 0 });
                }}
                className="p-1 rounded-full border"
                style={{ borderColor: 'var(--border-color)' }}
                title={isEnglish ? "Reset" : "Poner a cero"}
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 4. MINI SPREADSHEET (Editable in Edit Mode, Clean Calculated Table in View Mode!) */}
      {widget.type === 'spreadsheet' && (() => {
        const grid = widget.gridData || [
          ['ITEM', 'VALOR'],
          ['A', '120'],
          ['B', '80'],
          ['TOTAL', '=SUM()'],
        ];
        return (
          <div className="overflow-x-auto no-scrollbar rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-[10px] border-collapse" style={{ background: 'var(--bg-card)' }}>
              <tbody>
                {grid.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx === 0 ? 'font-extrabold border-b-2' : 'border-b'}
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {row.map((cell, cIdx) => {
                      const isFormula = cell.startsWith('=');
                      const evaluated = evalCell(cell, grid);
                      return (
                        <td
                          key={cIdx}
                          className="border-r last:border-r-0 p-1"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          {isEditMode ? (
                            <div>
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => {
                                  const nextGrid = grid.map((r, ri) =>
                                    ri === rIdx ? r.map((c, ci) => (ci === cIdx ? e.target.value : c)) : r
                                  );
                                  onUpdate({ gridData: nextGrid });
                                }}
                                className="w-full bg-transparent px-1 py-0.5 focus:outline-none text-[10px]"
                                style={{
                                  color: rIdx === 0 || isFormula ? 'var(--accent)' : 'var(--text-main)',
                                  fontWeight: rIdx === 0 || isFormula ? 800 : 500,
                                }}
                              />
                              {isFormula && (
                                <div className="text-[8px] font-dot-matrix px-1 opacity-75">
                                  = {evaluated}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="px-1.5 py-0.5"
                              style={{
                                color: rIdx === 0 || isFormula ? 'var(--accent)' : 'var(--text-main)',
                                fontWeight: rIdx === 0 || isFormula ? 800 : 500,
                              }}
                            >
                              {evaluated}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditMode && (
              <div className="flex items-center justify-between px-2 py-1 text-[8px] opacity-75 bg-[var(--bg-surface)]">
                <span>{isEnglish ? "Use =SUM() or =10+20" : "Usa =SUM() o =10+20"}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        gridData: [...grid, Array(grid[0]?.length || 2).fill('')],
                      })
                    }
                    className="font-bold underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {isEnglish ? "+ Row" : "+ Fila"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate({
                        gridData: grid.map((r) => [...r, '']),
                      })
                    }
                    className="font-bold underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {isEnglish ? "+ Col" : "+ Col"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 5. DRAWING PENCIL WIDGET (Excalidraw style) */}
      {widget.type === 'drawing' && (
        <NoteDrawingCanvas widget={widget} isEditMode={isEditMode} onUpdate={onUpdate} isEnglish={isEnglish} />
      )}

      {/* 6. CHECKLIST WIDGET */}
      {widget.type === 'checklist' && (() => {
        const items = widget.checklistItems || [];
        return (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  const nextItems = items.map((it) =>
                    it.id === item.id ? { ...it, done: !it.done } : it
                  );
                  onUpdate({ checklistItems: nextItems });
                }}
                className="flex items-center justify-between px-2 py-1 rounded-xl cursor-pointer transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${item.done ? 'var(--accent)' : 'var(--border-color)'}`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 accent-[var(--accent)]"
                  />
                  <span
                    className={`text-[11px] font-bold truncate ${
                      item.done ? 'line-through opacity-50' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({
                        checklistItems: items.filter((it) => it.id !== item.id),
                      });
                    }}
                    title={isEnglish ? "Delete" : "Eliminar"}
                    className="opacity-40 hover:opacity-100 text-red-500 p-0.5"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {isEditMode && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCheckText.trim()) return;
                  onUpdate({
                    checklistItems: [
                      ...items,
                      { id: 'ci-' + Date.now(), text: newCheckText.trim(), done: false },
                    ],
                  });
                  setNewCheckText('');
                }}
                className="flex items-center gap-1 pt-0.5"
              >
                <input
                  type="text"
                  value={newCheckText}
                  onChange={(e) => setNewCheckText(e.target.value)}
                  placeholder={isEnglish ? "Add task..." : "Añadir tarea..."}
                  className="flex-1 px-2 py-1 rounded-lg text-[10px] font-bold focus:outline-none border"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    borderColor: 'var(--border-color)',
                  }}
                />
                <button
                  type="submit"
                  title={isEnglish ? "Add" : "Añadir"}
                  className="p-1 rounded-lg"
                  style={{ background: 'var(--bg-pill)', color: 'var(--accent-fg)' }}
                >
                  <Plus size={11} />
                </button>
              </form>
            )}
          </div>
        );
      })()}

      {/* 7. IMAGE WIDGET (Word-style text wrap!) */}
      {widget.type === 'image' && (
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-black/5">
          {widget.imageUrl ? (
            <img
              src={widget.imageUrl}
              alt={widget.title || 'Imagen'}
              className="max-h-[145px] w-auto object-contain rounded-xl select-none"
            />
          ) : (
            <div className="text-[10px] opacity-50 py-4 italic">Sin imagen</div>
          )}
        </div>
      )}
    </div>
  );
};

export const NotionEditor: React.FC<NotionEditorProps> = ({
  note,
  onUpdateNote,
  onPasteImageSticker,
  showPanicButton,
  onPanicLock,
  chronoSettings,
  onBack,
  onPlaceSticker,
  shares = [],
  onUpdateShares,
  pinnedItems = [],
  onUpdatePinnedItems,
  groups = [],
  allNotes = [],
  language,
  onUpdateGroup,
}) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [resetFlash, setResetFlash] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  // In-sheet search keyboard shortcut (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const rawContent = note?.content || '';
  const searchMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: number[] = [];
    let idx = 0;
    const lower = rawContent.toLowerCase();
    while ((idx = lower.indexOf(q, idx)) !== -1) {
      matches.push(idx);
      idx += q.length;
    }
    return matches;
  }, [rawContent, searchQuery]);

  const updateCurrentNote = React.useCallback(
    (patch: Partial<Note>) => {
      if (!note?.id) return;
      onUpdateNote({ ...patch, id: note.id });
    },
    [note?.id, onUpdateNote]
  );

  const handleInsertWidgetBlock = (type: NoteWidgetBlock['type']) => {
    if (!note) return;
    const titles: Record<NoteWidgetBlock['type'], string> = {
      clock: isEnglish ? 'CLOCK' : 'RELOJ',
      timer: isEnglish ? 'TIMER' : 'TEMPORIZADOR',
      stopwatch: isEnglish ? 'STOPWATCH' : 'CRONÓMETRO',
      spreadsheet: isEnglish ? 'SPREADSHEET' : 'HOJA CÁLCULO',
      drawing: isEnglish ? 'SKETCH' : 'BOCETO LÁPIZ',
      checklist: 'CHECKLIST',
      image: isEnglish ? 'IMAGE' : 'IMAGEN',
    };
    const newId = 'wdg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    const newWidget: NoteWidgetBlock = {
      id: newId,
      type,
      title: titles[type] || 'BLOQUE',
      shape: type === 'checklist' || type === 'spreadsheet' ? 'wide' : 'square',
      align: 'left',
      transparentBg: true,
      strokeColor: '#FF2E00',
      timerDurationMinutes: 15,
      timerDurationSeconds: 0,
      timerSecondsLeft: 15 * 60,
      timerIsRunning: false,
      stopwatchMs: 0,
      gridData:
        type === 'spreadsheet'
          ? [
              ['ITEM', isEnglish ? 'VAL' : 'VALOR'],
              ['A', '100'],
              [isEnglish ? 'TOTAL' : 'SUMA', '=SUM()'],
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
    const nextContent = (note.content || '').trimEnd() + `\n\n${token}\n`;
    updateCurrentNote({
      content: nextContent,
      widgets: [...(note.widgets || []), newWidget],
      updatedAt: new Date().toISOString(),
    });
    setShowBlockMenu(false);
  };

  // Live ticks for in-note clocks, timers, and stopwatches
  const [nowTime, setNowTime] = useState(new Date());
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>({});
  const [runningStopwatches, setRunningStopwatches] = useState<Record<string, boolean>>({});

  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeSegmentIdxRef = useRef<number>(0);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept clicks on inputs, buttons, checkboxes, links, canvas, or widget cards
    if (
      target.closest(
        'button, [role="button"], input, select, canvas, a, [data-widget-card="true"]'
      )
    ) {
      return;
    }

    // If clicking directly into a textarea, let native browser cursor placement handle it
    if (target.tagName?.toLowerCase() === 'textarea') {
      return;
    }

    if (mode !== 'edit') {
      setMode('edit');
    }

    const clickY = e.clientY;

    setTimeout(() => {
      const container = canvasContainerRef.current;
      if (!container) return;

      const textareas = Array.from(container.querySelectorAll('textarea'));
      if (textareas.length === 0) return;

      // Find the best textarea for this vertical click coordinate, or default to the last one
      let targetTa: HTMLTextAreaElement = textareas[textareas.length - 1];
      for (const ta of textareas) {
        const rect = ta.getBoundingClientRect();
        if (clickY <= rect.bottom + 8) {
          targetTa = ta;
          break;
        }
      }

      targetTa.focus();
      const len = targetTa.value.length;
      targetTa.setSelectionRange(len, len);
      activeTextareaRef.current = targetTa;
    }, 15);
  };

  const noteRef = useRef(note);
  noteRef.current = note;
  const onUpdateRef = useRef(onUpdateNote);
  onUpdateRef.current = onUpdateNote;
  const chronoSettingsRef = useRef(chronoSettings);
  chronoSettingsRef.current = chronoSettings;

  // 1-second interval for clock display and in-note stopwatches (timers run persistently in App.tsx)
  useEffect(() => {
    const id = setInterval(() => {
      setNowTime(new Date());

      const current = noteRef.current;
      if (!current || !current.widgets || current.widgets.length === 0) return;

      const anySw = Object.values(runningStopwatches).some(Boolean);
      if (!anySw) return;

      const updatedWidgets = current.widgets.map((w) => {
        if (w.type === 'stopwatch' && runningStopwatches[w.id]) {
          return { ...w, stopwatchMs: (w.stopwatchMs || 0) + 1000 };
        }
        return w;
      });

      onUpdateRef.current({ widgets: updatedWidgets, id: current.id });
    }, 1000);
    return () => clearInterval(id);
  }, [runningStopwatches]);

  const handleToggleTimer = (widgetId: string) => {
    if (!note) return;
    const w = (note.widgets || []).find((item) => item.id === widgetId);
    if (!w) return;

    const isNowRunning = !w.timerIsRunning;
    const currentTotal =
      w.timerSecondsLeft ??
      ((w.timerDurationMinutes || 15) * 60 + (w.timerDurationSeconds || 0));

    updateSingleWidget(widgetId, {
      timerIsRunning: isNowRunning,
      timerSecondsLeft: currentTotal,
      timerTargetEndTime: isNowRunning ? Date.now() + currentTotal * 1000 : undefined,
    });
  };

  // Ensure every widget in `note.widgets` has its `[[bloque:id]]` token in `note.content` so it can be positioned anywhere!
  useEffect(() => {
    if (!note || !note.widgets || note.widgets.length === 0) return;
    let content = note.content || '';
    let changed = false;
    for (const w of note.widgets) {
      const token = `[[bloque:${w.id}]]`;
      if (!content.includes(token)) {
        content = content.trimEnd() + `\n\n${token}\n`;
        changed = true;
      }
    }
    if (changed) {
      onUpdateRef.current({ content, id: note.id, updatedAt: new Date().toISOString() });
    }
  }, [note?.id, note?.widgets?.length]);

  const performNoteReset = (targetNote: Note) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const resetContent = targetNote.content.replace(/- \[x\] /gi, '- [ ] ');
    const resetWidgets = (targetNote.widgets || []).map((w) => {
      if (w.type === 'checklist') {
        return {
          ...w,
          checklistItems: (w.checklistItems || []).map((it) => ({ ...it, done: false })),
        };
      }
      if (w.type === 'timer') {
        return {
          ...w,
          timerSecondsLeft: (w.timerDurationMinutes || 15) * 60,
        };
      }
      if (w.type === 'stopwatch') {
        return {
          ...w,
          stopwatchMs: 0,
        };
      }
      return w;
    });

    setRunningTimers({});
    setRunningStopwatches({});
    onUpdateNote({
      content: resetContent,
      widgets: resetWidgets,
      lastResetDate: todayStr,
      updatedAt: new Date().toISOString(),
    });
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 700);
  };

  useEffect(() => {
    if (!note || !note.resetMode || note.resetMode === 'none' || note.resetMode === 'manual') return;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let shouldReset = false;

    if (note.resetMode === 'daily') {
      shouldReset = Boolean(note.lastResetDate && note.lastResetDate !== todayStr);
    } else if (note.resetMode === 'weekly') {
      if (note.lastResetDate) {
        const last = new Date(note.lastResetDate);
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        shouldReset = diffDays >= 7 || (now.getDay() === 1 && note.lastResetDate !== todayStr);
      }
    } else if (note.resetMode === 'monthly') {
      if (note.lastResetDate) {
        shouldReset = note.lastResetDate.slice(0, 7) !== todayStr.slice(0, 7);
      }
    }

    if (shouldReset) {
      performNoteReset(note);
    } else if (!note.lastResetDate) {
      onUpdateNote({ lastResetDate: todayStr });
    }
  }, [note?.id, note?.resetMode, note?.lastResetDate]);

  const cycleResetMode = () => {
    if (!note) return;
    const order: NoteResetMode[] = ['manual', 'daily', 'weekly', 'monthly', 'none'];
    const current = note.resetMode || 'manual';
    const next = order[(order.indexOf(current) + 1) % order.length];
    onUpdateNote({
      resetMode: next,
      lastResetDate: new Date().toISOString().slice(0, 10),
    });
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-xs font-bold uppercase opacity-50">
        {isEnglish ? 'Scroll mouse wheel over top folders to select a sheet' : 'Gira la rueda sobre las carpetas superiores para elegir una hoja'}
      </div>
    );
  }

  const normalizeContentTokens = (txt: string) => {
    return txt
      .replace(/([^\n])(\[\[bloque:[a-zA-Z0-9_-]+\]\])/g, '$1\n$2')
      .replace(/(\[\[bloque:[a-zA-Z0-9_-]+\]\])([^\n])/g, '$1\n$2');
  };

  // Parse `note.content` into interleaved Text and Widget tokens (`[[bloque:id]]`) so blocks can live ANYWHERE in the note!
  const parts = React.useMemo(() => {
    const tokenRegex = /\[\[bloque:([a-zA-Z0-9_-]+)\]\]/g;
    const result: Array<{ kind: 'text'; text: string } | { kind: 'widget'; widgetId: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(rawContent)) !== null) {
      const before = rawContent.slice(lastIndex, match.index);
      result.push({ kind: 'text', text: before });
      result.push({ kind: 'widget', widgetId: match[1] });
      lastIndex = match.index + match[0].length;
    }
    result.push({ kind: 'text', text: rawContent.slice(lastIndex) });
    return result;
  }, [rawContent]);

  const rebuildContentFromParts = (nextParts: typeof parts) => {
    return nextParts
      .map((p) => (p.kind === 'text' ? p.text : `[[bloque:${p.widgetId}]]`))
      .join('');
  };

  // Auto-resize all textareas so text fills the sheet smoothly without collapsing to 0 or jumping scroll
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const prevScrollTop = container.scrollTop;
    const textareas = container.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      const isLast = ta.getAttribute('data-is-last') === 'true';
      ta.style.height = 'auto';
      const targetH = Math.max(isLast ? 220 : 28, ta.scrollHeight);
      ta.style.height = `${targetH}px`;
    });
    if (prevScrollTop > 0 && Math.abs(container.scrollTop - prevScrollTop) > 2) {
      container.scrollTop = prevScrollTop;
    }
  }, [note?.id, rawContent]);

  const handleSegmentTextChange = (partIdx: number, newText: string, el: HTMLTextAreaElement) => {
    const nextParts = parts.map((p, idx) =>
      idx === partIdx && p.kind === 'text' ? { ...p, text: newText } : p
    );
    const fullContent = rebuildContentFromParts(nextParts);
    updateCurrentNote({ content: fullContent, updatedAt: new Date().toISOString() });

    if (el) {
      const isLast = el.getAttribute('data-is-last') === 'true';
      el.style.height = 'auto';
      const targetH = Math.max(isLast ? 220 : 28, el.scrollHeight);
      el.style.height = `${targetH}px`;
    }

    const cursorPos = el.selectionStart;
    const textBefore = newText.slice(0, cursorPos);
    const lastSlash = textBefore.lastIndexOf('/');
    if (lastSlash !== -1 && lastSlash === cursorPos - 1) {
      activeTextareaRef.current = el;
      activeSegmentIdxRef.current = partIdx;
      setShowSlashMenu(true);
      setSlashFilter('');
      setSlashIndex(0);
    } else if (showSlashMenu) {
      if (lastSlash === -1 || cursorPos < lastSlash) {
        setShowSlashMenu(false);
      } else {
        const q = textBefore.slice(lastSlash + 1);
        if (q.includes(' ') || q.includes('\n')) {
          setShowSlashMenu(false);
        } else {
          setSlashFilter(q.toLowerCase());
          setSlashIndex(0);
        }
      }
    }
  };

  const moveWidgetInContent = (widgetId: string, direction: 'up' | 'down') => {
    const token = `[[bloque:${widgetId}]]`;
    const raw = note.content || '';
    if (!raw.includes(token)) return;

    // Normalize so tokens are reliably isolated per-line without corrupting inter-line spacing
    const normalized = normalizeContentTokens(raw);
    const lines = normalized.split('\n');
    const curIdx = lines.findIndex((l) => l.trim() === token);
    if (curIdx === -1) return;

    if (direction === 'up') {
      if (curIdx === 0) return;
      const targetIdx = curIdx - 1;
      const [item] = lines.splice(curIdx, 1);
      lines.splice(targetIdx, 0, item);
    } else {
      if (curIdx >= lines.length - 1) return;
      const targetIdx = curIdx + 1;
      const [item] = lines.splice(curIdx, 1);
      lines.splice(targetIdx, 0, item);
    }

    const nextContent = lines.join('\n');
    updateCurrentNote({ content: nextContent, updatedAt: new Date().toISOString() });
  };

  const handleDragWidget = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const srcToken = `[[bloque:${sourceId}]]`;
    const dstToken = `[[bloque:${targetId}]]`;
    const raw = note.content || '';
    if (!raw.includes(srcToken) || !raw.includes(dstToken)) return;

    const normalized = normalizeContentTokens(raw);
    const lines = normalized.split('\n');
    const srcIdx = lines.findIndex((l) => l.trim() === srcToken);
    const dstIdx = lines.findIndex((l) => l.trim() === dstToken);
    if (srcIdx === -1 || dstIdx === -1) return;

    const [item] = lines.splice(srcIdx, 1);
    lines.splice(dstIdx, 0, item);

    const nextContent = lines.join('\n');
    updateCurrentNote({ content: nextContent, updatedAt: new Date().toISOString() });
  };

  const updateSingleWidget = (id: string, patch: Partial<NoteWidgetBlock>) => {
    const nextWidgets = (note.widgets || []).map((w) => (w.id === id ? { ...w, ...patch } : w));
    updateCurrentNote({ widgets: nextWidgets, updatedAt: new Date().toISOString() });
  };

  const deleteSingleWidget = (id: string) => {
    const token = `[[bloque:${id}]]`;
    const nextContent = (note.content || '').replace(token, '').replace(/\n{3,}/g, '\n\n');
    const nextWidgets = (note.widgets || []).filter((w) => w.id !== id);
    updateCurrentNote({
      content: nextContent,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    });
  };

  const activeCommands = React.useMemo(() => [
    { id: 'h1', label: isEnglish ? 'Heading 1' : 'Título 1', detail: isEnglish ? 'Large section title' : 'Encabezado gigante', icon: <Heading1 size={14} />, template: '\n# ' },
    { id: 'h2', label: isEnglish ? 'Heading 2' : 'Título 2', detail: isEnglish ? 'Medium header' : 'Subtítulo de sección', icon: <Heading2 size={14} />, template: '\n## ' },
    { id: 'h3', label: isEnglish ? 'Heading 3' : 'Título 3', detail: isEnglish ? 'Small header' : 'Encabezado compacto', icon: <Heading3 size={14} />, template: '\n### ' },
    { id: 'todo', label: isEnglish ? 'Task Checkbox' : 'Casilla de tarea', detail: isEnglish ? 'Interactive checklist' : 'Checklist interactivo', icon: <CheckSquare size={14} />, template: '\n- [ ] ' },
    { id: 'quote', label: isEnglish ? 'Quote / Callout' : 'Cita / Callout', detail: isEnglish ? 'Highlighted block' : 'Bloque resaltado', icon: <Quote size={14} />, template: '\n> ' },
    { id: 'code', label: isEnglish ? 'Code Block' : 'Bloque de código', detail: isEnglish ? 'Monospace snippet' : 'Fragmento monospace', icon: <Code size={14} />, template: '\n```\n\n```' },
    { id: 'divider', label: isEnglish ? 'Divider' : 'Separador', detail: isEnglish ? 'Horizontal line' : 'Línea divisoria', icon: <Minus size={14} />, template: '\n---\n' },
  ], [isEnglish]);

  const filteredCommands = activeCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(slashFilter) ||
      cmd.id.toLowerCase().includes(slashFilter)
  );

  const applyCommand = (cmd: SlashCommand) => {
    const el = activeTextareaRef.current;
    const segIdx = activeSegmentIdxRef.current;
    const seg = parts[segIdx];
    if (!el || !seg || seg.kind !== 'text') return;

    const val = seg.text;
    const cursorPos = el.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const lastSlash = textBefore.lastIndexOf('/');
    if (lastSlash !== -1) {
      const nextSegText = val.slice(0, lastSlash) + cmd.template + val.slice(cursorPos);
      const nextParts = parts.map((p, idx) =>
        idx === segIdx && p.kind === 'text' ? { ...p, text: nextSegText } : p
      );
      updateCurrentNote({
        content: rebuildContentFromParts(nextParts),
        updatedAt: new Date().toISOString(),
      });
    }
    setShowSlashMenu(false);
    setTimeout(() => el.focus(), 40);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[slashIndex];
        if (cmd) applyCommand(cmd);
        return;
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl && note) {
              const newId = 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
              const newWidget: NoteWidgetBlock = {
                id: newId,
                type: 'image',
                title: 'IMAGEN',
                shape: 'square',
                align: 'left',
                imageUrl: dataUrl,
              };

              const segIdx = activeSegmentIdxRef.current;
              const seg = parts[segIdx];
              const el = activeTextareaRef.current;
              const cursor = el ? el.selectionStart : 0;
              const segText = seg && seg.kind === 'text' ? seg.text : '';
              const before = segText.slice(0, cursor);
              const after = segText.slice(cursor);
              const newSegText = before + `\n[[bloque:${newId}]]\n` + after;

              const nextParts = parts.map((p, idx) =>
                idx === segIdx && p.kind === 'text' ? { ...p, text: newSegText } : p
              );

              updateCurrentNote({
                content: rebuildContentFromParts(nextParts),
                widgets: [...(note.widgets || []), newWidget],
                updatedAt: new Date().toISOString(),
              });
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const toggleMarkdownCheckbox = (rawLine: string, occurrenceIndex: number) => {
    let seen = 0;
    const lines = (note.content || '').split('\n').map((l) => {
      if (l === rawLine) {
        if (seen === occurrenceIndex) {
          seen++;
          if (l.includes('- [ ] ')) return l.replace('- [ ] ', '- [x] ');
          if (l.includes('- [x] ')) return l.replace('- [x] ', '- [ ] ');
        }
        seen++;
      }
      return l;
    });
    updateCurrentNote({ content: lines.join('\n'), updatedAt: new Date().toISOString() });
  };

  const cleanTextForWordCount = rawContent.replace(/\[\[bloque:[a-zA-Z0-9_-]+\]\]/g, '').trim();
  const words = cleanTextForWordCount ? cleanTextForWordCount.split(/\s+/).length : 0;
  const resetMode = note.resetMode || 'manual';
  const resetModeLabel =
    resetMode === 'daily'
      ? (isEnglish ? 'DAILY' : 'CADA DÍA')
      : resetMode === 'weekly'
      ? (isEnglish ? 'WEEKLY' : 'SEMANAL')
      : resetMode === 'monthly'
      ? (isEnglish ? 'MONTHLY' : 'MENSUAL')
      : resetMode === 'manual'
      ? (isEnglish ? 'ON TAP' : 'AL PULSAR')
      : (isEnglish ? 'NO RESET' : 'SIN REINICIO');

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative dot-matrix-bg transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
      }}
    >
      {/* Sheet Status Pill Header - Single unified bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-1 border-b border-[var(--border-color)] bg-[var(--bg-surface)] z-20 shrink-0">
        <div className="flex items-center gap-1.5 text-[9px] font-dot-matrix font-bold uppercase shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-2.5 py-1 rounded-full border flex items-center gap-1 text-[10px] font-bold transition-all hover:scale-105 active:scale-95 mr-1"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
              title={isEnglish ? "Back to sheets list" : "Volver a la lista de hojas"}
            >
              <ArrowLeft size={13} />
              <span>{isEnglish ? "Back" : "Volver"}</span>
            </button>
          )}

          {/* Quick Insert Block Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBlockMenu(!showBlockMenu)}
              className="px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all hover:opacity-85"
              style={{
                background: showBlockMenu ? 'var(--bg-pill)' : 'var(--bg-card)',
                color: showBlockMenu ? 'var(--accent-fg)' : 'var(--text-main)',
                borderColor: 'var(--border-color)',
              }}
              title={isEnglish ? "Insert interactive block" : "Insertar bloque interactivo"}
            >
              <LayoutGrid size={10} style={{ color: showBlockMenu ? 'var(--accent-fg)' : 'var(--accent)' }} />
              <span>{isEnglish ? "+ Block" : "+ Bloque"}</span>
            </button>

            {showBlockMenu && (
              <div
                className="absolute left-0 top-full mt-1 w-48 rounded-2xl border shadow-xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
              >
                <div className="px-2 py-1 text-[9px] font-bold opacity-60 uppercase border-b border-black/5">
                  {isEnglish ? "Insert in Sheet" : "Insertar en Hoja"}
                </div>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('timer')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <Timer size={13} className="text-orange-500" />
                  <span>{isEnglish ? 'Timer' : 'Temporizador'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('stopwatch')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <Gauge size={13} className="text-blue-500" />
                  <span>{isEnglish ? 'Stopwatch' : 'Cronómetro'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('clock')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <Clock size={13} className="text-purple-500" />
                  <span>{isEnglish ? 'Digital Clock' : 'Reloj Digital'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('checklist')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <ListChecks size={13} className="text-emerald-500" />
                  <span>{isEnglish ? 'Checklist Block' : 'Checklist Interactivo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('spreadsheet')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <Table size={13} className="text-cyan-500" />
                  <span>{isEnglish ? 'Mini Spreadsheet' : 'Mini Hoja de Cálculo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertWidgetBlock('drawing')}
                  className="px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center gap-2 hover:bg-black/5"
                >
                  <PenTool size={13} className="text-pink-500" />
                  <span>{isEnglish ? 'Sketch Canvas (Drawing)' : 'Boceto Lápiz (Dibujo)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 justify-end">
          {(note.isVault || note.isDecoy) && showPanicButton && onPanicLock && (
            <button
              type="button"
              onClick={onPanicLock}
              className="px-2 py-0.5 rounded-full bg-[#FF0033] text-white text-[9px] font-extrabold uppercase flex items-center gap-1 animate-pulse shadow-md"
              title={isEnglish ? "PANIC BUTTON: Lock vault and exit immediately" : "BOTÓN DE PÁNICO: Bloquear bóveda y salir inmediatamente"}
            >
              <ShieldAlert size={10} />
              <span>{isEnglish ? 'PANIC' : 'PÁNICO'}</span>
            </button>
          )}

          {/* Write (Edit) / Read (View) Toggle */}
          <div
            className="flex items-center p-0.5 rounded-full border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
              style={{
                background: mode === 'edit' ? 'var(--bg-pill)' : 'transparent',
                color: mode === 'edit' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <Edit3 size={9} />
              <span>{isEnglish ? 'WRITE' : 'ESCRIBIR'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
              style={{
                background: mode === 'preview' ? 'var(--bg-pill)' : 'transparent',
                color: mode === 'preview' ? 'var(--accent-fg)' : 'var(--text-main)',
              }}
            >
              <Eye size={9} />
              <span>{isEnglish ? 'VIEW' : 'VISTA'}</span>
            </button>
          </div>

          {/* In-Sheet Search Icon Button */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 rounded-full border transition-all hover:scale-110 active:scale-95"
            style={{
              background: showSearch ? 'var(--bg-pill)' : 'var(--bg-card)',
              color: showSearch ? 'var(--accent-fg)' : 'var(--text-main)',
              borderColor: 'var(--border-strong)',
            }}
            title={isEnglish ? "Search in this sheet (Ctrl+F)" : "Buscar en esta hoja (Ctrl+F)"}
          >
            <Search size={12} />
          </button>

          {/* Single Sheet Settings & Share Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="p-1.5 rounded-full border transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--accent)',
              borderColor: 'var(--border-strong)',
            }}
            title={isEnglish ? "Sheet settings, reset and share" : "Ajustes de la hoja, reinicio y compartir"}
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      {/* In-Sheet Search Floating Bar */}
      {showSearch && (
        <div
          className="px-3 py-1.5 border-b flex items-center justify-between gap-2 z-30 shrink-0 text-xs animate-scale-up"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search size={13} className="opacity-50 shrink-0" />
            <input
              type="text"
              placeholder={isEnglish ? "Search text in this sheet... (Esc to exit)" : "Buscar texto en esta hoja... (Esc para salir)"}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              autoFocus
              className="w-full bg-transparent font-bold focus:outline-none text-[11px]"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
            <span className="opacity-60">
              {searchMatches.length > 0
                ? `${currentMatchIndex + 1} ${isEnglish ? 'of' : 'de'} ${searchMatches.length}`
                : searchQuery
                ? (isEnglish ? '0 matches' : '0 coincidencias')
                : ''}
            </span>

            {searchMatches.length > 0 && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length)
                  }
                  className="p-1 rounded hover:bg-black/10 transition-transform active:scale-90"
                  title={isEnglish ? "Previous match" : "Coincidencia anterior"}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMatchIndex((i) => (i + 1) % searchMatches.length)}
                  className="p-1 rounded hover:bg-black/10 transition-transform active:scale-90"
                  title={isEnglish ? "Next match" : "Siguiente coincidencia"}
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="p-1 rounded hover:bg-black/10 transition-transform active:scale-90 opacity-60 hover:opacity-100"
              title={isEnglish ? "Close search" : "Cerrar búsqueda"}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Sheet Scrollable Canvas */}
      <div
        ref={canvasContainerRef}
        onClick={handleCanvasClick}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2.5 relative z-10 pb-10 cursor-text"
      >
        <div className="flex items-center gap-2 pb-2 border-b-2 border-[var(--border-strong)]">
          <span className="text-xl">{note.icon || '⚡'}</span>
          {mode === 'edit' ? (
            <input
              type="text"
              value={note.title}
              onChange={(e) =>
                updateCurrentNote({ title: e.target.value, updatedAt: new Date().toISOString() })
              }
              placeholder={isEnglish ? "SHEET TITLE..." : "TÍTULO DE LA HOJA..."}
              className="w-full text-lg font-display-brutal uppercase tracking-tight bg-transparent focus:outline-none"
              style={{ color: 'var(--accent)' }}
            />
          ) : (
            <h1
              className="w-full text-lg font-display-brutal uppercase tracking-tight"
              style={{ color: 'var(--accent)' }}
            >
              {note.title}
            </h1>
          )}
        </div>

        {/* Interleaved Text Segments and Positioned Widgets (Word/Office style text wrap!) */}
        <div className="space-y-2 relative clearfix">
          {parts.map((part, pIdx) => {
            if (part.kind === 'widget') {
              const w = (note.widgets || []).find((item) => item.id === part.widgetId);
              if (!w) return null;
              const isSq = w.shape === 'square';
              const isRight = (w.align || 'left') === 'right';

              // VIEW MODE (`VISTA`): Float block left or right so text naturally wraps around it!
              if (mode === 'preview') {
                return (
                  <div
                    key={`wdg-${w.id}-${pIdx}`}
                    style={{
                      float: isSq ? (isRight ? 'right' : 'left') : 'none',
                      width: isSq ? '48%' : '100%',
                      margin: isSq ? (isRight ? '2px 0 8px 12px' : '2px 12px 8px 0') : '8px 0',
                      clear: isSq ? (isRight ? 'right' : 'left') : 'both',
                    }}
                  >
                    <SingleNoteWidgetCard
                      widget={w}
                      isEditMode={false}
                      onUpdate={(patch) => updateSingleWidget(w.id, patch)}
                      onDelete={() => deleteSingleWidget(w.id)}
                      nowTime={nowTime}
                      isTimerRunning={!!w.timerIsRunning}
                      onToggleTimer={() => handleToggleTimer(w.id)}
                      isStopwatchRunning={!!runningStopwatches[w.id]}
                      onToggleStopwatch={() =>
                        setRunningStopwatches((prev) => ({ ...prev, [w.id]: !prev[w.id] }))
                      }
                      isEnglish={isEnglish}
                    />
                  </div>
                );
              }

              // EDIT MODE (`ESCRIBIR`): Clean sequential document block with full movement and controls
              return (
                <div
                  key={`wdg-${w.id}-${pIdx}`}
                  className={`my-2.5 transition-all ${
                    isSq ? 'max-w-[340px]' : 'w-full'
                  }`}
                  style={{
                    marginLeft: isSq && isRight ? 'auto' : undefined,
                  }}
                >
                  <SingleNoteWidgetCard
                    widget={w}
                    isEditMode={true}
                    onUpdate={(patch) => updateSingleWidget(w.id, patch)}
                    onDelete={() => deleteSingleWidget(w.id)}
                    onMoveUp={() => moveWidgetInContent(w.id, 'up')}
                    onMoveDown={() => moveWidgetInContent(w.id, 'down')}
                    nowTime={nowTime}
                    isTimerRunning={!!w.timerIsRunning}
                    onToggleTimer={() => handleToggleTimer(w.id)}
                    isStopwatchRunning={!!runningStopwatches[w.id]}
                    onToggleStopwatch={() =>
                      setRunningStopwatches((prev) => ({ ...prev, [w.id]: !prev[w.id] }))
                    }
                    isEnglish={isEnglish}
                    onDragWidget={handleDragWidget}
                  />
                </div>
              );
            }

            const isLast = pIdx === parts.length - 1;
            const isFirst = pIdx === 0;

            // If empty text segment at index 0 and widgets follow, skip so widget is at the very top of note!
            if (isFirst && !part.text.trim() && parts.length > 1) {
              return null;
            }

            // Intermediate empty text segment between widgets: minimal line
            if (!isLast && !part.text.trim()) {
              return (
                <textarea
                  key={`txt-${pIdx}`}
                  data-is-last="false"
                  value={part.text}
                  rows={1}
                  onFocus={(e) => {
                    activeTextareaRef.current = e.currentTarget;
                    activeSegmentIdxRef.current = pIdx;
                  }}
                  onChange={(e) => handleSegmentTextChange(pIdx, e.target.value, e.currentTarget)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isEnglish ? "Type here..." : "Escribe aquí..."}
                  className="w-full bg-transparent text-xs font-medium leading-relaxed focus:outline-none resize-none no-scrollbar block h-6 min-h-[24px]"
                  style={{ color: 'var(--text-main)' }}
                />
              );
            }

            // Text segment in EDIT MODE
            if (mode === 'edit') {
              const lineCount = Math.max(isLast ? 4 : 1, part.text.split('\n').length);
              return (
                <textarea
                  key={`txt-${pIdx}`}
                  data-is-last={isLast ? "true" : "false"}
                  value={part.text}
                  onFocus={(e) => {
                    activeTextareaRef.current = e.currentTarget;
                    activeSegmentIdxRef.current = pIdx;
                  }}
                  onChange={(e) => handleSegmentTextChange(pIdx, e.target.value, e.currentTarget)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={lineCount}
                  placeholder={
                    isFirst
                      ? (isEnglish ? "Type here... Use '/' for commands or insert blocks from NoteBlocks..." : "Escribe aquí... Usa '/' para comandos o inserta bloques desde NoteBlocks...")
                      : (isEnglish ? 'Continue typing here...' : 'Continúa escribiendo aquí...')
                  }
                  className={`w-full bg-transparent text-xs font-medium leading-relaxed focus:outline-none resize-none no-scrollbar block overflow-hidden ${
                    isLast ? 'min-h-[220px]' : 'min-h-[28px]'
                  }`}
                  style={{ color: 'var(--text-main)' }}
                />
              );
            }

            // View Mode (`VISTA`) for text segment
            if (!part.text.trim()) return null;
            return (
              <div key={`view-txt-${pIdx}`} className="space-y-2 text-xs leading-relaxed">
                {part.text.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) {
                    return (
                      <h1
                        key={idx}
                        className="text-base font-display-brutal uppercase tracking-tight pt-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        {line.slice(2)}
                      </h1>
                    );
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-sm font-extrabold uppercase pt-1">
                        {line.slice(3)}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3
                        key={idx}
                        className="text-xs font-extrabold uppercase tracking-wider opacity-80 pt-1"
                      >
                        {line.slice(4)}
                      </h3>
                    );
                  }
                  if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
                    const checked = line.startsWith('- [x] ');
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleMarkdownCheckbox(line, 0)}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-transform hover:translate-x-1"
                        style={{
                          background: 'var(--bg-surface)',
                          border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-color)'}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                        />
                        <span
                          className={`text-xs font-bold ${checked ? 'line-through opacity-50' : ''}`}
                        >
                          {line.slice(6)}
                        </span>
                      </div>
                    );
                  }
                  if (line.startsWith('> ')) {
                    return (
                      <blockquote
                        key={idx}
                        className="px-3.5 py-2 rounded-2xl font-bold text-xs"
                        style={{
                          background: 'var(--bg-pill)',
                          color: 'var(--accent-fg)',
                        }}
                      >
                        {line.slice(2)}
                      </blockquote>
                    );
                  }
                  if (!line.trim()) return <div key={idx} className="h-1" />;
                  return (
                    <p key={idx} className="text-xs font-medium leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            );
          })}

          {showSlashMenu && filteredCommands.length > 0 && (
            <div
              className="fixed right-16 top-44 z-50 w-60 rounded-2xl p-1.5 shadow-2xl animate-folder-unfold"
              style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border-strong)',
              }}
            >
              <div
                className="px-2 py-1 text-[9px] font-dot-matrix font-bold uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                {isEnglish ? 'QUICK COMMANDS //' : 'COMANDOS RÁPIDOS //'}
              </div>
              {filteredCommands.map((cmd, idx) => {
                const active = idx === slashIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => applyCommand(cmd)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 text-xs font-bold transition-all"
                    style={{
                      background: active ? 'var(--bg-pill)' : 'transparent',
                      color: active ? 'var(--accent-fg)' : 'var(--text-main)',
                    }}
                  >
                    {cmd.icon}
                    <div>
                      <div className="text-[11px]">{cmd.label}</div>
                      <div className="text-[9px] opacity-75 font-normal">{cmd.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>



        {/* Generous empty click area: clicking anywhere in empty space focuses the end */}
        <div
          onClick={handleCanvasClick}
          className="min-h-[160px] w-full cursor-text"
          title={isEnglish ? "Click to write at the end of the sheet" : "Haz clic para escribir al final de la hoja"}
        />
      </div>

      {/* Share & Settings Modal */}
      <ShareAndSettingsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        targetType="sheet"
        note={note}
        groups={groups}
        allNotes={allNotes}
        shares={shares || []}
        onUpdateShares={onUpdateShares || (() => {})}
        onUpdateNote={onUpdateNote}
        onUpdateGroup={onUpdateGroup}
        onResetNote={performNoteReset}
        pinnedItems={pinnedItems}
        onUpdatePinnedItems={onUpdatePinnedItems}
        language={language}
      />
    </div>
  );
};
