import React, { useState } from 'react';
import { Calendar, Sparkles, CheckCircle2, Clock, Zap, Plus, ListTodo, Printer, Brain, CalendarDays } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WeeklyStudyPlan, UserProfile, StudyPlanBlock, MockExamRecord, PlannedMockExam, MistakeQuestionItem, MainTabCategory } from '../types';
import { StudyCalendar } from './StudyCalendar';
import { EXAM_METADATA } from '../data/curriculumData';
import { playCompletionBell } from '../lib/soundEffects';
import { apiFetch } from '../lib/apiClient';

interface StudyPlannerProps {
  profile: UserProfile;
  studyPlan: WeeklyStudyPlan | null;
  onUpdateStudyPlan: (plan: WeeklyStudyPlan) => void;
  onIncrementQuestionCount: (count?: number) => void;
  mockExams?: MockExamRecord[];
  mistakes?: MistakeQuestionItem[];
  plannedMocks?: PlannedMockExam[];
  onAddPlannedMock?: (planned: PlannedMockExam) => void;
  onDeletePlannedMock?: (id: string) => void;
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  profile,
  studyPlan,
  onUpdateStudyPlan,
  onIncrementQuestionCount,
  mockExams = [],
  mistakes = [],
  plannedMocks = [],
  onAddPlannedMock,
  onDeletePlannedMock,
  onNavigateTab,
}) => {
  const safeMockExams = Array.isArray(mockExams) ? mockExams : [];
  const [view, setView] = useState<'calendar' | 'plan'>('calendar');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddCustomTask, setShowAddCustomTask] = useState(false);

  // Form states for generator
  const [dailyHours, setDailyHours] = useState(profile.dailyStudyHourTarget || 4);
  const [weakSubjects, setWeakSubjects] = useState<string[]>(['Matematik', 'Tarih']);
  const [targetScore, setTargetScore] = useState(profile.targetScore || '88.5');

  // Custom task form
  const [customTaskSubject, setCustomTaskSubject] = useState('');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskDuration, setCustomTaskDuration] = useState('60 dk');

  const availableSubjects = profile.targetExam.startsWith('KPSS')
    ? ['Matematik & Geometri', 'Tarih', 'Türkçe & Paragraf', 'Coğrafya', 'Vatandaşlık & Güncel', 'Eğitim Bilimleri']
    : ['TYT Matematik', 'AYT Matematik', 'TYT Türkçe & Paragraf', 'Fizik', 'Kimya', 'Biyoloji', 'Edebiyat & Tarih'];

  const toggleWeakSubject = (sub: string) => {
    setWeakSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleGeneratePlan = async (customHours?: number, customWeak?: string[], customTitle?: string) => {
    setIsGenerating(true);
    try {
      const data = await apiFetch('/api/coach/generate-plan', {
        examType: EXAM_METADATA[profile.targetExam]?.name,
        targetScore,
        dailyHours: customHours || dailyHours,
        weakSubjects: customWeak || weakSubjects,
        daysUntilExam: 120,
        planTitle: customTitle,
      });
      const newPlan: WeeklyStudyPlan = {
        planTitle: data.planTitle || 'Haftalık Koçluk Programı',
        overview: data.overview || 'Kişiselleştirilmiş çalışma stratejisi',
        createdAt: new Date().toLocaleDateString('tr-TR'),
        days: data.days || [],
      };

      onUpdateStudyPlan(newPlan);
      setShowGenerateModal(false);

      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to generate plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick Preset Handlers
  const handleQuickPreset = (type: 'light' | 'standard' | 'intensive') => {
    if (type === 'light') {
      setDailyHours(2);
      handleGeneratePlan(2, ['Matematik', 'Tarih'], '🟢 Kolay & Hızlı Başlangıç Programı (2 Saat/Gün)');
    } else if (type === 'standard') {
      setDailyHours(4);
      handleGeneratePlan(4, weakSubjects, '🟡 Dengeli & Standart Koçluk Programı (4 Saat/Gün)');
    } else if (type === 'intensive') {
      setDailyHours(7);
      handleGeneratePlan(7, availableSubjects.slice(0, 3), '🔴 Yoğun / Derece Hedefli Program (7 Saat/Gün)');
    }
  };

  // Generate from latest mock exam
  const latestMock = safeMockExams[safeMockExams.length - 1];
  const handleGenerateFromLatestMock = async () => {
    if (!latestMock) return;
    setIsGenerating(true);

    try {
      const weakSecs = (latestMock.sections || [])
        .filter((s) => s && (s.wrong > 2 || (s.correct / (s.correct + s.wrong + s.blank || 1)) < 0.7))
        .map((s) => s.name);

      const data = await apiFetch('/api/coach/generate-plan-from-mock', {
        examTitle: latestMock.title,
        examType: EXAM_METADATA[latestMock.examType]?.name || latestMock.examType,
        targetScore: profile.targetScore || '88.5',
        dailyHours: dailyHours || 4,
        deficientTopics: weakSecs.length > 0 ? weakSecs : ['Matematik Problemleri', 'Tarih Teşkilat Yapısı', 'Paragraf Hız'],
        weakSections: weakSecs,
      });
      const newPlan: WeeklyStudyPlan = {
        planTitle: data.planTitle || `🎯 ${latestMock.title} Telafi Programı`,
        overview: data.overview || 'Son denemedeki eksik konulara özel telafi planı',
        createdAt: new Date().toLocaleDateString('tr-TR'),
        days: data.days || [],
      };

      onUpdateStudyPlan(newPlan);
      setShowGenerateModal(false);

      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
      });
    } catch (err) {
      console.error('Failed to generate from latest mock:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyPlan || !customTaskTitle.trim()) return;

    const updatedDays = [...studyPlan.days];
    const newBlock: StudyPlanBlock = {
      time: 'Ek Görev',
      subject: customTaskSubject.trim() || 'Özel Çalışma',
      task: customTaskTitle.trim(),
      duration: customTaskDuration,
      completed: false,
    };

    updatedDays[selectedDayIndex].blocks.push(newBlock);
    onUpdateStudyPlan({
      ...studyPlan,
      days: updatedDays,
    });

    setCustomTaskTitle('');
    setCustomTaskSubject('');
    setShowAddCustomTask(false);
  };

  const toggleTaskCompletion = (dayIdx: number, blockIdx: number) => {
    if (!studyPlan) return;
    const updatedDays = [...studyPlan.days];
    const targetBlock = updatedDays[dayIdx].blocks[blockIdx];
    targetBlock.completed = !targetBlock.completed;

    if (targetBlock.completed) {
      playCompletionBell();
      onIncrementQuestionCount(15);
    }

    onUpdateStudyPlan({
      ...studyPlan,
      days: updatedDays,
    });
  };

  const currentDay = studyPlan?.days?.[selectedDayIndex];
  const completedBlocksCount = (currentDay?.blocks || []).filter((b) => b?.completed).length;
  const totalBlocksCount = currentDay?.blocks?.length && currentDay.blocks.length > 0 ? currentDay.blocks.length : 1;
  const rawDayProgress = Math.round((completedBlocksCount / totalBlocksCount) * 100);
  const dayProgressPercent = isNaN(rawDayProgress) ? 0 : Math.min(100, Math.max(0, rawDayProgress));

  return (
    <div className="space-y-6 pb-12">
      {/* Görünüm seçici: Takvim / Haftalık Plan */}
      <div className="flex items-center gap-1.5 bg-surface-1 border border-border p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        <button
          onClick={() => setView('calendar')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            view === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Takvim
        </button>
        <button
          onClick={() => setView('plan')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            view === 'plan' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListTodo className="w-4 h-4" /> Haftalık Plan
        </button>
      </div>

      {view === 'calendar' ? (
        <StudyCalendar
          profile={profile}
          studyPlan={studyPlan}
          mockExams={safeMockExams}
          mistakes={mistakes}
          plannedMocks={plannedMocks}
          onAddPlannedMock={onAddPlannedMock}
          onDeletePlannedMock={onDeletePlannedMock}
          onNavigateTab={onNavigateTab}
          onShowWeeklyPlan={() => setView('plan')}
        />
      ) : (
      <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Akıllı Haftalık Koçluk Çizelgesi</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            📅 {studyPlan?.planTitle || 'Haftalık Çalışma & Görev Programı'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {studyPlan?.overview || 'Yapay zeka koçun zayıf olduğun dersleri ve son deneme eksiklerini önceliklendirerek sana özel 7 günlük yüksek verimli bir çalışma takvimi hazırlar.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors hidden sm:flex"
            title="Yazdır / PDF Olarak Kaydet"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            id="open-generate-plan-modal-button"
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI Kolay Program Hazırla</span>
          </button>
        </div>
      </div>

      {/* ⚡ Quick 1-Click Easy Preset Launchpad */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              ⚡ Tek Tıkla Kolay Çalışma Programı Şablonları
            </h3>
          </div>
          <span className="text-2xs text-slate-400">
            Tempona uygun şablonu seç, AI anında 7 günlük planını oluştursun
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Preset 1: Hafif */}
          <button
            onClick={() => handleQuickPreset('light')}
            disabled={isGenerating}
            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 text-left transition-all hover:scale-[1.02] group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400">🟢 Hafif & Hızlı</span>
              <span className="text-3xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">2-3 Saat</span>
            </div>
            <p className="text-2xs text-slate-400">
              Temel konu özeti, hap bilgiler ve günlük 50 soru çözümü.
            </p>
          </button>

          {/* Preset 2: Standart */}
          <button
            onClick={() => handleQuickPreset('standard')}
            disabled={isGenerating}
            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 text-left transition-all hover:scale-[1.02] group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-400">🟡 Dengeli & Standart</span>
              <span className="text-3xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">4-5 Saat</span>
            </div>
            <p className="text-2xs text-slate-400">
              Konu çalışması + Branş denemesi + 120 hedef soru.
            </p>
          </button>

          {/* Preset 3: Yoğun */}
          <button
            onClick={() => handleQuickPreset('intensive')}
            disabled={isGenerating}
            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/60 text-left transition-all hover:scale-[1.02] group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-400">🔴 Yoğun / Derece</span>
              <span className="text-3xs bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">6-8 Saat</span>
            </div>
            <p className="text-2xs text-slate-400">
              Çift deneme, hata defteri taraması ve 200+ soru.
            </p>
          </button>

          {/* Preset 4: Deneme Eksik Odaklı */}
          <button
            onClick={latestMock ? handleGenerateFromLatestMock : () => onNavigateTab && onNavigateTab('mock')}
            disabled={isGenerating}
            className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-950 to-indigo-950/40 border border-purple-500/40 hover:border-purple-400 text-left transition-all hover:scale-[1.02] group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Deneme Telafi Planı</span>
              </span>
              <span className="text-3xs bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">AI Teşhis</span>
            </div>
            <p className="text-2xs text-slate-400">
              {latestMock ? `Son "${latestMock.title}" eksiklerine göre planla` : 'Önce bir deneme sonucu kaydet'}
            </p>
          </button>
        </div>
      </div>

      {studyPlan && Array.isArray(studyPlan.days) && studyPlan.days.length > 0 ? (
        <div className="space-y-6">
          
          {/* Day Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {studyPlan.days.map((d, idx) => {
              const isSelected = selectedDayIndex === idx;
              const blocks = Array.isArray(d?.blocks) ? d.blocks : [];
              const doneCount = blocks.filter((b) => b?.completed).length;
              const isDayComplete = doneCount === blocks.length && blocks.length > 0;

              return (
                <button
                  key={idx}
                  id={`study-plan-day-tab-${idx}`}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {d?.dayName || `Gün ${idx + 1}`}
                    </span>
                    {isDayComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="text-3xs text-slate-500">
                        {doneCount}/{blocks.length}
                      </span>
                    )}
                  </div>
                  <p className="text-3xs text-indigo-300/80 truncate mt-1 font-medium">
                    {d?.focus || 'Çalışma Bloğu'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Current Day Content Card */}
          {currentDay && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in">
              
              {/* Day Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {currentDay.dayName} Görev Listesi
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                      {currentDay.focus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hedef: <strong>{currentDay.targetQuestions} Soru Çözümü</strong> & Konu Tekrarı
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddCustomTask(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Özel Görev Ekle</span>
                  </button>

                  <div className="text-right">
                    <span className="text-2xs text-slate-400 block">Gün İlerlemesi</span>
                    <span className="text-xs font-bold text-emerald-400">
                      %{dayProgressPercent} Tamamlandı
                    </span>
                  </div>
                  <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${dayProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Coach Tip of the Day */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider block">
                    Günün Koçluk Tüyosu:
                  </span>
                  <p className="text-xs text-amber-100/90 leading-relaxed mt-0.5">
                    {currentDay.coachTip}
                  </p>
                </div>
              </div>

              {/* Tasks / Blocks List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-400" />
                  <span>Çalışma Blokları & Saat Çizelgesi</span>
                </h3>

                <div className="space-y-2.5">
                  {(currentDay?.blocks || []).map((block, bIdx) => (
                    <div
                      key={bIdx}
                      id={`study-block-${bIdx}`}
                      onClick={() => toggleTaskCompletion(selectedDayIndex, bIdx)}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                        block.completed
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                          : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            block.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-slate-700 hover:border-indigo-400 bg-slate-900'
                          }`}
                        >
                          {block.completed && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${block.completed ? 'line-through text-slate-500' : 'text-indigo-400'}`}>
                              {block.subject}
                            </span>
                            <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {block.duration}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${block.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {block.task}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-2xs font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {block.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">
              Henüz Bir Haftalık Plan Oluşturulmadı
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hedef puanınıza ve eksik hissettiğiniz derslere göre yapay zekaya 7 günlük program hazırlatın.
            </p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            Hemen Plan Oluştur
          </button>
        </div>
      )}

      {/* Generate Plan Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Yapay Zeka Çalışma Programı Oluşturucu
                </h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Daily hours */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Günde Kaç Saat Çalışabilirsin?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDailyHours(h)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                      dailyHours === h
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {h} Saat
                  </button>
                ))}
              </div>
            </div>

            {/* Weak Subjects Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hangi Derslerde Kendini Eksik Hissediyorsun? (Öncelikli)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {availableSubjects.map((sub) => {
                  const isChecked = weakSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleWeakSubject(sub)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-colors flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{sub}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Score */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hedef Puan / Net
              </label>
              <input
                type="text"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="Örn: 88.5 veya İlk 10.000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                id="confirm-generate-plan-button"
                type="button"
                disabled={isGenerating}
                onClick={() => handleGeneratePlan()}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Plan Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Programı Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Task Modal */}
      {showAddCustomTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>{currentDay?.dayName} Gününe Yeni Görev Ekle</span>
              </h3>
              <button
                onClick={() => setShowAddCustomTask(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomBlock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ders / Konu Başlığı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Geometri / Üçgenler"
                  value={customTaskSubject}
                  onChange={(e) => setCustomTaskSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Yapılacak Görev Açıklaması
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 30 Soru Çözümü & Video Çözüm Analizi"
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Süre
                </label>
                <select
                  value={customTaskDuration}
                  onChange={(e) => setCustomTaskDuration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="30 dk">30 Dakika</option>
                  <option value="45 dk">45 Dakika</option>
                  <option value="60 dk">60 Dakika (1 Saat)</option>
                  <option value="90 dk">90 Dakika</option>
                  <option value="120 dk">120 Dakika (2 Saat)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomTask(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                >
                  Görevi Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
};
