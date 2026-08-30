// Faz 10b — grafik renkleri @theme CSS değişkenlerinden okunur (gece/gündüz uyumlu).
// recharts prop'ları gerçek renk string'i ister; tema değişiminde `useChartColors`
// yeniden okuyup bileşeni render eder.
import { useEffect, useState } from 'react';

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function getChartColors() {
  return {
    brand: cssVar('--color-brand', '#4f46e5'),
    success: cssVar('--color-success', '#3ccf9e'),
    warning: cssVar('--color-warning', '#ecb44e'),
    danger: cssVar('--color-danger', '#e86b78'),
    info: cssVar('--color-info', '#58acde'),
    grid: cssVar('--color-border', '#383d4d'),
    axis: cssVar('--color-fg-muted', '#8b94a4'),
    track: cssVar('--color-surface-2', '#282b37'),
  };
}

export type ChartColors = ReturnType<typeof getChartColors>;

/** Grafik renklerini döndürür; mount'ta ve tema değişiminde yeniden okur. */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(getChartColors);
  useEffect(() => {
    setColors(getChartColors());
    const handler = () => setColors(getChartColors());
    window.addEventListener('snaps:themechange', handler);
    return () => window.removeEventListener('snaps:themechange', handler);
  }, []);
  return colors;
}
