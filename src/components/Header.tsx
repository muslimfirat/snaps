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
  Menu,
  X, 
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Trophy,
  NotebookPen,
  LayoutGrid
} from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';
import { SnapsMark } from './SnapsMark';
import { UserProfile, InstitutionConfig, MainTabCategory, InstitutionAccount } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { ambientManager } from '../lib/soundEffects';
import { haptics } from '../lib/haptics';
import { handleTablistKeys } from '../lib/useTablistKeys';
import { INSTITUTION_ENABLED } from '../lib/features';

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
  /** Kategoriye girildiğinde ilk açılacak sekme. Yoksa subTabs[0] kullanılır. */
  landingTab?: string;
  subTabs: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Modül ızgarasında (ToolsHub) gösterilen kısa açıklama. */
    description?: string;
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
      { id: 'notes', label: 'Defter Notları', icon: NotebookPen },
      { id: 'streak', label: 'İstikrar Analizi', icon: Flame },
      { id: 'achievements', label: 'Başarılar & Rozetler', icon: Trophy },
    ],
  },
  {
    id: 'TRAINING',
    name: 'Çalışma Araçları',
    shortName: 'Araçlar',
    icon: LayoutGrid,
    landingTab: 'tools',
    subTabs: [
      { id: 'snap', label: 'Soru Çöz', icon: Camera, description: 'Fotoğrafla, yapay zeka adım adım çözsün' },
      { id: 'mock', label: 'Deneme Takibi', icon: BarChart3, description: 'Deneme netlerini gir, gelişimini izle' },
      { id: 'mistakes', label: 'Hata Defteri', icon: Bookmark, description: 'Yanlışlarını kaydet ve tekrar et' },
      { id: 'simulator', label: 'Hedef Simülatörü', icon: Target, description: 'Net → sıralama tahmini yap' },
      { id: 'pomodoro', label: 'Pomodoro', icon: Zap, description: 'Odak sayacıyla çalışma seansı' },
      { id: 'coach', label: 'Snaps Koç', icon: Bot, description: 'Snaps Koç ile yazılı sohbet' },
      { id: 'voice_coach', label: 'Sesli Snaps Koç', icon: Sparkles, description: 'Koçunla sesli konuş' },
      { id: 'flashcards', label: 'Bilgi Kartları', icon: BookOpen, description: 'Hızlı tekrar için kart destesi' },
      { id: 'speed', label: 'Hızlı Okuma', icon: Clock, description: 'Okuma hızını (WPM) artır' },
      { id: 'duel', label: 'Soru Düellosu', icon: Zap, description: 'Süreye karşı soru yarışı' },
    ],
  },
  {
    id: 'CALENDAR',
    name: 'Takvim',
    shortName: 'Takvim',
    icon: Calendar,
    subTabs: [
      { id: 'planner', label: 'Takvim & Haftalık Plan', icon: Calendar },
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

  const currentCategoryDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === activeCategory) ||
    CATEGORY_DEFINITIONS.find((c) => c.subTabs.some(st => st.id === activeTab)) || 
    CATEGORY_DEFINITIONS[0];

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-border text-slate-100 shadow-sm transition-all w-full">
      
      {/* 1. TOP BAR: Minimalist & Perfectly Responsive on Mobile, Tablet & Desktop */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-3 w-full min-w-0">
          
          {/* Left: Brand Logo (Individual Snaps vs Institution) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onSelectCategory('HOME');
                onSelectTab('dashboard');
              }}
              className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
              title="Snaps Koç"
              aria-label="Anasayfaya git"
            >
              {/* Distinctive Snaps Logo */}
              {isInstitutionAuthenticated ? (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
              ) : (
                <SnapsMark className="w-8 h-8 rounded-xl shadow-md shadow-indigo-600/20 shrink-0 group-hover:scale-105 transition-transform" />
              )}

              {/* Dynamic Branding Text: Snaps for Individual, Dershane Name for Authenticated Institutions */}
              <div className="min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-white block leading-none truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                  {isInstitutionAuthenticated 
                    ? (activeInstitutionAccount?.name || institutionConfig.name || 'Kurum Paneli')
                    : 'Snaps'}
                </span>
                <span className="text-3xs font-medium text-slate-400 block mt-0.5 truncate">
                  {isInstitutionAuthenticated
                    ? (institutionConfig.branch || 'Kurumsal Portal')
                    : 'AI Sınav Koçu'}
                </span>
              </div>
            </button>
          </div>

          {/* Center: Evrensel arama tetikleyici.
              Mobilde ikon (Anasayfa'daki Spotlight adacığı + alt-bar FAB birincil giriş);
              sm+ ekranlarda gerçek bir arama alanı. */}
          <div className="sm:flex-1 min-w-0 flex justify-end sm:justify-start sm:max-w-sm md:max-w-md ml-auto sm:ml-0 sm:mx-2">
            <button
              id="universal-search-trigger"
              onClick={onOpenSearch}
              aria-label="Ara"
              className="sm:w-full h-9 w-9 sm:px-3 bg-canvas hover:bg-surface-0 border border-border hover:border-indigo-500/40 rounded-xl flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-400 hover:text-slate-200 transition-all shadow-inner group cursor-pointer min-w-0"
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
              <span className="hidden sm:block flex-1 truncate text-slate-400 group-hover:text-slate-200 text-left">
                Soru, konu veya modül ara...
              </span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-2xs font-mono text-slate-400 shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Section: Compact Status, Google Auth & Hamburger Menu */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Seri (Zincir) Rozeti — motivasyon odaklı birincil durum göstergesi.
                Sınav geri sayımı bilinçli olarak header'dan kaldırıldı (kaygı azaltma);
                geri sayım Anasayfa ve Takvim'de bağlamıyla birlikte duruyor. */}
            <button
              id="header-streak-badge-btn"
              onClick={() => {
                haptics.selection();
                onSelectCategory('HOME');
                onSelectTab('streak');
              }}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-xs font-bold text-amber-400 transition-all cursor-pointer shadow-sm shrink-0"
              title={`Çalışma serin: ${profile.streakDays || 0} gün${profile.maxStreakDays ? ` • Rekor: ${profile.maxStreakDays} gün` : ''}`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-mono tabular-nums">{profile.streakDays || 0}</span>
              <span className="font-semibold hidden sm:inline">gün seri</span>
            </button>

            {/* Google Auth Button (Compact Avatar & Cloud Status) */}
            <GoogleAuthButton compact />

            {/* Unified Hamburger / Quick Tools Menu */}
            <div className="relative shrink-0 z-50" ref={menuRef}>
              <button
                id="header-hamburger-menu-btn"
                aria-label="Hızlı menü ve araçlar"
                aria-expanded={isMenuOpen}
                onClick={() => {
                  haptics.light();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-canvas hover:bg-surface-0 border-border text-slate-300 hover:text-white'
                }`}
                title="Hızlı Menü ve Araçlar"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Dropdown Menu Panel */}
              {isMenuOpen && (
                <div 
                  id="header-tools-dropdown"
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-surface-0 border border-border p-2.5 shadow-2xl z-[100] animate-in fade-in zoom-in-95 space-y-1.5 pointer-events-auto"
                >
                  {/* User Header in Menu */}
                  <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{profile.name || 'Öğrenci'}</p>
                      <p className="text-3xs text-slate-400 truncate">{profile.targetScore || 85} Hedef Puan • {EXAM_METADATA[profile.targetExam]?.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-3xs text-slate-400 font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* 1. Kurumsal / Dershane Portalı Girişi (demo — bayrakla gizlenebilir) */}
                  {INSTITUTION_ENABLED && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSelectCategory('INSTITUTION');
                      onSelectTab('institution');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-0 hover:bg-indigo-950/50 border border-border hover:border-indigo-500/40 text-left flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block truncate">{isInstitutionAuthenticated ? 'Kurum Paneli' : 'Dershane Portalı'}</span>
                        <span className="text-3xs text-slate-400 block font-normal truncate">
                          {isInstitutionAuthenticated ? activeInstitutionAccount?.name : 'Öğretmen & Kurum Girişi'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1" />
                  </button>
                  )}

                  {/* 2. Odak & Yağmur Sesi */}
                  <button
                    onClick={toggleAmbientSound}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-0 hover:bg-surface-2 border border-border text-left flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {ambientSound !== 'off' ? (
                        <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>Odaklanma Sesi</span>
                    </div>
                    <span className="text-3xs font-mono uppercase font-bold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded shrink-0">
                      {ambientSound === 'off' ? 'Kapalı' : ambientSound}
                    </span>
                  </button>

                  {/* 3. Çalışma İpucu İste (On demand) */}
                  <button
                    onClick={handleTriggerInsight}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-0 hover:bg-surface-2 border border-border text-left flex items-center gap-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
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
                      className="w-full px-2.5 py-2 rounded-xl bg-surface-0 hover:bg-surface-2 border border-border text-left flex items-center gap-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
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
        <div
          role="tablist"
          aria-label="Ana bölümler"
          aria-orientation="horizontal"
          onKeyDown={(e) => handleTablistKeys(e, (el) => el.click())}
          className="hidden md:grid grid-cols-3 gap-1 sm:gap-1.5 pt-1.5 pb-2 border-t border-border w-full"
        >
          {CATEGORY_DEFINITIONS.filter((c) => c.id !== 'INSTITUTION').map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            
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
                role="tab"
                aria-selected={isSelected}
                aria-controls="app-subtabs"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => {
                  onSelectCategory(cat.id);
                  const landing = cat.landingTab || (Array.isArray(cat?.subTabs) && cat.subTabs.length > 0 ? cat.subTabs[0].id : undefined);
                  if (landing) {
                    onSelectTab(landing);
                  }
                }}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl flex items-center justify-start gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm font-semibold cursor-pointer min-w-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-surface-0'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 2b kaldırıldı: mobilde kategori geçişini alt navigasyon (BottomNav) yapıyor;
            header'da ikinci bir kategori şeridi çift gösterim ve dikey alan israfıydı. */}

        {/* 3. SECONDARY SUB-TABS — tümü görünür (yatay kaydırma yok, satıra sarar).
            Modül ızgarası (hub) açıkken gizlenir; ızgaranın kendisi navigasyondur. */}
        {currentCategoryDef?.landingTab === activeTab ? null : (
        <div
          id="app-subtabs"
          role="tablist"
          aria-label={`${currentCategoryDef?.name || 'Bölüm'} alt sekmeleri`}
          onKeyDown={(e) => handleTablistKeys(e, (el) => el.click())}
          className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-2 border-t border-border/60 w-full"
        >
          {currentCategoryDef?.landingTab && (
            <button
              id="sub-tab-hub"
              onClick={() => onSelectTab(currentCategoryDef.landingTab as string)}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1 text-slate-400 hover:text-white hover:bg-surface-0/50 transition-colors cursor-pointer shrink-0"
              title="Tüm araçlar"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
          {(currentCategoryDef?.subTabs || []).map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = activeTab === sub.id;
            return (
              <button
                key={sub.id}
                id={`sub-tab-${sub.id}`}
                role="tab"
                aria-selected={isSubActive}
                aria-controls="main-panel"
                tabIndex={isSubActive ? 0 : -1}
                onClick={() => onSelectTab(sub.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer shrink-0 ${
                  isSubActive
                    ? 'bg-surface-0 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-surface-0/50'
                }`}
              >
                <SubIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
        )}

      </div>

    </header>
  );
};
