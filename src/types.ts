export type ExamCategory = 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM' | 'YKS_SAYISAL' | 'YKS_ESITAGIRLIK' | 'YKS_SOZEL' | 'YKS_DIL';

export type MainTabCategory = 'HOME' | 'TRAINING' | 'CALENDAR' | 'PROFILE' | 'INSTITUTION';


export interface SubjectTopic {
  id: string;
  name: string;
  weight: 'YÜKSEK' | 'ORTA' | 'DÜŞÜK'; // ÖSYM soru çıkma sıklığı
  isStudied: boolean;
  isPracticeDone: boolean;
  isReviewed: boolean;
  notes?: string;
  /**
   * Çıkmış soru istatistiğine (src/data/examTopicStats.ts) bağlanma anahtarı.
   * Birden fazla konu aynı statKey'i paylaşabilir (ör. alt başlıklar).
   */
  statKey?: string;
}

export interface Subject {
  id: string;
  name: string;
  category: 'TYT' | 'AYT' | 'KPSS_GY' | 'KPSS_GK' | 'KPSS_EGITIM';
  icon: string;
  color: string;
  topics: SubjectTopic[];
  targetQuestionsWeekly: number;
}

export interface SnapSolution {
  id: string;
  timestamp: string;
  imageUrl?: string;
  questionText?: string;
  subject: string;
  topic: string;
  questionSummary: string;
  correctOption: string;
  stepByStepSolution: string[];
  keyConcept: string;
  trapExplanation: string;
  userNotes?: string;
  isMastered: boolean;
  similarPracticeQuestion?: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  };
}

export interface MockExamRecord {
  id: string;
  title: string;
  date: string;
  examType: ExamCategory;
  sections: {
    name: string;
    correct: number;
    wrong: number;
    blank: number;
    net: number;
  }[];
  totalNet: number;
  estimatedScore?: number;
  notes?: string;
}

export interface StudyPlanBlock {
  time: string;
  subject: string;
  task: string;
  duration: string;
  completed?: boolean;
}

export interface StudyPlanDay {
  dayName: string;
  focus: string;
  targetQuestions: number;
  blocks: StudyPlanBlock[];
  coachTip: string;
}

export interface WeeklyStudyPlan {
  planTitle: string;
  overview: string;
  createdAt: string;
  days: StudyPlanDay[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Flashcard {
  id: string;
  category: string;
  front: string;
  back: string;
  tag: string;
  isLearned?: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'streak' | 'questions' | 'focus' | 'mock' | 'mastery';
  icon: string;
  description: string;
  statusTitle: string;
  requirementText: string;
  isUnlocked: boolean;
  progress: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlockedAt?: string;
}

export interface DailyTaskItem {
  id: string;
  title: string;
  category: 'question' | 'topic' | 'mock' | 'review' | 'pomodoro' | 'custom';
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  targetCount?: number;
  completedAt?: string;
  linkTab?: string;
  linkCategory?: MainTabCategory;
}

export interface UserProfile {
  name: string;
  targetExam: ExamCategory;
  targetScore: string;
  targetMajorOrTitle: string;
  examDate: string;
  dailyStudyHourTarget: number;
  dailyQuestionTarget: number;
  todayQuestionsSolved: number;
  todayMinutesStudied: number;
  streakDays: number;
  maxStreakDays?: number;
  lastActiveDate: string;
  lastLoginDate?: string;
  loginDates?: string[];
  /**
   * Seri dondurma / telafi hakkı (Tur 2). Bir gün kaçırıldığında seriyi
   * sıfırlamak yerine otomatik bir telafi hakkı harcanır. Hak ayda 2'dir ve her
   * ay başında yenilenir.
   */
  streakFreezesRemaining?: number;
  /** Telafi sayacının geçerli olduğu ay (`YYYY-MM`). Ay değişince hak yenilenir. */
  streakFreezeMonth?: string;
  /** Telafi ile kurtarılan günler (`YYYY-MM-DD`) — ısı haritasında işaretlenir. */
  streakFreezeUsedDates?: string[];
  activeTitle?: string;
  unlockedBadges?: string[];
  classGroupId?: string;
  /** İlk açılış kurulum akışı tamamlandı mı (Faz 9.5). */
  onboarded?: boolean;
}

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  dayLabel: string; // 'Pzt', 'Sal', 'Çar', etc.
  fullDayName: string; // 'Pazartesi', etc.
  questionsSolved: number;
  questionTarget: number;
  minutesStudied: number;
  minuteTarget: number;
  isStreakMaintained: boolean;
  completionRate: number; // 0 - 100%
  focusScore: number; // 0 - 100
}

/** İstikrar ısı haritası (GitHub tarzı) için tek gün. */
export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  questionsSolved: number;
  minutesStudied: number;
  /** 0 (boş) – 4 (hedefin üstü) arası yoğunluk seviyesi. */
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
  /** Telafi hakkıyla kurtarılan gün. */
  frozen: boolean;
  /** O gün en az bir aktivite kaydı veya giriş var mı. */
  active: boolean;
}

