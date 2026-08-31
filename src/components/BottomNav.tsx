import React from 'react';
import {
  Home,
  LayoutGrid,
  Search,
  Calendar,
  User
} from 'lucide-react';
import { MainTabCategory } from '../types';
import { haptics } from '../lib/haptics';

interface BottomNavProps {
  activeCategory: MainTabCategory;
  activeTab: string;
  onSelectCategory: (cat: MainTabCategory) => void;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  isInstitutionAuthenticated?: boolean;
  settingsOpen?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeCategory,
  activeTab,
  onSelectCategory,
  onSelectTab,
  onOpenSearch,
  onOpenSettings,
  settingsOpen = false,
}) => {
  // Check which main category is active
  const isHomeActive =
    activeCategory === 'HOME' ||
    ['dashboard', 'curriculum', 'notes', 'streak', 'achievements'].includes(activeTab);

  const isTrainingActive =
    activeCategory === 'TRAINING' ||
    [
      'tools',
      'snap',
      'mock',
      'mistakes',
      'notebook',
      'errors',
      'pomodoro',
      'simulator',
      'voice_coach',
      'coach',
      'speed',
      'duel',
      'flashcards'
    ].includes(activeTab);

  const isCalendarActive = 
    activeCategory === 'CALENDAR' || 
    activeTab === 'planner';

  const isProfileActive =
    settingsOpen ||
    activeCategory === 'PROFILE' ||
    activeTab === 'settings';

  return (
    <nav 
      id="main-bottom-navigation"
      aria-label="Alt Navigasyon Menüsü"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-1/95 backdrop-blur-xl border-t border-border px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.35)] select-none no-print"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-end justify-items-center">
        
        {/* 1. ANASAYFA */}
        <button
          id="bottom-nav-home-btn"
          aria-current={isHomeActive && !isCalendarActive && !isTrainingActive ? 'page' : undefined}
          onClick={() => {
            haptics.selection();
            onSelectCategory('HOME');
            if (!['dashboard', 'curriculum', 'notes', 'streak', 'achievements'].includes(activeTab)) {
              onSelectTab('dashboard');
            }
          }}
          className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-150 ${
            isHomeActive && !isCalendarActive && !isTrainingActive
              ? 'text-indigo-400 font-bold scale-105' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${
            isHomeActive && !isCalendarActive && !isTrainingActive ? 'bg-indigo-600/20 text-indigo-400' : ''
          }`}>
            <Home className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-3xs tracking-tight leading-tight mt-0.5 whitespace-nowrap">
            Anasayfa
          </span>
        </button>

        {/* 2. ÇALIŞMA ARAÇLARI */}
        <button
          id="bottom-nav-training-btn"
          aria-current={isTrainingActive ? 'page' : undefined}
          onClick={() => {
            haptics.selection();
            onSelectCategory('TRAINING');
            // Alt navigasyondaki "Araçlar" her zaman modül ızgarasına götürür.
            onSelectTab('tools');
          }}
          className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-150 ${
            isTrainingActive 
              ? 'text-indigo-400 font-bold scale-105' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${
            isTrainingActive ? 'bg-indigo-600/20 text-indigo-400' : ''
          }`}>
            <LayoutGrid className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-3xs tracking-tight leading-tight mt-0.5 whitespace-nowrap">
            Araçlar
          </span>
        </button>

        {/* 3. ARAMA (Ortada Belirgin Buton) */}
        <button
          id="bottom-nav-search-btn"
          onClick={() => {
            haptics.light();
            onOpenSearch();
          }}
          className="flex flex-col items-center justify-center w-full relative -mt-3.5 group cursor-pointer"
          title="Evrensel Arama ve Komut Paleti (Ctrl+K)"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-600/40 border-2 border-slate-900 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95">
            <Search className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-3xs font-bold text-indigo-300 tracking-tight leading-tight mt-0.5 whitespace-nowrap">
            Arama
          </span>
        </button>

        {/* 4. TAKVİM */}
        <button
          id="bottom-nav-calendar-btn"
          aria-current={isCalendarActive ? 'page' : undefined}
          onClick={() => {
            haptics.selection();
            onSelectCategory('CALENDAR');
            onSelectTab('planner');
          }}
          className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-150 ${
            isCalendarActive 
              ? 'text-indigo-400 font-bold scale-105' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${
            isCalendarActive ? 'bg-indigo-600/20 text-indigo-400' : ''
          }`}>
            <Calendar className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-3xs tracking-tight leading-tight mt-0.5 whitespace-nowrap">
            Takvim
          </span>
        </button>

        {/* 5. PROFİL */}
        <button
          id="bottom-nav-profile-btn"
          aria-current={isProfileActive ? 'page' : undefined}
          onClick={() => {
            haptics.selection();
            onOpenSettings();
          }}
          className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-150 ${
            isProfileActive 
              ? 'text-indigo-400 font-bold scale-105' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${
            isProfileActive ? 'bg-indigo-600/20 text-indigo-400' : ''
          }`}>
            <User className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-3xs tracking-tight leading-tight mt-0.5 whitespace-nowrap">
            Profil
          </span>
        </button>

      </div>
    </nav>
  );
};
