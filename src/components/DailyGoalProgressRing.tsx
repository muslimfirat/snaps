import React, { useState } from 'react';
import { Target, Zap, CheckCircle2, Plus, Sparkles, BookOpen } from 'lucide-react';
import { THEME } from '../theme';
import { haptics } from '../lib/haptics';

interface DailyGoalProgressRingProps {
  questionsSolved: number;
  questionTarget: number;
  minutesStudied: number;
  targetStudyHours: number;
  streakDays: number;
  onAddQuestions: (count: number) => void;
  onAddMinutes: (minutes: number) => void;
  onOpenPomodoro?: () => void;
  compact?: boolean;
}

export const DailyGoalProgressRing: React.FC<DailyGoalProgressRingProps> = ({
  questionsSolved,
  questionTarget,
  minutesStudied,
  targetStudyHours,
  streakDays,
  onAddQuestions,
  onAddMinutes,
  onOpenPomodoro,
  compact = false,
}) => {
  const [activeView, setActiveView] = useState<'both' | 'questions' | 'time'>('both');

  // Question calculations
  const targetQ = Math.max(1, Number(questionTarget) || 100);
  const solvedQ = Number(questionsSolved) || 0;
  const rawQPercent = Math.round((solvedQ / targetQ) * 100);
  const questionPercent = isNaN(rawQPercent) ? 0 : Math.min(100, Math.max(0, rawQPercent));

  // Time calculations
  const targetMinutes = Math.max(1, (Number(targetStudyHours) || 4) * 60);
  const studiedMin = Number(minutesStudied) || 0;
  const rawTPercent = Math.round((studiedMin / targetMinutes) * 100);
  const timePercent = isNaN(rawTPercent) ? 0 : Math.min(100, Math.max(0, rawTPercent));

  // Overall average
  const totalOverallPercent = Math.round((questionPercent + timePercent) / 2) || 0;
  const isQuestionDone = questionPercent >= 100;
  const isTimeDone = timePercent >= 100;
  const isAllCompleted = isQuestionDone && isTimeDone;
  const isEmptyDay = solvedQ === 0 && studiedMin === 0;

  // SVG Geometry for concentric rings
  const size = 160;
  const center = size / 2;
  
  // Outer ring (Questions)
  const outerRadius = 64;
  const outerStroke = 10;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const outerOffset = outerCircumference - (questionPercent / 100) * outerCircumference;

  // Inner ring (Time / Minutes)
  const innerRadius = 48;
  const innerStroke = 10;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerOffset = innerCircumference - (timePercent / 100) * innerCircumference;

  const handleAddQ = (count: number) => {
    if (solvedQ + count >= targetQ && solvedQ < targetQ) {
      haptics.success();
    } else {
      haptics.light();
    }
    onAddQuestions(count);
  };

  const handleAddM = (minutes: number) => {
    if (studiedMin + minutes >= targetMinutes && studiedMin < targetMinutes) {
      haptics.success();
    } else {
      haptics.light();
    }
    onAddMinutes(minutes);
  };

  const formatHoursMinutes = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} dk`;
    if (m === 0) return `${h} sa`;
    return `${h} sa ${m} dk`;
  };

  // Compact Single-Ring Mode for Minimalist Dashboard
  if (compact) {
    const compactSize = 100;
    const compactRadius = 38;
    const compactStroke = 7;
    const compactCircumference = 2 * Math.PI * compactRadius;
    const compactOffset = compactCircumference - (totalOverallPercent / 100) * compactCircumference;

    return (
      <div 
        id="daily-goal-compact-card"
        className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#2D3245] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Günlük Hedef</span>
                {isAllCompleted ? (
                  <span className="text-[11px] font-semibold text-green-400 bg-green-600/15 border border-green-600/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Tamamlandı
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#161822] text-indigo-300 border border-indigo-500/30 font-mono">
                    %{totalOverallPercent}
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Single +10 Question Button */}
          <button
            type="button"
            onClick={() => handleAddQ(10)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+10 Soru</span>
          </button>
        </div>

        {/* Content: Single Mini Ring + Two Progress Metrics */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Single Circular Progress Ring */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${compactSize} ${compactSize}`}>
              <circle
                cx={compactSize / 2}
                cy={compactSize / 2}
                r={compactRadius}
                stroke="#222533"
                strokeWidth={compactStroke}
                fill="transparent"
              />
              <circle
                cx={compactSize / 2}
                cy={compactSize / 2}
                r={compactRadius}
                stroke={isAllCompleted ? '#16A34A' : '#4F46E5'}
                strokeWidth={compactStroke}
                strokeDasharray={compactCircumference}
                strokeDashoffset={compactOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-lg font-black font-mono text-white leading-none">
                %{totalOverallPercent}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                Hedef
              </span>
            </div>
          </div>

          {/* Metric 1 (Questions) & Metric 2 (Time) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
            {/* Questions Metric */}
            <div className="p-3 rounded-xl bg-[#161822] border border-[#2D3245] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Soru Çözümü</span>
                <span className="font-bold font-mono text-white">
                  {solvedQ} / {targetQ}
                </span>
              </div>
              <div className="w-full h-2 bg-[#222533] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${questionPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-indigo-300 font-mono block text-right">
                %{questionPercent} tamamlandı
              </span>
            </div>

            {/* Time Metric */}
            <div className="p-3 rounded-xl bg-[#161822] border border-[#2D3245] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Çalışma Süresi</span>
                <span className="font-bold font-mono text-white">
                  {formatHoursMinutes(studiedMin)} / {formatHoursMinutes(targetMinutes)}
                </span>
              </div>
              <div className="w-full h-2 bg-[#222533] rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${timePercent}%` }}
                />
              </div>
              <span className="text-[10px] text-sky-300 font-mono block text-right">
                %{timePercent} tamamlandı
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Günlük Hedef Halkaları</span>
              {isAllCompleted && (
                <span className="text-xs font-semibold text-green-400 bg-green-600/15 border border-green-600/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  Hedef Tamamlandı
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center bg-[#161822] p-1 rounded-xl border border-[#2D3245]">
          <button
            onClick={() => setActiveView('both')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-150 ${
              activeView === 'both'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveView('questions')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-150 ${
              activeView === 'questions'
                ? isQuestionDone ? 'bg-green-600 text-white' : THEME.brand.tailwind.activeTab
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Soru ({questionPercent}%)
          </button>
          <button
            onClick={() => setActiveView('time')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-150 ${
              activeView === 'time'
                ? isTimeDone ? 'bg-green-600 text-white' : THEME.brand.tailwind.activeTab
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Süre ({timePercent}%)
          </button>
        </div>
      </div>

      {/* Main Content: Ring Visual & Detailed Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: SVG Concentric Rings */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[#161822] rounded-2xl border border-[#2D3245]">
          <div className="relative w-[160px] h-[160px] flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox={`0 0 ${size} ${size}`}
            >
              {/* Background Track - Outer (Questions) */}
              {(activeView === 'both' || activeView === 'questions') && (
                <circle
                  cx={center}
                  cy={center}
                  r={outerRadius}
                  stroke="#222533"
                  strokeWidth={outerStroke}
                  fill="transparent"
                />
              )}

              {/* Progress Arc - Outer (Questions: Indigo or Green if 100%) */}
              {(activeView === 'both' || activeView === 'questions') && (
                <circle
                  cx={center}
                  cy={center}
                  r={outerRadius}
                  stroke={isQuestionDone ? THEME.status.success.hex : THEME.brand.primary}
                  strokeWidth={outerStroke}
                  strokeDasharray={outerCircumference}
                  strokeDashoffset={outerOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300 ease-out"
                />
              )}

              {/* Background Track - Inner (Time) */}
              {(activeView === 'both' || activeView === 'time') && (
                <circle
                  cx={center}
                  cy={center}
                  r={innerRadius}
                  stroke="#222533"
                  strokeWidth={innerStroke}
                  fill="transparent"
                />
              )}

              {/* Progress Arc - Inner (Time: Sky/Teal or Green if 100%) */}
              {(activeView === 'both' || activeView === 'time') && (
                <circle
                  cx={center}
                  cy={center}
                  r={innerRadius}
                  stroke={isTimeDone ? THEME.status.success.hex : '#0284C7'}
                  strokeWidth={innerStroke}
                  strokeDasharray={innerCircumference}
                  strokeDashoffset={innerOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300 ease-out"
                />
              )}
            </svg>

            {/* Centered Ring Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              {activeView === 'both' && (
                <>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isAllCompleted ? 'text-green-400' : 'text-white'
                    }`}
                  >
                    %{totalOverallPercent}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {isAllCompleted ? 'Tamamlandı' : 'Genel Hedef'}
                  </span>
                </>
              )}

              {activeView === 'questions' && (
                <>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isQuestionDone ? 'text-green-400' : 'text-indigo-400'
                    }`}
                  >
                    %{questionPercent}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {solvedQ}/{targetQ} Soru
                  </span>
                </>
              )}

              {activeView === 'time' && (
                <>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      isTimeDone ? 'text-green-400' : 'text-sky-400'
                    }`}
                  >
                    %{timePercent}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {formatHoursMinutes(studiedMin)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend under Ring */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2 text-slate-200">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isQuestionDone ? 'bg-green-600' : 'bg-indigo-600'
                }`}
              />
              <span>Soru (%{questionPercent})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isTimeDone ? 'bg-green-600' : 'bg-sky-600'
                }`}
              />
              <span>Süre (%{timePercent})</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Metric Cards with Quick Increment Actions */}
        <div className="md:col-span-7 space-y-3.5">
          
          {/* Card 1: Question Goal */}
          <div
            className={`rounded-2xl p-4 space-y-2.5 transition-colors duration-150 ${
              isQuestionDone
                ? 'bg-[#161822] border border-green-600/40'
                : 'bg-[#161822] border border-[#2D3245]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Soru Çözme Hedefi</h3>
                  {isQuestionDone && (
                    <span className="text-xs font-semibold text-green-400">
                      ✓ Tamamlandı
                    </span>
                  )}
                </div>
                <span className="text-sm text-slate-300">
                  {isQuestionDone
                    ? `${solvedQ} soru çözüldü`
                    : `Kalan: ${Math.max(0, targetQ - solvedQ)} soru`}
                </span>
              </div>

              <div className="text-right">
                <span
                  className={`text-base font-bold font-mono ${
                    isQuestionDone ? 'text-green-400' : 'text-indigo-300'
                  }`}
                >
                  {solvedQ} <span className="text-sm text-slate-300 font-normal">/ {targetQ}</span>
                </span>
                <span className="text-xs text-slate-400 block font-medium">
                  %{questionPercent}
                </span>
              </div>
            </div>

            {/* Quick Soru Increment Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#2D3245]">
              <span className="text-sm text-slate-300 font-medium">Ekle:</span>
              <button
                onClick={() => handleAddQ(10)}
                className="px-3 py-1 rounded-lg bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150 cursor-pointer"
              >
                +10 Soru
              </button>
              <button
                onClick={() => handleAddQ(25)}
                className="px-3 py-1 rounded-lg bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150 cursor-pointer"
              >
                +25 Soru
              </button>
              <button
                onClick={() => handleAddQ(50)}
                className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-sm font-medium transition-colors duration-150 cursor-pointer"
              >
                +50 Soru
              </button>
            </div>
          </div>

          {/* Card 2: Time & Focus Goal */}
          <div
            className={`rounded-2xl p-4 space-y-2.5 transition-colors duration-150 ${
              isTimeDone
                ? 'bg-[#161822] border border-green-600/40'
                : 'bg-[#161822] border border-[#2D3245]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Çalışma Süresi</h3>
                  {isTimeDone && (
                    <span className="text-xs font-semibold text-green-400">
                      ✓ Tamamlandı
                    </span>
                  )}
                </div>
                <span className="text-sm text-slate-300">
                  Hedef: {targetStudyHours} saat ({targetMinutes} dk)
                </span>
              </div>

              <div className="text-right">
                <span
                  className={`text-base font-bold font-mono ${
                    isTimeDone ? 'text-green-400' : 'text-sky-400'
                  }`}
                >
                  {formatHoursMinutes(studiedMin)}{' '}
                  <span className="text-sm text-slate-300 font-normal">/ {formatHoursMinutes(targetMinutes)}</span>
                </span>
                <span className="text-xs text-slate-400 block font-medium">
                  %{timePercent}
                </span>
              </div>
            </div>

            {/* Quick Süre Increment Buttons & Pomodoro Link */}
            <div className="flex items-center justify-between pt-2 border-t border-[#2D3245]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 font-medium">Ekle:</span>
                <button
                  onClick={() => handleAddM(15)}
                  className="px-3 py-1 rounded-lg bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150 cursor-pointer"
                >
                  +15 dk
                </button>
                <button
                  onClick={() => handleAddM(30)}
                  className="px-3 py-1 rounded-lg bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150 cursor-pointer"
                >
                  +30 dk
                </button>
                <button
                  onClick={() => handleAddM(45)}
                  className="px-3 py-1 rounded-lg bg-[#222533] hover:bg-[#2D3245] active:bg-[#3B4259] border border-[#2D3245] text-slate-200 text-sm font-medium transition-colors duration-150 cursor-pointer"
                >
                  +45 dk
                </button>
              </div>

              {onOpenPomodoro && (
                <button
                  onClick={onOpenPomodoro}
                  className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 active:text-indigo-100 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span>Pomodoro</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Inviting Empty-Day Notice */}
      {isEmptyDay && (
        <div className="p-4 bg-[#161822] border border-[#2D3245] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium">
                Yeni bir çalışma gününe başlamak için harika bir an.
              </p>
              <p className="text-sm text-slate-300">
                Bugünün ilk sorusuyla zihnini ısıtmaya ne dersin?
              </p>
            </div>
          </div>
          <button
            onClick={() => handleAddQ(10)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors duration-150 self-start sm:self-auto cursor-pointer"
          >
            +10 Soru ile Başla
          </button>
        </div>
      )}
    </div>
  );
};
