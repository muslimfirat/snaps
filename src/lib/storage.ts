import { 
  UserProfile,
  Subject,
  SubjectTopic,
  SnapSolution,
  MockExamRecord, 
  WeeklyStudyPlan, 
  Flashcard, 
  ExamCategory,
  InstitutionConfig,
  ClassGroup,
  StudentRecord,
  InstitutionExam,
  MistakeQuestionItem,
  DailyStudyLog,
  NoteProgress
} from '../types';
import { INITIAL_KPSS_SUBJECTS, INITIAL_YKS_SUBJECTS, INITIAL_SAVED_SNAPS, INITIAL_FLASHCARDS, INITIAL_MISTAKES, EXAM_METADATA, CURRICULUM_VERSION } from '../data/curriculumData';
import { DEFAULT_INSTITUTION_CONFIG, DEFAULT_CLASS_GROUPS, DEFAULT_STUDENTS, DEFAULT_INSTITUTION_EXAMS } from '../data/institutionData';
import { getLocalDateStr, dayDifference } from './dateUtils';

const STORAGE_KEYS = {
  PROFILE: 'snaps_user_profile',
  SUBJECTS: 'snaps_subjects_',
  SNAPS: 'snaps_saved_solutions',
  MISTAKES: 'snaps_leitner_mistakes',
  MOCK_EXAMS: 'snaps_mock_exams',
  STUDY_PLAN: 'snaps_study_plan',
  FLASHCARDS: 'snaps_flashcards',
  INSTITUTION_CONFIG: 'snaps_inst_config',
  INSTITUTION_CLASSES: 'snaps_inst_classes',
  INSTITUTION_STUDENTS: 'snaps_inst_students',
  INSTITUTION_EXAMS: 'snaps_inst_exams',
  DAILY_STUDY_LOGS: 'snaps_daily_study_logs',
  CURRICULUM_VERSION: 'snaps_curriculum_version_',
  NOTE_PROGRESS: 'snaps_note_progress',
};

/**
 * Konu havuzu güncellendiğinde (CURRICULUM_VERSION artınca) çalışır: kayıtlı
 * derslerdeki kullanıcı işaretlerini (isStudied / isPracticeDone / isReviewed /
 * notes) konu id'sine göre yeni havuza taşır. Eşleşmeyen eski konular düşer,
 * yeni konular işaretsiz gelir.
 */
function migrateSubjects(examType: ExamCategory, stored: Subject[]): Subject[] {
  const base = examType.startsWith('KPSS') ? INITIAL_KPSS_SUBJECTS : INITIAL_YKS_SUBJECTS;
  const marks = new Map<string, Pick<SubjectTopic, 'isStudied' | 'isPracticeDone' | 'isReviewed' | 'notes'>>();
  for (const s of Array.isArray(stored) ? stored : []) {
    for (const t of s?.topics || []) {
      if (!t?.id) continue;
      if (t.isStudied || t.isPracticeDone || t.isReviewed || t.notes) {
        marks.set(t.id, {
          isStudied: !!t.isStudied,
          isPracticeDone: !!t.isPracticeDone,
          isReviewed: !!t.isReviewed,
          notes: t.notes,
        });
      }
    }
  }
  return base.map((s) => ({
    ...s,
    topics: s.topics.map((t) => {
      const m = marks.get(t.id);
      return m ? { ...t, ...m } : t;
    }),
  }));
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Sınav Adayı',
  targetExam: 'KPSS_LISANS',
  targetScore: '89.5',
  targetMajorOrTitle: 'Kadro / Hedef Üniversite',
  examDate: EXAM_METADATA.KPSS_LISANS.defaultDate,
  dailyStudyHourTarget: 5,
  dailyQuestionTarget: 150,
  // Kişisel ilerleme SIFIRDAN başlar — sahte "6 günlük seri" göstermek yeni
  // kullanıcıyı yanıltıyordu (Faz 9.5).
  todayQuestionsSolved: 0,
  todayMinutesStudied: 0,
  streakDays: 0,
  maxStreakDays: 0,
  lastActiveDate: getLocalDateStr(),
  lastLoginDate: getLocalDateStr(),
  loginDates: [getLocalDateStr()],
  classGroupId: 'grp-kpss-1',
  onboarded: false,
};

/**
 * Processes daily login streak whenever the user loads the app or active profile.
 * - Same day: Retains current active streak.
 * - Consecutive day (1 day gap): Increments streak by 1 and resets daily study meters.
 * - Missed days (>1 day gap): Resets streak to 1 and starts fresh daily counters.
 */
