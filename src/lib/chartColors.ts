// Faz 10.5/10b — grafik renkleri @theme CSS değişkenlerinden okunur (iki tema uyumlu).
// recharts prop'ları gerçek renk string'i ister; sayfa yüklendiğinde bir kez çözülür.
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function getChartColors() {
  return {
    brand: cssVar('--color-brand', '#4f46e5'),
    success: cssVar('--color-success', '#35c393'),
    warning: cssVar('--color-warning', '#dda544'),
    danger: cssVar('--color-danger', '#e26571'),
    info: cssVar('--color-info', '#4fa3d4'),
    grid: cssVar('--color-border', '#2f3340'),
    axis: cssVar('--color-fg-muted', '#8b94a4'),
    track: cssVar('--color-surface-2', '#282b37'),
  };
}
