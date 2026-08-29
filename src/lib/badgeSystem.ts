import { UserProfile, MockExamRecord, SnapSolution, AchievementBadge } from '../types';

export const calculateBadges = (
  profile: UserProfile,
  mockExams: MockExamRecord[] = [],
  snaps: SnapSolution[] = []
): { badges: AchievementBadge[]; unlockedCount: number; currentRank: string } => {
  const safeMocks = Array.isArray(mockExams) ? mockExams : [];
  const safeSnaps = Array.isArray(snaps) ? snaps : [];

  const streak = Number(profile?.streakDays) || 0;
  const questionsToday = Number(profile?.todayQuestionsSolved) || 0;
  const minutesToday = Number(profile?.todayMinutesStudied) || 0;
  const targetQuestions = Math.max(1, Number(profile?.dailyQuestionTarget) || 100);
  const targetMinutes = Math.max(1, (Number(profile?.dailyStudyHourTarget) || 4) * 60);
  const masteredErrors = safeSnaps.filter((s) => s && s.isMastered).length;
  const totalMocks = safeMocks.length;

  const rawBadges: AchievementBadge[] = [
    // 1. Streak Badges
    {
      id: 'streak_3',
      title: '3 Günlük Kıvılcım',
      category: 'streak',
      icon: '🔥',
      description: '3 gün kesintisiz çalışma serisi yakala.',
      statusTitle: '🔥 Kıvılcım Adayı',
      requirementText: '3 Günlük Çalışma Serisi',
      currentValue: streak,
      targetValue: 3,
      unit: 'Gün',
      progress: Math.min(100, Math.round((streak / 3) * 100)),
      isUnlocked: streak >= 3,
      tier: 'bronze',
    },
    {
      id: 'streak_7',
      title: 'Haftalık İstikrar',
      category: 'streak',
      icon: '⚡',
      description: 'Tam 7 gün boyunca her gün hedeflerine sadık kal.',
      statusTitle: '⚡ İstikrar Abidesi',
      requirementText: '7 Günlük Çalışma Serisi',
      currentValue: streak,
      targetValue: 7,
      unit: 'Gün',
      progress: Math.min(100, Math.round((streak / 7) * 100)),
      isUnlocked: streak >= 7,
      tier: 'silver',
    },
    {
      id: 'streak_14',
      title: 'Demir İrade',
      category: 'streak',
      icon: '🛡️',
      description: '14 gün aralıksız disiplinle çalışmayı sürdür.',
      statusTitle: '🛡️ Demir İradeli',
      requirementText: '14 Günlük Çalışma Serisi',
      currentValue: streak,
      targetValue: 14,
      unit: 'Gün',
      progress: Math.min(100, Math.round((streak / 14) * 100)),
      isUnlocked: streak >= 14,
      tier: 'gold',
    },
    {
      id: 'streak_30',
      title: 'Sınav Fatihi',
      category: 'streak',
      icon: '👑',
      description: '30 gün kesintisiz çalışma rekoruna ulaş.',
      statusTitle: '👑 Sınav Fatihi',
      requirementText: '30 Günlük Efsane Seri',
      currentValue: streak,
      targetValue: 30,
      unit: 'Gün',
      progress: Math.min(100, Math.round((streak / 30) * 100)),
      isUnlocked: streak >= 30,
      tier: 'diamond',
    },

    // 2. Daily Goal & Questions Badges
    {
      id: 'daily_goal_double',
      title: 'Günlük Çift Halka',
      category: 'focus',
      icon: '🎯',
      description: 'Günün hem soru hem de süre hedefini %100 tamamla.',
      statusTitle: '🎯 Disiplin Ustası',
      requirementText: 'Günlük Soru ve Süre Hedefini Kapat',
      currentValue: Math.min(questionsToday >= targetQuestions ? 1 : 0, minutesToday >= targetMinutes ? 1 : 0),
      targetValue: 1,
      unit: 'Tamamlandı',
      progress: questionsToday >= targetQuestions && minutesToday >= targetMinutes ? 100 : Math.round(((questionsToday / targetQuestions + minutesToday / targetMinutes) / 2) * 100),
      isUnlocked: questionsToday >= targetQuestions && minutesToday >= targetMinutes,
      tier: 'silver',
    },
    {
      id: 'questions_100',
      title: '100 Soru Barajı',
      category: 'questions',
      icon: '🏹',
      description: 'Tek bir günde en az 100 soru çöz.',
      statusTitle: '🏹 Soru Avcısı',
      requirementText: 'Günde 100 Soru',
      currentValue: questionsToday,
      targetValue: 100,
      unit: 'Soru',
      progress: Math.min(100, Math.round((questionsToday / 100) * 100)),
      isUnlocked: questionsToday >= 100,
      tier: 'bronze',
    },
    {
      id: 'questions_250',
      title: 'Soru Canavarı',
      category: 'questions',
      icon: '🚀',
      description: 'Günde 250 soru çözerek rekor kır.',
      statusTitle: '🚀 Soru Canavarı',
      requirementText: 'Günde 250 Soru',
      currentValue: questionsToday,
      targetValue: 250,
      unit: 'Soru',
      progress: Math.min(100, Math.round((questionsToday / 250) * 100)),
      isUnlocked: questionsToday >= 250,
      tier: 'gold',
    },

    // 3. Focus & Time Badges
    {
      id: 'focus_120',
      title: 'Derin Odaklanma',
      category: 'focus',
      icon: '🧘',
      description: 'Bugün en az 120 dakika (2 saat) net ders çalış.',
      statusTitle: '🧘 Odak Ustası',
      requirementText: 'Günde 120 Dk Çalışma',
      currentValue: minutesToday,
      targetValue: 120,
      unit: 'Dk',
      progress: Math.min(100, Math.round((minutesToday / 120) * 100)),
      isUnlocked: minutesToday >= 120,
      tier: 'bronze',
    },
    {
      id: 'focus_240',
      title: 'Maraton Koşucusu',
      category: 'focus',
      icon: '⏱️',
      description: 'Bugün 240 dakika (4 saat) ders çalışma süresine ulaş.',
      statusTitle: '⏱️ Zaman Bükücü',
      requirementText: 'Günde 240 Dk Çalışma',
      currentValue: minutesToday,
      targetValue: 240,
      unit: 'Dk',
      progress: Math.min(100, Math.round((minutesToday / 240) * 100)),
      isUnlocked: minutesToday >= 240,
      tier: 'gold',
    },

    // 4. Mastery & Mock Exam Badges
    {
      id: 'mastery_5',
      title: 'Hata Fatihi',
      category: 'mastery',
      icon: '🧠',
      description: 'Akıllı Hata Bankasında 5 yanlış soruyu kavrayıp mastered yap.',
      statusTitle: '🧠 Kavrama Ustası',
      requirementText: '5 Hatalı Soruyu Öğren',
      currentValue: masteredErrors,
      targetValue: 5,
      unit: 'Soru',
      progress: Math.min(100, Math.round((masteredErrors / 5) * 100)),
      isUnlocked: masteredErrors >= 5,
      tier: 'silver',
    },
    {
      id: 'mock_3',
      title: 'Deneme Stratejisti',
      category: 'mock',
      icon: '📊',
      description: 'En az 3 deneme sınavı kaydet ve net analizini yap.',
      statusTitle: '📊 Sınav Stratejisti',
      requirementText: '3 Deneme Kaydı',
      currentValue: totalMocks,
      targetValue: 3,
      unit: 'Deneme',
      progress: Math.min(100, Math.round((totalMocks / 3) * 100)),
      isUnlocked: totalMocks >= 3,
      tier: 'silver',
    },
    {
      id: 'rank_champion',
      title: 'ÖSYM Derece Adayı',
      category: 'mastery',
      icon: '🌟',
      description: '7 günlük seri, 3 deneme ve 100+ soru çözerek derece yoluna gir.',
      statusTitle: '🌟 Derece Adayı',
      requirementText: 'İleri Seviye Başarı',
      currentValue: (streak >= 7 ? 1 : 0) + (totalMocks >= 3 ? 1 : 0) + (questionsToday >= 100 ? 1 : 0),
      targetValue: 3,
      unit: 'Kriter',
      progress: Math.round((((streak >= 7 ? 1 : 0) + (totalMocks >= 3 ? 1 : 0) + (questionsToday >= 100 ? 1 : 0)) / 3) * 100),
      isUnlocked: streak >= 7 && totalMocks >= 3 && questionsToday >= 100,
      tier: 'diamond',
    },
  ];

  const unlockedCount = rawBadges.filter((b) => b.isUnlocked).length;

  let currentRank = '🌱 Başlangıç Adayı';
  if (unlockedCount >= 9) currentRank = '💎 Efsanevi Derece Adayı';
  else if (unlockedCount >= 6) currentRank = '👑 Kıdemli Sınav Stratejisti';
  else if (unlockedCount >= 4) currentRank = '⚔️ Disiplinli Savaşçı';
  else if (unlockedCount >= 2) currentRank = '🔥 İstikrarlı Aday';
  else if (unlockedCount >= 1) currentRank = '⚡ Azimli Öğrenci';

  return {
    badges: rawBadges,
    unlockedCount,
    currentRank,
  };
};
