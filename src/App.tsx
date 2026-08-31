import { useState, useEffect, useRef, lazy, Suspense, type ComponentType } from 'react';
import { Header, CATEGORY_DEFINITIONS } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CommandSearch } from './components/CommandSearch';
import { Dashboard } from './components/Dashboard';
import { ToolsHub } from './components/ToolsHub';
import { Onboarding } from './components/Onboarding';
import { LegalModal } from './components/LegalModal';
import { CoachTour, TOUR_STEPS } from './components/CoachTour';
import { INSTITUTION_ENABLED } from './lib/features';
import { QuickStartModal } from './components/QuickStartModal';
import { StudyInsightsToast } from './components/StudyInsightsToast';
import { ApiErrorToast } from './components/ApiErrorToast';
import { Skeleton } from './components/ui/Skeleton';
import { fetchMyInstitution, syncInstitutionToFirestore } from './lib/institutionStore';

// Rota düzeyi görünümler tembel yüklenir — ilk boyama yalnız Dashboard + kabuk.
// recharts (~410 KB) sadece StreakAnalytics + InstitutionPortal'da → kritik yoldan çıktı.
const named = <T,>(p: Promise<T>, k: keyof T) =>
  p.then((m) => ({ default: m[k] as unknown as ComponentType<any> }));

const SnapSolver = lazy(() => named(import('./components/SnapSolver'), 'SnapSolver'));
const AICoachChat = lazy(() => named(import('./components/AICoachChat'), 'AICoachChat'));
const StudyPlanner = lazy(() => named(import('./components/StudyPlanner'), 'StudyPlanner'));
const MockExamTracker = lazy(() => named(import('./components/MockExamTracker'), 'MockExamTracker'));
const CurriculumTracker = lazy(() => named(import('./components/CurriculumTracker'), 'CurriculumTracker'));
const PomodoroTimer = lazy(() => named(import('./components/PomodoroTimer'), 'PomodoroTimer'));
const QuickFlashcards = lazy(() => named(import('./components/QuickFlashcards'), 'QuickFlashcards'));
const SettingsModal = lazy(() => named(import('./components/SettingsModal'), 'SettingsModal'));
const InstitutionPortal = lazy(() => named(import('./components/InstitutionPortal'), 'InstitutionPortal'));
const SmartMistakeBank = lazy(() => named(import('./components/SmartMistakeBank'), 'SmartMistakeBank'));
const TargetSimulator = lazy(() => named(import('./components/TargetSimulator'), 'TargetSimulator'));
const SpeedTrainer = lazy(() => named(import('./components/SpeedTrainer'), 'SpeedTrainer'));
const QuestionDuel = lazy(() => named(import('./components/QuestionDuel'), 'QuestionDuel'));
const VoiceAICoach = lazy(() => named(import('./components/VoiceAICoach'), 'VoiceAICoach'));
const StreakAnalytics = lazy(() => named(import('./components/StreakAnalytics'), 'StreakAnalytics'));
const LectureNotes = lazy(() => named(import('./components/LectureNotes'), 'LectureNotes'));
const AchievementBadges = lazy(() => named(import('./components/AchievementBadges'), 'AchievementBadges'));
const InstitutionLoginView = lazy(() => named(import('./components/InstitutionLoginView'), 'InstitutionLoginView'));

import { storage } from './lib/storage';
import { watchSystemTheme } from './lib/themeMode';
import { initGlobalHaptics, haptics } from './lib/haptics';
import { useAuth } from './context/AuthContext';
import { UserProfile, SnapSolution, MockExamRecord, PlannedMockExam, WeeklyStudyPlan, Subject, Flashcard, InstitutionConfig, ClassGroup, StudentRecord, InstitutionExam, MistakeQuestionItem, MainTabCategory, InstitutionAccount, NoteProgress } from './types';

const getCategoryForTab = (tab: string): MainTabCategory => {
  if (['institution', 'inst_analysis', 'inst_students', 'inst_optical', 'inst_coaching'].includes(tab)) return 'INSTITUTION';
  if (['dashboard', 'curriculum', 'notes', 'streak', 'analytics', 'achievements'].includes(tab)) return 'HOME';
  if (['tools', 'snap', 'mock', 'mistakes', 'notebook', 'errors', 'pomodoro', 'simulator', 'voice_coach', 'coach', 'speed', 'duel', 'flashcards'].includes(tab)) return 'TRAINING';
  if (['planner', 'calendar'].includes(tab)) return 'CALENDAR';
  if (['settings', 'profile'].includes(tab)) return 'PROFILE';
  return 'HOME';
};

