import React, { useState } from 'react';
import { 
  Flame, 
  Zap, 
  Trophy, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Award, 
  X, 
  ChevronRight, 
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { UserProfile } from '../types';
import { haptics } from '../lib/haptics';

interface DailyStreakBadgeProps {
  profile: UserProfile;
  onNavigateTab?: (tab: string, category?: any) => void;
  onOpenAnalytics?: () => void;
}

interface StreakTierInfo {
  name: string;
  badgeTitle: string;
  glowClass: string;
  borderClass: string;
  badgeBg: string;
  textColor: string;
  icon: string;
  nextMilestone: number;
  nextMilestoneName: string;
}

export const getStreakTierInfo = (streakDays: number): StreakTierInfo => {
  const days = Math.max(1, streakDays || 1);

  if (days >= 30) {
    return {
      name: 'Efsanevi Fatih',
      badgeTitle: '30+ Günlük Efsane',
      glowClass: 'shadow-amber-500/20',
      borderClass: 'border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20',
      textColor: 'text-amber-300',
      icon: '👑',
      nextMilestone: 60,
      nextMilestoneName: '60 Günlük Şampiyonluk',
    };
  }

  if (days >= 14) {
    return {
      name: 'Demir İrade',
      badgeTitle: '14+ Günlük Disiplin',
      glowClass: 'shadow-cyan-500/20',
      borderClass: 'border-cyan-500/40 hover:border-cyan-400',
      badgeBg: 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20',
      textColor: 'text-cyan-300',
      icon: '🛡️',
      nextMilestone: 30,
      nextMilestoneName: '30 Günlük Sınav Fatihi',
    };
  }

  if (days >= 7) {
    return {
      name: 'Haftalık İstikrar',
      badgeTitle: '7+ Günlük Seri',
      glowClass: 'shadow-emerald-500/20',
      borderClass: 'border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
      textColor: 'text-emerald-300',
      icon: '⚡',
      nextMilestone: 14,
      nextMilestoneName: '14 Günlük Demir İrade',
    };
  }

  if (days >= 3) {
    return {
      name: 'Ateşli Kıvılcım',
      badgeTitle: '3+ Günlük Alev',
      glowClass: 'shadow-amber-500/20',
      borderClass: 'border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
      textColor: 'text-amber-300',
      icon: '🔥',
      nextMilestone: 7,
      nextMilestoneName: '7 Günlük Haftalık İstikrar',
    };
  }

  return {
    name: 'Başlangıç Kıvılcımı',
    badgeTitle: '1 Günlük Başlangıç',
    glowClass: 'shadow-slate-700/20',
    borderClass: 'border-amber-500/30 hover:border-amber-500/60',
    badgeBg: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
    textColor: 'text-amber-200',
    icon: '✨',
    nextMilestone: 3,
    nextMilestoneName: '3 Günlük Kıvılcım',
  };
};

export const DailyStreakBadge: React.FC<DailyStreakBadgeProps> = ({
  profile,
  onNavigateTab,
  onOpenAnalytics,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const streakDays = Number(profile?.streakDays) || 1;
  const maxStreak = Number(profile?.maxStreakDays) || streakDays;
  const tier = getStreakTierInfo(streakDays);

  const daysToNext = Math.max(0, tier.nextMilestone - streakDays);
  const prevMilestone = tier.nextMilestone === 3 ? 0 : tier.nextMilestone === 7 ? 3 : tier.nextMilestone === 14 ? 7 : tier.nextMilestone === 30 ? 14 : 30;
  const milestoneRange = tier.nextMilestone - prevMilestone;
  const progressInTier = Math.min(100, Math.max(0, Math.round(((streakDays - prevMilestone) / milestoneRange) * 100)));

  // Generate 7-day visual week activity
  const today = new Date();
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const todayDayIndex = (today.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

  const activeLoginDates = Array.isArray(profile?.loginDates) ? profile.loginDates : [];

  const handleOpenModal = () => {
    haptics.selection();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    haptics.light();
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Interactive Daily Streak Badge Button */}
      <button
        id="dashboard-header-streak-badge"
        onClick={handleOpenModal}
        className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-2xl border transition-all duration-200 shadow-md ${tier.badgeBg} ${tier.borderClass} ${tier.glowClass} text-left`}
        title="Günlük Giriş Serisi ve İstikrar Detayları (Tıkla)"
      >
        {/* Animated Flame Icon Container */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0">
          <Flame className="w-5 h-5 fill-amber-400 text-amber-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 text-xs">
            {tier.icon}
          </span>
        </div>

        {/* Streak Details */}
        <div className="flex flex-col min-w-[120px]">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Giriş Serisi
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
              Aktif
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black font-mono tracking-tight text-white">
              {streakDays}
            </span>
            <span className="text-xs font-bold text-amber-300">
              Gün Kesintisiz
            </span>
          </div>

          {/* Micro Progress Bar towards next milestone */}
          <div className="w-full h-1 bg-slate-950/60 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressInTier}%` }}
            />
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1 shrink-0" />
      </button>

      {/* Gamified Streak Details Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div 
            className="w-full max-w-md bg-[#1B1D27] border border-[#2D3245] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2D3245] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>Günlük Giriş Serisi</span>
                    <span className="text-sm">{tier.icon}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Her gün giriş yap, çalışma alışkanlığını kalıcı kıl
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl bg-[#161822] hover:bg-[#222533] text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Big Stat Hero Block */}
            <div className={`p-5 rounded-2xl border ${tier.badgeBg} ${tier.borderClass} flex items-center justify-between gap-4`}>
              <div>
                <span className="text-xs uppercase font-semibold text-slate-300 block tracking-wider">
                  Mevcut Giriş Serin
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                    {streakDays}
                  </span>
                  <span className="text-sm font-bold text-amber-300">
                    Gün Aralıksız
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Mevcut Ünvan: <strong className="text-white">{tier.name}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-400 block">
                  En Yüksek Rekor
                </span>
                <div className="text-xl font-bold text-amber-400 font-mono flex items-center justify-end gap-1 mt-0.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{maxStreak} Gün</span>
                </div>
              </div>
            </div>

            {/* Weekly Calendar Ribbon */}
            <div className="bg-[#161822] border border-[#2D3245] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Bu Haftanın Giriş Takibi
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Bugün Tamamlandı ✓
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {weekDays.map((dayLabel, idx) => {
                  const isPastOrToday = idx <= todayDayIndex;
                  const isCurrentDay = idx === todayDayIndex;
                  
                  return (
                    <div 
                      key={dayLabel}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        isCurrentDay
                          ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30'
                          : isPastOrToday
                          ? 'bg-[#1E2130] border-[#2D3245] text-slate-200'
                          : 'bg-[#12141C] border-[#222533] text-slate-600 opacity-60'
                      }`}
                    >
                      <span className="text-[10px] font-medium block">
                        {dayLabel}
                      </span>
                      <div className="mt-1">
                        {isPastOrToday ? (
                          <Flame className={`w-3.5 h-3.5 ${isCurrentDay ? 'text-amber-400 fill-amber-400' : 'text-amber-500/70'}`} />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700 mx-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone Tracker */}
            <div className="bg-[#161822] border border-[#2D3245] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Sıradaki Seri Rozeti Hedefi
                </span>
                <span className="font-bold text-amber-300 font-mono">
                  {daysToNext === 0 ? 'Tamamlandı! 🎉' : `${daysToNext} Gün Kaldı`}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{tier.nextMilestoneName}</span>
                  <span className="font-mono">{streakDays}/{tier.nextMilestone} Gün</span>
                </div>
                <div className="w-full h-2 bg-[#222533] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressInTier}%` }}
                  />
                </div>
              </div>

              {/* Badges overview mini list */}
              <div className="pt-2 border-t border-[#2D3245] grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className={`p-1.5 rounded-lg border ${streakDays >= 3 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-[#1B1D27] border-[#2D3245] text-slate-500'}`}>
                  <span className="block font-bold">🔥 3 Gün</span>
                  <span className="text-[9px] block text-slate-400">Kıvılcım</span>
                </div>
                <div className={`p-1.5 rounded-lg border ${streakDays >= 7 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-[#1B1D27] border-[#2D3245] text-slate-500'}`}>
                  <span className="block font-bold">⚡ 7 Gün</span>
                  <span className="text-[9px] block text-slate-400">İstikrar</span>
                </div>
                <div className={`p-1.5 rounded-lg border ${streakDays >= 14 ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-[#1B1D27] border-[#2D3245] text-slate-500'}`}>
                  <span className="block font-bold">🛡️ 14 Gün</span>
                  <span className="text-[9px] block text-slate-400">Demir İrade</span>
                </div>
                <div className={`p-1.5 rounded-lg border ${streakDays >= 30 ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-[#1B1D27] border-[#2D3245] text-slate-500'}`}>
                  <span className="block font-bold">👑 30 Gün</span>
                  <span className="text-[9px] block text-slate-400">Fatih</span>
                </div>
              </div>
            </div>

            {/* Gamification Motivation Tip */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Düzenli her gün 1 soru çözmek veya plana göz atmak seriyi canlı tutar ve sınav hafızanı diri tutar.
              </span>
            </div>

            {/* Quick Action to open detailed Streak Analytics bar chart */}
            {onOpenAnalytics && (
              <button
                onClick={() => {
                  haptics.selection();
                  setIsModalOpen(false);
                  onOpenAnalytics();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Haftalık Soru & İstikrar Grafiğini Gör</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        </div>
      )}
    </>
  );
};