export function processDailyLoginStreak(rawProfile: UserProfile): { profile: UserProfile; streakUpdated: boolean } {
  const todayStr = getLocalDateStr();
  const lastDate = rawProfile.lastActiveDate || rawProfile.lastLoginDate || '';
  const currentStreak = Number(rawProfile.streakDays) || 0;
  const currentMaxStreak = Number(rawProfile.maxStreakDays) || currentStreak || 1;
  const existingLoginDates = Array.isArray(rawProfile.loginDates) ? rawProfile.loginDates : [];

  // If already logged in today
  if (lastDate === todayStr) {
    const updatedLoginDates = existingLoginDates.includes(todayStr)
      ? existingLoginDates
      : [...existingLoginDates.slice(-29), todayStr];
    
    return {
      profile: {
        ...rawProfile,
        streakDays: Math.max(1, currentStreak),
        maxStreakDays: Math.max(currentMaxStreak, currentStreak, 1),
        lastActiveDate: todayStr,
        lastLoginDate: todayStr,
        loginDates: updatedLoginDates,
      },
      streakUpdated: false,
    };
  }

  // First time tracking or missing date
  if (!lastDate) {
    return {
      profile: {
        ...rawProfile,
        streakDays: Math.max(1, currentStreak || 1),
        maxStreakDays: Math.max(currentMaxStreak, currentStreak || 1),
        lastActiveDate: todayStr,
        lastLoginDate: todayStr,
        loginDates: [todayStr],
      },
      streakUpdated: true,
    };
  }

  const diffDays = dayDifference(lastDate, todayStr);

  if (diffDays === 1) {
    // Consecutive day login: Streak rewarded!
    const newStreak = currentStreak + 1;
    const newMaxStreak = Math.max(currentMaxStreak, newStreak);
    const updatedLoginDates = [...existingLoginDates.slice(-29), todayStr];

    return {
      profile: {
        ...rawProfile,
        streakDays: newStreak,
        maxStreakDays: newMaxStreak,
        lastActiveDate: todayStr,
        lastLoginDate: todayStr,
        loginDates: updatedLoginDates,
        // Reset daily progress for fresh day
        todayQuestionsSolved: 0,
        todayMinutesStudied: 0,
      },
      streakUpdated: true,
    };
  } else if (diffDays > 1) {
    // Streak broken: Reset streak to 1
    const updatedLoginDates = [...existingLoginDates.slice(-29), todayStr];

    return {
      profile: {
        ...rawProfile,
        streakDays: 1,
        maxStreakDays: Math.max(currentMaxStreak, currentStreak, 1),
        lastActiveDate: todayStr,
        lastLoginDate: todayStr,
        loginDates: updatedLoginDates,
        // Reset daily progress for fresh day
        todayQuestionsSolved: 0,
        todayMinutesStudied: 0,
      },
      streakUpdated: true,
    };
  }

  // Fallback
  return {
    profile: {
      ...rawProfile,
      lastActiveDate: todayStr,
      lastLoginDate: todayStr,
    },
    streakUpdated: false,
  };
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const initial = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
    
    // Automatically verify and track daily streak
    const { profile: processedProfile, streakUpdated } = processDailyLoginStreak(initial);
    if (streakUpdated) {
      saveProfile(processedProfile);
    }
    return processedProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile:', e);
  }
}

export function loadSubjects(examType: ExamCategory): Subject[] {
  const base = examType.startsWith('KPSS') ? INITIAL_KPSS_SUBJECTS : INITIAL_YKS_SUBJECTS;
  try {
    const key = STORAGE_KEYS.SUBJECTS + examType;
    const versionKey = STORAGE_KEYS.CURRICULUM_VERSION + examType;
    const raw = localStorage.getItem(key);

    if (!raw) {
      // İlk kez: sürüm damgasını yaz ki sonraki güncellemelerde göç tetiklensin.
      try { localStorage.setItem(versionKey, String(CURRICULUM_VERSION)); } catch { /* kota */ }
      return base;
    }

    const stored = JSON.parse(raw) as Subject[];
    const storedVersion = Number(localStorage.getItem(versionKey) || '1');
    if (storedVersion >= CURRICULUM_VERSION) {
      return stored;
    }

    // Konu havuzu güncellenmiş — kullanıcı işaretlerini taşı.
    const migrated = migrateSubjects(examType, stored);
    try {
      localStorage.setItem(key, JSON.stringify(migrated));
      localStorage.setItem(versionKey, String(CURRICULUM_VERSION));
    } catch { /* kota */ }
    return migrated;
  } catch {
    return base;
  }
}

