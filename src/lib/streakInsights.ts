import { UserProfile, DailyStudyLog, HeatmapDay } from '../types';

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 300, 365];

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const WEEKDAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export type MomentumTone = 'crit' | 'low' | 'ok' | 'high' | 'peak';

export interface StreakInsights {
  momentum: {
    score: number;
    trend: number; // -100..100 (bu hafta vs önceki eğilim)
    label: string;
    tone: MomentumTone;
  };
  risk: {
    safeToday: boolean;
    goalMet: boolean;
    questionsLeft: number;
    minutesLeft: number;
    hoursUntilMidnight: number;
    message: string;
  };
  record: {
    show: boolean;
    current: number;
    best: number;
    isNewRecord: boolean;
    daysToRecord: number;
    message: string;
  };
  milestone: {
    next: number;
    prev: number;
    progress: number; // 0..1
    daysLeft: number;
    passed: number[];
  };
  rhythm: {
    byWeekday: { label: string; full: string; avg: number }[];
    weakestLabel: string;
    weakestFull: string;
    tip: string;
  } | null;
  comeback: {
    show: boolean;
    awayDays: number;
    message: string;
  };
  freezes: {
    remaining: number;
    total: number;
  };
}

function momentumMeta(score: number): { label: string; tone: MomentumTone } {
  if (score < 25) return { label: 'Yeniden ivmelen', tone: 'crit' };
  if (score < 45) return { label: 'Toparlanma modu', tone: 'low' };
  if (score < 65) return { label: 'İstikrarlı', tone: 'ok' };
  if (score < 85) return { label: 'Güçlü momentum', tone: 'high' };
  return { label: 'Zirvede', tone: 'peak' };
}

