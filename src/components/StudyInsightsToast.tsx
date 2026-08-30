import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lightbulb, Sparkles, X, ChevronRight, Copy, Check, ThumbsUp, Clock, Brain, Target, Eye, FileText, TrendingUp, Zap, RotateCcw, Award, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import { STUDY_INSIGHTS, StudyInsight } from '../data/studyInsightsData';
import { haptics } from '../lib/haptics';

interface StudyInsightsToastProps {
  activeTab: string;
  isPomodoroActive?: boolean;
}

const STORAGE_KEY_INSIGHTS_ENABLED = 'snaps_study_insights_enabled';
const STORAGE_KEY_SNOOZE_UNTIL = 'snaps_study_insights_snooze_until';
const STORAGE_KEY_SAVED_TIPS = 'snaps_study_insights_saved';
const STORAGE_KEY_FREQUENCY = 'snaps_study_insights_frequency';

// Frequency presets in minutes (0 = manual only, 5, 10, 20, 30, 60 mins)
export type InsightFrequencyMinutes = 0 | 5 | 10 | 15 | 20 | 30 | 60;

export const StudyInsightsToast: React.FC<StudyInsightsToastProps> = ({
  activeTab,
  isPomodoroActive = false,
}) => {
  const [currentInsight, setCurrentInsight] = useState<StudyInsight | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [likedTips, setLikedTips] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED_TIPS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INSIGHTS_ENABLED);
      // Default to false (manual trigger only) so it doesn't disturb users unexpectedly
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Default to 0 (Manual only / on demand)
  const [frequencyMinutes, setFrequencyMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FREQUENCY);
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [progress, setProgress] = useState<number>(100);
  const DURATION_MS = 14000; // 14 seconds auto-dismiss

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const randomTriggerRef = useRef<NodeJS.Timeout | null>(null);
  const lastShownIndexRef = useRef<number>(-1);

  // Check if current tab is an active study session
  const isStudySessionActive = useCallback(() => {
    const studyTabs = [
      'pomodoro',
      'speed',
      'duel',
      'curriculum',
      'planner',
      'mistakes',
      'notebook',
      'errors',
      'flashcards',
      'mock',
      'simulator',
      'snap',
      'voice_coach',
      'coach',
      'dashboard'
    ];
    return isPomodoroActive || studyTabs.includes(activeTab);
  }, [activeTab, isPomodoroActive]);

  // Check if snoozed
  const isSnoozed = useCallback(() => {
    try {
      const snoozeUntil = localStorage.getItem(STORAGE_KEY_SNOOZE_UNTIL);
      if (snoozeUntil) {
        const time = parseInt(snoozeUntil, 10);
        if (Date.now() < time) return true;
      }
    } catch {}
    return false;
  }, []);

  // Show a specific or randomized study insight
  const showInsight = useCallback((insightToDisplay?: StudyInsight, force: boolean = false) => {
    if (!force && (!isEnabled || isSnoozed())) return;

    let selected: StudyInsight;
    if (insightToDisplay) {
      selected = insightToDisplay;
    } else {
      // Pick a random insight different from the last one
      let newIdx = Math.floor(Math.random() * STUDY_INSIGHTS.length);
      if (newIdx === lastShownIndexRef.current && STUDY_INSIGHTS.length > 1) {
        newIdx = (newIdx + 1) % STUDY_INSIGHTS.length;
      }
      lastShownIndexRef.current = newIdx;
      selected = STUDY_INSIGHTS[newIdx];
    }

    setCurrentInsight(selected);
    setIsVisible(true);
    setIsMinimized(false);
    setProgress(100);

    // Trigger subtle tactile feedback
    haptics.light();
  }, [isEnabled, isSnoozed]);

  // Schedule Next Random Trigger during active study session
  const scheduleNextRandomTrigger = useCallback(() => {
    if (randomTriggerRef.current) clearTimeout(randomTriggerRef.current);

    if (!isEnabled || frequencyMinutes <= 0 || isSnoozed() || !isStudySessionActive()) return;

    // Convert frequencyMinutes to milliseconds with a +/- 15% natural jitter
    const baseDelayMs = frequencyMinutes * 60 * 1000;
    const jitter = baseDelayMs * 0.2; // +/- 20%
    const minDelay = Math.max(30000, baseDelayMs - jitter);
    const maxDelay = baseDelayMs + jitter;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    randomTriggerRef.current = setTimeout(() => {
      if (!isVisible && isStudySessionActive() && isEnabled && frequencyMinutes > 0) {
        showInsight();
      }
      scheduleNextRandomTrigger();
    }, delay);
  }, [isEnabled, isSnoozed, isStudySessionActive, isVisible, showInsight, frequencyMinutes]);

  // Initial and reactive trigger setup
  useEffect(() => {
    // Listen for storage changes from Settings modal
    const handleStorageChange = () => {
      try {
        const savedEnabled = localStorage.getItem(STORAGE_KEY_INSIGHTS_ENABLED);
        if (savedEnabled !== null) setIsEnabled(savedEnabled === 'true');
        const savedFreq = localStorage.getItem(STORAGE_KEY_FREQUENCY);
        if (savedFreq !== null) setFrequencyMinutes(parseInt(savedFreq, 10));
      } catch {}
    };

    const handleCustomFreqEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ frequency?: number; enabled?: boolean }>).detail;
      if (detail?.frequency !== undefined) setFrequencyMinutes(detail.frequency);
      if (detail?.enabled !== undefined) setIsEnabled(detail.enabled);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('update-study-insights-config', handleCustomFreqEvent);

    if (isEnabled && frequencyMinutes > 0) {
      scheduleNextRandomTrigger();
    }

    return () => {
      if (randomTriggerRef.current) clearTimeout(randomTriggerRef.current);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('update-study-insights-config', handleCustomFreqEvent);
    };
  }, [isStudySessionActive, isSnoozed, isVisible, scheduleNextRandomTrigger, showInsight, frequencyMinutes, isEnabled]);

  // Listen for global custom event to trigger insight on demand (e.g. from Pomodoro or Search)
  useEffect(() => {
    const handleCustomTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<{ insightId?: string }>;
      if (customEvent.detail?.insightId) {
        const found = STUDY_INSIGHTS.find((i) => i.id === customEvent.detail.insightId);
        showInsight(found, true);
      } else {
        showInsight(undefined, true);
      }
    };

    window.addEventListener('trigger-study-insight', handleCustomTrigger);
    return () => window.removeEventListener('trigger-study-insight', handleCustomTrigger);
  }, [showInsight]);

  // Auto-dismiss countdown & progress bar
  useEffect(() => {
    if (!isVisible || isPaused || isMinimized) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const startTime = Date.now();
    const intervalTime = 100;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remainingPct);

      if (remainingPct <= 0) {
        setIsVisible(false);
        scheduleNextRandomTrigger();
      }
    }, intervalTime);

    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      scheduleNextRandomTrigger();
    }, DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isVisible, isPaused, isMinimized, scheduleNextRandomTrigger]);

  // Next Tip Handler
  const handleNextTip = () => {
    haptics.light();
    let newIdx = Math.floor(Math.random() * STUDY_INSIGHTS.length);
    if (newIdx === lastShownIndexRef.current && STUDY_INSIGHTS.length > 1) {
      newIdx = (newIdx + 1) % STUDY_INSIGHTS.length;
    }
    lastShownIndexRef.current = newIdx;
    setCurrentInsight(STUDY_INSIGHTS[newIdx]);
    setProgress(100);
  };

  // Like / Save Tip
  const handleToggleLike = () => {
    if (!currentInsight) return;
    haptics.light();
    const updated = {
      ...likedTips,
      [currentInsight.id]: !likedTips[currentInsight.id]
    };
    setLikedTips(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_TIPS, JSON.stringify(updated));
    } catch {}
  };

  // Copy Tip Text
  const handleCopy = () => {
    if (!currentInsight) return;
    haptics.light();
    const text = `💡 ${currentInsight.title}\n\n${currentInsight.insight}\n\n🎯 Eylem Adımı: ${currentInsight.actionStep}\n(Kaynak: ${currentInsight.scientificReference || 'Snaps Koçluk'})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Snooze for 30 minutes
  const handleSnooze = () => {
    haptics.light();
    const snoozeTime = Date.now() + 30 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY_SNOOZE_UNTIL, String(snoozeTime));
    } catch {}
    setIsVisible(false);
  };

  // Dismiss Toast
  const handleDismiss = () => {
    haptics.light();
    setIsVisible(false);
    scheduleNextRandomTrigger();
  };

  // Render Icon helper
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-4 h-4 text-indigo-400" />;
      case 'Clock': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'Eye': return <Eye className="w-4 h-4 text-emerald-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-indigo-400" />;
      case 'Target': return <Target className="w-4 h-4 text-amber-400" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'RotateCcw': return <RotateCcw className="w-4 h-4 text-rose-400" />;
      case 'Award': return <Award className="w-4 h-4 text-rose-400" />;
      case 'AlertCircle': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default: return <Lightbulb className="w-4 h-4 text-amber-400" />;
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* 1. FLOATING MINIMIZED PILL (When active but collapsed) */}
      {isMinimized && isVisible && currentInsight && (
        <div 
          id="study-insights-minimized-pill"
          onClick={() => {
            haptics.light();
            setIsMinimized(false);
          }}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-slate-900/95 hover:bg-slate-800 border border-indigo-500/40 text-white px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 group animate-in slide-in-from-bottom-2"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <Lightbulb className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold text-slate-200 truncate max-w-[160px]">
            {currentInsight.title}
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </div>
      )}

      {/* 2. MAIN TOAST NOTIFICATION CARD */}
      {isVisible && !isMinimized && currentInsight && (
        <div
          id="study-insights-toast-card"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-slate-950/80 space-y-3 animate-in slide-in-from-bottom-4 duration-300 select-none no-print"
        >
          {/* Progress Bar (Auto-Dismiss) */}
          <div className="absolute top-0 left-4 right-4 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-black uppercase tracking-wider text-slate-200">
                  Çalışma İpucu
                </span>
                <span className={`px-2 py-0.5 rounded-full border text-3xs font-bold ${currentInsight.badgeColor}`}>
                  {currentInsight.categoryLabel}
                </span>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-1">
              <button
                id="study-insight-minimize-btn"
                onClick={() => {
                  haptics.light();
                  setIsMinimized(true);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Küçült"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                id="study-insight-dismiss-btn"
                onClick={handleDismiss}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              {renderCategoryIcon(currentInsight.icon)}
              <span>{currentInsight.title}</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentInsight.insight}
            </p>
          </div>

          {/* Actionable Micro-Step Callout */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="text-2xs space-y-0.5">
              <span className="font-bold text-emerald-300 block">Hemen Uygula:</span>
              <p className="text-slate-300 font-medium leading-normal">
                {currentInsight.actionStep}
              </p>
            </div>
          </div>

          {/* Scientific Reference / Footnote */}
          {currentInsight.scientificReference && (
            <div className="flex items-center justify-between text-3xs text-slate-500 px-0.5">
              <span className="italic truncate max-w-[220px]">
                📌 {currentInsight.scientificReference}
              </span>
              {isPaused && (
                <span className="text-amber-400 font-semibold animate-pulse">
                  Duraklatıldı
                </span>
              )}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5">
              {/* Like / Helpful button */}
              <button
                id="study-insight-like-btn"
                onClick={handleToggleLike}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 text-2xs font-bold transition-all ${
                  likedTips[currentInsight.id]
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Faydalı Buldum"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{likedTips[currentInsight.id] ? 'Kaydedildi' : 'Faydalı'}</span>
              </button>

              {/* Copy Tip */}
              <button
                id="study-insight-copy-btn"
                onClick={handleCopy}
                className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="İpucunu Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Snooze / Frequency Adjustment Dropdown */}
              <button
                id="study-insight-snooze-btn"
                onClick={handleSnooze}
                className="px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-2xs font-medium transition-colors cursor-pointer"
                title="30 Dakika Sessize Al"
              >
                30dk Sustur
              </button>
            </div>

            {/* Next Tip Button */}
            <button
              id="study-insight-next-btn"
              onClick={handleNextTip}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-2xs transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-600/30"
            >
              <span>Sonraki İpucu</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      )}
    </>
  );
};