export function saveSubjects(examType: ExamCategory, subjects: Subject[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS + examType, JSON.stringify(subjects));
    localStorage.setItem(STORAGE_KEYS.CURRICULUM_VERSION + examType, String(CURRICULUM_VERSION));
  } catch (e) {
    console.error('Failed to save subjects:', e);
  }
}

// ── Defter Notları: okuma / tekrar durumu (görseller IndexedDB'de, bkz. noteStore.ts) ──

export function loadNoteProgress(): Record<string, NoteProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTE_PROGRESS);
    return raw ? (JSON.parse(raw) as Record<string, NoteProgress>) : {};
  } catch {
    return {};
  }
}

export function saveNoteProgress(progress: Record<string, NoteProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTE_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save note progress:', e);
  }
}

export function loadSnaps(): SnapSolution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNAPS);
    if (raw) return JSON.parse(raw);
    return INITIAL_SAVED_SNAPS;
  } catch {
    return INITIAL_SAVED_SNAPS;
  }
}

export function saveSnaps(snaps: SnapSolution[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SNAPS, JSON.stringify(snaps));
  } catch (e) {
    console.error('Failed to save snaps:', e);
  }
}

export function loadMistakes(): MistakeQuestionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (raw) return JSON.parse(raw);
    return INITIAL_MISTAKES;
  } catch {
    return INITIAL_MISTAKES;
  }
}

export function saveMistakes(mistakes: MistakeQuestionItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
  } catch (e) {
    console.error('Failed to save mistakes:', e);
  }
}

export function loadMockExams(): MockExamRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOCK_EXAMS);
    if (raw) return JSON.parse(raw);
    // Deneme GEÇMİŞİ kullanıcının kendi verisidir — sahte "geçmiş denemeler +
    // kişisel notlar" göstermek yanıltıcıydı (Faz 9.5). Boş başlar; MockExamTracker
    // kendi EmptyState'iyle ilk kaydı yönlendirir.
    return [];
  } catch {
    return [];
  }
}

export function saveMockExams(exams: MockExamRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOCK_EXAMS, JSON.stringify(exams));
  } catch (e) {
    console.error('Failed to save mock exams:', e);
  }
}

export function loadStudyPlan(): WeeklyStudyPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_PLAN);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function saveStudyPlan(plan: WeeklyStudyPlan): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDY_PLAN, JSON.stringify(plan));
  } catch (e) {
    console.error('Failed to save study plan:', e);
  }
}

export function loadFlashcards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
    if (raw) return JSON.parse(raw);
    return INITIAL_FLASHCARDS;
  } catch {
    return INITIAL_FLASHCARDS;
  }
}

export function saveFlashcards(cards: Flashcard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save flashcards:', e);
  }
}

export function loadInstitutionConfig(): InstitutionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSTITUTION_CONFIG);
    if (raw) return JSON.parse(raw);
    return DEFAULT_INSTITUTION_CONFIG;
  } catch {
    return DEFAULT_INSTITUTION_CONFIG;
  }
}

export function saveInstitutionConfig(config: InstitutionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INSTITUTION_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save institution config:', e);
  }
}

export function loadClassGroups(): ClassGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSTITUTION_CLASSES);
    if (raw) return JSON.parse(raw);
    return DEFAULT_CLASS_GROUPS;
  } catch {
    return DEFAULT_CLASS_GROUPS;
  }
}

export function saveClassGroups(groups: ClassGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INSTITUTION_CLASSES, JSON.stringify(groups));
  } catch (e) {
    console.error('Failed to save class groups:', e);
  }
}

export function loadStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSTITUTION_STUDENTS);
    if (raw) return JSON.parse(raw);
    return DEFAULT_STUDENTS;
  } catch {
    return DEFAULT_STUDENTS;
  }
}

export function saveStudents(students: StudentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INSTITUTION_STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students:', e);
  }
}

export function loadInstitutionExams(): InstitutionExam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSTITUTION_EXAMS);
    if (raw) return JSON.parse(raw);
    return DEFAULT_INSTITUTION_EXAMS;
  } catch {
    return DEFAULT_INSTITUTION_EXAMS;
  }
}