export function computeStreakInsights(
  profile: UserProfile,
  weeklyLogs: DailyStudyLog[],
  heatmap: HeatmapDay[]
): StreakInsights {
  const currentStreak = Math.max(0, Number(profile.streakDays) || 0);
  const bestStreak = Math.max(currentStreak, Number(profile.maxStreakDays) || 0);
  const qTarget = Math.max(20, profile.dailyQuestionTarget || 120);
  const mTarget = Math.max(60, (profile.dailyStudyHourTarget || 4) * 60);

  // ---- Momentum ----
  const days = weeklyLogs.length || 1;
  const activeDays = weeklyLogs.filter((l) => l.isStreakMaintained).length;
  const consistency = (activeDays / days) * 40; // 0..40
  const avgCompletion = weeklyLogs.reduce((s, l) => s + l.completionRate, 0) / days;
  const goalPart = Math.min(35, (avgCompletion / 100) * 35); // 0..35
  const streakPart = Math.min(25, (currentStreak / 14) * 25); // 0..25
  const momentumScore = Math.round(Math.min(100, consistency + goalPart + streakPart));

  const recent = weeklyLogs.slice(-3);
  const earlier = weeklyLogs.slice(0, Math.max(1, weeklyLogs.length - 3));
  const recentAvg = recent.reduce((s, l) => s + l.completionRate, 0) / Math.max(1, recent.length);
  const earlierAvg = earlier.reduce((s, l) => s + l.completionRate, 0) / Math.max(1, earlier.length);
  const trend = Math.round(recentAvg - earlierAvg);

  const mMeta = momentumMeta(momentumScore);

  // ---- Bugünün risk / kayıp-kaçınma durumu ----
  const todayLog = weeklyLogs[weeklyLogs.length - 1];
  const qSolved = todayLog?.questionsSolved ?? profile.todayQuestionsSolved ?? 0;
  const mStudied = todayLog?.minutesStudied ?? profile.todayMinutesStudied ?? 0;
  const questionsLeft = Math.max(0, qTarget - qSolved);
  const minutesLeft = Math.max(0, mTarget - mStudied);
  // Hedefin %60'ı bugünü "korundu" saymak için yeterli (esnek eşik).
  const goalMet = qSolved >= qTarget * 0.6 || mStudied >= mTarget * 0.6;

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = Math.max(0, (midnight.getTime() - now.getTime()) / 3_600_000);
  const hLeft = Math.floor(hoursUntilMidnight);
  const mLeft = Math.round((hoursUntilMidnight - hLeft) * 60);

  const hasStreakToLose = currentStreak >= 2;
  const safeToday = goalMet || !hasStreakToLose;

  let riskMessage: string;
  if (goalMet) {
    riskMessage = hasStreakToLose
      ? `Bugünkü çalışman serini güvene aldı. ${currentStreak} gün oldu — yarın da buradasın.`
      : 'Bugünkü hedefini tuttun. Birkaç gün üst üste gelince seri başlayacak.';
  } else if (!hasStreakToLose) {
    riskMessage = `Bugün en az ${Math.min(questionsLeft, 20)} soru çöz — küçük başla, zincir kurulsun.`;
  } else {
    const timeStr = hLeft > 0 ? `${hLeft} sa ${mLeft} dk` : `${mLeft} dk`;
    riskMessage = `${currentStreak} günlük serini korumak için bugün ${questionsLeft} soru daha çöz. Gün bitmesine ${timeStr}.`;
  }

  // ---- Rekora oynama ----
  const recordShow = bestStreak >= 2;
  const isNewRecord = currentStreak > 0 && currentStreak >= bestStreak;
  const daysToRecord = Math.max(0, bestStreak - currentStreak + 1);
  let recordMessage = '';
  if (isNewRecord) {
    recordMessage = `Şu an tüm zamanların rekorundasın — ${currentStreak} gün. Zinciri uzatmaya devam!`;
  } else if (recordShow) {
    recordMessage = `Kişisel rekorun ${bestStreak} gün. ${daysToRecord} gün daha dayan, rekoru kır 🔥`;
  }

  // ---- Kilometre taşı ----
  const nextMilestone = STREAK_MILESTONES.find((m) => m > currentStreak) ?? (currentStreak + 30);
  const prevMilestone = [...STREAK_MILESTONES].reverse().find((m) => m <= currentStreak) ?? 0;
  const span = Math.max(1, nextMilestone - prevMilestone);
  const milestoneProgress = Math.min(1, Math.max(0, (currentStreak - prevMilestone) / span));
  const passed = STREAK_MILESTONES.filter((m) => m <= currentStreak);

  // ---- Haftanın ritmi (ısı haritasından) ----
  let rhythm: StreakInsights['rhythm'] = null;
  const firstActiveIdx = heatmap.findIndex((c) => c.active);
  const activeWindow = firstActiveIdx >= 0 ? heatmap.slice(firstActiveIdx) : [];
  const scored = activeWindow.filter((c) => !c.isFuture && !c.isToday);
  if (scored.length >= 10) {
    const buckets: { sum: number; n: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    for (const cell of scored) {
      const d = new Date(`${cell.date}T00:00:00`);
      const wd = (d.getDay() + 6) % 7;
      buckets[wd].sum += Math.min(100, cell.level * 25);
      buckets[wd].n += 1;
    }
    const byWeekday = buckets.map((b, i) => ({
      label: WEEKDAY_LABELS[i],
      full: WEEKDAY_FULL[i],
      avg: b.n > 0 ? Math.round(b.sum / b.n) : 0,
      samples: b.n,
    }));
    // "En zayıf gün" yalnızca örneği olan günler arasından seçilir (henüz
    // yaşanmamış bir haftanın günü hep 0 çıkıp yanıltmasın).
    const withData = byWeekday.filter((b) => b.samples > 0);
    const weakest = withData.reduce((min, b) => (b.avg < min.avg ? b : min), withData[0]);
    rhythm = {
      byWeekday: byWeekday.map(({ label, full, avg }) => ({ label, full, avg })),
      weakestLabel: weakest.label,
      weakestFull: weakest.full,
      tip: `${weakest.full} günleri temkin düşüyorsun. O güne küçük ve net bir hedef koy (ör. 20 soru) — kesintisizlik hızdan önemli.`,
    };
  }

  // ---- Dönüş mesajı (yargılamayan) ----
  let comeback: StreakInsights['comeback'] = { show: false, awayDays: 0, message: '' };
  if (currentStreak <= 1) {
    // bugünden geriye ilk aktif günü bul
    let awayDays = 0;
    for (let i = heatmap.length - 2; i >= 0; i--) {
      if (heatmap[i].active) break;
      awayDays += 1;
    }
    const everActive = heatmap.slice(0, -1).some((c) => c.active);
    if (everActive && awayDays >= 1) {
      comeback = {
        show: true,
        awayDays,
        message:
          awayDays === 1
            ? 'Dün ara vermişsin — olur öyle. Bugün 5 soruyla dön, zincir yeniden başlasın.'
            : `${awayDays} gün ara vermişsin, sorun değil. Kaldığın yer değil, bugün önemli — küçük bir hedefle geri dön.`,
      };
    }
  }

  return {
    momentum: { score: momentumScore, trend, label: mMeta.label, tone: mMeta.tone },
    risk: { safeToday, goalMet, questionsLeft, minutesLeft, hoursUntilMidnight, message: riskMessage },
    record: { show: recordShow, current: currentStreak, best: bestStreak, isNewRecord, daysToRecord, message: recordMessage },
    milestone: { next: nextMilestone, prev: prevMilestone, progress: milestoneProgress, daysLeft: Math.max(0, nextMilestone - currentStreak), passed },
    rhythm,
    comeback,
    freezes: {
      remaining: Math.max(0, Math.min(2, Number(profile.streakFreezesRemaining ?? 2))),
      total: 2,
    },
  };
}
