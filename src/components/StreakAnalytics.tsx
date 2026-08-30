import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Flame, Zap, Trophy, TrendingUp, Calendar, Clock, Target, Sparkles, BarChart3, ArrowUpRight } from 'lucide-react';
import { UserProfile, DailyStudyLog, MainTabCategory } from '../types';
import { loadWeeklyStudyLogs } from '../lib/storage';
import { THEME } from '../theme';
import { getChartColors } from '../lib/chartColors';
import { haptics } from '../lib/haptics';

const CHART = getChartColors();

interface StreakAnalyticsProps {
  profile: UserProfile;
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
  onIncrementQuestionCount?: (count: number) => void;
}

type MetricView = 'questions' | 'minutes' | 'completion';

export const StreakAnalytics: React.FC<StreakAnalyticsProps> = ({
  profile,
  onNavigateTab,
  onIncrementQuestionCount,
}) => {
  const [metricView, setMetricView] = useState<MetricView>('questions');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Load 7-day rolling logs integrated with profile
  const logs: DailyStudyLog[] = useMemo(() => {
    return loadWeeklyStudyLogs(profile);
  }, [
    profile.todayQuestionsSolved,
    profile.todayMinutesStudied,
    profile.streakDays,
    profile.dailyQuestionTarget,
    profile.dailyStudyHourTarget,
    profile.loginDates,
  ]);

  const currentStreak = Number(profile.streakDays) || 1;
  const maxStreak = Number(profile.maxStreakDays) || currentStreak;

  // Aggregate weekly calculations
  const weeklyStats = useMemo(() => {
    const totalQuestions = logs.reduce((sum, l) => sum + l.questionsSolved, 0);
    const totalMinutes = logs.reduce((sum, l) => sum + l.minutesStudied, 0);
    const targetQuestionsTotal = logs.reduce((sum, l) => sum + l.questionTarget, 0);
    const targetMinutesTotal = logs.reduce((sum, l) => sum + l.minuteTarget, 0);

    const activeDaysCount = logs.filter((l) => l.isStreakMaintained).length;
    const consistencyPercent = Math.min(
      100,
      Math.round((activeDaysCount / Math.max(1, logs.length)) * 100)
    );

    const avgCompletion = Math.min(
      100,
      Math.round(logs.reduce((sum, l) => sum + l.completionRate, 0) / Math.max(1, logs.length))
    );

    let statusLabel = 'İstikrarlı ⚡';
    let statusClass = 'text-green-400 bg-green-600/15 border-green-600/30';
    if (currentStreak >= 14) {
      statusLabel = 'Efsanevi Alev 🔥';
      statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    } else if (currentStreak >= 7) {
      statusLabel = 'Yüksek Momentum 🚀';
      statusClass = 'text-indigo-300 bg-indigo-600/15 border-indigo-500/30';
    } else if (currentStreak <= 2) {
      statusLabel = 'Yeni Başlangıç 🌱';
      statusClass = 'text-sky-400 bg-sky-600/15 border-sky-600/30';
    }

    return {
      totalQuestions,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      targetQuestionsTotal,
      targetMinutesTotal,
      activeDaysCount,
      consistencyPercent,
      avgCompletion,
      statusLabel,
      statusClass,
    };
  }, [logs, currentStreak]);

  // Format data for Recharts using flat theme colors
  const chartData = useMemo(() => {
    return logs.map((log, idx) => {
      const isToday = idx === logs.length - 1;
      return {
        ...log,
        index: idx,
        isToday,
        displayValue:
          metricView === 'questions'
            ? log.questionsSolved
            : metricView === 'minutes'
            ? log.minutesStudied
            : log.completionRate,
        targetValue:
          metricView === 'questions'
            ? log.questionTarget
            : metricView === 'minutes'
            ? log.minuteTarget
            : 100,
        fillColor: isToday
          ? CHART.warning // bugün — mat altın
          : log.isStreakMaintained
          ? metricView === 'questions'
            ? CHART.brand
            : metricView === 'minutes'
            ? CHART.info
            : CHART.success
          : CHART.grid, // pasif gün
      };
    });
  }, [logs, metricView]);

  const targetLineValue =
    metricView === 'questions'
      ? profile.dailyQuestionTarget || 120
      : metricView === 'minutes'
      ? (profile.dailyStudyHourTarget || 4) * 60
      : 100;

  const handleMetricChange = (view: MetricView) => {
    haptics.selection();
    setMetricView(view);
  };


  return (
    <div className="bg-surface-1 border border-border rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header: Title, Live Status & Quick Streaks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Haftalık Çalışma & İstikrar Analitiği
              </h2>
              <span className={`text-2xs font-semibold px-2 py-0.5 rounded-md border ${weeklyStats.statusClass}`}>
                {weeklyStats.statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Son 7 günlük soru temposu, çalışma süreleri ve alışkanlık sürekliliği
            </p>
          </div>
        </div>

        {/* Big Streak Number & All-time Record Pill */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-surface-0 border border-border rounded-2xl px-4 py-2">
          <div className="flex items-baseline gap-1.5">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <span className="text-xl font-black font-mono text-white">
              {currentStreak}
            </span>
            <span className="text-xs font-semibold text-amber-300">
              Gün Seri
            </span>
          </div>

          <div className="h-5 w-px bg-surface-3" />

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Rekor:</span>
            <span className="font-bold font-mono text-slate-200">{maxStreak} Gün</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards (Flat Theme Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Weekly Consistency */}
        <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Haftalık İstikrar</span>
            <Zap className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-green-400">
              %{weeklyStats.consistencyPercent}
            </span>
            <span className="text-2xs text-slate-400">
              ({weeklyStats.activeDaysCount}/7 Gün)
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-green-600 rounded-full"
              style={{ width: `${weeklyStats.consistencyPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Total Questions Solved */}
        <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Haftalık Çözülen Soru</span>
            <Target className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {weeklyStats.totalQuestions}
            </span>
            <span className="text-2xs text-indigo-300 font-medium">
              / {weeklyStats.targetQuestionsTotal} Hedef
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{
                width: `${Math.min(100, Math.round((weeklyStats.totalQuestions / Math.max(1, weeklyStats.targetQuestionsTotal)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 3: Total Study Minutes */}
        <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Toplam Çalışma Süresi</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {weeklyStats.totalHours}
            </span>
            <span className="text-2xs text-sky-300 font-medium">
              Saat ({weeklyStats.totalMinutes} dk)
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-sky-600 rounded-full"
              style={{
                width: `${Math.min(100, Math.round((weeklyStats.totalMinutes / Math.max(1, weeklyStats.targetMinutesTotal)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 4: Average Goal Completion Rate */}
        <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Ortalama Başarı Oranı</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-400">
              %{weeklyStats.avgCompletion}
            </span>
            <span className="text-2xs text-slate-400">
              Genel Uyum
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-600 rounded-full"
              style={{ width: `${weeklyStats.avgCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Chart Container with Segmented View Switcher */}
      <div className="bg-surface-0 border border-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {metricView === 'questions' && 'Günlük Soru Çözüm Grafiği'}
              {metricView === 'minutes' && 'Günlük Çalışma Süresi Grafiği (Dakika)'}
              {metricView === 'completion' && 'Hedef Gerçekleşme Oranı (%)'}
            </h3>
          </div>

          {/* Metric View Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-surface-1 p-1 rounded-xl border border-border">
            <button
              onClick={() => handleMetricChange('questions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                metricView === 'questions'
                  ? THEME.brand.tailwind.activeTab
                  : 'text-slate-400 hover:text-white hover:bg-surface-2'
              }`}
            >
              Soru Sayısı
            </button>
            <button
              onClick={() => handleMetricChange('minutes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                metricView === 'minutes'
                  ? THEME.brand.tailwind.activeTab
                  : 'text-slate-400 hover:text-white hover:bg-surface-2'
              }`}
            >
              Çalışma Süresi (dk)
            </button>
            <button
              onClick={() => handleMetricChange('completion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                metricView === 'completion'
                  ? THEME.brand.tailwind.activeTab
                  : 'text-slate-400 hover:text-white hover:bg-surface-2'
              }`}
            >
              Tamamlama %
            </button>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
              onClick={(state) => {
                if (state && state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                  haptics.selection();
                  setSelectedDayIndex(Number(state.activeTooltipIndex));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke={CHART.axis}
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#2D3245' }}
              />
              <YAxis
                stroke={CHART.axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, targetLineValue * 1.1)]}
              />
              <Tooltip
                cursor={{ fill: 'rgba(79, 70, 229, 0.08)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-surface-1 border border-border rounded-xl p-3.5 shadow-2xl space-y-1.5 min-w-[160px]">
                        <div className="flex items-center justify-between border-b border-border pb-1.5">
                          <span className="text-xs font-bold text-white">
                            {data.fullDayName}
                          </span>
                          {data.isToday && (
                            <span className="text-3xs bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                              Bugün
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Çözülen Soru:</span>
                            <span className="font-bold text-white font-mono">{data.questionsSolved} / {data.questionTarget}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Çalışma Süresi:</span>
                            <span className="font-bold text-sky-300 font-mono">{data.minutesStudied} dk</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Başarı Oranı:</span>
                            <span className="font-bold text-green-400 font-mono">%{data.completionRate}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="text-slate-400">Seri Durumu:</span>
                            <span className={`font-semibold ${data.isStreakMaintained ? 'text-amber-400' : 'text-slate-500'}`}>
                              {data.isStreakMaintained ? '✓ Korundu' : '✗ Pas Geçildi'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={targetLineValue}
                stroke={CHART.warning}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Hedef (${targetLineValue}${metricView === 'completion' ? '%' : ''})`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Bar
                dataKey="displayValue"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      selectedDayIndex === index
                        ? '#DB2777' // Highlight clicked day (Pink)
                        : entry.isToday
                        ? '#F59E0B'
                        : entry.isStreakMaintained
                        ? metricView === 'questions'
                          ? THEME.brand.primary
                          : metricView === 'minutes'
                          ? THEME.subjects.math.hex
                          : THEME.status.success.hex
                        : '#334155'
                    }
                    className="cursor-pointer transition-all hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Ribbon */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
              <span>Bugün (Aktif)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
              <span>Hedefe Ulaşıldı</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-700 inline-block" />
              <span>Dinlenme / Düşük</span>
            </div>
          </div>

          <span className="text-2xs text-slate-500">
            Detayları görmek için sütunlara tıklayabilirsiniz
          </span>
        </div>
      </div>

      {/* 7-Day Quick Strip & Selected Day Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Günlük İlerleme Çizelgesi
          </span>
          <span className="text-xs text-indigo-400 font-semibold">
            {weeklyStats.activeDaysCount} Gün Aktif Çalışıldı
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {logs.map((dayLog, idx) => {
            const isToday = idx === logs.length - 1;
            const isSelected = selectedDayIndex === idx;

            return (
              <button
                key={dayLog.date}
                onClick={() => {
                  haptics.selection();
                  setSelectedDayIndex(idx === selectedDayIndex ? null : idx);
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                    : isToday
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : dayLog.isStreakMaintained
                    ? 'bg-surface-0 border-border hover:border-indigo-500/40'
                    : 'bg-canvas border-surface-2 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {dayLog.dayLabel}
                  </span>
                  {dayLog.isStreakMaintained ? (
                    <Flame className={`w-3.5 h-3.5 ${isToday ? 'text-amber-400 fill-amber-400' : 'text-amber-500'}`} />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-slate-700" />
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <span className="text-sm font-black font-mono text-white block">
                    {dayLog.questionsSolved} Soru
                  </span>
                  <span className="text-2xs text-slate-400 block">
                    {dayLog.minutesStudied} dk
                  </span>
                </div>

                {isToday && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-3xs font-extrabold bg-amber-500 text-slate-950 shadow-sm">
                    BUGÜN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Smart AI Streak Coaching & Action Suggestions */}
      <div className="p-5 rounded-2xl bg-surface-0 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>AI İstikrar Tavsiyesi</span>
              <span className="text-xs text-indigo-300 font-normal">
                ({currentStreak}. Gün Serisi Değerlendirmesi)
              </span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              {currentStreak >= 7
                ? 'Harika bir tempo yakaladın! Haftalık istikrarın %' +
                  weeklyStats.consistencyPercent +
                  '. Soru hızını koruyarak bu hafta sonu 1 adet tam deneme ile netlerini pekiştirebilirsin.'
                : 'Her gün düzenli 20-30 soru çözmek bile sınav hafızasını diri tutar. Serini kırmadan bugünkü hedefini tamamla!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => onNavigateTab && onNavigateTab('snap', 'TRAINING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${THEME.brand.tailwind.btn}`}
          >
            <span>Soru Çözdür</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateTab && onNavigateTab('pomodoro', 'TRAINING')}
            className="px-3.5 py-2 rounded-xl bg-surface-0 hover:bg-surface-2 border border-border text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pomodoro Başlat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
