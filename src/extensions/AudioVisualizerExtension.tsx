import React, { useState, useEffect, useRef } from 'react';
import { ExtensionProps } from './types';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  Radio,
  Music,
  Disc,
} from 'lucide-react';

export const AudioVisualizerExtension: React.FC<ExtensionProps> = ({
  extensionConfigs,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const lastUserActionRef = useRef<number>(0);
  const [currentLang, setCurrentLang] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('cross_diary_language') || 'es' : 'es'
  );

  useEffect(() => {
    const handler = (e: any) =>
      setCurrentLang(e.detail || localStorage.getItem('cross_diary_language') || 'es');
    window.addEventListener('cross-diary-language-change', handler);
    return () => window.removeEventListener('cross-diary-language-change', handler);
  }, []);

  const isEnglish = currentLang === 'en';

  const [waveBars, setWaveBars] = useState<number[]>(() =>
    Array.from({ length: 32 }, (_, i) => 12 + ((i * 7) % 18))
  );
  const [systemMedia, setSystemMedia] = useState<{
    found: boolean;
    title?: string;
    artist?: string;
    status?: string;
    source?: string;
    peak?: number;
    thumbnail?: string;
  }>({
    found: false,
    title: 'Cross-Diary Live Sync',
    artist: isEnglish ? 'No active playback' : 'Sin reproducción activa',
  });

  // Query live system media from Electron / GSMTC daemon
  useEffect(() => {
    let mounted = true;

    const handleMediaUpdate = (res: any) => {
      if (!mounted || !res || typeof res !== 'object') return;
      if (res.found) {
        setSystemMedia(res);
        // If user recently toggled play/pause (<400ms), prevent transient status echo from flipping state back
        const timeSinceUserAction = Date.now() - lastUserActionRef.current;
        if (timeSinceUserAction > 400) {
          if (res.status === 'Playing') {
            setIsPlaying(true);
          } else if (res.status === 'Paused') {
            setIsPlaying(false);
          } else if (typeof res.peak === 'number' && res.peak > 0.005) {
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        }
      } else {
        setSystemMedia((prev) => ({
          ...prev,
          found: false,
          status: 'Paused',
          peak: 0,
        }));
        setIsPlaying(false);
      }
    };

    // Instant IPC push listener
    let unsubIpc: (() => void) | undefined;
    if (window.crossDiaryNative?.onSystemMediaChanged) {
      unsubIpc = window.crossDiaryNative.onSystemMediaChanged(handleMediaUpdate);
    }

    const pollMedia = async () => {
      try {
        if (window.crossDiaryNative?.getNowPlaying) {
          const res = await window.crossDiaryNative.getNowPlaying();
          handleMediaUpdate(res);
        }
      } catch (err) {
        console.warn('Media poll failed:', err);
      }
    };

    pollMedia();
    const interval = setInterval(pollMedia, 500);
    return () => {
      mounted = false;
      clearInterval(interval);
      if (unsubIpc) unsubIpc();
    };
  }, []);

  // Exaggerated reactive waveform animation
  useEffect(() => {
    if (!isPlaying) {
      setWaveBars((prev) => prev.map((_, i) => 8 + ((i * 5) % 12)));
      return;
    }

    let step = 0;
    const id = setInterval(() => {
      step++;
      const rawPeak = systemMedia.peak && systemMedia.peak > 0.004 ? systemMedia.peak : 0.28;
      const boost = Math.min(1.4, Math.max(0.6, Math.pow(rawPeak, 0.55) * 1.7));

      setWaveBars((prev) =>
        prev.map((_, idx) => {
          const centerWeight = 1 - Math.abs(idx - 15.5) / 18;
          const fastOsc = Math.sin(step * 0.85 + idx * 0.72);
          const subOsc = Math.cos(step * 0.42 - idx * 0.35);
          const spike = Math.random() > 0.7 ? Math.random() * 45 : Math.random() * 20;
          const rawVal = ((fastOsc * 0.55 + subOsc * 0.45 + 1) * 44 * centerWeight + spike) * boost;
          return Math.min(100, Math.max(8, Math.round(rawVal)));
        })
      );
    }, 80);

    return () => clearInterval(id);
  }, [isPlaying, systemMedia.peak]);

  const handleMediaAction = async (
    action: 'playPause' | 'next' | 'prev' | 'seekForward' | 'seekBackward'
  ) => {
    if (action === 'playPause') {
      lastUserActionRef.current = Date.now();
      setIsPlaying((p) => !p);
    }
    if (window.crossDiaryNative?.controlMedia) {
      const updated = await window.crossDiaryNative.controlMedia(action);
      if (updated && typeof updated === 'object' && 'found' in updated) {
        setSystemMedia(updated);
        if (action === 'playPause' && typeof updated.status === 'string') {
          setIsPlaying(updated.status === 'Playing');
        }
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Live Track Header with GSMTC Cover Thumbnail */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border relative overflow-hidden shadow-inner"
          style={{
            background: 'var(--bg-main)',
            borderColor: 'var(--border-strong)',
          }}
        >
          {systemMedia.thumbnail ? (
            <img
              src={systemMedia.thumbnail}
              alt="Cover"
              className="w-full h-full object-cover animate-fade-in"
              onError={() => {
                setSystemMedia((prev) => ({ ...prev, thumbnail: undefined }));
              }}
            />
          ) : (
            <Disc
              size={24}
              className={`${isPlaying ? 'animate-spin' : ''}`}
              style={{
                color: 'var(--accent)',
                animationDuration: '3.5s',
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Radio
              size={10}
              className={isPlaying ? 'animate-pulse' : 'opacity-40'}
              style={{ color: 'var(--accent)' }}
            />
            <span
              className="text-[9px] font-dot-matrix font-bold uppercase tracking-wider truncate"
              style={{ color: 'var(--accent)' }}
            >
              {systemMedia.source
                ? `${systemMedia.source} // ${isEnglish ? 'LIVE' : 'EN VIVO'}`
                : isEnglish
                ? 'AUDIO // LOCAL'
                : 'AUDIO // LOCAL'}
            </span>
          </div>
          <div className="text-xs font-extrabold uppercase truncate mt-0.5" title={systemMedia.title}>
            {systemMedia.title || (isEnglish ? 'Audio Track' : 'Pista de Audio')}
          </div>
          <div className="text-[10px] font-bold opacity-60 truncate">
            {systemMedia.artist || (isEnglish ? 'Windows Media Player' : 'Reproductor de Windows')}
          </div>
        </div>
      </div>

      {/* Exaggerated 32-Bar Waveform Display */}
      <div
        className="h-16 rounded-xl flex items-end justify-between px-2.5 py-2 gap-[3px] border relative overflow-hidden"
        style={{
          background: 'var(--bg-main)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, var(--accent) 0%, transparent 50%, var(--accent) 100%)',
          }}
        />
        {waveBars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-75 relative z-10"
            style={{
              height: `${Math.max(8, h)}%`,
              backgroundColor: i % 2 === 0 ? 'var(--accent)' : 'var(--text-main)',
              opacity: isPlaying ? 0.95 : 0.25,
            }}
          />
        ))}
      </div>

      {/* Control Buttons with -10s and +10s seeking */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => handleMediaAction('seekBackward')}
          className="p-2 rounded-full border hover:scale-105 active:scale-95 transition-transform"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
          title={isEnglish ? "Rewind 10 seconds (-10s)" : "Retroceder 10 segundos (-10s)"}
        >
          <RotateCcw size={12} />
        </button>

        <button
          type="button"
          onClick={() => handleMediaAction('prev')}
          className="p-2 rounded-full border hover:scale-105 active:scale-95 transition-transform"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
          title={isEnglish ? "Previous track" : "Pista anterior"}
        >
          <SkipBack size={13} />
        </button>

        <button
          type="button"
          onClick={() => handleMediaAction('playPause')}
          className="p-3 rounded-full border hover:scale-105 active:scale-95 transition-transform shadow-md"
          style={{
            background: 'var(--bg-pill)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent-fg)',
          }}
          title={isPlaying ? (isEnglish ? 'Pause' : 'Pausar') : (isEnglish ? 'Play' : 'Reproducir')}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          onClick={() => handleMediaAction('next')}
          className="p-2 rounded-full border hover:scale-105 active:scale-95 transition-transform"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
          title={isEnglish ? "Next track" : "Siguiente pista"}
        >
          <SkipForward size={13} />
        </button>

        <button
          type="button"
          onClick={() => handleMediaAction('seekForward')}
          className="p-2 rounded-full border hover:scale-105 active:scale-95 transition-transform"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
          title={isEnglish ? "Fast forward 10 seconds (+10s)" : "Adelantar 10 segundos (+10s)"}
        >
          <RotateCw size={12} />
        </button>
      </div>
    </div>
  );
};
