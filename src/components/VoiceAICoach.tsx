import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Sparkles, Play, Square, Flame, HeartHandshake, Zap, Bot } from 'lucide-react';
import { ExamCategory } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';

export interface StudentStatsInterface {
  totalQuestionsSolved: number;
  totalStudyHours: number;
  averageNet: number;
  successRate: number;
}

interface VoiceAICoachProps {
  examType: ExamCategory;
  stats: StudentStatsInterface;
}

export const VoiceAICoach: React.FC<VoiceAICoachProps> = ({
  examType,
  stats,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<'MORNING' | 'MOTIVATION' | 'ANXIETY' | 'CUSTOM'>('MORNING');
  const [spokenText, setSpokenText] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1.0);

  const examInfo = EXAM_METADATA[examType] || EXAM_METADATA.KPSS_LISANS;

  const defaultBriefings = {
    MORNING: `Günaydın şampiyon! Bugün ${examInfo.name} hazırlığında kritik bir gün. Toplam ${stats.totalQuestionsSolved} soru çözdün ve ${stats.totalStudyHours} saattir bu hedefe odaklandın. Bugün odaklanman gereken ana alan: Matematik Problemler ve Paragraf Hızı. Günlük 100 soru hedefini tamamlamayı ve hata defterindeki yanlışları tekrar etmeyi unutma! Masanın başına geç, derin bir nefes al ve başla.`,
    MOTIVATION: `Yorulduğunu biliyorum ama rakiplerin şu an pes ederken senin masada kalman farkı yaratacak. ${examInfo.targetHint} için verdiğin bu emek asla boşa gitmeyecek. Bir sorunun seni binlerce kişinin önüne geçireceğini hatırla. Şimdi odaklan ve sıradaki soruyu parçala!`,
    ANXIETY: `Gözlerini kapat ve derin bir nefes al. 4 saniye nefes al... 4 saniye tut... ve 6 saniyede yavaşça bırak. Sınav sadece bilgini ölçen bir araç, senin değerini değil. Şu ana kadar yüzlerce saat çalıştın ve zihnin ihtiyacın olan tüm bilgiye sahip. Rahatla ve sadece sıradaki adımı düşün.`,
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const speakText = (text: string) => {
    setErrorMessage(null);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErrorMessage('Tarayıcınız ses sentezleme (Web Speech API) özelliğini desteklemiyor.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = audioSpeed;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsPlaying(false);
      setErrorMessage('Ses oynatma sırasında bir sorun oluştu.');
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handlePlayBriefing = (type: 'MORNING' | 'MOTIVATION' | 'ANXIETY') => {
    handleStopAudio();
    setCurrentTopic(type);
    const text = defaultBriefings[type];
    setSpokenText(text);
    speakText(text);
  };

  const handleAskVoiceCoach = async () => {
    if (!customQuestion.trim()) return;
    handleStopAudio();
    setIsGenerating(true);
    setCurrentTopic('CUSTOM');

    try {
      // Simple generation or smart local fallback
      const generatedAnswer = `Harika bir soru! ${customQuestion} konusunda en kritik nokta istikrardır. Günde 40 dakika bile olsa düzenli paragraf ve branş denemesi çözdüğünde netlerinin 2 hafta içinde sıçradığını göreceksin. Şüpheyi bırak, eyleme geç!`;
      setSpokenText(generatedAnswer);
      speakText(generatedAnswer);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Yapay Zeka Sesli Koç & Günlük Brifing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Snaps Sesli Mentorun Seni Dinliyor
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Güne başlarken sabah brifingini dinle, sınav kaygını yatıştır veya sesli koçuna durumunu sorup anında yönlendirme al.
            </p>
          </div>

          {/* Visual Voice Orb Animation */}
          <div className="relative flex items-center justify-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              isPlaying 
                ? 'bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 scale-110 shadow-2xl shadow-purple-500/50 animate-pulse' 
                : 'bg-slate-800 border-2 border-indigo-500/30'
            }`}>
              {isPlaying ? (
                <Volume2 className="w-10 h-10 text-white animate-bounce" />
              ) : (
                <Mic className="w-10 h-10 text-indigo-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Audio Preset Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => handlePlayBriefing('MORNING')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-2 ${
            currentTopic === 'MORNING' && isPlaying
              ? 'bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">🌅 Günlük Sabah Brifingi</h3>
          <p className="text-xs text-slate-400">Günün hedefleri, net stratejisi ve odak rotası</p>
        </button>

        <button
          onClick={() => handlePlayBriefing('MOTIVATION')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-2 ${
            currentTopic === 'MOTIVATION' && isPlaying
              ? 'bg-purple-600/30 border-purple-500 ring-2 ring-purple-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">⚡ 2 Dk Şok Motivasyon</h3>
          <p className="text-xs text-slate-400">Tükenmişlik ve erteleme krizine karşı anlık ateşleyici</p>
        </button>

        <button
          onClick={() => handlePlayBriefing('ANXIETY')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-2 ${
            currentTopic === 'ANXIETY' && isPlaying
              ? 'bg-emerald-600/30 border-emerald-500 ring-2 ring-emerald-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">🧘 Sınav Kaygısı & Rahatlama</h3>
          <p className="text-xs text-slate-400">Nefes ritmi ve zihinsel sakinleşme rehberliği</p>
        </button>
      </div>

      {/* Error / Fallback Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-amber-400 hover:text-amber-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Audio Player Card */}
      {spokenText && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200">Seslendirilen Koçluk Mesajı</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Hız:</span>
                {[1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setAudioSpeed(speed);
                      if (isPlaying) {
                        speakText(spokenText);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-2xs font-bold ${
                      audioSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {isPlaying ? (
                <button
                  onClick={handleStopAudio}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Durdur</span>
                </button>
              ) : (
                <button
                  onClick={() => speakText(spokenText)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-900/30"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tekrar Dinle</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed font-sans">
            "{spokenText}"
          </div>

          {/* Equalizer Bars Simulation */}
          {isPlaying && (
            <div className="flex items-center justify-center gap-1.5 h-6">
              {[40, 70, 90, 60, 100, 50, 80, 95, 45, 75, 85, 30].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-full animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Voice Question / Prompt */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-400" />
          <span>Sesli Koça Özel Durumunu Sor</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskVoiceCoach()}
            placeholder="Örn: Tarih çalışırken çabuk unutuyorum ne yapmalıyım?"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            disabled={isGenerating || !customQuestion.trim()}
            onClick={handleAskVoiceCoach}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Koça Sor & Seslendir</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[
            'Son 1 ay kala deneme sıklığı ne olmalı?',
            'Paragraf çözerken odaklanamıyorum',
            'Geometriyi sıfırdan nasıl toparlarım?',
            'KPSS Genel Kültür tekrar taktiği',
          ].map((quickQ, qIdx) => (
            <button
              key={qIdx}
              onClick={() => {
                setCustomQuestion(quickQ);
              }}
              className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-2xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {quickQ}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
