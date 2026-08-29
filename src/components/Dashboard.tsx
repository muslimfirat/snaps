import React, { useState } from 'react';
import { 
  Camera, 
  Bot, 
  Calendar, 
  Zap, 
  Flame, 
  Target, 
  Clock, 
  Sparkles,
  ArrowRight,
  BookOpen,
  Trophy,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { 
  UserProfile, 
  MockExamRecord, 
  SnapSolution, 
  WeeklyStudyPlan, 
  Subject, 
  MainTabCategory,
  ClassGroup,
  StudentRecord
} from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { DailyGoalProgressRing } from './DailyGoalProgressRing';
import { DailyTasksWidget } from './DailyTasksWidget';
import { QuickStartModal } from './QuickStartModal';
import { calculateBadges } from '../lib/badgeSystem';
import { THEME } from '../theme';
import { haptics } from '../lib/haptics';

interface DashboardProps {
  profile: UserProfile;
  mockExams: MockExamRecord[];
  snaps: SnapSolution[];
  studyPlan: WeeklyStudyPlan | null;
  subjects: Subject[];
  classGroups?: ClassGroup[];
  students?: StudentRecord[];
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
  onIncrementQuestionCount: (count?: number) => void;
  onIncrementStudyMinutes?: (minutes: number) => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  mockExams = [],
  snaps = [],
  subjects = [],
  onNavigateTab,
  onIncrementQuestionCount,
  onIncrementStudyMinutes,
}) => {
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeMocks = Array.isArray(mockExams) ? mockExams : [];
  const safeSnaps = Array.isArray(snaps) ? snaps : [];

  const examMeta = EXAM_METADATA[profile.targetExam] || EXAM_METADATA['KPSS_LISANS'];

  // Days remaining calculation
  const targetTime = profile?.examDate ? new Date(profile.examDate).getTime() : NaN;
  const now = new Date().getTime();
  const diffDays = isNaN(targetTime) ? 0 : Math.max(0, Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24)));

  // Curriculum completion calculation
  const totalTopics = safeSubjects.reduce((acc, s) => acc + (s?.topics?.length || 0), 0);
  const completedTopics = safeSubjects.reduce(
    (acc, s) => acc + (s?.topics ? s.topics.filter((t) => t?.isStudied).length : 0),
    0
  );
  const rawCurriculumPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const curriculumPercent = isNaN(rawCurriculumPercent) ? 0 : rawCurriculumPercent;

  // Calculate badges to extract the latest unlocked single badge
  const { badges, unlockedCount } = calculateBadges(profile, safeMocks, safeSnaps);
  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const latestBadge = unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] : badges[0];

  const currentStreak = Number(profile.streakDays) || 0;

  const handleAddMinutes = (min: number) => {
    if (onIncrementStudyMinutes) {
      onIncrementStudyMinutes(min);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* 1. Karşılama Başlığı, Durum Rozetleri ve Sınav Sayacı */}
      <div className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Sol: Karşılama, Aday Bilgisi & Rozetler */}
        <div className="space-y-2.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
              {examMeta.name}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Hedef: <strong className="text-white">{profile.targetScore} Puan</strong>
            </span>
            {profile.activeTitle && (
              <span className="text-xs font-medium text-slate-200 bg-[#222533] border border-[#3B4259] px-2.5 py-0.5 rounded-lg">
                {profile.activeTitle}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Merhaba, {profile.name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Bugünkü hedeflerine odaklan ve kesintisiz çalışma serini sürdür.
          </p>
        </div>

        {/* Sağ: Seri Rozeti + Son Kazanılan Rozet + Kalan Gün */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          
          {/* Güncel Seri Rozeti (İstikrar Merkezine Yönlendirir) */}
          <button
            onClick={() => {
              haptics.selection();
              onNavigateTab('streak', 'HOME');
            }}
            title="Detaylı İstikrar Merkezini aç"
            className="flex items-center gap-2 bg-[#161822] hover:bg-[#222533] border border-[#2D3245] hover:border-amber-500/40 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Seri</span>
              <span className="text-sm font-bold font-mono text-amber-400 leading-tight">
                {currentStreak} Gün
              </span>
            </div>
          </button>

          {/* En Son Kazanılan Tek Rozet (Profile Yönlendirir) */}
          <button
            onClick={() => {
              haptics.selection();
              onNavigateTab('profile', 'PROFILE');
            }}
            title="Tüm Başarı Rozetlerini gör"
            className="flex items-center gap-2 bg-[#161822] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <span className="text-base shrink-0">{latestBadge.icon}</span>
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block truncate max-w-[90px]">
                {latestBadge.isUnlocked ? 'Son Rozet' : 'Sıradaki'}
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[110px] block leading-tight">
                {latestBadge.title}
              </span>
            </div>
          </button>

          {/* Kalan Gün Sayacı */}
          <div className="bg-[#161822] border border-[#2D3245] rounded-xl px-3.5 py-2 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Kalan
            </span>
            <span className="text-sm font-bold text-white font-mono leading-tight">
              {diffDays} Gün
            </span>
          </div>

          {/* Rehber Bilgi Butonu */}
          <button
            onClick={() => setIsQuickStartOpen(true)}
            className="p-2.5 rounded-xl bg-[#161822] hover:bg-[#222533] border border-[#2D3245] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Nasıl Kullanılır?"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. 4 Hızlı Eylem Butonu (Soru Çözdür, Pomodoro, Deneme Kaydet, AI Koç) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Buton 1: Soru Çözdür */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigateTab('snap', 'TRAINING');
          }}
          className="p-4 rounded-2xl bg-[#1B1D27] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 text-left transition-all group flex items-center gap-3.5 cursor-pointer shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              Soru Çözdür
            </h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Yapay zeka ile çöz
            </p>
          </div>
        </button>

        {/* Buton 2: Pomodoro Sayacı */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigateTab('pomodoro', 'TRAINING');
          }}
          className="p-4 rounded-2xl bg-[#1B1D27] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 text-left transition-all group flex items-center gap-3.5 cursor-pointer shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              Pomodoro
            </h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Odak sayacını başlat
            </p>
          </div>
        </button>

        {/* Buton 3: Deneme Kaydet */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigateTab('mock', 'TRAINING');
          }}
          className="p-4 rounded-2xl bg-[#1B1D27] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 text-left transition-all group flex items-center gap-3.5 cursor-pointer shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              Deneme Kaydet
            </h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Net analizlerini gir
            </p>
          </div>
        </button>

        {/* Buton 4: AI Sınav Koçu */}
        <button
          onClick={() => {
            haptics.selection();
            onNavigateTab('voice_coach', 'TRAINING');
          }}
          className="p-4 rounded-2xl bg-[#1B1D27] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 text-left transition-all group flex items-center gap-3.5 cursor-pointer shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              AI Sınav Koçu
            </h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Strateji & brifing al
            </p>
          </div>
        </button>

      </div>

      {/* 3. Tek Küçük Günlük Hedef Halkası Kartı (Soru & Süre + Sadece +10 Soru Butonu) */}
      <DailyGoalProgressRing
        questionsSolved={profile.todayQuestionsSolved || 0}
        questionTarget={profile.dailyQuestionTarget || 100}
        minutesStudied={profile.todayMinutesStudied || 0}
        targetStudyHours={profile.dailyStudyHourTarget || 4}
        streakDays={profile.streakDays || 0}
        onAddQuestions={(count) => onIncrementQuestionCount(count)}
        onAddMinutes={handleAddMinutes}
        compact={true}
      />

      {/* 4. Günün Görevleri Widget'ı (Sadece İlk 3 Görev + Tümünü Gör Linki) */}
      <DailyTasksWidget
        profile={profile}
        onNavigateTab={onNavigateTab}
        onIncrementQuestionCount={onIncrementQuestionCount}
        onIncrementStudyMinutes={onIncrementStudyMinutes}
        compact={true}
      />

      {/* 5. Ders İlerleme Durumu: Tek Satırlık Genel İlerleme & Müfredatı İncele Linki */}
      <div className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Genel Müfredat Hakimiyeti
                </h3>
                <span className="text-xs font-bold font-mono text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30">
                  %{curriculumPercent}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Toplam {totalTopics} konunun {completedTopics} tanesi tamamlandı
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onNavigateTab('curriculum', 'HOME');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Müfredatı İncele</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Single Sleek Progress Bar */}
        <div className="w-full h-2.5 bg-[#161822] rounded-full overflow-hidden border border-[#2D3245]">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${curriculumPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Start Modal */}
      <QuickStartModal
        isOpen={isQuickStartOpen}
        onClose={() => setIsQuickStartOpen(false)}
        onNavigateTab={onNavigateTab}
      />

    </div>
  );
};
