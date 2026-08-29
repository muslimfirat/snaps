import React, { useState, useEffect, useRef } from 'react';
import { 
  Gauge, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  BookOpen, 
  Brain, 
  Zap, 
  Award,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, SpeedTrainingSession } from '../types';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';

interface SpeedTrainerProps {
  profile: UserProfile;
  onIncrementQuestionCount?: (count: number) => void;
}

interface PassageData {
  title: string;
  passage: string;
  wordCount: number;
  idealWpmTarget: number;
  comprehensionQuestions: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const SpeedTrainer: React.FC<SpeedTrainerProps> = ({
  profile,
  onIncrementQuestionCount,
}) => {
  const [trainingType, setTrainingType] = useState<'PARAGRAPH' | 'MATH_PROBLEM'>('PARAGRAPH');
  const [selectedTopic, setSelectedTopic] = useState('Paragrafta Anlam & Felsefe');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [passageData, setPassageData] = useState<PassageData | null>(null);

  // Training execution state
  const [stage, setStage] = useState<'IDLE' | 'READING' | 'QUESTIONS' | 'COMPLETED'>('IDLE');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  // Question answers
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  
  // Results & History
  const [sessionResult, setSessionResult] = useState<SpeedTrainingSession | null>(null);
  const [history, setHistory] = useState<SpeedTrainingSession[]>(() => {
    const saved = localStorage.getItem('snaps_speed_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('snaps_speed_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleFetchPassage = async () => {
    setIsGenerating(true);
    setPassageData(null);
    setStage('IDLE');
    setTimerSeconds(0);
    setTimerActive(false);
    setUserAnswers({});
    setSessionResult(null);

    try {
      const data = await apiFetch('/api/speed-trainer/generate-passage', {
        type: trainingType,
        topic: selectedTopic,
        examType: profile.targetExam,
      });
      if (data.passage) {
        setPassageData(data);
      }
    } catch (err) {
      console.error('Speed trainer fetch error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartReading = () => {
    haptics.medium();
    setStage('READING');
    setTimerSeconds(0);
    setTimerActive(true);
  };

  const handleFinishReading = () => {
    haptics.medium();
    setTimerActive(false);
    setStage('QUESTIONS');
  };

  const handleSubmitQuestions = () => {
    if (!passageData) return;

    const questions = Array.isArray(passageData.comprehensionQuestions) ? passageData.comprehensionQuestions : [];
    let correctCount = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    const totalQ = questions.length || 1;
    const scorePercent = Math.round((correctCount / totalQ) * 100);

    if (scorePercent >= 75) {
      haptics.success();
    } else if (scorePercent >= 50) {
      haptics.medium();
    } else {
      haptics.warning();
    }
    
    // WPM calculation: (Words / Seconds) * 60
    const minutes = Math.max(0.1, timerSeconds / 60);
    const calculatedWpm = Math.round((passageData.wordCount || 100) / minutes);
    const secPerQ = Math.round(timerSeconds / (questions.length || 1));

    let feedbackText = '';
    if (calculatedWpm >= 250 && scorePercent === 100) {
      feedbackText = '🚀 Mükemmel! Yüksek okuma hızı ve %100 kavrama. Sınavda ciddi bir süre avantajı sağlayacaksın!';
      confetti({ particleCount: 70, spread: 60 });
    } else if (calculatedWpm < 150) {
      feedbackText = '⚠️ Okuma hızın biraz düşük. Kelimeleri seslendirmeden (iç ses olmadan) gözle blok blok okumaya çalış.';
    } else if (scorePercent < 60) {
      feedbackText = '⚠️ Hızlı okudun ancak anlama oranında kayıp var. Odaklanmayı hızın önüne koymalısın.';
    } else {
      feedbackText = '👍 Gayet dengeli bir okuma ve anlama performansı. Düzenli günlük 3 metin antrenmanıyla hızını 280+ WPM seviyesine çıkarabilirsin.';
    }

    const session: SpeedTrainingSession = {
      id: `speed-${Date.now()}`,
      date: new Date().toLocaleDateString('tr-TR'),
      type: trainingType,
      textTitle: passageData.title || 'Paragraf',
      wordCount: passageData.wordCount || 100,
      durationSeconds: timerSeconds,
      wpm: calculatedWpm,
      comprehensionScorePercent: scorePercent,
      timePerQuestionSeconds: secPerQ,
      feedback: feedbackText,
    };

    setSessionResult(session);
    setHistory((prev) => [session, ...prev]);
    setStage('COMPLETED');

    if (onIncrementQuestionCount) {
      onIncrementQuestionCount(questions.length);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Gauge className="w-3.5 h-3.5" />
              <span>WPM (Kelime/Dakika) & Problem Ritim Antrenörü</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Paragraf & Problem Hız Sayacı
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              ÖSYM sınavlarında derece yapmanın sırrı süreyi yetiştirmektir. Okuma hızını (WPM), kavrama oranını ve soru başına harcadığın saniyeyi ölç; yapay zeka antrenmanlarıyla hızlan!
            </p>
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setTrainingType('PARAGRAPH');
                setSelectedTopic('Paragrafta Anlam & Edebi Metinler');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                trainingType === 'PARAGRAPH'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📖 Paragraf Hızı
            </button>
            <button
              onClick={() => {
                setTrainingType('MATH_PROBLEM');
                setSelectedTopic('Yeni Nesil Mantık & Sayı Problemleri');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                trainingType === 'MATH_PROBLEM'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🧮 Problem Hızı
            </button>
          </div>
        </div>
      </div>

      {/* Generator Launchpad */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Antrenman Konusu / Teması
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {trainingType === 'PARAGRAPH' ? (
                <>
                  <option value="Paragrafta Anlam & Felsefe">Paragrafta Anlam & Felsefe</option>
                  <option value="Bilim & Teknoloji Makaleleri">Bilim & Teknoloji Makaleleri</option>
                  <option value="Edebiyat & Sanat Eleştirisi">Edebiyat & Sanat Eleştirisi</option>
                  <option value="Tarih & Toplum İncelemesi">Tarih & Toplum İncelemesi</option>
                </>
              ) : (
                <>
                  <option value="Yeni Nesil Sayı & Kesir Problemleri">Yeni Nesil Sayı & Kesir Problemleri</option>
                  <option value="Hız & Hareket Mantık Problemleri">Hız & Hareket Mantık Problemleri</option>
                  <option value="Yüzde & Kar-Zarar Problemleri">Yüzde & Kar-Zarar Problemleri</option>
                  <option value="Mantıksal Akıl Yürütme">Mantıksal Akıl Yürütme</option>
                </>
              )}
            </select>
          </div>

          <button
            id="generate-speed-passage-button"
            disabled={isGenerating}
            onClick={handleFetchPassage}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Metin & Sorular Üretiliyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Yeni Hız Antrenmanı Başlat</span>
              </>
            )}
          </button>
        </div>

        {/* Live Training Arena */}
        {passageData && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{passageData.title}</h3>
                <span className="text-xs text-amber-400 font-medium">
                  {passageData.wordCount} Kelime • İdeal Hedef: ~{passageData.idealWpmTarget} WPM
                </span>
              </div>

              {/* Stopwatch Display */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-lg font-bold text-white">
                    {formatSeconds(timerSeconds)}
                  </span>
                </div>

                {stage === 'IDLE' && (
                  <button
                    onClick={handleStartReading}
                    className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    <Play className="w-4 h-4" />
                    <span>Okumaya Başla</span>
                  </button>
                )}

                {stage === 'READING' && (
                  <button
                    onClick={handleFinishReading}
                    className="px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-900/30 animate-pulse"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Okumayı Bitirdim</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reading View */}
            {stage === 'READING' && (
              <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/30 text-sm md:text-base text-slate-100 leading-relaxed font-sans space-y-4 animate-in fade-in shadow-inner select-none">
                <p className="whitespace-pre-wrap">{passageData.passage}</p>
                <div className="pt-2 text-right">
                  <button
                    onClick={handleFinishReading}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                  >
                    Metni Tamamladım, Sorulara Geç →
                  </button>
                </div>
              </div>
            )}

            {/* Question Stage */}
            {stage === 'QUESTIONS' && (
              <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span className="font-bold text-white">Metni Ne Kadar Anladın? (Kavrama Testi)</span>
                  <span>Okuma Süresi: {timerSeconds} saniye</span>
                </div>

                <div className="space-y-5">
                  {(passageData.comprehensionQuestions || []).map((q, qIdx) => (
                    <div key={q.id || qIdx} className="space-y-3">
                      <p className="text-xs font-bold text-slate-200">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((opt, optIdx) => {
                          const isSelected = userAnswers[q.id] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setUserAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-white shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 text-right">
                  <button
                    disabled={Object.keys(userAnswers).length < (passageData?.comprehensionQuestions || []).length}
                    onClick={handleSubmitQuestions}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-900/30 disabled:opacity-50"
                  >
                    Sonuçlarımı ve WPM Hızımı Hesapla
                  </button>
                </div>
              </div>
            )}

            {/* Results Stage */}
            {stage === 'COMPLETED' && sessionResult && (
              <div className="p-6 rounded-3xl bg-amber-950/30 border border-amber-800/50 space-y-6 animate-in zoom-in-95">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Okuma Hızın (WPM)</span>
                    <span className="text-3xl font-extrabold text-amber-400">{sessionResult.wpm}</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Kelime / Dakika</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Anlama Oranı</span>
                    <span className="text-3xl font-extrabold text-emerald-400">%{sessionResult.comprehensionScorePercent}</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Doğruluk Puanı</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Geçen Süre</span>
                    <span className="text-3xl font-extrabold text-white">{sessionResult.durationSeconds} sn</span>
                    <span className="text-[11px] text-slate-400 block mt-1">Toplam Metin Süresi</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Brain className="w-4 h-4" />
                    <span>Koçluk & Hız Değerlendirmesi:</span>
                  </div>
                  <p className="leading-relaxed">{sessionResult.feedback}</p>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={handleFetchPassage}
                    className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Yeni Bir Paragraf ile Tekrar Dene</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Log */}
      {Array.isArray(history) && history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Geçmiş Hız Antrenmanı Kayıtları ({history.length})
          </h3>

          <div className="divide-y divide-slate-800">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{item.textTitle}</span>
                  <span className="text-slate-400 text-[11px]">{item.date} • {item.wordCount} Kelime</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-amber-400 font-bold">{item.wpm} WPM</span>
                  <span className="text-emerald-400 font-bold">%{item.comprehensionScorePercent} Anlama</span>
                  <span className="text-slate-400">{item.durationSeconds} sn</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
