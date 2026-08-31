import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';
import { haptics } from '../lib/haptics';

export interface TourStep {
  /** Hedef eleman id'leri — ilk görünür olan kullanılır (mobil/masaüstü farkı için). */
  targets: string[];
  title: string;
  body: string;
}

interface CoachTourProps {
  steps: TourStep[];
  onDone: () => void;
}

interface Rect { top: number; left: number; width: number; height: number; }

function firstVisible(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') return el;
    }
  }
  return null;
}

export const CoachTour: React.FC<CoachTourProps> = ({ steps, onDone }) => {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[idx];

  const measure = useCallback(() => {
    const el = firstVisible(step?.targets || []);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Kaydırma bitiminden sonra ölç.
    window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 320);
  }, [step]);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      if (e.key === 'Enter' || e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const next = () => {
    haptics.selection();
    if (idx >= steps.length - 1) { onDone(); return; }
    setIdx((i) => i + 1);
  };

  if (!step) return null;

  const pad = 8;
  const highlight: Rect | null = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip konumu: hedefin altına, taşarsa üstüne; yatayda ekrana sığdır.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
  const cardW = Math.min(320, vw - 24);
  let cardTop = highlight ? highlight.top + highlight.height + 12 : vh / 2 - 80;
  let placeAbove = false;
  if (highlight && cardTop + 180 > vh) {
    cardTop = highlight.top - 12 - 180;
    placeAbove = true;
  }
  cardTop = Math.max(12, Math.min(cardTop, vh - 200));
  let cardLeft = highlight ? highlight.left + highlight.width / 2 - cardW / 2 : vw / 2 - cardW / 2;
  cardLeft = Math.max(12, Math.min(cardLeft, vw - cardW - 12));

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Karartma — 4 parça ile "delik" efekti */}
      {highlight ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-slate-950/75" style={{ height: Math.max(0, highlight.top) }} onClick={onDone} />
          <div className="absolute inset-x-0 bg-slate-950/75" style={{ top: highlight.top + highlight.height, bottom: 0 }} onClick={onDone} />
          <div className="absolute bg-slate-950/75" style={{ top: highlight.top, left: 0, width: Math.max(0, highlight.left), height: highlight.height }} onClick={onDone} />
          <div className="absolute bg-slate-950/75" style={{ top: highlight.top, left: highlight.left + highlight.width, right: 0, height: highlight.height }} onClick={onDone} />
          <div
            className="absolute rounded-2xl ring-2 ring-indigo-400 pointer-events-none transition-all duration-200"
            style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/75" onClick={onDone} />
      )}

      {/* İpucu kartı */}
      <div
        className="absolute rounded-2xl bg-surface-1 border border-indigo-500/40 shadow-2xl p-4 animate-in fade-in zoom-in-95"
        style={{ top: cardTop, left: cardLeft, width: cardW }}
      >
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h4 className="text-sm font-bold text-white">{step.title}</h4>
          <button onClick={onDone} className="text-slate-500 hover:text-white shrink-0 -mt-0.5" aria-label="Turu kapat">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-indigo-400' : 'bg-surface-3'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {idx < steps.length - 1 && (
              <button onClick={onDone} className="text-2xs text-slate-400 hover:text-white">Atla</button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {idx >= steps.length - 1 ? <>Bitir <Check className="w-3.5 h-3.5" /></> : <>Sonraki <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
        {placeAbove && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-1 border-r border-b border-indigo-500/40 rotate-45" />}
        {!placeAbove && highlight && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-1 border-l border-t border-indigo-500/40 rotate-45" />}
      </div>
    </div>
  );
};

export const TOUR_STEPS: TourStep[] = [
  {
    targets: ['spotlight-search'],
    title: 'Her şey aramadan başlar',
    body: 'Soru çöz, konu ara, deneme gir veya koça sor — hepsine tek yerden ulaş. Masaüstünde ⌘K / Ctrl+K.',
  },
  {
    targets: ['bottom-nav-training-btn', 'primary-category-TRAINING'],
    title: 'Çalışma Araçları',
    body: 'Deneme takibi, hata defteri, pomodoro, hedef simülatörü ve koç bir kart ızgarasında toplandı.',
  },
  {
    targets: ['bottom-nav-calendar-btn', 'primary-category-CALENDAR'],
    title: 'Takvim & günlük odak',
    body: 'Sınav geri sayımı, günün çalışma blokları, aylık takvim ve ileri tarihli deneme planlama burada.',
  },
  {
    targets: ['header-streak-badge-btn'],
    title: 'Zinciri kırma',
    body: 'Her gün en az bir şey yap; çalışma serini sürdür. Bir gün kaçırırsan telafi hakkın seriyi korur.',
  },
];
