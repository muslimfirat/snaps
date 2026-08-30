import React, { useState, useEffect, useRef } from 'react';
import { Swords, Trophy, Flame, Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DuelQuestion, LeaderboardUser } from '../types';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';

interface QuestionDuelProps {
  profile: UserProfile;
  onIncrementQuestionCount?: (count: number) => void;
}

const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  { id: 'u1', name: 'Zeynep K. (YKS İlk 1000)', avatar: '👩‍🎓', points: 4250, streak: 8, questionsSolvedThisWeek: 840, league: 'ELMAS', rank: 1 },
  { id: 'u2', name: 'Ahmet Y. (KPSS Lisans 90+)', avatar: '👨‍💼', points: 3980, streak: 6, questionsSolvedThisWeek: 790, league: 'ELMAS', rank: 2 },
  { id: 'u3', name: 'Elif D. (Hacettepe Tıp Hedef)', avatar: '🩺', points: 3620, streak: 5, questionsSolvedThisWeek: 710, league: 'ELMAS', rank: 3 },
  { id: 'u4', name: 'Mehmet B. (Gelir Uzm. Adayı)', avatar: '💼', points: 3100, streak: 4, questionsSolvedThisWeek: 620, league: 'ALTIN', rank: 4 },
  { id: 'u5', name: 'Merve S. (ÖABT Öğretmenlik)', avatar: '📚', points: 2840, streak: 3, questionsSolvedThisWeek: 550, league: 'ALTIN', rank: 5 },
  { id: 'u6', name: 'Burak T. (ODTÜ CENG Hedef)', avatar: '💻', points: 2450, streak: 2, questionsSolvedThisWeek: 480, league: 'GÜMÜŞ', rank: 6 },
  { id: 'u7', name: 'Ayşe N. (KPSS Önlisans)', avatar: '🎯', points: 1950, streak: 2, questionsSolvedThisWeek: 390, league: 'BRONZ', rank: 7 },
];

