import React, { useState } from 'react';
import { 
  BookOpen, 
  Calculator, 
  Landmark, 
  Compass, 
  Scale, 
  Atom, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  ChevronRight, 
  TrendingUp 
} from 'lucide-react';
import { Subject, MainTabCategory } from '../types';
import { THEME, getSubjectTheme } from '../theme';
import { haptics } from '../lib/haptics';

interface SubjectProgressWidgetProps {
  subjects: Subject[];
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
}

export const SubjectProgressWidget: React.FC<SubjectProgressWidgetProps> = ({
  subjects = [],
  onNavigateTab,
}) => {
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Helper to resolve icon by subject name
  const getSubjectIcon = (subjectName: string) => {
    const nameLower = (subjectName || '').toLowerCase();
    if (nameLower.includes('türkçe') || nameLower.includes('edebiyat') || nameLower.includes('dil')) return BookOpen;
    if (nameLower.includes('matematik') || nameLower.includes('geometri') || nameLower.includes('sayısal')) return Calculator;
    if (nameLower.includes('tarih') || nameLower.includes('inkılap')) return Landmark;
    if (nameLower.includes('coğrafya')) return Compass;
    if (nameLower.includes('vatandaşlık') || nameLower.includes('anayasa') || nameLower.includes('güncel')) return Scale;
    if (nameLower.includes('fizik') || nameLower.includes('kimya') || nameLower.includes('biyoloji') || nameLower.includes('fen')) return Atom;
    return BookOpen;
  };

  // Distinct categories available in current subjects
  const categories = Array.from(
    new Set(safeSubjects.map((s) => s.category).filter(Boolean))
  );

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'KPSS_GY':
        return 'Genel Yetenek';
      case 'KPSS_GK':
        return 'Genel Kültür';
      case 'KPSS_EGITIM':
        return 'Eğitim Bilimleri';
      case 'TYT':
        return 'TYT';
      case 'AYT':
        return 'AYT';
      default:
        return cat;
    }
  };

  const filteredSubjects = filterCategory === 'ALL'
    ? safeSubjects
    : safeSubjects.filter((s) => s.category === filterCategory);

  // Overall calculations
  const totalTopicsOverall = safeSubjects.reduce((acc, s) => acc + (s?.topics?.length || 0), 0);
  const studiedTopicsOverall = safeSubjects.reduce(
    (acc, s) => acc + (s?.topics ? s.topics.filter((t) => t?.isStudied).length : 0),
    0
  );
  const practiceDoneOverall = safeSubjects.reduce(
    (acc, s) => acc + (s?.topics ? s.topics.filter((t) => t?.isPracticeDone).length : 0),
    0
  );
  const overallPercentage = totalTopicsOverall > 0 ? Math.round((studiedTopicsOverall / totalTopicsOverall) * 100) : 0;

  return (
    <div 
      id="subject-progress-widget"
      className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 transition-all"
    >
      {/* 1. Header & Quick Curriculum Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3245] pb-4">
        
        {/* Title & Overview Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Ders İlerleme Durumu
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
                Müfredat Takibi
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tüm derslerdeki konu tamamlama ve kavrama oranların.
            </p>
          </div>
        </div>

        {/* Action Controls & Detailed Curriculum Link */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onNavigateTab('curriculum', 'HOME');
            }}
            className="px-3 py-1.5 rounded-xl bg-[#161822] hover:bg-[#222533] border border-[#2D3245] hover:border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Müfredatı Detaylı İncele</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 2. Top Metric Bar (Overall Progress Summary - Flat Color) */}
      <div className="bg-[#161822] border border-[#2D3245] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              Genel Müfredat Hakimiyeti:
            </span>
            <strong className="text-white font-bold">
              {studiedTopicsOverall} / {totalTopicsOverall} Konu Tamamlandı
            </strong>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] hidden md:inline">
              Testi Çözülen: <strong className="text-slate-200">{practiceDoneOverall} Konu</strong>
            </span>
            <span className="font-mono font-bold text-indigo-300 text-sm bg-indigo-600/15 px-2 py-0.5 rounded-md border border-indigo-500/30">
              %{overallPercentage}
            </span>
          </div>
        </div>

        {/* Global Flat Progress Bar */}
        <div className="w-full bg-[#222533] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, overallPercentage))}%` }}
          />
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setFilterCategory('ALL');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterCategory === 'ALL'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-400 hover:text-slate-200 bg-[#161822] border border-[#2D3245]'
            }`}
          >
            Tüm Dersler ({safeSubjects.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                haptics.light();
                setFilterCategory(cat);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                filterCategory === cat
                  ? THEME.brand.tailwind.activeTab
                  : 'text-slate-400 hover:text-slate-200 bg-[#161822] border border-[#2D3245]'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* 4. Subject Progress Bars Grid with 6-Subject Theme Palette */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredSubjects.map((subject, index) => {
          const themeMeta = getSubjectTheme(subject.name || subject.id);
          const IconComponent = getSubjectIcon(subject.name);

          const totalTopics = subject?.topics?.length || 0;
          const studiedTopics = subject?.topics ? subject.topics.filter((t) => t.isStudied).length : 0;
          const practiceTopics = subject?.topics ? subject.topics.filter((t) => t.isPracticeDone).length : 0;
          const progressPercent = totalTopics > 0 ? Math.round((studiedTopics / totalTopics) * 100) : 0;
          const isComplete = totalTopics > 0 && studiedTopics === totalTopics;

          return (
            <div
              key={subject.id || index}
              onClick={() => {
                haptics.selection();
                onNavigateTab('curriculum', 'HOME');
              }}
              className="p-4 rounded-xl bg-[#161822] hover:bg-[#1c1f2d] border border-[#2D3245] hover:border-indigo-500/40 transition-all duration-200 group cursor-pointer flex flex-col justify-between gap-3 shadow-xs"
            >
              {/* Top Row: Subject Icon, Name & Percentage Badge */}
              <div className="flex items-start justify-between gap-2.5">
                
                {/* Left: Icon & Subject Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border"
                    style={{
                      backgroundColor: themeMeta.bg,
                      borderColor: themeMeta.border,
                      color: themeMeta.hex,
                    }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                        {subject.name}
                      </h4>
                      {isComplete && (
                        <span title="Ders Müfredatı Tamamlandı">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{getCategoryLabel(subject.category)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-300">
                        {studiedTopics} / {totalTopics} Konu
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Percentage Value */}
                <div className="text-right shrink-0">
                  <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-md border ${themeMeta.badgeClass}`}>
                    %{progressPercent}
                  </span>
                </div>

              </div>

              {/* Middle: Zarif & İnce Düz Renkli İlerleme Çubuğu */}
              <div className="space-y-1.5">
                <div className="w-full bg-[#222533] h-2 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full ${themeMeta.barBg} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  />
                </div>

                {/* Subline Details: Studied vs Practiced count */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    <span>{studiedTopics} Çalışıldı</span>
                  </span>
                  
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                    <span>{practiceTopics} Test Çözüldü</span>
                  </span>

                  <span className="text-slate-500 group-hover:text-indigo-300 transition-colors flex items-center gap-0.5">
                    <span>Detay</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
