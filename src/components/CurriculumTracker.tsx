import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Brain, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Check, 
  Flame,
  Award,
  Zap,
  X,
  BookmarkPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Subject, SubjectTopic, UserProfile, Flashcard, MainTabCategory } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';

interface CurriculumTrackerProps {
  profile: UserProfile;
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onIncrementQuestionCount: (count?: number) => void;
  onAddFlashcard?: (card: Flashcard) => void;
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
}

export const CurriculumTracker: React.FC<CurriculumTrackerProps> = ({
  profile,
  subjects = [],
  onUpdateSubjects,
  onIncrementQuestionCount,
  onAddFlashcard,
  onNavigateTab,
}) => {
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(safeSubjects[0]?.id || '');
  const [summaryModalTopic, setSummaryModalTopic] = useState<{ subject: string; topic: string } | null>(null);
  const [topicSummaryData, setTopicSummaryData] = useState<any | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isCardSaved, setIsCardSaved] = useState(false);

  // Quiz Modal State
  const [quizModalTopic, setQuizModalTopic] = useState<{ subject: string; topic: string } | null>(null);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const selectedSubject = safeSubjects.find((s) => s?.id === selectedSubjectId) || safeSubjects[0];

  // Progress calculations
  const totalTopics = safeSubjects.reduce((acc, s) => acc + (s?.topics?.length || 0), 0);
  const studiedTopics = safeSubjects.reduce(
    (acc, s) => acc + (s?.topics ? s.topics.filter((t) => t?.isStudied).length : 0),
    0
  );
  const overallProgress = totalTopics > 0 ? Math.round((studiedTopics / totalTopics) * 100) : 0;

  const toggleTopicStatus = (
    subjectId: string,
    topicId: string,
    field: 'isStudied' | 'isPracticeDone' | 'isReviewed'
  ) => {
    const updated = safeSubjects.map((s) => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        topics: (s.topics || []).map((t) => {
          if (t.id !== topicId) return t;
          return {
            ...t,
            [field]: !t[field],
          };
        }),
      };
    });
    onUpdateSubjects(updated);
  };

  // Fetch AI Topic Summary (Hap Bilgi & Mnemonic)
  const handleOpenSummary = async (subjectName: string, topicName: string) => {
    setSummaryModalTopic({ subject: subjectName, topic: topicName });
    setTopicSummaryData(null);
    setIsSummaryLoading(true);
    setIsCardSaved(false);
    haptics.selection();

    try {
      const data = await apiFetch('/api/coach/topic-summary', {
        subject: subjectName,
        topic: topicName,
        examType: EXAM_METADATA[profile.targetExam]?.name || 'KPSS & YKS',
      });
      setTopicSummaryData(data);
    } catch (err) {
      console.warn('Summary fetch error, using client fallback:', err);
      // Instant rich curated fallback
      setTopicSummaryData({
        subject: subjectName,
        topic: topicName,
        quickSummary: `${topicName}, ${subjectName} dersinde ÖSYM sınav formatında sıklıkla soru gelen temel başlıklardandır.`,
        keyFormulasAndRules: [
          'Kural 1: Soru kökünü dikkatle analiz edin ve verilen temel kavramları not edin.',
          'Kural 2: Doğrudan sonuca gitmek yerine çeldirici seçenekleri eleyerek ilerleyin.',
          'Kural 3: Bu konunun hap bilgilerini 24 saat sonra Bilgi Kartları modülünde tekrar edin.'
        ],
        mnemonicCode: 'ŞİFRELEME: "ANALİZ - ELEME - DOĞRULAMA" kuralı ile hız kazan!',
        frequentQuestionTypes: 'ÖSYM doğrudan bilgiye dayalı ve öncüllü yorum soruları sormaktadır.'
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Save topic summary as a flashcard
  const handleSaveAsFlashcard = () => {
    if (!summaryModalTopic || !topicSummaryData) return;
    haptics.success();
    const newCard: Flashcard = {
      id: 'fc-curr-' + Date.now(),
      category: summaryModalTopic.subject,
      front: `${summaryModalTopic.topic}: ${topicSummaryData.quickSummary || 'Bu konunun ÖSYM için kritik kuralı nedir?'}`,
      back: `${topicSummaryData.mnemonicCode ? `⚡ ${topicSummaryData.mnemonicCode}\n\n` : ''}${(topicSummaryData.keyFormulasAndRules || []).join('\n')}`,
      tag: 'Müfredat',
      isLearned: false,
    };

    if (onAddFlashcard) {
      onAddFlashcard(newCard);
    }
    setIsCardSaved(true);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  // Fetch AI Mini Quiz
  const handleOpenQuiz = async (subjectName: string, topicName: string) => {
    setQuizModalTopic({ subject: subjectName, topic: topicName });
    setQuizData(null);
    setUserQuizAnswers({});
    setShowQuizResults(false);
    setIsQuizLoading(true);

    try {
      const data = await apiFetch('/api/coach/quiz', {
        subject: subjectName,
        topic: topicName,
        examType: EXAM_METADATA[profile.targetExam]?.name,
        count: 3,
      });
      setQuizData(data.questions || []);
    } catch (err) {
      console.error('Quiz error:', err);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleFinishQuiz = () => {
    setShowQuizResults(true);
    onIncrementQuestionCount(3);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>ÖSYM Müfredat & İlerleme Haritası</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            📚 {EXAM_METADATA[profile.targetExam]?.shortName} Konu Takip Çizelgesi
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Tüm konuların durumunu işaretleyin, ÖSYM çıkma sıklıklarını görün ve tek tıkla yapay zekadan hap özet & şifreleme (mnemonic) çıkarın.
          </p>
        </div>

        {/* Total Progress Badge */}
        <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Genel Müfredat İlerlemesi</span>
            <span className="text-xl font-black text-emerald-400">
              %{overallProgress}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {studiedTopics}/{totalTopics} Konu Tamamlandı
            </span>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-900 border-4 border-emerald-500/30 flex items-center justify-center font-bold text-white text-xs">
            %{overallProgress}
          </div>
        </div>
      </div>

      {/* Main Layout: Subjects Sidebar + Topics Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Subjects List (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Dersler & Alanlar
          </h3>
          <div className="space-y-2">
            {safeSubjects.map((sub) => {
              const isSelected = selectedSubject?.id === sub.id;
              const subTopics = Array.isArray(sub?.topics) ? sub.topics : [];
              const subStudiedCount = subTopics.filter((t) => t?.isStudied).length;
              const subPercent = subTopics.length > 0 ? Math.round((subStudiedCount / subTopics.length) * 100) : 0;

              return (
                <button
                  key={sub.id}
                  id={`subject-tab-${sub.id}`}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {sub.name}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{subTopics.length} Konu</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">%{subPercent}</span>
                    </div>
                  </div>

                  <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${subPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Topics Checklist Table (8 Cols) */}
        {selectedSubject && (
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {selectedSubject.name} Konuları
                  </h2>
                  <span className="text-xs text-slate-400">
                    ÖSYM soru ağırlıklarına göre önceliklendirin
                  </span>
                </div>
              </div>

              {/* Topic Rows */}
              <div className="space-y-3">
                {(selectedSubject.topics || []).map((topic) => (
                  <div
                    key={topic.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {topic.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            topic.weight === 'YÜKSEK'
                              ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                              : topic.weight === 'ORTA'
                              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                          title="ÖSYM Sınav Çıkma Ağırlığı"
                        >
                          {topic.weight} AĞIRLIK
                        </span>
                      </div>
                    </div>

                    {/* Status Toggles & AI Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      
                      {/* Konu Çalışıldı */}
                      <button
                        onClick={() => toggleTopicStatus(selectedSubject.id, topic.id, 'isStudied')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          topic.isStudied
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                        title="Konu Anlatımı Çalışıldı"
                      >
                        <Check className="w-3 h-3" />
                        <span>Konu</span>
                      </button>

                      {/* Soru Çözüldü */}
                      <button
                        onClick={() => toggleTopicStatus(selectedSubject.id, topic.id, 'isPracticeDone')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          topic.isPracticeDone
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                        title="Soru Bankası Çözüldü"
                      >
                        <Check className="w-3 h-3" />
                        <span>Soru</span>
                      </button>

                      {/* Tekrar Yapıldı */}
                      <button
                        onClick={() => toggleTopicStatus(selectedSubject.id, topic.id, 'isReviewed')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          topic.isReviewed
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                        title="Aralıklı Tekrar Yapıldı"
                      >
                        <Check className="w-3 h-3" />
                        <span>Tekrar</span>
                      </button>

                      {/* AI Hap Bilgi button */}
                      <button
                        id={`ai-summary-btn-${topic.id}`}
                        onClick={() => handleOpenSummary(selectedSubject.name, topic.name)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Yapay Zeka Hap Bilgi & Şifreleme Çıkar"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Hap Bilgi</span>
                      </button>

                      {/* AI Mini Quiz button */}
                      <button
                        id={`ai-quiz-btn-${topic.id}`}
                        onClick={() => handleOpenQuiz(selectedSubject.name, topic.name)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="3 Soruluk Mini Quiz ile Test Et"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Quiz</span>
                      </button>

                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* AI Topic Summary Modal */}
      {summaryModalTopic && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {summaryModalTopic.topic} Hap Özeti
                  </h3>
                  <span className="text-[11px] text-slate-400">{summaryModalTopic.subject}</span>
                </div>
              </div>
              <button
                onClick={() => setSummaryModalTopic(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {isSummaryLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  ÖSYM formatında hap bilgi ve hafıza şifrelemesi oluşturuluyor...
                </p>
              </div>
            ) : topicSummaryData ? (
              <div className="space-y-4 text-xs">
                {/* Quick Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                    Kilit Sınav Özeti
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {topicSummaryData.quickSummary}
                  </p>
                </div>

                {/* Key Rules and Formulas */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Altın Kurallar & Formüller
                  </span>
                  <div className="space-y-1.5">
                    {topicSummaryData.keyFormulasAndRules?.map((rule: string, rIdx: number) => (
                      <div key={rIdx} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mnemonic Code */}
                {topicSummaryData.mnemonicCode && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      ⚡ Hafıza Şifreleme / Kodlama Tekniği
                    </span>
                    <p className="text-amber-100 font-bold text-xs leading-relaxed">
                      {topicSummaryData.mnemonicCode}
                    </p>
                  </div>
                )}

                {/* Frequent Questions */}
                {topicSummaryData.frequentQuestionTypes && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      ÖSYM Soru Tipi Analizi
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {topicSummaryData.frequentQuestionTypes}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {topicSummaryData && onAddFlashcard && (
                  <button
                    disabled={isCardSaved}
                    onClick={handleSaveAsFlashcard}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isCardSaved
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 hover:scale-105'
                    }`}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{isCardSaved ? 'Kartlara Eklendi ✓' : 'Bilgi Kartı Olarak Kaydet'}</span>
                  </button>
                )}

                {onNavigateTab && (
                  <button
                    onClick={() => {
                      setSummaryModalTopic(null);
                      onNavigateTab('flashcards', 'TRAINING');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Kartları Çalış →
                  </button>
                )}
              </div>

              <button
                onClick={() => setSummaryModalTopic(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Mini Quiz Modal */}
      {quizModalTopic && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {quizModalTopic.topic} Mini Quiz
                  </h3>
                  <span className="text-[11px] text-slate-400">{quizModalTopic.subject} • 3 Soru</span>
                </div>
              </div>
              <button
                onClick={() => setQuizModalTopic(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {isQuizLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  Bu konuya özel 3 adet ÖSYM tipi soru üretiliyor...
                </p>
              </div>
            ) : Array.isArray(quizData) && quizData.length > 0 ? (
              <div className="space-y-6">
                {(quizData || []).map((q, qIdx) => {
                  const selectedOpt = userQuizAnswers[q.id || qIdx];
                  const isAnswered = !!selectedOpt;
                  const isCorrect = selectedOpt === q.correctAnswer;

                  return (
                    <div key={qIdx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {qIdx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-200 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5 pl-8">
                        {(q.options || []).map((opt: string, oIdx: number) => {
                          const letter = (opt || '').trim().charAt(0);
                          const isOptionSelected = selectedOpt === letter;
                          const isOptionCorrect = letter === q.correctAnswer;

                          return (
                            <button
                              key={oIdx}
                              disabled={showQuizResults}
                              onClick={() => setUserQuizAnswers({ ...userQuizAnswers, [q.id || qIdx]: letter })}
                              className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                                showQuizResults
                                  ? isOptionCorrect
                                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                                    : isOptionSelected
                                    ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                                  : isOptionSelected
                                  ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {showQuizResults && (
                        <div className="pl-8 pt-2 border-t border-slate-900 text-xs space-y-1 animate-in fade-in">
                          <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCorrect ? '✓ Doğru Cevap!' : `✗ Yanlış! Doğru Seçenek: ${q.correctAnswer}`}
                          </span>
                          <p className="text-slate-400 text-[11px]">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end gap-3 pt-2">
                  {!showQuizResults ? (
                    <button
                      onClick={handleFinishQuiz}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                    >
                      Testi Tamamla & Sonuçları Gör
                    </button>
                  ) : (
                    <button
                      onClick={() => setQuizModalTopic(null)}
                      className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                    >
                      Kapat
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
