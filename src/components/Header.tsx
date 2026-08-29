import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  Settings, 
  Volume2, 
  VolumeX, 
  Target, 
  BookOpen, 
  Building2, 
  Search, 
  Camera, 
  Bot, 
  Calendar, 
  BarChart3, 
  Bookmark, 
  Zap, 
  HelpCircle, 
  Home, 
  Dumbbell, 
  Menu, 
  X, 
  Lightbulb, 
  ChevronRight 
} from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';
import { UserProfile, InstitutionConfig, MainTabCategory, InstitutionAccount } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { ambientManager } from '../lib/soundEffects';
import { haptics } from '../lib/haptics';

interface HeaderProps {
  profile: UserProfile;
  institutionConfig: InstitutionConfig;
  activeCategory: MainTabCategory;
  onSelectCategory: (cat: MainTabCategory) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenQuickStart?: () => void;
  isInstitutionAuthenticated?: boolean;
  activeInstitutionAccount?: InstitutionAccount | null;
  onLogoutInstitution?: () => void;
}

export const CATEGORY_DEFINITIONS: {
  id: MainTabCategory;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  subTabs: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    id: 'HOME',
    name: 'Anasayfa',
    shortName: 'Anasayfa',
    icon: Home,
    subTabs: [
      { id: 'dashboard', label: 'Genel Bakış', icon: BarChart3 },
      { id: 'curriculum', label: 'Müfredat & Konu', icon: BookOpen },
      { id: 'streak', label: 'İstikrar Analizi', icon: Flame },
    ],
  },
  {
    id: 'TRAINING',
    name: 'Antrenman',
    shortName: 'Antrenman',
    icon: Dumbbell,
    subTabs: [
      { id: 'snap', label: 'Soru Çöz', icon: Camera },
      { id: 'mock', label: 'Deneme Takibi', icon: BarChart3 },
      { id: 'mistakes', label: 'Hata Defteri', icon: Bookmark },
      { id: 'pomodoro', label: 'Pomodoro', icon: Zap },
      { id: 'simulator', label: 'Hedef Simülatörü', icon: Target },
      { id: 'voice_coach', label: 'Sesli AI Koç', icon: Sparkles },
      { id: 'coach', label: 'Rehberlik Chat', icon: Bot },
      { id: 'speed', label: 'Hızlı Okuma', icon: Clock },
      { id: 'duel', label: 'Soru Düellosu', icon: Zap },
      { id: 'flashcards', label: 'Bilgi Kartları', icon: BookOpen },
    ],
  },
  {
    id: 'CALENDAR',
    name: 'Takvim',
    shortName: 'Takvim',
    icon: Calendar,
    subTabs: [
      { id: 'planner', label: 'Çalışma Planı & Saatlik Takvim', icon: Calendar },
    ],
  },
  {
    id: 'INSTITUTION',
    name: 'Kurum Portalı',
    shortName: 'Kurum',
    icon: Building2,
    subTabs: [
      { id: 'institution', label: 'Kurumsal Sınav Paneli', icon: Building2 },
    ],
  },
];

