import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Repeat, 
  Layers, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  ArrowRight, 
  HelpCircle, 
  Lightbulb, 
  Brain,
  Calendar,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';
import { MistakeQuestionItem, LeitnerStage, TwinQuestion, UserProfile } from '../types';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';
import { getLocalDateStr } from '../lib/dateUtils';

interface SmartMistakeBankProps {
  profile: UserProfile;
  mistakes: MistakeQuestionItem[];
  onUpdateMistakes: (mistakes: MistakeQuestionItem[]) => void;
  onIncrementQuestionCount?: (count: number) => void;
}

export const SmartMistakeBank: React.FC<SmartMistakeBankProps> = ({
  profile,
  mistakes = [],
  onUpdateMistakes,
  onIncrementQuestionCount,
}) => {
  const safeMistakes = Array.isArray(mistakes) ? mistakes : [];
  const [selectedStage, setSelectedStage] = useState<number | 'ALL'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review Mode State
  const [activeReviewItem, setActiveReviewItem] = useState<MistakeQuestionItem | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Twin Generator State
  const [activeTwinItem, setActiveTwinItem] = useState<MistakeQuestionItem | null>(null);
  const [twinQuestions, setTwinQuestions] = useState<TwinQuestion[]>([]);
  const [isGeneratingTwins, setIsGeneratingTwins] = useState(false);
  const [selectedTwinAnswers, setSelectedTwinAnswers] = useState<Record<string, string>>({});
  const [showTwinHints, setShowTwinHints] = useState<Record<string, boolean>>({});

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Matematik');
  const [newTopic, setNewTopic] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [newUserWrongAnswer, setNewUserWrongAnswer] = useState('');
  const [newAiExplanation, setNewAiExplanation] = useState('');

  const todayStr = getLocalDateStr();

  const dueItems = safeMistakes.filter(
    (m) => m && m.leitnerStage < 5 && (!m.nextReviewDate || m.nextReviewDate <= todayStr)
  );

  const subjects = Array.from(new Set(safeMistakes.map((m) => m?.subject))).filter(Boolean);

  const filteredMistakes = safeMistakes.filter((m) => {
    if (!m) return false;
    if (selectedStage !== 'ALL' && m.leitnerStage !== selectedStage) return false;
    if (selectedSubject !== 'ALL' && m.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.topic && m.topic.toLowerCase().includes(q)) ||
        (m.questionText && m.questionText.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const getStageLabel = (stage: LeitnerStage) => {
    switch (stage) {
      case 1:
        return { label: '1. Kutu (1 Gün Sonra)', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' };
      case 2:
        return { label: '2. Kutu (3 Gün Sonra)', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' };
      case 3:
        return { label: '3. Kutu (1 Hafta Sonra)', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' };
      case 4:
        return { label: '4. Kutu (1 Ay Sonra)', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' };
      case 5:
        return { label: '5. Kutu (Kalıcı Hafıza)', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' };
    }
  };

  const handleAdvanceLeitner = (item: MistakeQuestionItem, success: boolean) => {
    const nextStage: LeitnerStage = success
      ? ((Math.min(item.leitnerStage + 1, 5)) as LeitnerStage)
      : 1;

    let daysToAdd = 1;
    if (nextStage === 2) daysToAdd = 3;
    else if (nextStage === 3) daysToAdd = 7;
    else if (nextStage === 4) daysToAdd = 30;
    else if (nextStage === 5) daysToAdd = 365;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    const updated = mistakes.map((m) => {
      if (m.id === item.id) {
        return {
          ...m,
          leitnerStage: nextStage,
          nextReviewDate: getLocalDateStr(nextDate),
          lastReviewedDate: todayStr,
          reviewCount: m.reviewCount + 1,
          successCount: success ? m.successCount + 1 : m.successCount,
        };
      }
      return m;
    });

    if (success) {
      haptics.success();
    } else {
      haptics.warning();
    }

    onUpdateMistakes(updated);
    if (onIncrementQuestionCount) onIncrementQuestionCount(1);

    // Advance to next due item or close review
    const remainingDue = updated.filter(
      (m) => m.id !== item.id && m.leitnerStage < 5 && (!m.nextReviewDate || m.nextReviewDate <= todayStr)
    );
    if (remainingDue.length > 0) {
      setActiveReviewItem(remainingDue[0]);
      setShowExplanation(false);
    } else {
      setActiveReviewItem(null);
      setShowExplanation(false);
    }
  };

  const handleGenerateTwins = async (item: MistakeQuestionItem) => {
    setActiveTwinItem(item);
    setIsGeneratingTwins(true);
    setTwinQuestions([]);
    setSelectedTwinAnswers({});
    setShowTwinHints({});

    try {
      const data = await apiFetch('/api/snap/generate-twins', {
        subject: item.subject,
        topic: item.topic,
        questionContext: item.questionText || item.title,
        examType: item.examType || profile.targetExam,
      });
      if (data.twins && Array.isArray(data.twins)) {
        setTwinQuestions(data.twins);
      }
    } catch (err) {
      console.error('Twin generate error:', err);
    } finally {
      setIsGeneratingTwins(false);
    }
  };

  const handleAddNewMistake = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: MistakeQuestionItem = {
      id: `mistake-${Date.now()}`,
      title: newTitle || `${newSubject} - ${newTopic || 'Önemli Soru'}`,
      subject: newSubject,
      topic: newTopic || 'Genel Konu',
      examType: profile.targetExam,
      questionText: newQuestionText,
      correctAnswer: newCorrectAnswer,
      userWrongAnswer: newUserWrongAnswer,
      aiExplanation: newAiExplanation || 'Öğrenci tarafından hata defterine kaydedildi.',
      leitnerStage: 1,
      nextReviewDate: todayStr,
      reviewCount: 0,
      successCount: 0,
      tags: [newSubject, newTopic].filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    onUpdateMistakes([newItem, ...mistakes]);
    setShowAddModal(false);
    setNewTitle('');
    setNewTopic('');
    setNewQuestionText('');
    setNewCorrectAnswer('');
    setNewUserWrongAnswer('');
    setNewAiExplanation('');
  };

  const handleDeleteMistake = (id: string) => {
    onUpdateMistakes(mistakes.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5" />
              <span>Aralıklı Tekrar (Spaced Repetition) & Leitner Sistemi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Akıllı Hata Defteri & Benzer Soru Üretici
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Yanlış yaptığın veya çözdürdüğün soruları unutma eğrisine (Leitner 1g, 3g, 1h, 1a) göre tekrar et. Yapay zeka ile aynı mantıkta 3 yeni <span className="text-indigo-400 font-semibold">İkiz Soru</span> üreterek pekiştir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dueItems.length > 0 && (
              <button
                id="start-due-review-button"
                onClick={() => {
                  setActiveReviewItem(dueItems[0]);
                  setShowExplanation(false);
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2 animate-pulse"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Bugünün Tekrarı ({dueItems.length} Soru)</span>
              </button>
            )}
            <button
              id="add-mistake-manual-button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Soru / Not Ekle</span>
            </button>
          </div>
        </div>

        {/* Leitner Box Progress Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          {[1, 2, 3, 4, 5].map((boxNum) => {
            const count = safeMistakes.filter((m) => m && m.leitnerStage === boxNum).length;
            const stageInfo = getStageLabel(boxNum as LeitnerStage);
            const isSelected = selectedStage === boxNum;

            return (
              <button
                key={boxNum}
                onClick={() => setSelectedStage(isSelected ? 'ALL' : (boxNum as LeitnerStage))}
                className={`p-3 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/20 shadow-md ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Kutu {boxNum}</span>
                  <span className="font-bold text-white text-sm">{count}</span>
                </div>
                <div className="text-[11px] font-medium text-slate-300 truncate">
                  {boxNum === 1 ? '1 Gün' : boxNum === 2 ? '3 Gün' : boxNum === 3 ? '1 Hafta' : boxNum === 4 ? '1 Ay' : 'Kalıcı Hafıza'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Soru, ders veya konu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSubject === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tüm Dersler ({safeMistakes.length})
          </button>
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === subj
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {subj} ({safeMistakes.filter((m) => m && m.subject === subj).length})
            </button>
          ))}
        </div>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Henüz Hata Kaydı Bulunmuyor"
          description="Yanlış yaptığın veya tekrar etmek istediğin soruları ekleyerek Leitner aralıklı tekrar kutularıyla hafızana kalıcı olarak kaydedebilirsin."
          actionLabel="+ İlk Hatanı Ekle"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMistakes.map((item) => {
            const stage = getStageLabel(item.leitnerStage);
            const isDue = item.leitnerStage < 5 && (!item.nextReviewDate || item.nextReviewDate <= todayStr);

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold">
                        {item.subject}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${stage.color}`}>
                        {stage.label}
                      </span>
                      {isDue && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Bugün Tekrar Zamanı</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMistake(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Topic */}
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-indigo-400 font-medium">{item.topic}</p>
                  </div>

                  {/* Question snippet or text */}
                  {item.questionText && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 line-clamp-3 font-mono leading-relaxed">
                      {item.questionText}
                    </div>
                  )}

                  {/* Answers summary */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      <span className="font-semibold text-rose-400 block text-[10px]">Senin Yanıtın:</span>
                      <span>{item.userWrongAnswer || 'Hatalı Çözüm'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <span className="font-semibold text-emerald-400 block text-[10px]">Doğru Yanıt:</span>
                      <span>{item.correctAnswer || 'Doğru Çözüm'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleGenerateTwins(item)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Benzer Soru Üret</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveReviewItem(item);
                      setShowExplanation(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Tekrar Kartı Aç</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Mode Modal */}
      {activeReviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold">
                  {activeReviewItem.subject}
                </span>
                <span className="text-xs text-slate-400">{activeReviewItem.topic}</span>
              </div>
              <button
                onClick={() => setActiveReviewItem(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">{activeReviewItem.title}</h3>
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed font-mono">
                {activeReviewItem.questionText || 'Soru metni bulunmuyor (Konu pekiştirme kartı)'}
              </div>

              {!showExplanation ? (
                <button
                  onClick={() => setShowExplanation(true)}
                  className="w-full py-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Çözümü ve Açıklamayı Göster</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-emerald-400">
                    <span>Doğru Cevap: {activeReviewItem.correctAnswer}</span>
                    <span className="text-rose-400">Senin Hatan: {activeReviewItem.userWrongAnswer}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {activeReviewItem.aiExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* Decision Buttons (Leitner Advance / Reset) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleAdvanceLeitner(activeReviewItem, false)}
                className="py-3 rounded-2xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Hatırlayamadım (1. Kutuya Geri Dön)</span>
              </button>

              <button
                onClick={() => handleAdvanceLeitner(activeReviewItem, true)}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Doğru Hatırladım (İlerle)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Twin Question Generator Modal */}
      {activeTwinItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Yapay Zeka İkiz / Benzer Soru Üretici</h3>
                  <p className="text-xs text-slate-400">{activeTwinItem.subject} • {activeTwinItem.topic}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTwinItem(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Kapat
              </button>
            </div>

            {isGeneratingTwins ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-200">ÖSYM Tarzı Benzer Sorular Hazırlanıyor...</p>
                <p className="text-xs text-slate-400">Aynı pedagojik mantıkta 3 yeni soru üretiliyor.</p>
              </div>
            ) : twinQuestions.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-xs text-slate-400">Benzer soru üretilemedi veya bir hata oluştu.</p>
                <button
                  onClick={() => handleGenerateTwins(activeTwinItem)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(twinQuestions || []).map((q, idx) => {
                  const userChoice = selectedTwinAnswers[q.id];
                  const isAnswered = !!userChoice;
                  const isCorrect = userChoice === q.correctAnswer;
                  const isHintOpen = showTwinHints[q.id];

                  return (
                    <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                        <span>Soru {idx + 1} / {(twinQuestions || []).length}</span>
                        <button
                          onClick={() => setShowTwinHints((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>{isHintOpen ? 'İpucunu Gizle' : 'İpucu Gör'}</span>
                        </button>
                      </div>

                      {isHintOpen && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                          💡 <strong>İpucu:</strong> {q.hint}
                        </div>
                      )}

                      <p className="text-xs text-slate-200 leading-relaxed">{q.questionText}</p>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(q?.options || []).map((opt) => {
                          const isThisSelected = userChoice === opt.key;
                          let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800';

                          if (isAnswered) {
                            if (opt.key === q.correctAnswer) {
                              btnStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold';
                            } else if (isThisSelected && !isCorrect) {
                              btnStyle = 'bg-rose-600/20 border-rose-500 text-rose-300 line-through';
                            }
                          }

                          return (
                            <button
                              key={opt.key}
                              disabled={isAnswered}
                              onClick={() => {
                                setSelectedTwinAnswers((prev) => ({ ...prev, [q.id]: opt.key }));
                                if (onIncrementQuestionCount) onIncrementQuestionCount(1);
                              }}
                              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${btnStyle}`}
                            >
                              <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                {opt.key}
                              </span>
                              <span className="truncate">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Solution View */}
                      {isAnswered && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1 animate-in fade-in">
                          <div className="font-bold flex items-center gap-2">
                            {isCorrect ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Tebrikler! Doğru Cevap: {q.correctAnswer}
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1">
                                Yanlış! Doğru Cevap: {q.correctAnswer}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 leading-relaxed">{q.solution}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Mistake Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 shadow-2xl my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Hata Defterine Yeni Soru / Not Ekle</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewMistake} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ders</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Matematik">Matematik</option>
                  <option value="Türkçe">Türkçe / Paragraf</option>
                  <option value="Tarih">Tarih</option>
                  <option value="Coğrafya">Coğrafya</option>
                  <option value="Vatandaşlık">Vatandaşlık</option>
                  <option value="Fizik">Fizik</option>
                  <option value="Kimya">Kimya</option>
                  <option value="Biyoloji">Biyoloji</option>
                  <option value="Eğitim Bilimleri">Eğitim Bilimleri</option>
                  <option value="Alan / ÖABT">Alan / ÖABT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Konu Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Üçgende Benzerlik veya Yazım Kuralları"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Soru Metni / Not</label>
                <textarea
                  rows={3}
                  placeholder="Sorunun metnini veya kaçırdığın kritik bilgiyi yaz..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">Yaptığın Yanlış</label>
                  <input
                    type="text"
                    placeholder="Örn: C şıkkı dedim"
                    value={newUserWrongAnswer}
                    onChange={(e) => setNewUserWrongAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">Doğru Cevap</label>
                  <input
                    type="text"
                    placeholder="Örn: E şıkkı (Formül x2)"
                    value={newCorrectAnswer}
                    onChange={(e) => setNewCorrectAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Açıklama & Püf Nokta</label>
                <textarea
                  rows={2}
                  placeholder="Bu soruyu çözerken unutmaman gereken kural..."
                  value={newAiExplanation}
                  onChange={(e) => setNewAiExplanation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                >
                  Hata Defterine Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