export default function App() {
  const { currentUser, syncCurrentDataToCloud, fetchCloudData } = useAuth();

  // Global Persisted State
  const [profile, setProfile] = useState<UserProfile>(() => storage.getProfile());
  const [activeCategory, setActiveCategory] = useState<MainTabCategory>('HOME');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [snaps, setSnaps] = useState<SnapSolution[]>(() => storage.getSnaps());
  const [mistakes, setMistakes] = useState<MistakeQuestionItem[]>(() => storage.getMistakes());
  const [mockExams, setMockExams] = useState<MockExamRecord[]>(() => storage.getMockExams());
  const [plannedMocks, setPlannedMocks] = useState<PlannedMockExam[]>(() => storage.getPlannedMocks());
  const [studyPlan, setStudyPlan] = useState<WeeklyStudyPlan | null>(() => storage.getStudyPlan());
  const [subjects, setSubjects] = useState<Subject[]>(() => storage.getSubjects(profile.targetExam));
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => storage.getFlashcards());
  const [noteProgress, setNoteProgress] = useState<Record<string, NoteProgress>>(() => storage.getNoteProgress());
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [showTour, setShowTour] = useState(false);

  // İlk açılış: profil hiç kurulmadıysa tam ekran onboarding akışını göster.
  const [isOnboarding, setIsOnboarding] = useState(() => !storage.getProfile().onboarded);

  // Keep the latest local state reachable from the login effect without
  // re-subscribing it on every mutation (the effect only fires on uid change).
  const localStateRef = useRef({ profile, snaps, mistakes, mockExams, plannedMocks, studyPlan, flashcards, subjects });
  localStateRef.current = { profile, snaps, mistakes, mockExams, plannedMocks, studyPlan, flashcards, subjects };

  // Cloud Sync Listener: When user logs in with Google, pull their cloud data or seed their Firestore doc
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    (async () => {
      try {
        const cloudData = await fetchCloudData();
        if (!isMounted) return;

        if (cloudData) {
          // User already has cloud data, restore into local state
          if (cloudData.profile) {
            setProfile(cloudData.profile);
            storage.saveProfile(cloudData.profile);
            if (cloudData.profile.onboarded) {
              setIsOnboarding(false);
            }
            if (cloudData.profile.targetExam) {
              const cloudSubjects = storage.getSubjects(cloudData.profile.targetExam);
              setSubjects(cloudSubjects);
            }
          }
          if (cloudData.snaps) {
            setSnaps(cloudData.snaps);
            storage.saveSnaps(cloudData.snaps);
          }
          if (cloudData.mistakes) {
            setMistakes(cloudData.mistakes);
            storage.saveMistakes(cloudData.mistakes);
          }
          if (cloudData.mockExams) {
            setMockExams(cloudData.mockExams);
            storage.saveMockExams(cloudData.mockExams);
          }
          if (cloudData.plannedMocks) {
            setPlannedMocks(cloudData.plannedMocks);
            storage.savePlannedMocks(cloudData.plannedMocks);
          }
          if (cloudData.studyPlan) {
            setStudyPlan(cloudData.studyPlan);
            storage.saveStudyPlan(cloudData.studyPlan);
          }
          if (cloudData.flashcards) {
            setFlashcards(cloudData.flashcards);
            storage.saveFlashcards(cloudData.flashcards);
          }
          if (cloudData.noteProgress) {
            setNoteProgress(cloudData.noteProgress);
            storage.saveNoteProgress(cloudData.noteProgress);
          }
        } else {
          // New Google User: Seed their initial cloud storage with their current state
          const local = localStateRef.current;
          const updatedProfile = {
            ...local.profile,
            name: currentUser.displayName || local.profile.name,
          };
          setProfile(updatedProfile);
          storage.saveProfile(updatedProfile);

          await syncCurrentDataToCloud({
            profile: updatedProfile,
            snaps: local.snaps,
            mistakes: local.mistakes,
            mockExams: local.mockExams,
            plannedMocks: local.plannedMocks,
            studyPlan: local.studyPlan,
            flashcards: local.flashcards,
            subjects: local.subjects,
            targetExam: local.profile.targetExam,
            noteProgress: storage.getNoteProgress(),
          });
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Institution / Multi-Tenant Auth State.
  // The authoritative source is Firestore (`/institutions/{id}`); a signed-in
  // Google user reaches the portal only if their uid is in `memberUids`.
  // localStorage stays a per-device offline cache for the last active tenant.
  const [currentInstitutionAccount, setCurrentInstitutionAccount] = useState<InstitutionAccount | null>(null);
  const [isInstitutionAuthenticated, setIsInstitutionAuthenticated] = useState<boolean>(false);
  const [institutionConfig, setInstitutionConfig] = useState<InstitutionConfig>(() => storage.getInstitutionConfig());
  const [classGroups, setClassGroups] = useState<ClassGroup[]>(() => storage.getClassGroups());
  const [students, setStudents] = useState<StudentRecord[]>(() => storage.getStudents());
  const [institutionExams, setInstitutionExams] = useState<InstitutionExam[]>(() => storage.getInstitutionExams());

  // Resolve the signed-in user's institution membership. Runs on uid change:
  // signing out of Google drops portal access; signing in restores it.
  useEffect(() => {
    if (!currentUser) {
      setIsInstitutionAuthenticated(false);
      setCurrentInstitutionAccount(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const account = await fetchMyInstitution(currentUser.uid);
        if (cancelled || !account) return;
        setCurrentInstitutionAccount(account);
        setIsInstitutionAuthenticated(true);
        setInstitutionConfig(account.config);
        setClassGroups(account.classGroups || []);
        setStudents(account.students || []);
        setInstitutionExams(account.institutionExams || []);
        storage.saveInstitutionConfig(account.config);
      } catch (err) {
        console.warn('Institution membership lookup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // Initialize global tactile haptic feedback for all interactive elements
  useEffect(() => {
    const cleanupHaptics = initGlobalHaptics();
    return () => cleanupHaptics();
  }, []);

  // "Sistem" teması seçiliyken cihaz açık/koyu tercihi değişirse canlı uygula
  useEffect(() => watchSystemTheme(), []);

  // Kurum portalı kapalıyken o sekmede kalınmışsa anasayfaya dön.
  useEffect(() => {
    if (!INSTITUTION_ENABLED && (activeTab === 'institution' || activeCategory === 'INSTITUTION')) {
      setActiveCategory('HOME');
      setActiveTab('dashboard');
    }
  }, [activeTab, activeCategory]);

  // PWA kısayolları: /?go=snap gibi bir parametreyle açılırsa ilgili sekmeye git.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const go = params.get('go');
      if (go) {
        handleSelectTab(go);
        params.delete('go');
        params.delete('source');
        const qs = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcut Ctrl+K / Cmd+K + programmatic "open-command-search" event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        haptics.light();
        setIsSearchOpen((prev) => !prev);
      }
    };
    const openSearch = () => setIsSearchOpen(true);
    const openLegal = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setLegalDoc(d === 'terms' ? 'terms' : 'privacy');
    };
    const startTour = () => {
      setActiveCategory('HOME');
      setActiveTab('dashboard');
      setTimeout(() => setShowTour(true), 300);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-search', openSearch);
    window.addEventListener('open-coach-tour', startTour);
    window.addEventListener('open-legal', openLegal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-search', openSearch);
      window.removeEventListener('open-coach-tour', startTour);
      window.removeEventListener('open-legal', openLegal);
    };
  }, []);

  // Navigation handlers
  const handleSelectTab = (tab: string, category?: MainTabCategory) => {
    haptics.selection();
    const cat = category || getCategoryForTab(tab);
    setActiveCategory(cat);
    setActiveTab(tab);
  };

  const handleSelectCategory = (cat: MainTabCategory) => {
    haptics.selection();
    setActiveCategory(cat);
    const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === cat);
    const landing = catDef?.landingTab
      || (catDef && Array.isArray(catDef.subTabs) && catDef.subTabs.length > 0 ? catDef.subTabs[0].id : undefined);
    if (landing) {
      setActiveTab(landing);
    }
  };

  const handleSelectAction = (category: MainTabCategory, subTab: string) => {
    haptics.selection();
    if (subTab === 'study_insight') {
      window.dispatchEvent(new CustomEvent('trigger-study-insight'));
      return;
    }
    setActiveCategory(category);
    setActiveTab(subTab === 'inst_analysis' || subTab === 'inst_students' || subTab === 'inst_optical' || subTab === 'inst_coaching' ? 'institution' : subTab);
  };

  // Sync profile changes
  const handleUpdateProfile = (incoming: UserProfile) => {
    // İlk kurulum kaydında onboarding'i kapat.
    const newProfile: UserProfile = { ...incoming, onboarded: true };
    if (isOnboarding) {
      setIsOnboarding(false);
      setShowSettings(false);
      // Kurulumu ilk kez bitiren kullanıcıya kısa tanıtım turu.
      let tourDone = false;
      try { tourDone = localStorage.getItem('snaps_tour_done') === '1'; } catch { /* ignore */ }
      if (!tourDone) {
        setActiveCategory('HOME');
        setActiveTab('dashboard');
        setTimeout(() => setShowTour(true), 400);
      }
    }
    setProfile(newProfile);
    storage.saveProfile(newProfile);

    // If target exam changed, switch subjects list accordingly
    const newSubjects = storage.getSubjects(newProfile.targetExam);
    setSubjects(newSubjects);

    if (currentUser) {
      syncCurrentDataToCloud({
        profile: newProfile,
        subjects: newSubjects,
        targetExam: newProfile.targetExam,
      });
    }
  };

  const handleUpdateProfilePartial = (updated: Partial<UserProfile>) => {
    const merged = { ...profile, ...updated };
    handleUpdateProfile(merged);
  };

  // State handlers with auto-persistence
  const handleSaveSnap = (snap: SnapSolution) => {
    const updated = [snap, ...snaps.filter((s) => s.id !== snap.id)];
    setSnaps(updated);
    storage.saveSnaps(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ snaps: updated });
    }
  };

  const handleUpdateMistakes = (updated: MistakeQuestionItem[]) => {
    setMistakes(updated);
    storage.saveMistakes(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ mistakes: updated });
    }
  };

  const handleAddMockExam = (exam: MockExamRecord) => {
    const updated = [...mockExams, exam];
    setMockExams(updated);
    storage.saveMockExams(updated);

    // Gerçek deneme kaydedilince, tarihine yakın (±3 gün) planlı denemeyi kaldır.
    const examTime = exam.date ? new Date(`${exam.date.slice(0, 10)}T00:00:00`).getTime() : NaN;
    const prunedPlanned = isNaN(examTime)
      ? plannedMocks
      : plannedMocks.filter((p) => {
          const t = new Date(`${p.date}T00:00:00`).getTime();
          return isNaN(t) || Math.abs(t - examTime) > 3 * 86_400_000;
        });
    const plannedChanged = prunedPlanned.length !== plannedMocks.length;
    if (plannedChanged) {
      setPlannedMocks(prunedPlanned);
      storage.savePlannedMocks(prunedPlanned);
    }

    if (currentUser) {
      syncCurrentDataToCloud(plannedChanged ? { mockExams: updated, plannedMocks: prunedPlanned } : { mockExams: updated });
    }
  };

  const handleDeleteMockExam = (id: string) => {
    const updated = mockExams.filter((m) => m.id !== id);
    setMockExams(updated);
    storage.saveMockExams(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ mockExams: updated });
    }
  };

  const handleAddPlannedMock = (planned: PlannedMockExam) => {
    const updated = [...plannedMocks, planned].sort((a, b) => a.date.localeCompare(b.date));
    setPlannedMocks(updated);
    storage.savePlannedMocks(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ plannedMocks: updated });
    }
  };

  const handleDeletePlannedMock = (id: string) => {
    const updated = plannedMocks.filter((p) => p.id !== id);
    setPlannedMocks(updated);
    storage.savePlannedMocks(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ plannedMocks: updated });
    }
  };

  const handleUpdateStudyPlan = (plan: WeeklyStudyPlan) => {
    setStudyPlan(plan);
    storage.saveStudyPlan(plan);
    if (currentUser) {
      syncCurrentDataToCloud({ studyPlan: plan });
    }
  };

  const handleUpdateSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    storage.saveSubjects(profile.targetExam, newSubjects);
    if (currentUser) {
      syncCurrentDataToCloud({
        subjects: newSubjects,
        targetExam: profile.targetExam,
      });
    }
  };

  const handleUpdateNoteProgress = (next: Record<string, NoteProgress>) => {
    setNoteProgress(next);
    storage.saveNoteProgress(next);
    if (currentUser) {
      syncCurrentDataToCloud({ noteProgress: next });
    }
  };

  const handleUpdateFlashcards = (newCards: Flashcard[]) => {
    setFlashcards(newCards);
    storage.saveFlashcards(newCards);
    if (currentUser) {
      syncCurrentDataToCloud({ flashcards: newCards });
    }
  };

  const handleAddFlashcard = (card: Flashcard) => {
    const updated = [card, ...flashcards.filter((c) => c.id !== card.id)];
    setFlashcards(updated);
    storage.saveFlashcards(updated);
    if (currentUser) {
      syncCurrentDataToCloud({ flashcards: updated });
    }
  };

  // Institutional Handlers with Isolated Tenant Persistence
  const handleInstitutionLoginSuccess = (account: InstitutionAccount) => {
    haptics.success();
    setCurrentInstitutionAccount(account);
    setIsInstitutionAuthenticated(true);
    setInstitutionConfig(account.config);
    setClassGroups(account.classGroups || []);
    setStudents(account.students || []);
    setInstitutionExams(account.institutionExams || []);
    setActiveCategory('INSTITUTION');
    setActiveTab('institution');
  };

  // Leaves the portal back to student mode. Does NOT sign out of Google —
  // institution access follows the Google session now.
  const handleInstitutionLogout = () => {
    haptics.light();
    setIsInstitutionAuthenticated(false);
    setCurrentInstitutionAccount(null);
    handleSelectTab('dashboard', 'HOME');
  };

  const persistInstitution = (
    partial: Parameters<typeof syncInstitutionToFirestore>[1],
  ) => {
    if (!currentInstitutionAccount) return;
    setCurrentInstitutionAccount(prev => (prev ? { ...prev, ...partial } : null));
    syncInstitutionToFirestore(currentInstitutionAccount.id, partial).catch(err => {
      console.error('Institution cloud sync failed:', err);
    });
  };

  const handleUpdateInstitutionConfig = (config: InstitutionConfig) => {
    setInstitutionConfig(config);
    storage.saveInstitutionConfig(config);
    persistInstitution({
      config,
      name: config.name,
      branch: config.branch,
      directorName: config.directorName,
      phone: config.phone,
      logoText: config.logoText,
      themeColor: config.themeColor,
    });
  };

  const handleUpdateClassGroups = (groups: ClassGroup[]) => {
    setClassGroups(groups);
    storage.saveClassGroups(groups);
    persistInstitution({ classGroups: groups });
  };

  const handleUpdateStudents = (newStudents: StudentRecord[]) => {
    setStudents(newStudents);
    storage.saveStudents(newStudents);
    persistInstitution({ students: newStudents });
  };

  const handleUpdateInstitutionExams = (exams: InstitutionExam[]) => {
    setInstitutionExams(exams);
    storage.saveInstitutionExams(exams);
    persistInstitution({ institutionExams: exams });
  };

  // Daily Question / Study stats
  const handleIncrementQuestionCount = (count = 1) => {
    const updated: UserProfile = {
      ...profile,
      todayQuestionsSolved: (profile.todayQuestionsSolved || 0) + count,
    };
    setProfile(updated);
    storage.saveProfile(updated);
  };

  const handleIncrementStudyMinutes = (minutes: number) => {
    const updated: UserProfile = {
      ...profile,
      todayMinutesStudied: (profile.todayMinutesStudied || 0) + minutes,
    };
    setProfile(updated);
    storage.saveProfile(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col w-full max-w-full overflow-x-hidden">
      
      {/* 4-Bar Modern Top Navigation Header with Universal Spotlight Search */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        profile={profile}
        institutionConfig={institutionConfig}
        onUpdateProfile={handleUpdateProfilePartial}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickStart={() => setShowQuickStart(true)}
        isInstitutionAuthenticated={isInstitutionAuthenticated}
        activeInstitutionAccount={currentInstitutionAccount}
        onLogoutInstitution={handleInstitutionLogout}
      />

      {/* Main App Body */}
      <main
        id="main-panel"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`sub-tab-${activeTab}`}
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8 overflow-x-hidden focus:outline-none"
      >
       <Suspense fallback={<div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>}>

        {/* Category 1: Overview & Planning Views */}
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={profile}
            mockExams={mockExams}
            snaps={snaps}
            studyPlan={studyPlan}
            subjects={subjects}
            classGroups={classGroups}
            students={students}
            noteProgress={noteProgress}
            onNavigateTab={handleSelectTab}
            onIncrementQuestionCount={handleIncrementQuestionCount}
            onIncrementStudyMinutes={handleIncrementStudyMinutes}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {activeTab === 'planner' && (
          <StudyPlanner
            profile={profile}
            studyPlan={studyPlan}
            onUpdateStudyPlan={handleUpdateStudyPlan}
            onIncrementQuestionCount={handleIncrementQuestionCount}
            mockExams={mockExams}
            mistakes={mistakes}
            plannedMocks={plannedMocks}
            onAddPlannedMock={handleAddPlannedMock}
            onDeletePlannedMock={handleDeletePlannedMock}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumTracker
            profile={profile}
            subjects={subjects}
            onUpdateSubjects={handleUpdateSubjects}
            onIncrementQuestionCount={handleIncrementQuestionCount}
            onAddFlashcard={handleAddFlashcard}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'notes' && (
          <LectureNotes
            profile={profile}
            subjects={subjects}
            onUpdateSubjects={handleUpdateSubjects}
            onNavigateTab={handleSelectTab}
            noteProgress={noteProgress}
            onUpdateNoteProgress={handleUpdateNoteProgress}
          />
        )}

        {activeTab === 'pomodoro' && (
          <PomodoroTimer
            profile={profile}
            onIncrementQuestionCount={handleIncrementQuestionCount}
            onIncrementStudyMinutes={handleIncrementStudyMinutes}
          />
        )}

        {(activeTab === 'streak' || activeTab === 'analytics') && (
          <StreakAnalytics
            profile={profile}
            onNavigateTab={handleSelectTab}
            onIncrementQuestionCount={handleIncrementQuestionCount}
          />
        )}

        {activeTab === 'achievements' && (
          <div className="pb-4">
            <AchievementBadges
              profile={profile}
              mockExams={mockExams}
              snaps={snaps}
              onUpdateProfile={handleUpdateProfilePartial}
            />
          </div>
        )}

        {/* Çalışma Araçları giriş ekranı (modül ızgarası) */}
        {activeTab === 'tools' && (
          <ToolsHub
            title={CATEGORY_DEFINITIONS.find((c) => c.id === 'TRAINING')?.name || 'Çalışma Araçları'}
            items={CATEGORY_DEFINITIONS.find((c) => c.id === 'TRAINING')?.subTabs || []}
            onSelect={(id) => handleSelectTab(id, 'TRAINING')}
          />
        )}

        {/* Category 2: AI Studio Views */}
        {activeTab === 'snap' && (
          <SnapSolver
            profile={profile}
            savedSnaps={snaps}
            onSaveSnap={handleSaveSnap}
            onIncrementQuestionCount={handleIncrementQuestionCount}
            onNavigateToNotebook={() => handleSelectTab('mistakes', 'TRAINING')}
          />
        )}

        {activeTab === 'voice_coach' && (
          <VoiceAICoach
            examType={profile.targetExam}
            stats={{
              totalQuestionsSolved: profile.todayQuestionsSolved || 0,
              totalStudyHours: Math.round((profile.todayMinutesStudied || 0) / 60),
              averageNet: Array.isArray(mockExams) && mockExams.length > 0 ? (mockExams[0]?.totalNet || 75) : 75,
              successRate: 82,
            }}
          />
        )}

        {activeTab === 'coach' && (
          <AICoachChat
            profile={profile}
            onNavigateTab={handleSelectTab}
          />
        )}

        {(activeTab === 'mistakes' || activeTab === 'notebook' || activeTab === 'errors') && (
          <SmartMistakeBank
            profile={profile}
            mistakes={mistakes}
            onUpdateMistakes={handleUpdateMistakes}
            onIncrementQuestionCount={handleIncrementQuestionCount}
          />
        )}

        {/* Category 3: Practice & Performance Views */}
        {activeTab === 'mock' && (
          <MockExamTracker
            profile={profile}
            mockExams={mockExams}
            onAddMockExam={handleAddMockExam}
            onDeleteMockExam={handleDeleteMockExam}
            onUpdateStudyPlan={handleUpdateStudyPlan}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'simulator' && (
          <TargetSimulator
            profile={profile}
            mockExams={mockExams}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'speed' && (
          <SpeedTrainer
            profile={profile}
            onIncrementQuestionCount={handleIncrementQuestionCount}
          />
        )}

        {activeTab === 'duel' && (
          <QuestionDuel
            profile={profile}
            onIncrementQuestionCount={handleIncrementQuestionCount}
          />
        )}

        {activeTab === 'flashcards' && (
          <QuickFlashcards
            profile={profile}
            flashcards={flashcards}
            onUpdateFlashcards={handleUpdateFlashcards}
          />
        )}

        {/* Category 4: Institution & Management Views */}
        {activeTab === 'institution' && INSTITUTION_ENABLED && (
          isInstitutionAuthenticated ? (
            <InstitutionPortal
              institutionConfig={institutionConfig}
              classGroups={classGroups}
              students={students}
              institutionExams={institutionExams}
              onUpdateConfig={handleUpdateInstitutionConfig}
              onUpdateClassGroups={handleUpdateClassGroups}
              onUpdateStudents={handleUpdateStudents}
              onUpdateInstitutionExams={handleUpdateInstitutionExams}
              onSwitchToStudentMode={() => handleSelectTab('dashboard', 'HOME')}
              activeInstitutionId={currentInstitutionAccount?.id}
              activeInstitutionEmail={currentInstitutionAccount?.ownerEmail}
              onLogoutInstitution={handleInstitutionLogout}
            />
          ) : (
            <InstitutionLoginView
              onLoginSuccess={handleInstitutionLoginSuccess}
              onReturnToStudentMode={() => handleSelectTab('dashboard', 'HOME')}
            />
          )
        )}

       </Suspense>
      </main>

      {/* 5-Item Fixed Bottom Navigation Bar (Mobile) */}
      <BottomNav
        activeCategory={activeCategory}
        activeTab={activeTab}
        onSelectCategory={handleSelectCategory}
        onSelectTab={handleSelectTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setShowSettings(true)}
        isInstitutionAuthenticated={isInstitutionAuthenticated}
        settingsOpen={showSettings}
      />

      {/* Universal Search & Command Palette Modal */}
      <CommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAction={handleSelectAction}
      />

      {/* Profile / Settings Modal */}
      {showSettings && !isOnboarding && (
        <Suspense fallback={null}>
          <SettingsModal
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}

      {/* İlk açılış — tam ekran kurulum akışı */}
      {isOnboarding && (
        <Onboarding
          initialProfile={profile}
          onComplete={handleUpdateProfile}
          onOpenLegal={(doc) => setLegalDoc(doc)}
        />
      )}

      {/* Yasal metinler */}
      <LegalModal
        isOpen={legalDoc !== null}
        onClose={() => setLegalDoc(null)}
        initialDoc={legalDoc || 'privacy'}
      />

      {/* İlk kurulum sonrası kısa tanıtım turu */}
      {showTour && !isOnboarding && (
        <CoachTour
          steps={TOUR_STEPS}
          onDone={() => {
            setShowTour(false);
            try { localStorage.setItem('snaps_tour_done', '1'); } catch { /* ignore */ }
          }}
        />
      )}

      {/* Quick Start Guide Modal */}
      <QuickStartModal
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onNavigateTab={handleSelectTab}
      />

      {/* Actionable Study Insights Toast Notifications during active study sessions */}
      <StudyInsightsToast
        activeTab={activeTab}
      />

      {/* Global toast for API failures (401 / 429 / network) */}
      <ApiErrorToast />

      {/* Global Minimal Footer */}
      <footer className="border-t border-slate-900 pt-4 pb-24 md:pb-4 text-center text-xs text-slate-500 no-print space-y-1.5">
        <p>{institutionConfig.name} • Snaps KPSS & YKS Koçluk ve Kurumsal Sınav Analiz Portalı</p>
        <p className="flex items-center justify-center gap-3">
          <button onClick={() => setLegalDoc('privacy')} className="hover:text-slate-300 transition-colors">Gizlilik &amp; KVKK</button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setLegalDoc('terms')} className="hover:text-slate-300 transition-colors">Kullanım Koşulları</button>
          <span className="text-slate-700">·</span>
          <button onClick={() => setShowQuickStart(true)} className="hover:text-slate-300 transition-colors">Nasıl kullanılır?</button>
        </p>
      </footer>

    </div>
  );
}
