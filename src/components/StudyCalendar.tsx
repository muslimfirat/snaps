import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  ClipboardList,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { UserProfile, MockExamRecord, MistakeQuestionItem, MainTabCategory, HeatmapDay } from '../types';
import { loadStudyHeatmap } from '../lib/storage';
import { getLocalDateStr } from '../lib/dateUtils';
import { haptics } from '../lib/haptics';

interface StudyCalendarProps {
  profile: UserProfile;
  mockExams?: MockExamRecord[];
  mistakes?: MistakeQuestionItem[];
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const WD_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Sınav gününe kalan güne göre koçluk fazı. */
function examPhase(days: number): { key: string; label: string; tip: string; tone: string } {
  if (days <= 0) return { key: 'done', label: 'Sınav zamanı', tip: 'Sakin ol, hazırlandın. Kendine güven.', tone: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  if (days <= 7) return { key: 'taper', label: 'Son hafta — hafifle', tip: 'Yeni konu yok. Hafif tekrar, bol uyku, sınav provası saatlerine geç.', tone: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  if (days <= 30) return { key: 'exam', label: 'Deneme + tekrar modu', tip: 'Haftada 2-3 tam deneme, her denemeden sonra eksik konu taraması. Yeni konuya girme.', tone: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  if (days <= 90) return { key: 'consolidate', label: 'Soru + pekiştirme', tip: 'Konuları soru çözerek pekiştir, branş denemeleri ekle, hata defterini işlet.', tone: 'text-indigo-300 bg-indigo-600/15 border-indigo-500/30' };
  return { key: 'learn', label: 'Konu öğrenme', tip: 'Müfredatı bitirmeye odaklan. Her konudan sonra 20-30 soru ile taze tut.', tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
}

const MILESTONES = [90, 60, 30, 14, 7];

export const StudyCalendar: React.FC<StudyCalendarProps> = ({
  profile,
  mockExams = [],
  mistakes = [],
  onNavigateTab,
}) => {
  const todayStr = getLocalDateStr();
  const today = new Date(`${todayStr}T00:00:00`);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(todayStr);

  const examDateStr = profile.examDate ? profile.examDate.slice(0, 10) : '';
  const daysToExam = examDateStr
    ? Math.max(0, Math.round((new Date(`${examDateStr}T00:00:00`).getTime() - today.getTime()) / 86_400_000))
    : 0;
  const phase = examPhase(daysToExam);

  const heatmap: HeatmapDay[] = useMemo(() => loadStudyHeatmap(profile, 400), [
    profile.todayQuestionsSolved,
    profile.todayMinutesStudied,
    profile.streakDays,
    profile.loginDates,
    profile.streakFreezeUsedDates,
  ]);
  const heatByDate = useMemo(() => {
    const m = new Map<string, HeatmapDay>();
    heatmap.forEach((c) => m.set(c.date, c));
    return m;
  }, [heatmap]);

  const mocksByDate = useMemo(() => {
    const m = new Map<string, MockExamRecord[]>();
    (Array.isArray(mockExams) ? mockExams : []).forEach((ex) => {
      if (!ex?.date) return;
      const key = ex.date.slice(0, 10);
      m.set(key, [...(m.get(key) || []), ex]);
    });
    return m;
  }, [mockExams]);

  const reviewsByDate = useMemo(() => {
    const m = new Map<string, number>();
    (Array.isArray(mistakes) ? mistakes : []).forEach((mi) => {
      if (!mi?.nextReviewDate) return;
      const key = mi.nextReviewDate.slice(0, 10);
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [mistakes]);

  const reviewsDueToday = useMemo(
    () => (Array.isArray(mistakes) ? mistakes : []).filter((mi) => mi?.nextReviewDate && mi.nextReviewDate.slice(0, 10) <= todayStr).length,
    [mistakes, todayStr]
  );

  // Ay ızgarası (Pazartesi başlangıç)
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: { date: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < lead; i++) arr.push({ date: '', day: 0, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      arr.push({ date: getLocalDateStr(dt), day: d, inMonth: true });
    }
    while (arr.length % 7 !== 0) arr.push({ date: '', day: 0, inMonth: false });
    return arr;
  }, [cursor]);

  const selDate = selected ? new Date(`${selected}T00:00:00`) : today;
  const selMocks = mocksByDate.get(selected) || [];
  const selReviews = reviewsByDate.get(selected) || 0;
  const selHeat = heatByDate.get(selected);
  const selIsExam = selected === examDateStr;

  const progressPct = useMemo(() => {
    if (!examDateStr) return 0;
    const startStr = profile.loginDates && profile.loginDates.length > 0 ? profile.loginDates[0] : todayStr;
    const start = new Date(`${startStr}T00:00:00`).getTime();
    const end = new Date(`${examDateStr}T00:00:00`).getTime();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, ((today.getTime() - start) / total) * 100));
  }, [examDateStr, profile.loginDates, todayStr, today]);

  return (
    <div className="space-y-5">
      {/* Sınav geri sayımı + faz */}
      <div className="bg-surface-1 border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Sınava kalan</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-white">{daysToExam}</span>
                <span className="text-sm text-slate-400">gün</span>
              </div>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${phase.tone}`}>
            {phase.label}
          </span>
        </div>

        {/* İlerleme çizgisi + kilometre taşları */}
        <div className="relative h-2 bg-surface-2 rounded-full">
          <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
          {daysToExam > 0 && MILESTONES.filter((m) => m < daysToExam).map((m) => (
            <span
              key={m}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-slate-500/70"
              style={{ right: `${(m / daysToExam) * (100 - progressPct)}%` }}
              title={`Sınava ${m} gün`}
            />
          ))}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{phase.tip}</p>
      </div>

      {/* Bugünün tekrarları */}
      {reviewsDueToday > 0 && (
        <button
          onClick={() => onNavigateTab?.('mistakes', 'TRAINING')}
          className="w-full text-left bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-amber-500/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{reviewsDueToday} soru bugün tekrar edilmeli</p>
              <p className="text-2xs text-slate-400">Hata defterindeki aralıklı tekrar programın</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
        </button>
      )}

      {/* Ay takvimi */}
      <div className="bg-surface-1 border border-border rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { haptics.selection(); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); }}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-bold text-white">
            {MONTHS_TR[cursor.getMonth()]} {cursor.getFullYear()}
          </h3>
          <button
            onClick={() => { haptics.selection(); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); }}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WD_TR.map((w) => (
            <div key={w} className="text-3xs text-slate-500 text-center font-semibold py-1">{w}</div>
          ))}
          {cells.map((c, i) => {
            if (!c.inMonth) return <div key={i} />;
            const isToday = c.date === todayStr;
            const isSelected = c.date === selected;
            const isExam = c.date === examDateStr;
            const hasMock = mocksByDate.has(c.date);
            const reviewCount = reviewsByDate.get(c.date) || 0;
            const heat = heatByDate.get(c.date);
            const studied = heat && heat.level > 0;
            return (
              <button
                key={i}
                onClick={() => { haptics.selection(); setSelected(c.date); }}
                className={`h-11 sm:h-12 rounded-lg text-xs flex flex-col items-center justify-center gap-1 border transition-colors relative ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                    : isExam
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                    : isToday
                    ? 'border-amber-500/50 bg-amber-500/5 text-white'
                    : 'border-transparent hover:bg-surface-2 text-slate-300'
                }`}
              >
                <span className={`font-mono ${isToday ? 'font-bold' : ''}`}>{c.day}</span>
                <span className="flex items-center gap-0.5 h-1.5">
                  {isExam && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                  {hasMock && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  {studied && <span className={`w-1.5 h-1.5 rounded-full ${heat!.frozen ? 'bg-sky-400' : 'bg-emerald-400'}`} />}
                  {reviewCount > 0 && !isExam && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Açıklama */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xs text-slate-500 pt-1 border-t border-border/60">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Sınav</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Deneme</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Çalışıldı</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Tekrar</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Telafi</span>
        </div>
      </div>

      {/* Seçili gün detayı */}
      <div className="bg-surface-1 border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">
            {selDate.getDate()} {MONTHS_TR[selDate.getMonth()]}
            {selected === todayStr && <span className="text-amber-400 font-normal"> · Bugün</span>}
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {selIsExam && (
            <div className="flex items-center gap-2 text-rose-300">
              <Flag className="w-3.5 h-3.5 shrink-0" /> <span>Sınav günü</span>
            </div>
          )}
          {selMocks.map((ex) => (
            <div key={ex.id} className="flex items-center gap-2 text-indigo-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>{ex.title} — {ex.totalNet} net</span>
            </div>
          ))}
          {selReviews > 0 && (
            <div className="flex items-center gap-2 text-amber-300">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" /> <span>{selReviews} soru tekrarı planlı</span>
            </div>
          )}
          {selHeat && selHeat.level > 0 && (
            <div className="flex items-center gap-2 text-emerald-300">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>{selHeat.frozen ? 'Telafi günü' : `${selHeat.questionsSolved} soru · ${selHeat.minutesStudied} dk`}</span>
            </div>
          )}
          {!selIsExam && selMocks.length === 0 && selReviews === 0 && !(selHeat && selHeat.level > 0) && (
            <p className="text-slate-500">Bu gün için kayıt yok.</p>
          )}
        </div>
      </div>
    </div>
  );
};
