import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Plus, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Trash2, 
  ArrowUpRight,
  Calculator,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Brain,
  Clock,
  BookOpen,
  ListTodo
} from 'lucide-react';
import { MockExamRecord, UserProfile, ExamCategory, MockExamAnalysisReport, WeeklyStudyPlan } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { apiFetch } from '../lib/apiClient';
import { getLocalDateStr } from '../lib/dateUtils';

interface MockExamTrackerProps {
  profile: UserProfile;
  mockExams: MockExamRecord[];
  onAddMockExam: (exam: MockExamRecord) => void;
  onDeleteMockExam: (id: string) => void;
  onUpdateStudyPlan: (plan: WeeklyStudyPlan) => void;
  onNavigateTab?: (tab: string) => void;
}

export const MockExamTracker: React.FC<MockExamTrackerProps> = ({
  profile,
  mockExams = [],
  onAddMockExam,
  onDeleteMockExam,
  onUpdateStudyPlan,
  onNavigateTab,
}) => {
  const safeMockExams = Array.isArray(mockExams) ? mockExams : [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(() => getLocalDateStr());
  const [notes, setNotes] = useState('');

  // AI Diagnostic states
  const [selectedExamForAnalysis, setSelectedExamForAnalysis] = useState<MockExamRecord | null>(null);
  const [analysisReport, setAnalysisReport] = useState<MockExamAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planUpdatedSuccess, setPlanUpdatedSuccess] = useState(false);

  // Default sections based on exam type
  const isKPSS = profile.targetExam.startsWith('KPSS');
  const defaultSections = isKPSS
    ? [
        { name: 'Türkçe', correct: 25, wrong: 4, blank: 1 },
        { name: 'Matematik', correct: 20, wrong: 3, blank: 7 },
        { name: 'Tarih', correct: 21, wrong: 4, blank: 2 },
        { name: 'Coğrafya', correct: 15, wrong: 2, blank: 1 },
        { name: 'Vatandaşlık & Güncel', correct: 10, wrong: 3, blank: 2 },
      ]
    : [
        { name: 'TYT Türkçe', correct: 32, wrong: 5, blank: 3 },
        { name: 'TYT Sosyal', correct: 16, wrong: 3, blank: 1 },
        { name: 'TYT Matematik', correct: 28, wrong: 4, blank: 8 },
        { name: 'TYT Fen', correct: 14, wrong: 4, blank: 2 },
      ];

  const [formSections, setFormSections] = useState(defaultSections);

  const calculateNet = (correct: number, wrong: number) => {
    const c = Number(correct) || 0;
    const w = Number(wrong) || 0;
    const val = c - w / 4;
    return Math.max(0, Number(isNaN(val) ? 0 : val.toFixed(2)));
  };

  const handleSectionChange = (index: number, field: 'correct' | 'wrong' | 'blank', value: number) => {
    const updated = [...formSections];
    updated[index][field] = Math.max(0, Number(value) || 0);
    setFormSections(updated);
  };

  const rawTotalNet = formSections.reduce(
    (acc, curr) => acc + calculateNet(curr.correct, curr.wrong),
    0
  );
  const totalCalculatedNet = isNaN(rawTotalNet) ? 0 : Number(rawTotalNet.toFixed(2));

  // Approximate Estimated Score based on standard ÖSYM base score
  const estimatedScore = isKPSS
    ? Number((50 + totalCalculatedNet * 0.42).toFixed(2))
    : Number((100 + totalCalculatedNet * 3.33).toFixed(2));

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    const newRecord: MockExamRecord = {
      id: 'mock-' + Date.now(),
      title: examTitle.trim(),
      date: examDate,
      examType: profile.targetExam,
      sections: formSections.map((s) => ({
        ...s,
        net: calculateNet(s.correct, s.wrong),
      })),
      totalNet: Number(totalCalculatedNet.toFixed(2)),
      estimatedScore,
      notes: notes.trim() || undefined,
    };

    onAddMockExam(newRecord);
    setShowAddModal(false);
    setExamTitle('');
    setNotes('');
  };

  // Run AI In-Depth Mock Exam Analysis
  const handleAnalyzeMock = async (exam: MockExamRecord) => {
    setSelectedExamForAnalysis(exam);
    setIsAnalyzing(true);
    setAnalysisReport(null);
    setPlanUpdatedSuccess(false);

    try {
      const data = await apiFetch('/api/coach/analyze-mock-exam', {
        examTitle: exam.title,
        examType: EXAM_METADATA[exam.examType]?.name || exam.examType,
        targetScore: profile.targetScore || '88.5',
        sections: exam.sections,
        totalNet: exam.totalNet,
        estimatedScore: exam.estimatedScore,
        notes: exam.notes,
      });
      setAnalysisReport(data);
    } catch (err) {
      console.error('Failed to analyze mock exam:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate and Auto-Update Weekly Study Plan from Identified Deficiencies
  const handleUpdateStudyPlanFromMock = async () => {
    if (!selectedExamForAnalysis || !analysisReport || !onUpdateStudyPlan) return;
    setIsUpdatingPlan(true);

    try {
      const defTopics = Array.isArray(analysisReport.criticalDeficientTopics)
        ? analysisReport.criticalDeficientTopics
        : [];
      const weakSecs = Array.isArray(analysisReport.weakSections) ? analysisReport.weakSections : [];

      const deficientTopicNames = defTopics.map((t) => `${t?.subject || ''}: ${t?.topicName || ''}`);
      const weakSectionNames = weakSecs.map((w) => w?.sectionName || '');

      const data = await apiFetch('/api/coach/generate-plan-from-mock', {
        examTitle: selectedExamForAnalysis.title,
        examType: EXAM_METADATA[selectedExamForAnalysis.examType]?.name || selectedExamForAnalysis.examType,
        targetScore: profile.targetScore || '88.5',
        dailyHours: profile.dailyStudyHourTarget || 4,
        deficientTopics: deficientTopicNames,
        weakSections: weakSectionNames,
      });
      const updatedPlan: WeeklyStudyPlan = {
        planTitle: data.planTitle || `🎯 ${selectedExamForAnalysis.title} Telafi Programı`,
        overview: data.overview || 'Deneme analizi sonucu tespit edilen eksik konuları kapatma programı',
        createdAt: new Date().toLocaleDateString('tr-TR'),
        days: Array.isArray(data.days) ? data.days : [],
      };

      onUpdateStudyPlan(updatedPlan);
      setPlanUpdatedSuccess(true);
    } catch (err) {
      console.error('Failed to update study plan from mock:', err);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Stats calculation
  const latestExam = safeMockExams[safeMockExams.length - 1];
  const maxNet = safeMockExams.length > 0 ? Math.max(...safeMockExams.map((m) => Number(m?.totalNet) || 0)) : 0;
  const rawAvgNet =
    safeMockExams.length > 0
      ? safeMockExams.reduce((acc, curr) => acc + (Number(curr?.totalNet) || 0), 0) / safeMockExams.length
      : 0;
  const avgNet = isNaN(rawAvgNet) ? '0.0' : rawAvgNet.toFixed(1);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Deneme Sınavı & Net Gelişimi</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            📊 Deneme Takip & AI Eksik Analizi
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Çözdüğün denemeleri kaydet. Yapay zeka ile net kayıplarını ve eksik konuları anında tespit edip çalışma programını tek tıkla otomatik güncelle!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {latestExam && (
            <button
              id="analyze-latest-mock-button"
              onClick={() => handleAnalyzeMock(latestExam)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Son Denemeyi AI ile Analiz Et</span>
            </button>
          )}

          <button
            id="open-add-mock-modal-button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Deneme Ekle</span>
          </button>
        </div>
      </div>

      {/* Quick Score Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Son Deneme Neti
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {latestExam ? `${latestExam.totalNet} Net` : '—'}
            </span>
            {latestExam?.estimatedScore && (
              <span className="text-xs font-bold text-emerald-400">
                (~{latestExam.estimatedScore} Puan)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {latestExam ? latestExam.title : 'Henüz deneme eklenmedi'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            En Yüksek Net (Zirve)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              {maxNet > 0 ? `${maxNet} Net` : '—'}
            </span>
            <span className="text-xs text-slate-400">Rekor</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Hedef: {profile.targetScore} Puan
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Ortalama Net
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400">
              {avgNet} Net
            </span>
            <span className="text-xs text-slate-400">({safeMockExams.length} Deneme)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Gelişim ivmesi stabil
          </p>
        </div>
      </div>

      {/* Mock Exams History Table & Visual Progression */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Kayıtlı Deneme Sınavları ({safeMockExams.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            {EXAM_METADATA[profile.targetExam]?.shortName} Formatı
          </span>
        </div>

        {safeMockExams.length > 0 ? (
          <div className="space-y-4">
            {safeMockExams.map((exam) => (
              <div
                key={exam.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Row Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{exam.title}</span>
                      {exam.estimatedScore && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          ~{exam.estimatedScore} Puan
                        </span>
                      )}
                    </h3>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {exam.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Toplam Net</span>
                      <span className="text-lg font-black text-emerald-400">
                        {exam.totalNet}
                      </span>
                    </div>

                    {/* AI Analyze Button for this specific exam */}
                    <button
                      id={`analyze-mock-${exam.id}`}
                      onClick={() => handleAnalyzeMock(exam)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="AI Eksik Konu Analizi Yap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden sm:inline">AI Eksik Analizi</span>
                      <span className="sm:hidden">Analiz</span>
                    </button>

                    <button
                      onClick={() => onDeleteMockExam(exam.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Denemeyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Section breakdown tags */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-2 border-t border-slate-900">
                  {(exam?.sections || []).map((sec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/60 text-xs space-y-0.5"
                    >
                      <span className="text-slate-400 block truncate font-medium text-[11px]">
                        {sec.name}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">
                          {sec.net} Net
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sec.correct}D {sec.wrong}Y
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {exam.notes && (
                  <p className="text-[11px] text-amber-300/80 italic pt-1 border-t border-slate-900/60">
                    💡 Not: {exam.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Henüz Deneme Kaydı Bulunmuyor"
            description="Çözdüğün branş veya genel deneme sınavlarını kaydederek net artışını izleyebilir, yapay zeka ile eksik analizlerini anında görebilirsin."
            actionLabel="+ İlk Denemeyi Ekle"
            onAction={() => setShowAddModal(true)}
          />
        )}
      </div>

      {/* AI Mock Exam In-Depth Diagnostic Modal */}
      {selectedExamForAnalysis && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      AI Deneme Teşhisi & Eksik Konu Raporu
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedExamForAnalysis.title} • {selectedExamForAnalysis.totalNet} Net (~{selectedExamForAnalysis.estimatedScore} Puan)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedExamForAnalysis(null);
                  setAnalysisReport(null);
                  setPlanUpdatedSuccess(false);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {isAnalyzing ? (
              <div className="py-8 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="w-48 h-4" />
                  <Skeleton className="w-full h-16" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="w-full h-20" />
                  <Skeleton className="w-full h-20" />
                </div>
                <p className="text-xs text-slate-400 text-center pt-2">
                  Yapay zeka deneme net kayıplarını ve eksik alt konuları sakin bir şekilde inceliyor...
                </p>
              </div>
            ) : analysisReport ? (
              <div className="space-y-6">
                
                {/* 1. Summary & Score Target Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Genel Koçluk Teşhisi</span>
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {analysisReport.analysisSummary}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      <span>Hedef Puan Analizi</span>
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {analysisReport.scoreAssessment}
                    </p>
                  </div>
                </div>

                {/* 2. Critical Deficient Topics (Eksik Konular) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Tespit Edilen Kritik Eksik Konular ({(analysisReport.criticalDeficientTopics || []).length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(analysisReport.criticalDeficientTopics || []).map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 space-y-2.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {topic?.subject || 'Genel'}
                            </span>
                            <h5 className="text-xs font-bold text-white mt-0.5">
                              {topic?.topicName || 'Konu'}
                            </h5>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              topic?.priority === 'KRİTİK'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : topic?.priority === 'YÜKSEK'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {topic?.priority || 'ORTA'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                          🔍 <strong>Neden:</strong> {topic?.reason || 'Tekrar gereksinimi'}
                        </p>

                        <div className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30 flex items-start gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span><strong>Telafi İpucu:</strong> {topic?.quickFixTip || 'Odaklı soru çözümü yapınız.'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Weak Sections & Recommended Weekly Hours */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Branş Bazlı Net Kaybı & Önerilen Haftalık Çalışma Saati</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(analysisReport.weakSections || []).map((sec, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{sec?.sectionName || 'Branş'}</span>
                          <span className="text-xs font-extrabold text-rose-400">{sec?.netLoss || 'Net Kaybı'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{sec?.diagnosis || 'Gözlem yapılıyor'}</p>
                        <div className="pt-1 text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                          <span>⏱️ Önerilen Çalışma:</span>
                          <span className="text-white font-black">{sec?.recommendedWeeklyHours || 4} Saat/Hafta</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Strategy & Pacing Advice */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    💡 Sınav Stratejisi & Turlama Tekniği
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {analysisReport.timeAndStrategyAdvice || 'Turlama tekniğini uygulayınız.'}
                  </p>
                </div>

                {/* 5. Highlight Action: Auto-Update Study Plan */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border-2 border-indigo-500/50 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>🎯 Bu Eksiklere Göre Çalışma Programını Otomatik Güncelle</span>
                      </h4>
                      <p className="text-xs text-indigo-200 mt-1">
                        Yapay zeka, tespit edilen {(analysisReport.criticalDeficientTopics || []).length} eksik konuyu önceliklendirerek sana 7 günlük yeni telafi çalışma programı hazırlar.
                      </p>
                    </div>

                    {planUpdatedSuccess ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-3 py-2 rounded-xl border border-emerald-500/40">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Program Güncellendi!</span>
                        </span>
                        {onNavigateTab && (
                          <button
                            onClick={() => {
                              setSelectedExamForAnalysis(null);
                              onNavigateTab('planner');
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                          >
                            <span>Programa Git</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        id="update-plan-from-mock-button"
                        onClick={handleUpdateStudyPlanFromMock}
                        disabled={isUpdatingPlan}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/40 transition-all hover:scale-105 flex-shrink-0 disabled:opacity-50"
                      >
                        {isUpdatingPlan ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Program Hazırlanıyor...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Programımı Güncelle</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : null}

            {/* Footer Close */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedExamForAnalysis(null);
                  setAnalysisReport(null);
                  setPlanUpdatedSuccess(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add Mock Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Yeni Deneme Sınavı & Net Girişi
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deneme Adı / Yayın
                  </label>
                  <input
                    type="text"
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Örn: Pegem Türkiye Geneli Deneme-4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Uygulama Tarihi
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sections Inputs */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Ders Bazında Doğru / Yanlış / Boş Sayıları
                </label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {formSections.map((sec, sIdx) => {
                    const secNet = calculateNet(sec.correct, sec.wrong);
                    return (
                      <div
                        key={sIdx}
                        className="grid grid-cols-12 gap-2 items-center text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800/60"
                      >
                        <span className="col-span-4 font-bold text-slate-200 truncate">
                          {sec.name}
                        </span>

                        <div className="col-span-2">
                          <input
                            type="number"
                            min={0}
                            value={sec.correct}
                            onChange={(e) => handleSectionChange(sIdx, 'correct', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-emerald-400 font-bold"
                            title="Doğru Sayısı"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            min={0}
                            value={sec.wrong}
                            onChange={(e) => handleSectionChange(sIdx, 'wrong', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-rose-400 font-bold"
                            title="Yanlış Sayısı"
                          />
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            min={0}
                            value={sec.blank}
                            onChange={(e) => handleSectionChange(sIdx, 'blank', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center text-xs text-slate-400"
                            title="Boş Sayısı"
                          />
                        </div>

                        <div className="col-span-2 text-right font-mono font-bold text-indigo-400">
                          {secNet} Net
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculated Net Summary Box */}
              <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Hesaplanan Toplam Net</span>
                  <div className="text-xl font-black text-white">
                    {totalCalculatedNet.toFixed(2)} Net
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Tahmini Puan</span>
                  <div className="text-xl font-black text-emerald-400">
                    ~{estimatedScore}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deneme Değerlendirme & Eksik Notları
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hangi derste süreniz yetmedi? Hangi konularda çeldiricilere düştünüz?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  id="confirm-save-mock-button"
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Denemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
