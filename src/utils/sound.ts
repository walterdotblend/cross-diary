import { ChronoSettings, AlarmToneId } from '../types/diary';

let activeHtmlAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;

// Synthetic WAV generator helper
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function generateWavBeepDataUrl(freqs: number[], durationSec = 1.0, type: 'chime' | 'beep' | 'arcade' = 'chime'): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (type === 'beep') {
      // Periodic pulsing digital alarm beep
      const pulse = Math.floor(t * 8) % 2 === 0 ? 1 : 0;
      sample = pulse * Math.sin(2 * Math.PI * freqs[0] * t);
    } else if (type === 'arcade') {
      // Ascending rapid arpeggio
      const noteIdx = Math.min(freqs.length - 1, Math.floor(t * 10));
      const f = freqs[noteIdx];
      sample = (Math.sin(2 * Math.PI * f * t) > 0 ? 0.6 : -0.6) * Math.exp(-1.5 * (t % 0.1));
    } else {
      // Harmonic chime bell with exponential decay
      for (let fi = 0; fi < freqs.length; fi++) {
        const decay = 2.5 + fi * 0.8;
        sample += Math.sin(2 * Math.PI * freqs[fi] * t) * Math.exp(-decay * t);
      }
      sample = sample / freqs.length;
    }

    const clamped = Math.max(-1, Math.min(1, sample * 0.85));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Pre-generated WAV audio cache for instant, zero-latency playback
const WAV_CACHE: Partial<Record<AlarmToneId, string>> = {
  'cristal-bell': generateWavBeepDataUrl([523.25, 659.25, 783.99, 1046.5], 1.2, 'chime'),
  'cyber-beep': generateWavBeepDataUrl([1046.5], 1.0, 'beep'),
  'arcade-up': generateWavBeepDataUrl([440, 554, 659, 880, 1108], 0.9, 'arcade'),
  'soft-chime': generateWavBeepDataUrl([392.0, 587.33, 783.99], 1.4, 'chime'),
};

export function playTimerAlarm(config?: Partial<ChronoSettings>, forcePlay = false): void {
  if (!forcePlay && config?.soundAlerts === false) return;

  const tone: AlarmToneId = config?.alarmTone || 'cristal-bell';
  const vol = Math.min(1, Math.max(0.05, (config?.alarmVolume ?? 85) / 100));

  // 1. Play custom uploaded audio file if present
  if (tone === 'custom' && config?.customAlarmDataUrl) {
    try {
      if (activeHtmlAudio) {
        activeHtmlAudio.pause();
      }
      activeHtmlAudio = new Audio(config.customAlarmDataUrl);
      activeHtmlAudio.volume = vol;
      activeHtmlAudio.play().catch(() => {});
      return;
    } catch {
      // fallback
    }
  }

  // 2. Play synthetic WAV chime (100% reliable in Electron / Chromium, bypasses suspended AudioContext)
  const wavUrl = WAV_CACHE[tone] || WAV_CACHE['cristal-bell'];
  if (wavUrl) {
    try {
      if (activeHtmlAudio) {
        activeHtmlAudio.pause();
      }
      activeHtmlAudio = new Audio(wavUrl);
      activeHtmlAudio.volume = vol;
      activeHtmlAudio.play().catch((err) => {
        console.warn('HTML Audio play error, trying WebAudio:', err);
      });
    } catch {}
  }

  // 3. Dual play via WebAudio as backup
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(tone === 'cyber-beep' ? 987 : 784, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch {}
}
