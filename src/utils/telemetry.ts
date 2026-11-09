// Privacy-First Anonymous Telemetry & Metrics
export interface TelemetryEvent {
  event: 'session_start' | 'theme_change' | 'note_created' | 'language_change' | 'app_update_check';
  timestamp: string;
  properties?: Record<string, any>;
}

const TELEMETRY_STORAGE_KEY = 'cross_diary_telemetry_v1';
const TELEMETRY_ENABLED_KEY = 'cross_diary_telemetry_enabled';

export function isTelemetryEnabled(): boolean {
  return localStorage.getItem(TELEMETRY_ENABLED_KEY) !== 'false';
}

export function setTelemetryEnabled(enabled: boolean) {
  localStorage.setItem(TELEMETRY_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function recordMetric(event: TelemetryEvent['event'], properties?: Record<string, any>) {
  if (!isTelemetryEnabled()) return;
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    const events: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    events.push({
      event,
      timestamp: new Date().toISOString(),
      properties: {
        platform: typeof window !== 'undefined' && (window as any).crossDiaryNative ? 'desktop-electron' : 'web-mobile',
        screen: `${window.innerWidth}x${window.innerHeight}`,
        ...properties,
      },
    });
    // Keep max 50 recent anonymous events
    if (events.length > 50) events.splice(0, events.length - 50);
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore metric recording errors silently
  }
}

export function getStoredMetrics(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
