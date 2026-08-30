// Faz 10b — Gündüz/Gece/Sistem tema modu. Palet değerleri index.css `[data-theme]` bloklarında.
export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'snaps_theme';

function prefersLight(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  );
}

/** Kullanıcı tercihini (system/light/dark) döndürür — seçici UI'si için. */
export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
  } catch {}
  return 'dark';
}

/** Tercihi gerçek temaya çözer (system → cihaz tercihine göre light/dark). */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersLight() ? 'light' : 'dark';
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#f4f5f7' : '#13141A');
  // Grafikler CSS var'larını okuyor → yeniden okumaları için haber ver
  window.dispatchEvent(new CustomEvent('snaps:themechange', { detail: resolved }));
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  applyTheme(mode);
}

/** "Sistem" seçiliyken cihaz teması değişirse canlı uygula. */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getThemeMode() === 'system') applyTheme('system');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