export function saveInstitutionExams(exams: InstitutionExam[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INSTITUTION_EXAMS, JSON.stringify(exams));
  } catch (e) {
    console.error('Failed to save institution exams:', e);
  }
}

/**
 * Builds the 7-day rolling study analytics from real data only:
 * - today's live counters from the active UserProfile,
 * - any explicitly saved {@link DailyStudyLog} entries for the past 6 days.
 * Days with no recorded activity report 0 (no synthetic/demo seeding).
 */
export function loadWeeklyStudyLogs(profile: UserProfile): DailyStudyLog[] {
  const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const fullDayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  
  const questionTarget = Math.max(20, profile.dailyQuestionTarget || 120);
  const minuteTarget = Math.max(60, (profile.dailyStudyHourTarget || 4) * 60);
  const streakDays = Math.max(1, profile.streakDays || 1);
  const loginDates = Array.isArray(profile.loginDates) ? profile.loginDates : [];

  let savedLogsMap: Record<string, Partial<DailyStudyLog>> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STUDY_LOGS);
    if (raw) {
      savedLogsMap = JSON.parse(raw);
    }
  } catch {
    savedLogsMap = {};
  }

  const result: DailyStudyLog[] = [];
  const today = new Date();

  // Generate 7 days ending today
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateStr(d);
    
    // Day of week index (Monday = 0, Sunday = 6)
    const dayOfWeek = (d.getDay() + 6) % 7;
    const dayLabel = dayLabels[dayOfWeek];
    const fullDayName = fullDayNames[dayOfWeek];

    const isToday = i === 0;
    const isWithinActiveStreak = i < streakDays;
    const isLoginRecorded = loginDates.includes(dateStr) || isToday;
    const isActiveStudyDay = isWithinActiveStreak || isLoginRecorded;

    const saved = savedLogsMap[dateStr];

    let questionsSolved: number;
    let minutesStudied: number;

    if (isToday) {
      questionsSolved = Math.max(0, profile.todayQuestionsSolved || 0);
      minutesStudied = Math.max(0, profile.todayMinutesStudied || 0);
    } else if (saved && typeof saved.questionsSolved === 'number') {
      questionsSolved = saved.questionsSolved;
      minutesStudied = saved.minutesStudied || Math.round(saved.questionsSolved * 1.6);
    } else {
      // No recorded activity for this day.
      questionsSolved = 0;
      minutesStudied = 0;
    }

    const questionRatio = Math.min(1.2, questionsSolved / questionTarget);
    const minuteRatio = Math.min(1.2, minutesStudied / minuteTarget);
    const completionRate = Math.min(100, Math.round(((questionRatio + minuteRatio) / 2) * 100));
    const focusScore = Math.min(100, Math.round(Math.min(completionRate, 95) + (isActiveStudyDay ? 5 : 0)));

    result.push({
      date: dateStr,
      dayLabel,
      fullDayName,
      questionsSolved,
      questionTarget,
      minutesStudied,
      minuteTarget,
      isStreakMaintained: isActiveStudyDay && (questionsSolved > 0 || minutesStudied > 0),
      completionRate,
      focusScore,
    });
  }

  return result;
}

export function saveDailyStudyLogs(logs: DailyStudyLog[]): void {
  try {
    const map: Record<string, DailyStudyLog> = {};
    logs.forEach(l => {
      map[l.date] = l;
    });
    localStorage.setItem(STORAGE_KEYS.DAILY_STUDY_LOGS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save daily study logs:', e);
  }
}

export const storage = {
  getProfile: loadProfile,
  saveProfile,
  getSubjects: loadSubjects,
  saveSubjects,
  getSnaps: loadSnaps,
  saveSnaps,
  getMistakes: loadMistakes,
  saveMistakes,
  getMockExams: loadMockExams,
  saveMockExams,
  getStudyPlan: loadStudyPlan,
  saveStudyPlan,
  getFlashcards: loadFlashcards,
  saveFlashcards,
  getInstitutionConfig: loadInstitutionConfig,
  saveInstitutionConfig,
  getClassGroups: loadClassGroups,
  saveClassGroups,
  getStudents: loadStudents,
  saveStudents,
  getInstitutionExams: loadInstitutionExams,
  saveInstitutionExams,
  getWeeklyStudyLogs: loadWeeklyStudyLogs,
  saveDailyStudyLogs,
  getNoteProgress: loadNoteProgress,
  saveNoteProgress,
};
