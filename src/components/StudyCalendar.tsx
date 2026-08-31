import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  ClipboardList,
  Flame,
  ArrowUpRight,
  CalendarPlus,
  Clock3,
  CheckCircle2,
  Circle,
  Lightbulb,
} from 'lucide-react';
import { UserProfile, MockExamRecord, MistakeQuestionItem, MainTabCategory, HeatmapDay, WeeklyStudyPlan } from '../types';
import { loadStudyHeatmap } from '../lib/storage';
import { getLocalDateStr } from '../lib/dateUtils';
import { haptics } from '../lib/haptics';
import { buildIcs, downloadIcs, IcsEvent } from '../lib/icsExport';
import { EXAM_METADATA } from '../data/curriculumData';

interface StudyCalendarProps {
  profile: UserProfile;
  studyPlan?: WeeklyStudyPlan | null;
  mockExams?: MockExamRecord[];
  mistakes?: MistakeQuestionItem[];
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
  /** "Haftalık Plan" görünümüne geçiş (StudyPlanner'daki sekme). */
  onShowWeeklyPlan?: () => void;
}

/** "09:00 - 10:30", "14.00", "Sabah 08:00" gibi metinden başlangıç saatini (dk) çıkarır. */
function parseStartMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
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
  studyPlan,
  mockExams = [],
  mistakes = [],
  onNavigateTab,
  onShowWeeklyPlan,
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

  // Bugüne denk gelen plan günü (haftanın gününe göre — plan günleri gerçek tarih taşımıyor).
  const todayPlanDay = useMemo(() => {
    const days = studyPlan?.days;
    if (!Array.isArray(days) || days.length === 0) return null;
    const wd = (today.getDay() + 6) % 7;
    return days[Math.min(wd, days.length - 1)] || null;
  }, [studyPlan, today]);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const planBlocks = Array.isArray(todayPlanDay?.blocks) ? todayPlanDay!.blocks : [];
  // "Şimdi sırada": başlangıç saati şu andan önce olan son blok (tamamlanmamışsa).
  const currentBlockIdx = useMemo(() => {
    let idx = -1;
    planBlocks.forEach((b, i) => {
      const start = parseStartMinutes(b.time);
      if (start !== null && start <= nowMinutes) idx = i;
    });
    return idx;
  }, [planBlocks, nowMinutes]);

  // Sınav öncesi "deneme haftası" önerisi
  const recentMockCount = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 14);
    return (Array.isArray(mockExams) ? mockExams : []).filter((ex) => {
      if (!ex?.date) return false;
      const d = new Date(`${ex.date.slice(0, 10)}T00:00:00`);
      return d >= cutoff && d <= today;
    }).length;
  }, [mockExams, today]);
  const denemeNudge = daysToExam > 7 && daysToExam <= 45 && recentMockCount < 2;

  const handleExportIcs = () => {
    haptics.selection();
    const events: IcsEvent[] = [];
    const examName = EXAM_METADATA[profile.targetExam]?.shortName || 'Sınav';

    if (examDateStr) {
      events.push({ date: examDateStr, summary: `🎯 ${examName} — SINAV GÜNÜ`, description: 'Snaps sınav koçu' });
    }
    (Array.isArray(mockExams) ? mockExams : []).forEach((ex) => {
      if (ex?.date) events.push({ date: ex.date.slice(0, 10), summary: `📝 Deneme: ${ex.title}`, description: `${ex.totalNet} net` });
    });
    // Yaklaşan tekrarlar (bugünden itibaren 60 gün)
    const limit = new Date(today); limit.setDate(limit.getDate() + 60);
    reviewsByDate.forEach((count, date) => {
      const d = new Date(`${date}T00:00:00`);
      if (d >= today && d <= limit) {
        events.push({ date, summary: `🔁 ${count} soru tekrarı`, description: 'Hata defteri aralıklı tekrar' });
      }
    });
    // Haftalık plan — önümüzdeki günlere sırayla
    if (Array.isArray(studyPlan?.days)) {
      studyPlan!.days.forEach((d, i) => {
        const dt = new Date(today); dt.setDate(dt.getDate() + i);
        const blocks = Array.isArray(d?.blocks) ? d.blocks.map((b) => `• ${b.subject}: ${b.task}`).join('\n') : '';
        events.push({
          date: getLocalDateStr(dt),
          summary: `📚 ${d?.focus || d?.dayName || `Çalışma günü ${i + 1}`}${d?.targetQuestions ? ` (${d.targetQuestions} soru)` : ''}`,
          description: blocks,
        });
      });
    }

    if (events.length === 0) return;
    downloadIcs('snaps-calisma-takvimi.ics', buildIcs(events));
  };

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
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${phase.tone}`}>
              {phase.label}
            </span>
            <button
              onClick={handleExportIcs}
              title="Takvimi .ics olarak indir (Google/Apple/Outlook)"
              className="p-1.5 rounded-lg border border-border text-slate-400 hover:text-white hover:border-indigo-500/40 transition-colors"
              aria-label="Takvimi dışa aktar"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
          </div>
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

        {denemeNudge && (
          <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Son 2 haftada {recentMockCount} deneme kaydettin. Sınav yaklaşıyor — bu hafta bir tam deneme planla.</span>
          </div>
        )}
      </div>

      {/* Bugün odak — planın bugünkü blokları */}
      {planBlocks.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-indigo-400" /> Bugün Odak
            </h3>
            {todayPlanDay?.focus && (
              <span className="text-2xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">{todayPlanDay.focus}</span>
            )}
          </div>
          <div className="space-y-1.5">
            {planBlocks.map((b, i) => {
              const isNow = i === currentBlockIdx && !b.completed;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                    isNow
                      ? 'border-indigo-500/60 bg-indigo-600/15'
                      : b.completed
                      ? 'border-transparent bg-surface-0 opacity-60'
                      : 'border-transparent bg-surface-0'
                  }`}
                >
                  {b.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="text-2xs font-mono text-slate-400 w-14 shrink-0">{b.time || '—'}</span>
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-semibold ${b.completed ? 'line-through text-slate-500' : 'text-indigo-300'}`}>{b.subject}</span>
                    <p className={`text-2xs truncate ${b.completed ? 'text-slate-600' : 'text-slate-300'}`}>{b.task}</p>
                  </div>
                  {isNow && <span className="text-3xs font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">ŞİMDİ</span>}
                </div>
              );
            })}
          </div>
          {onShowWeeklyPlan && (
            <button
              onClick={onShowWeeklyPlan}
              className="text-2xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Haftalık planın tamamı <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

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