export const Header: React.FC<HeaderProps> = ({
  profile,
  institutionConfig,
  activeCategory,
  onSelectCategory,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenSearch,
  onOpenQuickStart,
  isInstitutionAuthenticated = false,
  activeInstitutionAccount,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'whitenoise' | 'lofi'>('off');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate countdown
  useEffect(() => {
    const calculateCountdown = () => {
      const rawDate = profile?.examDate;
      if (!rawDate) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const formatted = rawDate.includes('T') ? rawDate : `${rawDate}T10:15:00`;
      const targetDate = new Date(formatted).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (!isNaN(difference) && difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({
          days: isNaN(days) ? 0 : days,
          hours: isNaN(hours) ? 0 : hours,
          minutes: isNaN(minutes) ? 0 : minutes,
          seconds: isNaN(seconds) ? 0 : seconds,
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.examDate]);

  const toggleAmbientSound = () => {
    if (ambientSound === 'off') {
      ambientManager.start('rain');
      setAmbientSound('rain');
    } else if (ambientSound === 'rain') {
      ambientManager.start('whitenoise');
      setAmbientSound('whitenoise');
    } else if (ambientSound === 'whitenoise') {
      ambientManager.start('lofi');
      setAmbientSound('lofi');
    } else {
      ambientManager.stop();
      setAmbientSound('off');
    }
  };

  const handleTriggerInsight = () => {
    window.dispatchEvent(new CustomEvent('trigger-study-insight'));
    setIsMenuOpen(false);
  };

  const mappedCategoryId = 
    activeCategory === 'OVERVIEW' ? 'HOME' : 
    (activeCategory === 'AI_STUDIO' || activeCategory === 'PRACTICE') ? 'TRAINING' : 
    activeCategory;

  const currentCategoryDef = 
    CATEGORY_DEFINITIONS.find((c) => c.id === mappedCategoryId) || 
    CATEGORY_DEFINITIONS.find((c) => c.subTabs.some(st => st.id === activeTab)) || 
    CATEGORY_DEFINITIONS[0];

  return (
    <header className="sticky top-0 z-40 bg-[#0F111A]/95 backdrop-blur-md border-b border-[#242838] text-slate-100 shadow-sm transition-all w-full">
      
      {/* 1. TOP BAR: Minimalist & Perfectly Responsive on Mobile, Tablet & Desktop */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-3 w-full min-w-0">
          
          {/* Left: Brand Logo (Individual Snaps vs Institution) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            <div 
              onClick={() => {
                haptics.selection();
                onSelectCategory('HOME');
                onSelectTab('dashboard');
              }}
              className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
              title="Snaps Sınav Koçu"
            >
              {/* Distinctive Snaps Logo */}
              {isInstitutionAuthenticated ? (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4 fill-white text-white" />
                </div>
              )}

              {/* Dynamic Branding Text: Snaps for Individual, Dershane Name for Authenticated Institutions */}
              <div className="min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-white block leading-none truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                  {isInstitutionAuthenticated 
                    ? (activeInstitutionAccount?.name || institutionConfig.name || 'Kurum Paneli')
                    : 'Snaps'}
                </span>
                <span className="text-[10px] font-medium text-slate-400 block mt-0.5 truncate">
                  {isInstitutionAuthenticated 
                    ? (institutionConfig.branch || 'Kurumsal Portal')
                    : `${EXAM_METADATA[profile?.targetExam]?.shortName || 'KPSS'} • AI Sınav Koçu`}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Minimalist Fluid Spotlight Search Trigger */}
          <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2">
            <button
              id="universal-search-trigger"
              onClick={onOpenSearch}
              className="w-full h-8 sm:h-9 px-2.5 sm:px-3 bg-[#141622] hover:bg-[#1A1D2D] border border-[#262B3D] hover:border-indigo-500/40 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-all shadow-inner group cursor-pointer min-w-0"
            >
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
              <span className="truncate text-slate-400 group-hover:text-slate-200 text-left">
                <span className="hidden sm:inline">Soru, konu veya modül ara...</span>
                <span className="sm:hidden">Ara...</span>
              </span>
            </button>
          </div>

          {/* Right Section: Compact Status, Google Auth & Hamburger Menu */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Streak Pill */}
            <button
              id="header-streak-badge-btn"
              onClick={() => {
                haptics.selection();
                onSelectCategory('HOME');
                onSelectTab('streak');
              }}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-xl bg-[#141622] border border-[#262B3D] hover:border-amber-500/40 text-xs font-bold text-amber-400 transition-all cursor-pointer shadow-sm shrink-0"
              title="Çalışma Serisi"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-mono">{profile.streakDays || 0}g</span>
            </button>

            {/* Countdown Badge (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[#141622] border border-[#262B3D] text-xs shrink-0">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span className="font-mono font-bold text-white">{timeLeft.days}</span>
              <span className="text-[11px] text-slate-400">g</span>
            </div>

            {/* Google Auth Button (Compact Avatar & Cloud Status) */}
            <GoogleAuthButton compact />

            {/* Unified Hamburger / Quick Tools Menu */}
            <div className="relative shrink-0 z-50" ref={menuRef}>
              <button
                id="header-hamburger-menu-btn"
                onClick={() => {
                  haptics.light();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#141622] hover:bg-[#1E2132] border-[#262B3D] text-slate-300 hover:text-white'
                }`}
                title="Hızlı Menü ve Araçlar"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Dropdown Menu Panel */}
              {isMenuOpen && (
                <div 
                  id="header-tools-dropdown"
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-[#161826] border border-[#2B3045] p-2.5 shadow-2xl z-[100] animate-in fade-in zoom-in-95 space-y-1.5 pointer-events-auto"
                >
                  {/* User Header in Menu */}
                  <div className="px-2 py-1.5 border-b border-[#242838] flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{profile.name || 'Öğrenci'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile.targetScore || 85} Hedef Puan • {EXAM_METADATA[profile.targetExam]?.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-[10px] text-slate-400 font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* 1. Kurumsal / Dershane Portalı Girişi */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectCategory('INSTITUTION');
                      onSelectTab('institution');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-indigo-950/50 border border-[#282D42] hover:border-indigo-500/40 text-left flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block truncate">{isInstitutionAuthenticated ? 'Kurum Paneli' : 'Dershane Portalı'}</span>
                        <span className="text-[10px] text-slate-400 block font-normal truncate">
                          {isInstitutionAuthenticated ? activeInstitutionAccount?.name : 'Öğretmen & Kurum Girişi'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1" />
                  </button>

                  {/* 2. Odak & Yağmur Sesi */}
                  <button
                    onClick={toggleAmbientSound}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#22263A] border border-[#282D42] text-left flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {ambientSound !== 'off' ? (
                        <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>Odaklanma Sesi</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded shrink-0">
                      {ambientSound === 'off' ? 'Kapalı' : ambientSound}
                    </span>
                  </button>

                  {/* 3. Çalışma İpucu İste (On demand) */}
                  <button
                    onClick={handleTriggerInsight}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#22263A] border border-[#282D42] text-left flex items-center gap-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Akıllı Çalışma İpucu Al</span>
                  </button>

                  {/* 4. Kullanım Kılavuzu */}
                  {onOpenQuickStart && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenQuickStart();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#22263A] border border-[#282D42] text-left flex items-center gap-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Nasıl Kullanılır? (Kılavuz)</span>
                    </button>
                  )}

                  {/* 5. Profil ve Ayarlar */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-left flex items-center justify-between text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 shrink-0" />
                      <span>Profil & Sınav Ayarları</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 2. PRIMARY CATEGORIES BAR (Desktop & Tablet) */}
        <div className="hidden md:grid grid-cols-4 gap-1 sm:gap-1.5 pt-1.5 pb-2 border-t border-[#242838] w-full">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = mappedCategoryId === cat.id;
            
            let label = cat.name;
            if (cat.id === 'INSTITUTION') {
              if (isInstitutionAuthenticated) {
                label = `${(activeInstitutionAccount?.name || institutionConfig.name).split(' ')[0]} Paneli`;
              } else {
                label = 'Kurum Portalı';
              }
            }

            return (
              <button
                key={cat.id}
                id={`primary-category-${cat.id}`}
                onClick={() => {
                  onSelectCategory(cat.id);
                  if (Array.isArray(cat?.subTabs) && cat.subTabs.length > 0) {
                    onSelectTab(cat.subTabs[0].id);
                  }
                }}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl flex items-center justify-start gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm font-semibold cursor-pointer min-w-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1E2132]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 2b. MOBILE HORIZONTAL CATEGORY SCROLLER (< 768px) */}
        <div className="md:hidden flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar border-t border-[#242838] w-full">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = mappedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                id={`mobile-category-${cat.id}`}
                onClick={() => {
                  onSelectCategory(cat.id);
                  if (Array.isArray(cat?.subTabs) && cat.subTabs.length > 0) {
                    onSelectTab(cat.subTabs[0].id);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-[#1E2132]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* 3. SECONDARY SUB-TABS (All Screen Sizes with Smooth Horizontal Scroll) */}
        <div className="flex items-center gap-1 sm:gap-1.5 py-2 overflow-x-auto no-scrollbar border-t border-[#242838]/60 w-full touch-pan-x">
          {(currentCategoryDef?.subTabs || []).map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = activeTab === sub.id;
            return (
              <button
                key={sub.id}
                id={`sub-tab-${sub.id}`}
                onClick={() => onSelectTab(sub.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 ${
                  isSubActive
                    ? 'bg-[#1E2132] text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-[#1E2132]/50'
                }`}
              >
                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>

      </div>

    </header>
  );
};