export const QuestionDuel: React.FC<QuestionDuelProps> = ({
  profile,
  onIncrementQuestionCount,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Tarih');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Match State
  const [questions, setQuestions] = useState<DuelQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Score & Multipliers
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  
  // Game Over
  const [isGameOver, setIsGameOver] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(() => {
    const saved = localStorage.getItem('snaps_duel_leaderboard');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_LEADERBOARD;
  });

  const timerRef = useRef<any>(null);

  // Countdown timer
  useEffect(() => {
    if (isPlaying && !isAnswerRevealed && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isAnswerRevealed, isGameOver]);

  const handleStartDuel = async () => {
    setIsLoadingQuestions(true);
    setIsGameOver(false);
    setPlayerScore(0);
    setBotScore(0);
    setStreakCount(0);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);

    try {
      const data = await apiFetch('/api/duel/generate-questions', {
        category: selectedCategory,
        examType: profile?.targetExam || 'KPSS_LISANS',
        difficulty: 'Orta',
      });
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setTimeLeft(data.questions[0].timeLimitSeconds || 20);
        setIsPlaying(true);
        haptics.medium();
      }
    } catch (err) {
      console.error('Duel questions error:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleTimeUp = () => {
    handleAnswerSubmit(-1); // timeout
  };

  const handleAnswerSubmit = (optionIndex: number) => {
    if (isAnswerRevealed) return;

    setSelectedOption(optionIndex);
    setIsAnswerRevealed(true);

    const currentQ = questions[currentQIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    // Bot simulation: 75% chance correct
    const botIsCorrect = Math.random() < 0.75;
    const botEarned = botIsCorrect ? Math.floor(80 + Math.random() * 40) : 0;
    setBotScore((prev) => prev + botEarned);

    if (isCorrect) {
      haptics.success();
      const multiplier = streakCount >= 3 ? 2 : streakCount >= 1 ? 1.5 : 1;
      const speedBonus = Math.floor(timeLeft * 3);
      const earned = Math.floor((100 + speedBonus) * multiplier);
      setPlayerScore((prev) => prev + earned);
      setStreakCount((prev) => prev + 1);
      confetti({ particleCount: 25, spread: 40 });
    } else {
      haptics.error();
      setStreakCount(0);
    }

    if (onIncrementQuestionCount) onIncrementQuestionCount(1);
  };

  const handleNextQuestion = () => {
    haptics.selection();
    const safeQuestions = Array.isArray(questions) ? questions : [];
    if (currentQIndex + 1 < safeQuestions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(safeQuestions[currentQIndex + 1]?.timeLimitSeconds || 20);
    } else {
      // Game ended
      setIsGameOver(true);
      setIsPlaying(false);
      if (playerScore > botScore) {
        haptics.success();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } else {
        haptics.warning();
      }
      // Update leaderboard
      updateLeaderboard(playerScore);
    }
  };

  const updateLeaderboard = (earnedPoints: number) => {
    const userEntry: LeaderboardUser = {
      id: 'current-user',
      name: `${profile?.name || 'Sen'} (Sen)`,
      avatar: '👑',
      points: 2500 + earnedPoints,
      streak: streakCount,
      questionsSolvedThisWeek: (profile?.todayQuestionsSolved || 0) + (questions?.length || 0),
      league: earnedPoints > 600 ? 'ELMAS' : 'ALTIN',
      rank: 3,
      isCurrentUser: true,
    };

    const updated = [userEntry, ...leaderboard.filter((u) => u.id !== 'current-user')].sort(
      (a, b) => b.points - a.points
    ).map((item, idx) => ({ ...item, rank: idx + 1 }));

    setLeaderboard(updated);
    localStorage.setItem('snaps_duel_leaderboard', JSON.stringify(updated));
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <Swords className="w-3.5 h-3.5" />
              <span>Canlı Bilgi Düellosu & Haftalık Ligler</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Soru Düellosu & Lider Tablosu
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              8 soruluk süreli düelloda yapay zeka rakibinle kapış; seri çarpanları (x1.5, x2) topla, haftalık Elmas Ligi’nde zirveye yerleş!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-bold text-slate-300">Seri Çarpanı: <strong className="text-amber-400">{streakCount >= 3 ? 'x2.0' : streakCount >= 1 ? 'x1.5' : 'x1.0'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Duel Arena / Launchpad */}
      {!isPlaying && !isGameOver && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-900/30">
              <Swords className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Düello Başlatmaya Hazır Mısın?</h2>
            <p className="text-xs text-slate-400">
              Her soru için 20 saniyen var. Hızlı ve doğru cevap verdikçe ekstra hız puanı kazanırsın.
            </p>

            <div className="space-y-2 text-left pt-2">
              <label className="block text-xs font-semibold text-slate-300">Ders / Alan Seç:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="Tarih">Tarih (KPSS & YKS)</option>
                <option value="Coğrafya">Coğrafya (KPSS & YKS)</option>
                <option value="Vatandaşlık & Anayasa">Vatandaşlık & Anayasa (KPSS)</option>
                <option value="Türkçe & Paragraf">Türkçe & Paragraf</option>
                <option value="Matematik & Mantık">Matematik & Mantık</option>
                <option value="Genel Kültür & Güncel Bilgiler">Genel Kültür & Güncel Bilgiler</option>
              </select>
            </div>

            <button
              id="start-duel-button"
              disabled={isLoadingQuestions}
              onClick={handleStartDuel}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold shadow-xl shadow-rose-900/40 flex items-center justify-center gap-2 transition-all"
            >
              {isLoadingQuestions ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sorular ve Rakip Hazırlanıyor...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Düelloyu Başlat (8 Soru)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Battle Arena */}
      {isPlaying && currentQ && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
          {/* Top Scoreboard: Player vs AI Bot */}
          <div className="grid grid-cols-3 items-center gap-4 border-b border-slate-800 pb-5">
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span className="text-xs font-bold text-white">{profile.name || 'Sen'}</span>
              </div>
              <div className="text-xl font-extrabold text-indigo-400">{playerScore} Puan</div>
            </div>

            <div className="text-center space-y-1">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border font-mono font-bold text-lg ${
                timeLeft <= 5
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-ping'
                  : timeLeft <= 10
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-slate-950 border-slate-800 text-white'
              }`}>
                {timeLeft}
              </div>
              <div className="text-3xs text-slate-400">Soru {currentQIndex + 1} / {(questions || []).length}</div>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-bold text-white">AI Rakip (ÖSYM Botu)</span>
                <span className="text-lg">🤖</span>
              </div>
              <div className="text-xl font-extrabold text-rose-400">{botScore} Puan</div>
            </div>
          </div>

          {/* Question Text */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-indigo-400 font-bold">
              <span>{currentQ?.category || 'Genel'}</span>
              {streakCount >= 1 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> {streakCount} Seri Kombo!
                </span>
              )}
            </div>
            <p className="text-sm md:text-base font-medium text-slate-100 leading-relaxed">
              {currentQ?.question}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(currentQ?.options || []).map((opt, idx) => {
              const isSelected = selectedOption === idx;
              let style = 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800';

              if (isAnswerRevealed) {
                if (idx === currentQ.correctIndex) {
                  style = 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold';
                } else if (isSelected && idx !== currentQ.correctIndex) {
                  style = 'bg-rose-600/20 border-rose-500 text-rose-300 line-through';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswerRevealed}
                  onClick={() => handleAnswerSubmit(idx)}
                  className={`p-3.5 rounded-2xl border text-left text-xs transition-all flex items-center gap-3 ${style}`}
                >
                  <span className="w-6 h-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Solution & Next Button */}
          {isAnswerRevealed && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
              <div>
                <strong className="text-white block mb-1">Açıklama:</strong>
                <p className="text-slate-300">{currentQ.explanation}</p>
              </div>
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap shadow-lg shadow-rose-900/30"
              >
                {currentQIndex + 1 < (questions || []).length ? 'Sonraki Soru →' : 'Düelloyu Bitir 🏁'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Game Over Modal / Card */}
      {isGameOver && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl shadow-xl">
            {playerScore >= botScore ? '🏆' : '⚔️'}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">
              {playerScore >= botScore ? 'Tebrikler, Düelloyu Kazandın!' : 'Güzel Mücadele, Rakip Kazandı!'}
            </h2>
            <p className="text-xs text-slate-400">
              Senin Puanın: <strong className="text-indigo-400">{playerScore}</strong> • Rakip Puanı: <strong className="text-rose-400">{botScore}</strong>
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleStartDuel}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Yeniden Düello Yap</span>
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Haftalık Türkiye Lider Tablosu</h3>
          </div>
          <span className="text-xs text-slate-400">Her Pazar Sıfırlanır</span>
        </div>

        <div className="divide-y divide-slate-800">
          {leaderboard.map((user) => (
            <div
              key={user.id}
              className={`py-3.5 flex items-center justify-between text-xs px-3 rounded-xl transition-all ${
                user.isCurrentUser ? 'bg-indigo-600/10 border border-indigo-500/30' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${
                  user.rank === 1 ? 'text-amber-400 text-base' : user.rank === 2 ? 'text-slate-300 text-sm' : user.rank === 3 ? 'text-amber-600 text-sm' : 'text-slate-500'
                }`}>
                  #{user.rank}
                </span>
                <span className="text-lg">{user.avatar}</span>
                <div>
                  <span className="font-bold text-white block">{user.name}</span>
                  <span className="text-2xs text-slate-400">{user.questionsSolvedThisWeek} Soru Bu Hafta</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-0.5 rounded-lg text-3xs font-extrabold border ${
                  user.league === 'ELMAS'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : user.league === 'ALTIN'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {user.league} LİGİ
                </span>
                <span className="font-extrabold text-sm text-indigo-400">{user.points} P</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
