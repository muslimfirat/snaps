import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Calendar, 
  Zap, 
  BookOpen, 
  Camera, 
  Bookmark, 
  Clock, 
  RotateCcw, 
  Target, 
  Bot, 
  ListPlus, 
  Check 
} from 'lucide-react';
import { DailyTaskItem, UserProfile, MainTabCategory } from '../types';
import { THEME } from '../theme';
import { haptics } from '../lib/haptics';
import { getLocalDateStr } from '../lib/dateUtils';

interface DailyTasksWidgetProps {
  profile: UserProfile;
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
  compact?: boolean;
}

interface SmartRecommendation {
  id: string;
  title: string;
  category: DailyTaskItem['category'];
  priority: 'high' | 'medium' | 'low';
  linkTab: string;
  linkCategory: MainTabCategory;
  icon: React.ElementType;
  description: string;
  badge: string;
}

export const DailyTasksWidget: React.FC<DailyTasksWidgetProps> = ({
  profile,
  onNavigateTab,
  compact = false,
}) => {
  const todayStr = getLocalDateStr();
  const storageKey = `snaps_daily_tasks_${todayStr}`;
  const isKPSS = profile.targetExam.startsWith('KPSS');

  // 4 Core Smart Recommendations for the Student
  const SMART_RECOMMENDATIONS: SmartRecommendation[] = [
    {
      id: 'rec-1-snap',
      title: isKPSS ? 'Günün Paragraf / Problem Soru Rutini (20 Soru)' : 'TYT/AYT Branş Soru Çözümü (25 Soru)',
      category: 'question',
      priority: 'high',
      linkTab: 'snap',
      linkCategory: 'TRAINING',
      icon: Camera,
      description: 'Fotoğrafını çekip yapay zeka ile adım adım çözdür veya testini çöz.',
      badge: 'SORU',
    },
    {
      id: 'rec-2-coach',
      title: 'AI Sınav Koçu ile Günlük Strateji & Motivasyon Brifingi',
      category: 'custom',
      priority: 'medium',
      linkTab: 'voice_coach',
      linkCategory: 'TRAINING',
      icon: Bot,
      description: 'Günün ders planını netleştir, kaygı yönetimi ve sınav taktiği al.',
      badge: 'AI KOÇ',
    },
    {
      id: 'rec-3-mistakes',
      title: 'Akıllı Hata Defterindeki Yanlış Soruları & İkiz Soruyu Çöz',
      category: 'review',
      priority: 'high',
      linkTab: 'mistakes',
      linkCategory: 'TRAINING',
      icon: Bookmark,
      description: 'Leitner kutusundaki hatalı soruları tekrar et ve kalıcı öğren.',
      badge: 'TEKRAR',
    },
    {
      id: 'rec-4-pomodoro',
      title: '25 Dk Derin Odak Pomodoro Çalışma Seansı Yap',
      category: 'pomodoro',
      priority: 'medium',
      linkTab: 'pomodoro',
      linkCategory: 'TRAINING',
      icon: Zap,
      description: 'Bölünmeden derin odaklanarak ders çalış.',
      badge: 'ODAK',
    },
  ];

  // Default suggested tasks based on candidate exam
  const getDefaultTasks = (): DailyTaskItem[] => {
    if (isKPSS) {
      return [
        {
          id: 'kpss-1',
          title: 'Günün Türkçe Paragraf Rutini (20 Soru)',
          category: 'question',
          completed: false,
          priority: 'high',
          linkTab: 'snap',
          linkCategory: 'TRAINING',
        },
        {
          id: 'kpss-2',
          title: 'Genel Yetenek Matematik / Problem Çözümü (25 Soru)',
          category: 'question',
          completed: false,
          priority: 'high',
          linkTab: 'snap',
          linkCategory: 'TRAINING',
        },
        {
          id: 'kpss-3',
          title: 'Genel Kültür Tarih / Coğrafya Hap Not Tekrarı',
          category: 'review',
          completed: false,
          priority: 'medium',
          linkTab: 'curriculum',
          linkCategory: 'HOME',
        },
        {
          id: 'kpss-4',
          title: 'Akıllı Hata Defterindeki 5 Yanlış Soruyu Çöz',
          category: 'review',
          completed: false,
          priority: 'medium',
          linkTab: 'mistakes',
          linkCategory: 'TRAINING',
        },
        {
          id: 'kpss-5',
          title: '1x 25 Dk Derin Odak Pomodoro Çalışması Yap',
          category: 'pomodoro',
          completed: false,
          priority: 'low',
          linkTab: 'pomodoro',
          linkCategory: 'TRAINING',
        },
      ];
    } else {
      return [
        {
          id: 'yks-1',
          title: 'TYT Türkçe Paragraf & Anlam Bilgisi (25 Soru)',
          category: 'question',
          completed: false,
          priority: 'high',
          linkTab: 'snap',
          linkCategory: 'TRAINING',
        },
        {
          id: 'yks-2',
          title: 'Matematik / Fen Branş Testi (30 Soru)',
          category: 'question',
          completed: false,
          priority: 'high',
          linkTab: 'snap',
          linkCategory: 'TRAINING',
        },
        {
          id: 'yks-3',
          title: 'Müfredat Konu İlerlemesi & Eksik Konu Tekrarı',
          category: 'topic',
          completed: false,
          priority: 'medium',
          linkTab: 'curriculum',
          linkCategory: 'HOME',
        },
        {
          id: 'yks-4',
          title: 'Hata Defterindeki Yanlış Soruları İncele',
          category: 'review',
          completed: false,
          priority: 'medium',
          linkTab: 'mistakes',
          linkCategory: 'TRAINING',
        },
        {
          id: 'yks-5',
          title: '1x 25 Dk Odaklanmış Pomodoro Seansı Tamamla',
          category: 'pomodoro',
          completed: false,
          priority: 'low',
          linkTab: 'pomodoro',
          linkCategory: 'TRAINING',
        },
      ];
    }
  };

  const [tasks, setTasks] = useState<DailyTaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading daily tasks', e);
    }
    return getDefaultTasks();
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<DailyTaskItem['category']>('question');
  const [newTaskPriority, setNewTaskPriority] = useState<DailyTaskItem['priority']>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Save to LocalStorage whenever tasks update
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving daily tasks', e);
    }
  }, [tasks, storageKey]);

  // Global event listener to add tasks from external components (e.g. Dashboard tiles)
  useEffect(() => {
    const handleExternalAddTask = (e: Event) => {
      const customEvent = e as CustomEvent<DailyTaskItem>;
      if (customEvent.detail && customEvent.detail.title) {
        setTasks((prev) => {
          const exists = prev.some(
            (t) => t.title.toLowerCase().trim() === customEvent.detail.title.toLowerCase().trim()
          );
          if (exists) return prev;
          haptics.success();
          return [customEvent.detail, ...prev];
        });
      }
    };

    window.addEventListener('add-daily-task', handleExternalAddTask);
    return () => window.removeEventListener('add-daily-task', handleExternalAddTask);
  }, []);

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            haptics.success();
          } else {
            haptics.selection();
          }
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = newTaskTitle.trim();
    if (!cleanTitle) return;

    let linkTab: string | undefined;
    let linkCategory: MainTabCategory | undefined;

    if (newTaskCategory === 'question') {
      linkTab = 'snap';
      linkCategory = 'TRAINING';
    } else if (newTaskCategory === 'pomodoro') {
      linkTab = 'pomodoro';
      linkCategory = 'TRAINING';
    } else if (newTaskCategory === 'review') {
      linkTab = 'mistakes';
      linkCategory = 'TRAINING';
    } else if (newTaskCategory === 'topic') {
      linkTab = 'curriculum';
      linkCategory = 'HOME';
    } else if (newTaskCategory === 'mock') {
      linkTab = 'mock';
      linkCategory = 'TRAINING';
    }

    const newTask: DailyTaskItem = {
      id: `custom-${Date.now()}`,
      title: cleanTitle,
      category: newTaskCategory,
      completed: false,
      priority: newTaskPriority,
      linkTab,
      linkCategory,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAddingOpen(false);
    haptics.light();
  };

  const handleAddSmartRecommendation = (rec: SmartRecommendation) => {
    const isAlreadyInTasks = tasks.some(
      (t) => t.title.toLowerCase().trim() === rec.title.toLowerCase().trim()
    );

    if (isAlreadyInTasks) {
      haptics.selection();
      return;
    }

    const newTask: DailyTaskItem = {
      id: `rec-added-${Date.now()}-${rec.id}`,
      title: rec.title,
      category: rec.category,
      completed: false,
      priority: rec.priority,
      linkTab: rec.linkTab,
      linkCategory: rec.linkCategory,
    };

    setTasks((prev) => [newTask, ...prev]);
    haptics.success();
  };

  const handleDeleteTask = (taskId: string) => {
    haptics.selection();
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleResetToSmartTasks = () => {
    haptics.medium();
    setTasks(getDefaultTasks());
  };

  const handleClearCompleted = () => {
    haptics.light();
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  // Calculations
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  // Filtered list
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  // Category Icon and Label helper (Clean & Strict Status System)
  const getCategoryMeta = (cat: DailyTaskItem['category']) => {
    switch (cat) {
      case 'question':
        return { label: 'Soru', icon: Camera, color: 'text-indigo-300 bg-indigo-600/15 border-indigo-500/30' };
      case 'topic':
        return { label: 'Konu', icon: BookOpen, color: 'text-sky-300 bg-sky-600/15 border-sky-600/30' };
      case 'pomodoro':
        return { label: 'Odak', icon: Zap, color: 'text-orange-300 bg-orange-600/15 border-orange-600/30' };
      case 'review':
        return { label: 'Tekrar', icon: Bookmark, color: 'text-slate-300 bg-slate-700/30 border-slate-600/30' };
      case 'mock':
        return { label: 'Deneme', icon: Target, color: 'text-indigo-300 bg-indigo-600/15 border-indigo-500/30' };
      default:
        return { label: 'Görev', icon: CheckSquare, color: 'text-slate-300 bg-slate-800 border-slate-700' };
    }
  };

  const formattedToday = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Compact Mode for Clean Minimalist Dashboard
  if (compact) {
    const displayTasks = tasks.slice(0, 3);
    return (
      <div 
        id="daily-tasks-widget-compact"
        className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-5 shadow-sm space-y-4 transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D3245] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Günün Görevleri</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#161822] text-slate-300 border border-[#2D3245] font-mono">
                  {completedCount}/{tasks.length}
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('planner', 'CALENDAR')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Tümünü Gör ({tasks.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Tasks List */}
        <div className="space-y-2.5">
          {displayTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">Günün görevi bulunmuyor.</p>
          ) : (
            displayTasks.map((task) => {
              const catMeta = getCategoryMeta(task.category);
              const CatIcon = catMeta.icon;
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTaskCompletion(task.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    task.completed
                      ? 'bg-[#141620] border-[#222533] opacity-75'
                      : 'bg-[#161822] border-[#2D3245] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompletion(task.id);
                      }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        task.completed
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'border-2 border-slate-600 hover:border-indigo-400 bg-slate-900'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs font-medium block truncate ${
                          task.completed
                            ? 'line-through text-slate-500 italic'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${catMeta.color}`}>
                      <CatIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">{catMeta.label}</span>
                    </span>
                  </div>

                  {task.linkTab && !task.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.selection();
                        onNavigateTab(task.linkTab!, task.linkCategory);
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>Başla</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar: Quick View All link */}
        {tasks.length > 3 && (
          <div className="pt-2 text-center border-t border-[#2D3245]">
            <button
              type="button"
              onClick={() => onNavigateTab('planner', 'CALENDAR')}
              className="text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
            >
              <span>Diğer {tasks.length - 3} görevi ve haftalık planı incele</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      id="daily-tasks-widget"
      className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 transition-all"
    >
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3245] pb-4">
        
        {/* Title & Date */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Günün Görevleri
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-600/15 text-indigo-300 border border-indigo-500/30">
                Kontrol Listesi
              </span>
            </div>
            <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedToday}</span>
            </p>
          </div>
        </div>

        {/* Action Controls (Add Task / Smart Preset) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setIsAddingOpen(!isAddingOpen);
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Görev Ekle</span>
          </button>

          <button
            type="button"
            onClick={handleResetToSmartTasks}
            title="ÖSYM hedefine uygun önerilen günlük görevleri yükle"
            className="p-1.5 rounded-xl bg-[#161822] hover:bg-[#222533] border border-[#2D3245] text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline text-[11px]">Akıllı Sıfırla</span>
          </button>
        </div>

      </div>

      {/* 2. Progress Overview Bar (Flat Indigo Bar) */}
      <div className="bg-[#161822] border border-[#2D3245] rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bugünkü İlerleme:</span>
            <strong className="text-white">{completedCount} / {totalCount}</strong>
            <span className="text-slate-400">tamamlandı</span>
          </span>
          <span className="font-mono font-bold text-indigo-300 text-sm">
            %{completionPercentage}
          </span>
        </div>

        {/* Progress Bar Track - Flat Color */}
        <div className="w-full bg-[#222533] h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 3. 4 AKILLI ÖNERİ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Günün 4 Önerisi (Hızlı Ekle)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="text-[11px] text-indigo-300 hover:text-white transition-colors"
          >
            {showRecommendations ? 'Gizle' : 'Göster'}
          </button>
        </div>

        {showRecommendations && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SMART_RECOMMENDATIONS.map((rec) => {
              const RecIcon = rec.icon;
              const isAlreadyInTasks = tasks.some(
                (t) => t.title.toLowerCase().trim() === rec.title.toLowerCase().trim()
              );
              const matchingTask = tasks.find(
                (t) => t.title.toLowerCase().trim() === rec.title.toLowerCase().trim()
              );

              return (
                <div
                  key={rec.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isAlreadyInTasks
                      ? 'bg-[#161822]/70 border-indigo-500/20'
                      : 'bg-[#161822] border-[#2D3245] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 flex items-center justify-center shrink-0">
                          <RecIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white truncate">
                          {rec.badge}
                        </span>
                      </div>

                      {isAlreadyInTasks && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-600/15 text-green-300 border border-green-600/30 flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          <span>{matchingTask?.completed ? 'Tamamlandı' : 'Listede'}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {rec.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2D3245]/60">
                    <button
                      type="button"
                      disabled={isAlreadyInTasks}
                      onClick={() => handleAddSmartRecommendation(rec)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                        isAlreadyInTasks
                          ? 'text-slate-500 bg-slate-800/40 cursor-default'
                          : 'text-indigo-300 hover:text-white bg-indigo-600/15 hover:bg-indigo-600/30 border border-indigo-500/30 cursor-pointer'
                      }`}
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>{isAlreadyInTasks ? 'Eklendi' : '+ Göreve Ekle'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        onNavigateTab(rec.linkTab, rec.linkCategory);
                      }}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Başla</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Celebration Banner when all tasks are complete */}
      {isAllDone && (
        <div className="bg-[#161822] border border-green-600/40 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-600/20 text-green-400 flex items-center justify-center shrink-0 border border-green-600/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-green-300">
                Tebrikler! Bugünün tüm görevlerini tamamladın 🎉
              </h4>
              <p className="text-xs text-slate-300">
                İstikrarlı çalışman hedefine giden yoldaki en güçlü kozun.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('streak', 'HOME')}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 shrink-0 px-2.5 py-1 rounded-lg bg-green-600/10 border border-green-600/20 transition-colors"
          >
            <span>Seriyi Gör</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Task Creation Form Accordion */}
      {isAddingOpen && (
        <form 
          onSubmit={handleAddTask}
          className="bg-[#161822] border border-indigo-500/30 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            Yeni Görev Tanımla
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Örn: Matematik Fonksiyonlar 25 test sorusu çöz..."
              autoFocus
              className="flex-1 bg-[#1B1D27] border border-[#2D3245] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />

            <div className="flex items-center gap-2">
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as DailyTaskItem['category'])}
                className="bg-[#1B1D27] border border-[#2D3245] text-slate-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="question">🎯 Soru Çözümü</option>
                <option value="topic">📚 Konu Çalışması</option>
                <option value="pomodoro">⏱️ Odak / Pomodoro</option>
                <option value="review">🔄 Tekrar / Hata</option>
                <option value="mock">⚡ Deneme</option>
                <option value="custom">📝 Diğer Görev</option>
              </select>

              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as DailyTaskItem['priority'])}
                className="bg-[#1B1D27] border border-[#2D3245] text-slate-200 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="high">🔴 Yüksek Öncelik</option>
                <option value="medium">🟡 Normal</option>
                <option value="low">🟢 Düşük</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                Ekle
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 6. Filter Tabs & Quick Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 bg-[#161822] p-1 rounded-xl border border-[#2D3245]">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tümü ({totalCount})
          </button>
          
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setFilter('pending');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'pending'
                ? THEME.brand.tailwind.activeTab
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bekleyen ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.light();
              setFilter('completed');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-green-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tamamlanan ({completedCount})
          </button>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            onClick={handleClearCompleted}
            className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Bitenleri Temizle</span>
          </button>
        )}
      </div>

      {/* 7. Tasks Checklist Rendering */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 px-4 bg-[#161822] border border-[#2D3245] rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {filter === 'completed' 
                ? 'Henüz tamamlanmış görev bulunmuyor.' 
                : filter === 'pending'
                ? 'Bekleyen görev yok! Tüm görevler tamamlandı.'
                : 'Bugün için eklenmiş görev bulunmuyor.'}
            </p>
            <p className="text-xs text-slate-500">
              Yukarıdaki "Günün 4 Önerisi"nden seçebilir veya "Görev Ekle" ile kendi maddeni ekleyebilirsin.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const catMeta = getCategoryMeta(task.category);
            const CatIcon = catMeta.icon;

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                  task.completed
                    ? 'bg-[#161822]/60 border-slate-800/80 opacity-75'
                    : 'bg-[#161822] border-[#2D3245] hover:border-indigo-500/40 hover:bg-[#1c1f2d]'
                }`}
              >
                {/* Left: Interactive Checkbox & Title */}
                <div 
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                  onClick={() => toggleTaskCompletion(task.id)}
                >
                  {/* Custom Checkbox */}
                  <button
                    type="button"
                    aria-label={task.completed ? 'Görevi tamamlanmadı olarak işaretle' : 'Görevi tamamlandı olarak işaretle'}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      task.completed
                        ? 'bg-green-600 text-white shadow-sm shadow-green-600/20'
                        : 'border-2 border-slate-600 hover:border-indigo-400 bg-slate-900/80'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  {/* Task Text & Details */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm font-medium block transition-all break-words ${
                        task.completed
                          ? 'line-through text-slate-500 italic'
                          : 'text-white group-hover:text-indigo-200'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Metadata Subline */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${catMeta.color}`}>
                        <CatIcon className="w-3 h-3" />
                        <span>{catMeta.label}</span>
                      </span>

                      {task.priority === 'high' && !task.completed && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-600/15 text-red-300 border border-red-600/30">
                          Önemli
                        </span>
                      )}

                      {task.completed && task.completedAt && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{task.completedAt}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Link & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {task.linkTab && !task.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.selection();
                        onNavigateTab(task.linkTab!, task.linkCategory);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="İlgili antrenmana veya araca git"
                    >
                      <span className="hidden sm:inline">Başla</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Görevi Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
