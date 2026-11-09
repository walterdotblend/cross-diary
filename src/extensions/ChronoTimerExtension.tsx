import React, { useState, useEffect, useRef } from 'react';
import { ExtensionProps } from './types';
import { playTimerAlarm } from '../utils/sound';
import { AlarmToneId } from '../types/diary';
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  Gauge,
  Plus,
  Trash2,
  Volume2,
  Upload,
} from 'lucide-react';

export const ChronoTimerExtension: React.FC<ExtensionProps> = ({
  extensionConfigs,
  onUpdateExtensionConfig,
}) => {
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

  const [chronoMode, setChronoMode] = useState<'timer' | 'stopwatch'>('timer');
  const [timerSeconds, setTimerSeconds] = useState(
    extensionConfigs.chrono.defaultFocusMinutes * 60
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<string[]>([]);
  const [newPresetInput, setNewPresetInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const timerPresets = extensionConfigs.chrono.timerPresets || [5, 10, 15, 25, 45, 60];
  const chronoConfigRef = useRef(extensionConfigs.chrono);
  chronoConfigRef.current = extensionConfigs.chrono;

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          playTimerAlarm(chronoConfigRef.current);
          return chronoConfigRef.current.defaultFocusMinutes * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = setInterval(() => {
      setStopwatchMs((ms) => ms + 100);
    }, 100);
    return () => clearInterval(id);
  }, [stopwatchRunning]);

  const handleSelectTimerPreset = (mins: number) => {
    onUpdateExtensionConfig('chrono', { defaultFocusMinutes: mins });
    setTimerSeconds(mins * 60);
  };

  const handleAdjustTimer = (deltaSeconds: number) => {
    setTimerSeconds((prev) => Math.max(5, prev + deltaSeconds));
  };

  const handleAddTimerPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newPresetInput, 10);
    if (isNaN(val) || val < 1 || val > 240) return;
    if (!timerPresets.includes(val)) {
      const next = [...timerPresets, val].sort((a, b) => a - b);
      onUpdateExtensionConfig('chrono', { timerPresets: next });
    }
    setNewPresetInput('');
  };

  const handleDeleteTimerPreset = (mins: number) => {
    const next = timerPresets.filter((p) => p !== mins);
    onUpdateExtensionConfig('chrono', { timerPresets: next });
  };

  const handleUploadCustomAlarm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        onUpdateExtensionConfig('chrono', {
          alarmTone: 'custom',
          customAlarmDataUrl: dataUrl,
          customAlarmName: file.name.slice(0, 24),
        });
        setTimeout(() => {
          playTimerAlarm(
            {
              ...extensionConfigs.chrono,
              alarmTone: 'custom',
              customAlarmDataUrl: dataUrl,
            },
            true
          );
        }, 120);
      }
    };
    reader.readAsDataURL(file);
  };

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const swTotalSec = Math.floor(stopwatchMs / 1000);
  const swMins = Math.floor(swTotalSec / 60);
  const swSecs = swTotalSec % 60;
  const swTenths = Math.floor((stopwatchMs % 1000) / 100);

  return (
    <div className="space-y-3">
      {/* Mode Switcher + Settings Toggle */}
      <div className="flex items-center justify-between gap-1 pb-1">
        <div
          className="flex items-center p-0.5 rounded-full border"
          style={{
            background: 'var(--bg-main)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => setChronoMode('timer')}
            className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
            style={{
              background: chronoMode === 'timer' ? 'var(--bg-pill)' : 'transparent',
              color: chronoMode === 'timer' ? 'var(--accent-fg)' : 'var(--text-main)',
            }}
          >
            <Timer size={10} />
            <span>{isEnglish ? 'Timer' : 'Temporizador'}</span>
          </button>
          <button
            type="button"
            onClick={() => setChronoMode('stopwatch')}
            className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 transition-all"
            style={{
              background: chronoMode === 'stopwatch' ? 'var(--bg-pill)' : 'transparent',
              color: chronoMode === 'stopwatch' ? 'var(--accent-fg)' : 'var(--text-main)',
            }}
          >
            <Gauge size={10} />
            <span>{isEnglish ? 'Stopwatch' : 'Cronómetro'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border transition-all"
          style={{
            background: showConfig ? 'var(--bg-pill)' : 'var(--bg-surface)',
            color: showConfig ? 'var(--accent-fg)' : 'var(--text-main)',
            borderColor: 'var(--border-color)',
          }}
        >
          {showConfig ? (isEnglish ? 'Close Tones' : 'Cerrar Tonos') : (isEnglish ? 'Alarm Tones' : 'Ajustar Tonos')}
        </button>
      </div>

      {showConfig ? (
        /* Config View: Custom Tones & Presets */
        <div
          className="p-3 rounded-2xl border space-y-3 animate-fade-in"
          style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-[10px] font-dot-matrix font-extrabold uppercase" style={{ color: 'var(--accent)' }}>
            {isEnglish ? 'Alarm Sound Configuration' : 'Configuración de Alarma'}
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-bold opacity-75 uppercase">{isEnglish ? 'Alarm Tone:' : 'Tono de Alarma:'}</span>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'cristal-bell' as AlarmToneId, label: isEnglish ? 'Crystal Bell' : 'Campana Cristal' },
                { id: 'cyber-beep' as AlarmToneId, label: isEnglish ? 'Digital Pulse' : 'Pulso Digital' },
                { id: 'arcade-up' as AlarmToneId, label: isEnglish ? '8-Bit Arcade' : 'Arcade 8-Bit' },
                { id: 'soft-chime' as AlarmToneId, label: isEnglish ? 'Soft Chime' : 'Acorde Suave' },
              ].map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => {
                    onUpdateExtensionConfig('chrono', { alarmTone: tone.id });
                    playTimerAlarm({ ...extensionConfigs.chrono, alarmTone: tone.id }, true);
                  }}
                  className="px-2 py-1 rounded-xl text-[9px] font-bold border text-left truncate transition-all"
                  style={{
                    background:
                      extensionConfigs.chrono.alarmTone === tone.id
                        ? 'var(--bg-pill)'
                        : 'var(--bg-surface)',
                    color:
                      extensionConfigs.chrono.alarmTone === tone.id
                        ? 'var(--accent-fg)'
                        : 'var(--text-main)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom audio upload */}
          <div className="space-y-1 pt-1 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold opacity-75 uppercase">{isEnglish ? 'Custom Tone (MP3/WAV):' : 'Tono Personalizado (MP3/WAV):'}</span>
              {extensionConfigs.chrono.alarmTone === 'custom' && (
                <button
                  type="button"
                  onClick={() => playTimerAlarm(extensionConfigs.chrono, true)}
                  className="text-[9px] font-bold underline text-[var(--accent)]"
                >
                  {isEnglish ? 'Test' : 'Probar'}
                </button>
              )}
            </div>
            <label className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed cursor-pointer hover:bg-black/5 transition-colors">
              <Upload size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-[9px] font-bold uppercase truncate max-w-[200px]">
                {extensionConfigs.chrono.customAlarmName || (isEnglish ? 'Upload audio from PC...' : 'Subir audio del PC...')}
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleUploadCustomAlarm}
                className="hidden"
              />
            </label>
          </div>

          {/* Presets manager */}
          <div className="space-y-1 pt-1 border-t border-[var(--border-color)]">
            <span className="text-[9px] font-bold opacity-75 uppercase">{isEnglish ? 'Minute Presets:' : 'Presets de Minutos:'}</span>
            <div className="flex flex-wrap gap-1">
              {timerPresets.map((m) => (
                <span
                  key={m}
                  className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold border flex items-center gap-1"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  {m}m
                  <button
                    type="button"
                    onClick={() => handleDeleteTimerPreset(m)}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTimerPreset} className="flex gap-1 pt-1">
              <input
                type="number"
                min="1"
                max="240"
                value={newPresetInput}
                onChange={(e) => setNewPresetInput(e.target.value)}
                placeholder={isEnglish ? "Add minutes..." : "Añadir minutos..."}
                className="flex-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border focus:outline-none"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-[var(--bg-pill)] text-[var(--accent-fg)]"
              >
                +
              </button>
            </form>
          </div>
        </div>
      ) : chronoMode === 'timer' ? (
        /* Timer View */
        <div className="space-y-3">
          <div
            className="rounded-2xl p-4 flex flex-col items-center justify-center border relative overflow-hidden"
            style={{
              background: 'var(--bg-main)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div
              className="text-4xl font-display-brutal tracking-widest leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="text-[9px] font-dot-matrix font-bold uppercase opacity-65 mt-1.5">
              {isEnglish ? 'TIMER ACTIVE' : 'TEMPORIZADOR ACTIVO'}
            </div>
          </div>

          {/* Quick presets & Delta buttons */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {timerPresets.slice(0, 5).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectTimerPreset(m)}
                  className="px-2 py-1 rounded-xl text-[9px] font-extrabold uppercase border hover:scale-105 transition-transform"
                  style={{
                    background:
                      extensionConfigs.chrono.defaultFocusMinutes === m
                        ? 'var(--bg-pill)'
                        : 'var(--bg-surface)',
                    color:
                      extensionConfigs.chrono.defaultFocusMinutes === m
                        ? 'var(--accent-fg)'
                        : 'var(--text-main)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAdjustTimer(-60)}
                className="px-1.5 py-1 rounded-lg text-[9px] font-bold border hover:bg-black/5"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                title={isEnglish ? "Subtract 1 minute" : "Quitar 1 minuto"}
              >
                -1m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTimer(60)}
                className="px-1.5 py-1 rounded-lg text-[9px] font-bold border hover:bg-black/5"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                title={isEnglish ? "Add 1 minute" : "Añadir 1 minuto"}
              >
                +1m
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(extensionConfigs.chrono.defaultFocusMinutes * 60);
              }}
              className="p-2.5 rounded-full border hover:scale-105 transition-transform"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              title={isEnglish ? "Reset timer" : "Reiniciar temporizador"}
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              className="px-6 py-2.5 rounded-full border text-xs font-black uppercase flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-transform"
              style={{
                background: 'var(--bg-pill)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent-fg)',
              }}
            >
              {timerRunning ? <Pause size={14} /> : <Play size={14} />}
              <span>{timerRunning ? (isEnglish ? 'Pause' : 'Pausar') : (isEnglish ? 'Start' : 'Comenzar')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Stopwatch View */
        <div className="space-y-3">
          <div
            className="rounded-2xl p-4 flex flex-col items-center justify-center border relative overflow-hidden"
            style={{
              background: 'var(--bg-main)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div
              className="text-4xl font-display-brutal tracking-widest leading-none"
              style={{ color: 'var(--accent)' }}
            >
              {String(swMins).padStart(2, '0')}:{String(swSecs).padStart(2, '0')}.
              <span className="text-2xl">{swTenths}</span>
            </div>
            <div className="text-[9px] font-dot-matrix font-bold uppercase opacity-65 mt-1.5">
              {isEnglish ? 'PRECISION STOPWATCH' : 'CRONÓMETRO DE PRECISIÓN'}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setStopwatchRunning(false);
                setStopwatchMs(0);
                setLaps([]);
              }}
              className="p-2.5 rounded-full border hover:scale-105 transition-transform"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              title={isEnglish ? "Reset stopwatch" : "Reiniciar cronómetro"}
            >
              <RotateCcw size={14} />
            </button>

            {stopwatchRunning && (
              <button
                type="button"
                onClick={() => {
                  const lapTime = `${String(swMins).padStart(2, '0')}:${String(swSecs).padStart(
                    2,
                    '0'
                  )}.${swTenths}`;
                  setLaps((prev) => [lapTime, ...prev.slice(0, 5)]);
                }}
                className="px-3 py-2 rounded-full border text-[10px] font-black uppercase hover:scale-105 transition-transform"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              >
                {isEnglish ? 'Lap' : 'Vuelta'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setStopwatchRunning(!stopwatchRunning)}
              className="px-6 py-2.5 rounded-full border text-xs font-black uppercase flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-transform"
              style={{
                background: 'var(--bg-pill)',
                borderColor: 'var(--border-strong)',
                color: 'var(--accent-fg)',
              }}
            >
              {stopwatchRunning ? <Pause size={14} /> : <Play size={14} />}
              <span>{stopwatchRunning ? (isEnglish ? 'Stop' : 'Parar') : (isEnglish ? 'Start' : 'Iniciar')}</span>
            </button>
          </div>

          {laps.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar pt-1">
              {laps.map((lap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1 rounded-xl text-[10px] font-mono border"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                >
                  <span className="font-bold opacity-60">{isEnglish ? `LAP #${laps.length - idx}` : `VUELTA #${laps.length - idx}`}</span>
                  <span className="font-extrabold" style={{ color: 'var(--accent)' }}>
                    {lap}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
