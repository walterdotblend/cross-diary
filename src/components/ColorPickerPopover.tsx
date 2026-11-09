import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Palette, X, Plus } from 'lucide-react';

export interface ColorPickerPopoverProps {
  color: string;
  onChange: (hex: string) => void;
  suggestedColors?: string[];
  mode?: 'inline' | 'button-only';
  align?: 'left' | 'right' | 'center';
  className?: string;
}

const DEFAULT_SUGGESTED_COLORS = [
  '#FF2E00', // Crimson Red
  '#FF5C93', // Sakura Pink
  '#CBA6F7', // Lavender
  '#FE8019', // Amber Orange
  '#10B981', // Emerald Green
  '#3B82F6', // Cobalt Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber Yellow
];

// Helper: Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return { h: 10, s: 100, l: 50 };

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Helper: Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    return Math.max(0, Math.min(255, val)).toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  onChange,
  suggestedColors = DEFAULT_SUGGESTED_COLORS,
  mode = 'inline',
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isEnglish = typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en';

  const hsl = useMemo(() => hexToHsl(color || '#FF2E00'), [color]);
  const [hue, setHue] = useState(hsl.h);
  const [sat, setSat] = useState(hsl.s);
  const [lightness, setLightness] = useState(hsl.l);
  const [hexInput, setHexInput] = useState(color || '#FF2E00');

  useEffect(() => {
    const updated = hexToHsl(color || '#FF2E00');
    setHue(updated.h);
    setSat(updated.s);
    setLightness(updated.l);
    setHexInput((color || '#FF2E00').toUpperCase());
  }, [color]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Draw Chromatic Color Wheel onto Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, width, height);

    // Draw radial hue / saturation disk
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw active picker circle marker
    const markerAngle = (hue * Math.PI) / 180;
    const markerDist = (sat / 100) * radius;
    const mx = cx + markerDist * Math.cos(markerAngle);
    const my = cy + markerDist * Math.sin(markerAngle);

    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [hue, sat]);

  useEffect(() => {
    if (isOpen) {
      // Allow DOM mount
      setTimeout(drawWheel, 10);
    }
  }, [isOpen, drawWheel]);

  // Handle pointer drag on color wheel
  const handleWheelPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;

    const angle = Math.atan2(y, x);
    let deg = Math.round((angle * 180) / Math.PI);
    if (deg < 0) deg += 360;

    const radius = rect.width / 2 - 2;
    const dist = Math.sqrt(x * x + y * y);
    const s = Math.max(0, Math.min(100, Math.round((dist / radius) * 100)));

    setHue(deg);
    setSat(s);

    const newHex = hslToHex(deg, s, lightness);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleLightnessChange = (newL: number) => {
    setLightness(newL);
    const newHex = hslToHex(hue, sat, newL);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleHexInputChange = (val: string) => {
    const clean = val.toUpperCase();
    setHexInput(clean);
    if (/^#[0-9A-F]{6}$/i.test(clean)) {
      const converted = hexToHsl(clean);
      setHue(converted.h);
      setSat(converted.s);
      setLightness(converted.l);
      onChange(clean);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* TRIGGER DISPLAY */}
      {mode === 'inline' ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          {suggestedColors.map((c) => {
            const isSelected = (color || '').toUpperCase() === c.toUpperCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                className={`w-5 h-5 rounded-full transition-transform border ${
                  isSelected ? 'scale-125 ring-2 ring-offset-1 ring-black/40 z-10' : 'hover:scale-110 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c, borderColor: 'rgba(255,255,255,0.4)' }}
                title={c}
              />
            );
          })}

          {/* Custom Color Button at the end of suggested swatches */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-xs ${
              isOpen ? 'ring-2 ring-black/50 scale-110' : ''
            }`}
            style={{
              background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              borderColor: '#ffffff',
            }}
            title={isEnglish ? 'Custom Color (Wheel & Darkness)' : 'Color Personalizado (Rueda & Oscuridad)'}
          >
            <Plus size={10} className="text-white drop-shadow-md stroke-[3]" />
          </button>
        </div>
      ) : (
        /* BUTTON ONLY TRIGGER (For Excalidraw NoteDrawingCanvas) */
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all overflow-hidden"
          style={{
            background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            borderColor: '#ffffff',
          }}
          title={isEnglish ? 'Pick Color (Wheel & Darkness)' : 'Elegir Color (Rueda & Oscuridad)'}
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
            style={{ backgroundColor: color || '#FF2E00' }}
          />
        </button>
      )}

      {/* POPOVER DIALOG */}
      {isOpen && (
        <div
          className={`absolute z-50 top-full mt-2 p-3 rounded-2xl border-2 shadow-2xl space-y-2.5 animate-fadeIn ${
            align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-main)',
            minWidth: 190,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase">
              <Palette size={11} style={{ color: 'var(--accent)' }} />
              <span>{isEnglish ? 'Custom Color' : 'Color Personalizado'}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded-full hover:bg-black/10 opacity-60 hover:opacity-100"
            >
              <X size={12} />
            </button>
          </div>

          {/* Suggested row in button-only mode */}
          {mode === 'button-only' && (
            <div className="flex items-center gap-1 justify-between pb-1 border-b border-[var(--border-color)]">
              {suggestedColors.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
                  style={{ backgroundColor: c, borderColor: '#ffffff' }}
                />
              ))}
            </div>
          )}

          {/* Chromatic Color Wheel */}
          <div className="flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={110}
              height={110}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleWheelPointer(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0) handleWheelPointer(e);
              }}
              className="rounded-full cursor-crosshair shadow-sm border border-white/60 touch-none"
              style={{ width: 110, height: 110 }}
            />
          </div>

          {/* Darkness / Lightness Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8px] font-bold uppercase opacity-75">
              <span>{isEnglish ? 'Darkness' : 'Oscuridad'}</span>
              <span className="font-mono">{lightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={(e) => handleLightnessChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg cursor-pointer appearance-none"
              style={{
                background: `linear-gradient(to right, #000000, hsl(${hue}, ${sat}%, 50%), #ffffff)`,
              }}
            />
          </div>

          {/* HEX Input & Live Swatch */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className="w-6 h-6 rounded-lg border shrink-0 shadow-xs"
              style={{ backgroundColor: color || '#FF2E00', borderColor: 'var(--border-strong)' }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              maxLength={7}
              placeholder="#FF2E00"
              className="flex-1 px-2 py-1 rounded-lg font-mono text-[10px] font-bold uppercase border focus:outline-none"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
