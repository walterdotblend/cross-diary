import React, { useState, useEffect, useRef } from 'react';
import { NoteSticker, StickerSettings } from '../types/diary';
import { Trash2, RotateCw, RotateCcw, FlipHorizontal } from 'lucide-react';

interface FreeStickerLayerProps {
  stickers: NoteSticker[];
  onUpdateStickers: (updated: NoteSticker[]) => void;
  settings: StickerSettings;
  onStickerActivityChange?: (active: boolean) => void;
  transitionClass?: string;
  isEditing?: boolean; // When false, stickers are automatically locked and touch-pass-through
}

export const FreeStickerLayer: React.FC<FreeStickerLayerProps> = ({
  stickers,
  onUpdateStickers,
  settings,
  onStickerActivityChange,
  transitionClass = '',
  isEditing = true,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  // High-performance local state during drag to avoid re-rendering entire app and localStorage serialization
  const [liveStickers, setLiveStickers] = useState<NoteSticker[]>(stickers);
  const isHoveringStickerRef = useRef(false);

  const liveStickersRef = useRef(liveStickers);
  liveStickersRef.current = liveStickers;

  const onUpdateRef = useRef(onUpdateStickers);
  onUpdateRef.current = onUpdateStickers;

  const onActivityRef = useRef(onStickerActivityChange);
  onActivityRef.current = onStickerActivityChange;

  const interactionRef = useRef<{
    mode: 'move' | 'resize' | 'rotate';
    stickerId: string;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startRotation: number;
    startAngleDeg: number;
    centerX: number;
    centerY: number;
    cornerSignX: number;
    cornerSignY: number;
  } | null>(null);

  // Sync from props only when NOT actively dragging
  useEffect(() => {
    if (!isInteracting) {
      setLiveStickers(stickers);
    }
  }, [stickers, isInteracting]);

  // Deselect when clicking outside any sticker or when locked / not editing
  useEffect(() => {
    if ((!isEditing || settings.lockPositions) && selectedId) {
      setSelectedId(null);
    }
  }, [settings.lockPositions, isEditing, selectedId]);

  useEffect(() => {
    const handleGlobalDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-sticker-element="true"]')) {
        setSelectedId(null);
      }
    };
    window.addEventListener('pointerdown', handleGlobalDown);
    return () => window.removeEventListener('pointerdown', handleGlobalDown);
  }, []);

  // Stable global pointermove / pointerup / pointercancel listeners with high performance local updates
  useEffect(() => {
    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const active = interactionRef.current;
      if (!active) return;

      const dx = e.clientX - active.startMouseX;
      const dy = e.clientY - active.startMouseY;

      const nextList = liveStickersRef.current.map((stk) => {
        if (stk.id !== active.stickerId) return stk;

        if (active.mode === 'move') {
          return {
            ...stk,
            x: Math.max(4, Math.min(window.innerWidth - 30, Math.round(active.startX + dx))),
            y: Math.max(4, Math.min(window.innerHeight - 30, Math.round(active.startY + dy))),
          };
        }

        if (active.mode === 'resize') {
          const signedDelta =
            Math.abs(dx) > Math.abs(dy) ? dx * active.cornerSignX : dy * active.cornerSignY;
          return {
            ...stk,
            width: Math.max(36, Math.min(420, Math.round(active.startWidth + signedDelta))),
          };
        }

        if (active.mode === 'rotate') {
          const currentAngleDeg =
            Math.atan2(e.clientY - active.centerY, e.clientX - active.centerX) * (180 / Math.PI);
          let nextRot = Math.round(active.startRotation + (currentAngleDeg - active.startAngleDeg));
          while (nextRot > 180) nextRot -= 360;
          while (nextRot < -180) nextRot += 360;
          return {
            ...stk,
            rotation: nextRot,
          };
        }

        return stk;
      });

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setLiveStickers(nextList);
      });
    };

    const handlePointerEnd = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (interactionRef.current) {
        const finalStickers = liveStickersRef.current;
        interactionRef.current = null;
        setIsInteracting(false);
        document.body.removeAttribute('data-dragging-sticker');
        if (!isHoveringStickerRef.current) {
          onActivityRef.current?.(false);
        }
        // Commit final state to parent ONCE when interaction finishes!
        onUpdateRef.current(finalStickers);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  const startInteraction = (
    e: React.PointerEvent,
    stk: NoteSticker,
    mode: 'move' | 'resize' | 'rotate',
    stickerContainerEl: HTMLElement | null,
    cornerSignX = 1,
    cornerSignY = 1
  ) => {
    e.stopPropagation();
    setSelectedId(stk.id);
    onActivityRef.current?.(true);

    if (!isEditing || settings.lockPositions) return;

    const w = stk.width || settings.defaultSize || 92;
    let centerX = stk.x + w / 2;
    let centerY = stk.y + w / 2;

    if (stickerContainerEl) {
      const rect = stickerContainerEl.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    const startAngleDeg =
      Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    document.body.setAttribute('data-dragging-sticker', 'true');
    setIsInteracting(true);

    interactionRef.current = {
      mode,
      stickerId: stk.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: stk.x,
      startY: stk.y,
      startWidth: w,
      startRotation: stk.rotation || 0,
      startAngleDeg,
      centerX,
      centerY,
      cornerSignX,
      cornerSignY,
    };
  };

  const rotateByStep = (stkId: string, deltaDeg: number) => {
    const updated = liveStickersRef.current.map((s) => {
      if (s.id !== stkId) return s;
      let next = (s.rotation || 0) + deltaDeg;
      while (next > 180) next -= 360;
      while (next < -180) next += 360;
      return { ...s, rotation: next };
    });
    setLiveStickers(updated);
    onUpdateRef.current(updated);
  };

  const toggleFlipX = (stkId: string) => {
    const updated = liveStickersRef.current.map((s) =>
      s.id === stkId ? { ...s, flipX: !s.flipX } : s
    );
    setLiveStickers(updated);
    onUpdateRef.current(updated);
  };

  const deleteSticker = (stkId: string) => {
    const updated = liveStickersRef.current.filter((s) => s.id !== stkId);
    setLiveStickers(updated);
    onUpdateRef.current(updated);
    setSelectedId(null);
  };

  // If not editing or locked by user settings: stickers are completely locked and cannot be touched
  const isGloballyLocked = !isEditing || !!settings.lockPositions;

  return (
    <div
      className={`fixed inset-0 z-[70] pointer-events-none overflow-hidden select-none ${transitionClass}`}
    >
      {liveStickers.map((stk) => {
        const isSelected = selectedId === stk.id && !isGloballyLocked;
        const w = stk.width || settings.defaultSize || 92;
        const rot = stk.rotation || 0;
        const opacityVal = Math.min(1, Math.max(0.15, (settings.opacity ?? 100) / 100));

        const canControl = isSelected && !isGloballyLocked;

        return (
          <div
            key={stk.id}
            data-sticker-element={isGloballyLocked ? undefined : 'true'}
            data-interactive={isGloballyLocked ? undefined : 'true'}
            style={{
              left: `${stk.x}px`,
              top: `${stk.y}px`,
              width: `${w}px`,
              transform: `rotate(${rot}deg)`,
              transformOrigin: 'center center',
              opacity: opacityVal,
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onMouseEnter={() => {
              if (isGloballyLocked) return;
              isHoveringStickerRef.current = true;
              onActivityRef.current?.(true);
            }}
            onMouseLeave={() => {
              if (isGloballyLocked) return;
              isHoveringStickerRef.current = false;
              if (!interactionRef.current) {
                onActivityRef.current?.(false);
              }
            }}
            onPointerDown={(e) => {
              if (isGloballyLocked) return;
              startInteraction(e, stk, 'move', e.currentTarget as HTMLElement);
            }}
            className={`absolute z-[71] select-none ${
              isGloballyLocked ? 'pointer-events-none' : 'pointer-events-auto cursor-move'
            }`}
          >
            {/* Bounding Box Frame when selected and editable */}
            <div
              className={`relative p-1.5 transition-shadow ${
                canControl
                  ? 'border-2 border-[var(--accent)] bg-black/15 shadow-xl'
                  : 'border-2 border-transparent'
              }`}
            >
              <img
                src={stk.url}
                alt={stk.name}
                draggable={false}
                style={{
                  transform: stk.flipX ? 'scaleX(-1)' : 'none',
                }}
                className="w-full h-auto object-contain drop-shadow-md pointer-events-none select-none"
              />

              {/* TRANSFORM CONTROLS: Top Rotation Point + 4 Corner Resize Squares + Bottom Quick Bar */}
              {canControl && (
                <>
                  {/* Top Stem + Rotation Handle */}
                  <div
                    data-interactive="true"
                    data-sticker-element="true"
                    style={{ touchAction: 'none' }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing px-3 pt-1 pb-0.5"
                    onPointerDown={(e) =>
                      startInteraction(
                        e,
                        stk,
                        'rotate',
                        e.currentTarget.parentElement?.parentElement as HTMLElement
                      )
                    }
                    title="Arrastra en círculo para girar libremente"
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-white border-[2.5px] shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
                      style={{ borderColor: 'var(--accent)', color: '#0A0A0A' }}
                    >
                      <RotateCw size={12} />
                    </div>
                    <div
                      className="w-[2.5px] h-3.5"
                      style={{ backgroundColor: 'var(--accent)' }}
                    />
                  </div>

                  {/* 4 Corner Resize Squares */}
                  {[
                    { posClass: '-top-2 -left-2 cursor-nwse-resize', sx: -1, sy: -1 },
                    { posClass: '-top-2 -right-2 cursor-nesw-resize', sx: 1, sy: -1 },
                    { posClass: '-bottom-2 -left-2 cursor-nesw-resize', sx: -1, sy: 1 },
                    { posClass: '-bottom-2 -right-2 cursor-nwse-resize', sx: 1, sy: 1 },
                  ].map((corner, idx) => (
                    <div
                      key={idx}
                      data-interactive="true"
                      data-sticker-element="true"
                      onPointerDown={(e) =>
                        startInteraction(
                          e,
                          stk,
                          'resize',
                          e.currentTarget.parentElement?.parentElement as HTMLElement,
                          corner.sx,
                          corner.sy
                        )
                      }
                      className={`absolute ${corner.posClass} w-4 h-4 bg-white border-2 shadow-sm hover:scale-125 transition-transform`}
                      style={{ touchAction: 'none', borderColor: 'var(--accent)' }}
                      title="Arrastra la esquina para escalar"
                    />
                  ))}

                  {/* Bottom Quick Action Bar (-15°, Degree readout, +15°, Flip, Delete) */}
                  <div
                    data-interactive="true"
                    data-sticker-element="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/85 text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotateByStep(stk.id, -15);
                      }}
                      className="p-0.5 hover:text-[var(--accent)]"
                      title="Girar -15°"
                    >
                      <RotateCcw size={10} />
                    </button>
                    <span className="text-[9px] font-mono font-bold px-1">
                      {rot}°
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotateByStep(stk.id, 15);
                      }}
                      className="p-0.5 hover:text-[var(--accent)]"
                      title="Girar +15°"
                    >
                      <RotateCw size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlipX(stk.id);
                      }}
                      className="p-0.5 hover:text-[var(--accent)]"
                      title="Voltear horizontalmente"
                    >
                      <FlipHorizontal size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSticker(stk.id);
                      }}
                      className="p-0.5 text-red-400 hover:text-red-500 ml-0.5"
                      title="Eliminar sticker"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
