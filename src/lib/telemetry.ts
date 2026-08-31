/**
 * Hafif, gizlilik dostu telemetri.
 * - Yalnızca /api/telemetry uç noktasına gönderir (3. parti servis YOK).
 * - Kullanıcı kapatabilir (`snaps_telemetry_disabled`).
 * - Ateşle-unut; hiçbir zaman uygulama akışını bloklamaz veya hata fırlatmaz.
 * - PII göndermez: mesaj/stack kırpılır, kullanıcı verisi eklenmez.
 */

const DISABLE_KEY = 'snaps_telemetry_disabled';
const SESSION_LIMIT = 20; // oturum başına en fazla gönderim (gürültü/döngü koruması)

let sent = 0;
const recentErrors = new Set<string>();

export function isTelemetryEnabled(): boolean {
  try {
    return localStorage.getItem(DISABLE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setTelemetryEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(DISABLE_KEY);
    else localStorage.setItem(DISABLE_KEY, '1');
  } catch {
    /* ignore */
  }
}

function post(body: Record<string, unknown>): void {
  if (!isTelemetryEnabled() || sent >= SESSION_LIMIT) return;
  sent += 1;
  try {
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function reportError(error: unknown, meta?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = `${err.name}:${err.message}`.slice(0, 120);
  if (recentErrors.has(key)) return; // aynı hatayı bir kez
  recentErrors.add(key);
  post({
    type: 'error',
    name: err.name,
    message: err.message,
    stack: err.stack,
    meta: { ...meta, path: safePath() },
  });
}

export function trackEvent(name: string, meta?: Record<string, unknown>): void {
  post({ type: 'event', name, meta: { ...meta, path: safePath() } });
}

function safePath(): string {
  try {
    return window.location.pathname;
  } catch {
    return '';
  }
}

/** Yakalanmamış hataları ve promise reddi'lerini bir kez bağlar. */
export function installGlobalErrorTelemetry(): void {
  window.addEventListener('error', (e) => {
    if (e?.error) reportError(e.error, { source: 'window.onerror' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e?.reason ?? 'unhandledrejection', { source: 'unhandledrejection' });
  });
}
