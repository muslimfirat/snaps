import React, { useEffect, useState } from 'react';
import { Search, Camera, BookOpen, FileText, Bot } from 'lucide-react';
import { MainTabCategory } from '../types';
import { haptics } from '../lib/haptics';

interface SpotlightSearchProps {
  onOpenSearch: () => void;
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
}

const ROTATING_HINTS = [
  '2020 KPSS 42. soruyu çöz',
  'paragrafta hız teknikleri',
  'türev konu anlatımı',
  'son denememdeki eksikler',
  'Osmanlı kuruluş dönemi',
  'bugün ne çalışmalıyım?',
];

const QUICK_ACTIONS: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
  category: MainTabCategory;
}[] = [
  { label: 'Soru Çöz', icon: Camera, tab: 'snap', category: 'TRAINING' },
  { label: 'Konu Ara', icon: BookOpen, tab: 'curriculum', category: 'HOME' },
  { label: 'Deneme Gir', icon: FileText, tab: 'mock', category: 'TRAINING' },
  { label: 'Koça Sor', icon: Bot, tab: 'coach', category: 'TRAINING' },
];

/**
 * Anasayfanın en üstünde duran belirgin arama adacığı. Görsel olarak yükseltilmiş
 * bir kart; tıklanınca evrensel komut paletini açar. Altındaki çipler sık kullanılan
 * modüllere tek dokunuşla götürür.
 */
export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({ onOpenSearch, onNavigateTab }) => {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setHintIndex((i) => (i + 1) % ROTATING_HINTS.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-3xl p-[1.5px] bg-gradient-to-tr from-indigo-500/60 via-violet-500/40 to-indigo-500/60 shadow-lg shadow-indigo-950/30">
      <div className="rounded-[calc(1.5rem-1.5px)] bg-surface-1 p-4 sm:p-5 space-y-3">
        <button
          onClick={() => {
            haptics.light();
            onOpenSearch();
          }}
          className="w-full h-12 sm:h-14 px-3.5 sm:px-4 bg-canvas hover:bg-surface-0 border border-border hover:border-indigo-500/50 rounded-2xl flex items-center gap-3 transition-all group cursor-pointer"
        >
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="flex-1 min-w-0 text-left text-sm sm:text-base text-slate-400 group-hover:text-slate-200 truncate">
            <span className="hidden sm:inline">Ara: </span>
            <span key={hintIndex} className="animate-in fade-in slide-in-from-bottom-1 duration-500 text-slate-300">
              {ROTATING_HINTS[hintIndex]}
            </span>
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-2xs font-mono text-slate-400 shrink-0">
            ⌘K
          </kbd>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => {
                  haptics.selection();
                  onNavigateTab(action.tab, action.category);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-0 hover:bg-surface-2 border border-border hover:border-indigo-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
