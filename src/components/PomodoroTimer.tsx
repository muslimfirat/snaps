import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, Zap, Target, BookOpen, Lightbulb, BellRing } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { playCompletionBell, ambientManager } from '../lib/soundEffects';
import { haptics } from '../lib/haptics';
import { THEME } from '../theme';
import { useChartColors } from '../lib/chartColors';

interface PomodoroTimerProps {
  profile: UserProfile;
  onIncrementQuestionCount: (count?: number) => void;
  onIncrementStudyMinutes: (minutes: number) => void;
}

type Mode = 'FOCUS_25' | 'FOCUS_50' | 'SHORT_BREAK' | 'LONG_BREAK';

const MODE_DURATIONS: Record<Mode, number> = {
  FOCUS_25: 25 * 60,
  FOCUS_50: 50 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  profile,
  onIncrementQuestionCount,
  onIncrementStudyMinutes,
}) => {
  const CHART = useChartColors();
  const [mode, setMode] = useState<Mode>('FOCUS_25');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.FOCUS_25);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionSubject, setSessionSubject] = useState('Matematik');
  const [questionsSolvedInSession, setQuestionsSolvedInSession] = useState(0);
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'whitenoise' | 'lofi'>('off');
  const [completedSessionsCount, setCompletedSessionsCount] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCompletionFlash, setShowCompletionFlash] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, soundEnabled]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    
    // Play distinctive completion bell sound
    if (soundEnabled) {
      playCompletionBell();
    }
    
    haptics.success();
    setShowCompletionFlash(true);
    setTimeout(() => setShowCompletionFlash(false), 3000);

    const minutesCompleted = Math.round(MODE_DURATIONS[mode] / 60);
    onIncrementStudyMinutes(minutesCompleted);

    if (mode === 'FOCUS_25' || mode === 'FOCUS_50') {
      setCompletedSessionsCount((c) => c + 1);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const switchMode = (newMode: Mode) => {
    haptics.selection();
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_DURATIONS[newMode]);
  };

  const resetTimer = () => {
    haptics.warning();
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const handleLogQuestions = () => {
    if (questionsSolvedInSession > 0) {
      haptics.success();
      onIncrementQuestionCount(questionsSolvedInSession);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      setQuestionsSolvedInSession(0);
    }
  };

  const toggleAmbientSound = (type: 'rain' | 'whitenoise' | 'lofi') => {
    if (ambientSound === type) {
      ambientManager.stop();
      setAmbientSound('off');
    } else {
      ambientManager.start(type);
      setAmbientSound(type);
    }
  };

  const testAlarmSound = () => {
    haptics.light();
    playCompletionBell();
  };

  const totalDuration = MODE_DURATIONS[mode];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressRatio = Math.max(0, Math.min(1, (totalDuration - timeLeft) / totalDuration));
  const progressPercent = Math.round(progressRatio * 100);

  // SVG Geometry for smooth circular progress animation
  const radius = 110;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; // ~691.15
  const strokeDashoffset = circumference - (progressRatio * circumference);

  const isFocusMode = mode.startsWith('FOCUS');
  const accentColor = isFocusMode ? '#4F46E5' : '#16A34A'; // Indigo or Green

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Derin Odak & Sınav Simülasyon Odası</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Pomodoro & Odaklanma Sayacı
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            25 veya 50 dakikalık bloklar halinde sınav odaklı çalışın. Süre bittiğinde otomatik sesli bildirim uyarısı verilir.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Notification Status and Test */}
          <div className="flex items-center gap-2 bg-surface-0 border border-border p-2 rounded-xl">
            <button
              onClick={() => {
                haptics.selection();
                setSoundEnabled(!soundEnabled);
              }}
              title={soundEnabled ? 'Bildirim sesini kapat' : 'Bildirim sesini aç'}
              className={`p-1.5 rounded-lg transition-colors ${
                soundEnabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-surface-2 text-slate-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <BellRing className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={testAlarmSound}
              title="Bildirim sesini test et"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-2 hover:bg-surface-3 text-slate-200 border border-border flex items-center gap-1 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sesi Dene</span>
            </button>
          </div>

          <div className="text-right bg-surface-0 border border-border px-4 py-2 rounded-xl">
            <span className="text-2xs text-slate-400 block font-medium">Tamamlanan Oturum</span>
            <span className="text-base font-bold font-mono text-amber-400">
              {completedSessionsCount} Blok
            </span>
          </div>
        </div>
      </div>

      {/* Completion alert banner if just finished */}
      {showCompletionFlash && (
        <div className="p-4 bg-green-600/20 border border-green-500/50 rounded-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-bold text-white">
              Tebrikler! Oturum süresi tamamlandı. Bildirim sesi çalındı.
            </span>
          </div>
          <span className="text-xs font-semibold text-green-300 bg-green-950/60 px-2.5 py-1 rounded-lg border border-green-500/30">
            +{Math.round(MODE_DURATIONS[mode] / 60)} Dk Eklendi
          </span>
        </div>
      )}

      {/* Main Center Stage */}
      <div className="bg-surface-1 border border-border rounded-3xl p-8 shadow-2xl space-y-8 text-center flex flex-col items-center">
        
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-0 border border-border">
          <button
            id="mode-pomodoro-25"
            onClick={() => switchMode('FOCUS_25')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'FOCUS_25'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-300 hover:text-white'
            }`}
          >
            25 Dk Standart Pomodoro
          </button>

          <button
            id="mode-pomodoro-50"
            onClick={() => switchMode('FOCUS_50')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'FOCUS_50'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-300 hover:text-white'
            }`}
          >
            50 Dk Derin Odak (ÖSYM Blok)
          </button>

          <button
            id="mode-break-short"
            onClick={() => switchMode('SHORT_BREAK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'SHORT_BREAK'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            5 Dk Kısa Mola
          </button>

          <button
            id="mode-break-long"
            onClick={() => switchMode('LONG_BREAK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'LONG_BREAK'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            15 Dk Uzun Mola
          </button>
        </div>

        {/* Big Circular Progress Timer Display */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 250 250">
            {/* Background Track Circle */}
            <circle
              cx="125"
              cy="125"
              r={radius}
              stroke={CHART.track}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            
            {/* Active Circular Progress Arc */}
            <circle
              cx="125"
              cy="125"
              r={radius}
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />

            {/* Glowing Accent Head Marker */}
            {progressRatio > 0 && progressRatio < 1 && (
              <circle
                cx={125 + radius * Math.cos(2 * Math.PI * progressRatio - Math.PI / 2)}
                cy={125 + radius * Math.sin(2 * Math.PI * progressRatio - Math.PI / 2)}
                r="6"
                fill="#FFFFFF"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          {/* Time digits and status in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1.5 pointer-events-none select-none">
            <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isFocusMode ? `${sessionSubject} Odaklanması` : 'Zihinsel Dinlenme'}
              </span>
              <span className="text-2xs font-bold font-mono px-2 py-0.5 rounded-full bg-surface-0 text-slate-300 border border-border">
                %{progressPercent}
              </span>
            </div>
            {isRunning && (
              <span className="text-3xs text-green-400 font-semibold flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                Sayaç Devam Ediyor
              </span>
            )}
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-4">
          <button
            id="reset-timer-button"
            onClick={resetTimer}
            className="p-3.5 rounded-2xl bg-surface-0 hover:bg-surface-2 border border-border text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Sıfırla"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            id="toggle-timer-button"
            onClick={() => {
              if (!isRunning) {
                haptics.success();
              } else {
                haptics.light();
              }
              setIsRunning(!isRunning);
            }}
            className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Duraklat</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Odaklanmayı Başlat</span>
              </>
            )}
          </button>

          <button
            id="pomodoro-request-insight-btn"
            onClick={() => {
              haptics.light();
              window.dispatchEvent(new CustomEvent('trigger-study-insight'));
            }}
            className="p-3.5 rounded-2xl bg-surface-0 hover:bg-surface-2 border border-border text-amber-400 hover:text-amber-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Çalışma & Odaklanma İpucu Al"
          >
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Tools: Subject select & Question Logger & Ambience */}
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-left">
          
          {/* Active Subject Selector */}
          <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Çalışılan Ders:</span>
            </label>
            <select
              value={sessionSubject}
              onChange={(e) => setSessionSubject(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="Matematik">Matematik & Geometri</option>
              <option value="Tarih">Tarih</option>
              <option value="Türkçe">Türkçe & Paragraf</option>
              <option value="Coğrafya">Coğrafya</option>
              <option value="Vatandaşlık">Vatandaşlık & Güncel</option>
              <option value="Fen Bilimleri">Fen Bilimleri (Fizik/Kimya/Biyo)</option>
              <option value="Deneme Sınavı">Genel / Branş Denemesi</option>
            </select>
          </div>

          {/* Question Logger in session */}
          <div className="p-4 rounded-2xl bg-surface-0 border border-border space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-green-400" />
                <span>Çözülen Soru Sayısı:</span>
              </span>
              <span className="text-3xs text-slate-400 font-mono">Bu Blokta</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={questionsSolvedInSession}
                onChange={(e) => setQuestionsSolvedInSession(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-surface-1 border border-border rounded-xl px-3 py-1.5 text-xs text-white font-bold text-center"
              />
              <button
                onClick={handleLogQuestions}
                disabled={questionsSolvedInSession === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  questionsSolvedInSession > 0
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-surface-2 text-slate-500 cursor-not-allowed'
                }`}
              >
                Kaydet +
              </button>
            </div>
          </div>

        </div>

        {/* Ambient Sound Toggles */}
        <div className="space-y-2 w-full max-w-xl">
          <span className="text-xs font-semibold text-slate-300 block text-left">
            Arka Plan Odak Sesleri (Web Audio):
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'rain', label: 'Yağmur Sesi' },
              { id: 'whitenoise', label: 'Beyaz Gürültü' },
              { id: 'lofi', label: '432Hz Alfa Dalga' },
            ].map((snd) => {
              const isActive = ambientSound === snd.id;
              return (
                <button
                  key={snd.id}
                  onClick={() => toggleAmbientSound(snd.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 ring-1 ring-indigo-400/40'
                      : 'bg-surface-0 hover:bg-surface-2 border-border text-slate-300'
                  }`}
                >
                  {snd.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