export interface WeeklyStreakSummary {
  weeklyConsistencyPercent: number;
  totalQuestionsThisWeek: number;
  totalMinutesThisWeek: number;
  activeDaysCount: number;
  bestStreakDays: number;
  currentStreakDays: number;
  streakStatus: 'CRITICAL' | 'STABLE' | 'BURNING' | 'LEGENDARY';
  coachingFeedback: string;
}

// ----------------------------------------------------
// DERSHANE & KURUM YÖNETİM MODÜLÜ TİPLERİ
// ----------------------------------------------------

export interface InstitutionPlanItem {
  id: string;
  studentQuota: number;
  monthlyPrice: number;
  annualPricePerMonth: number;
  isPopular?: boolean;
  isEnterpriseAnnual?: boolean;
  features: string[];
}

export interface InstitutionAccount {
  id: string;
  /** Firebase uid of the institution owner (creator). */
  ownerUid: string;
  /** Firebase uids allowed into this institution's portal. */
  memberUids: string[];
  /** Google e-mail of the owner, for display only. */
  ownerEmail: string;
  name: string;
  branch: string;
  directorName: string;
  phone: string;
  logoText: string;
  themeColor: string;
  config: InstitutionConfig;
  classGroups: ClassGroup[];
  students: StudentRecord[];
  institutionExams: InstitutionExam[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface InstitutionConfig {
  name: string;
  branch: string;
  slogan: string;
  logoText: string;
  themeColor: string; // e.g. '#4f46e5' or 'indigo'
  directorName: string;
  phone: string;
  announcement: string;
  customExamWeights: boolean;
  activePlanId?: string; // e.g. 'plan-annual-enterprise' | 'plan-50'
  studentQuota?: number;
  planBillingCycle?: 'MONTHLY' | 'ANNUAL';
  planExpiryDate?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  examType: ExamCategory;
  coachTeacher: string;
  roomNumber: string;
  targetScoreAverage: string;
}

export interface StudentRecord {
  id: string;
  studentNumber: string;
  name: string;
  classGroupId: string;
  targetExam: ExamCategory;
  targetScore: string;
  phone: string;
  attendancePercent: number;
  totalQuestionsSolved: number;
  averageNet: number;
  latestMockNet: number;
  latestMockTitle: string;
  errorCount: number;
  weakSubjects: string[];
  coachNotes?: string;
  status: 'HIGH' | 'STABLE' | 'NEEDS_ATTENTION';
  joinedDate: string;
  /** Consecutive active-study-day streak (optional; used by leaderboard sorting). */
  streakDays?: number;
}

export interface InstitutionExam {
  id: string;
  title: string;
  examType: ExamCategory;
  classGroupId: string; // or 'ALL'
  date: string;
  participantCount: number;
  averageNet: number;
  highestNet: number;
  lowestNet: number;
  sectionAverages: {
    name: string;
    avgNet: number;
    targetNet: number;
    successRate: number; // 0-100%
  }[];
  weakTopics: string[];
}

export interface ClassAnalysisReport {
  overview: string;
  strengths: string[];
  topDeficientTopics: {
    subject: string;
    topic: string;
    failRate: number;
    recommendedAction: string;
  }[];
  highPerformers: string[];
  needsAttentionStudents: string[];
  institutionalActionPlan: string[];
}

export interface DeficientTopicItem {
  subject: string;
  topicName: string;
  priority: 'KRİTİK' | 'YÜKSEK' | 'ORTA' | string;
  reason: string;
  quickFixTip: string;
}

export interface MockExamAnalysisReport {
  analysisSummary: string;
  scoreAssessment: string;
  weakSections: {
    sectionName: string;
    netLoss: string;
    diagnosis: string;
    recommendedWeeklyHours: number;
  }[];
  criticalDeficientTopics: DeficientTopicItem[];
  timeAndStrategyAdvice: string;
  actionPlanSteps: string[];
}

// ----------------------------------------------------
// AKILLI HATA DEFTERİ & LEITNER SİSTEMİ
// ----------------------------------------------------

export type LeitnerStage = 1 | 2 | 3 | 4 | 5; // 1: 1 Gün, 2: 3 Gün, 3: 1 Hafta, 4: 1 Ay, 5: Tamamlandı (Kalıcı Bellek)

export interface MistakeQuestionItem {
  id: string;
  title: string;
  subject: string;
  topic: string;
  examType: ExamCategory;
  imageUrl?: string;
  questionText?: string;
  correctAnswer?: string;
  userWrongAnswer?: string;
  aiExplanation?: string;
  leitnerStage: LeitnerStage;
  nextReviewDate: string; // ISO date string
  lastReviewedDate?: string;
  reviewCount: number;
  successCount: number;
  tags: string[];
  createdAt: string;
}

export interface TwinQuestion {
  id: string;
  questionText: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  hint: string;
  solution: string;
}

// ----------------------------------------------------
// HEDEF SİMÜLATÖRÜ (YKS & KPSS KADRO / ÜNİVERSİTE)
// ----------------------------------------------------

export interface TargetPreset {
  id: string;
  category: 'KPSS' | 'YKS';
  title: string; // e.g. "Hacettepe Üniversitesi - Tıp Fakültesi" veya "Gelir Uzman Yardımcılığı (GUY)"
  subTitle: string; // e.g. "Sayısal İlk 1.000" veya "KPSS Lisans P3: 86+"
  requiredScore: number;
  requiredNets: {
    section: string;
    targetNet: number;
  }[];
  quotaOrInfo: string;
  careerOutlook: string;
}

export interface TargetSimulationResult {
  matchPercentage: number;
  scoreDifference: number;
  netDifferences: {
    section: string;
    currentNet: number;
    targetNet: number;
    diff: number;
  }[];
  aiAdvice: string;
  criticalFocusAreas: string[];
}

// ----------------------------------------------------
// PARAGRAF & PROBLEM HIZ SAYACI (WPM)
// ----------------------------------------------------

export interface SpeedTrainingSession {
  id: string;
  date: string;
  type: 'PARAGRAPH' | 'MATH_PROBLEM';
  textTitle: string;
  wordCount: number;
  durationSeconds: number;
  wpm: number; // Words Per Minute
  comprehensionScorePercent: number;
  timePerQuestionSeconds: number;
  feedback: string;
}

// ----------------------------------------------------
// SORU DÜELLOSU & LİDER TABLOSU
// ----------------------------------------------------

export interface DuelQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  timeLimitSeconds: number;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  questionsSolvedThisWeek: number;
  league: 'ELMAS' | 'ALTIN' | 'GÜMÜŞ' | 'BRONZ';
  rank: number;
  isCurrentUser?: boolean;
}

// ----------------------------------------------------
// BİREBİR KOÇLUK RANDEVU & GÖRÜŞME NOTLARI
// ----------------------------------------------------

export interface CoachingSessionNote {
  id: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  date: string;
  durationMinutes: number;
  agendaTopic: string;
  studentMood: 'Çok Yüksek' | 'Motive' | 'Kaygılı' | 'Yorgun';
  discussionNotes: string;
  actionItems: string[];
  targetQuestionCommitment: number;
  nextAppointmentDate: string;
}

// ----------------------------------------------------
// DEFTER NOTLARI (el yazısı ders notları modülü)
// ----------------------------------------------------

/** Küratörlü (ekip tarafından hazırlanan) bir not sayfası. */
export interface LectureNotePage {
  /** public/ altındaki statik görsel yolu, ör. "/lecture-notes/tyt-matematik/problemler-01.webp" */
  src: string;
  caption?: string;
}

/** Bir konuya ait küratörlü not seti. */
export interface LectureNoteTopic {
  /** curriculumData'daki SubjectTopic.id ile eşleşir (konu ↔ not bağı). */
  topicId: string;
  title: string;
  pages: LectureNotePage[];
}

/** Bir derse ait küratörlü notlar. */
export interface LectureNoteSubject {
  /** curriculumData'daki Subject.id ile eşleşir. */
  subjectId: string;
  label: string;
  section: 'TYT' | 'AYT';
  topics: LectureNoteTopic[];
}

/** Öğrencinin kendi eklediği not sayfası. Görsel Blob'u IndexedDB'de tutulur. */
export interface UserNote {
  id: string;
  subjectId: string;
  topicId?: string;
  title: string;
  tags: string[];
  /** IndexedDB'deki blob kayıt anahtarları (sayfa sırası). */
  imageKeys: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Bir not sayfası/setinin okuma durumu. Anahtar:
 *  - küratörlü: `lecture:${topicId}` veya `lecture:${topicId}#${pageIndex}`
 *  - öğrenci notu: `user:${noteId}`
 */
export interface NoteProgress {
  read?: boolean;
  needsReview?: boolean;
  lastViewedAt?: string;
}
