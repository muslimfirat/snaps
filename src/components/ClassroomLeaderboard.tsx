import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  ChevronRight, 
  Sparkles, 
  GraduationCap
} from 'lucide-react';
import { 
  UserProfile, 
  ClassGroup, 
  StudentRecord, 
  MockExamRecord, 
  MainTabCategory 
} from '../types';

interface ClassroomLeaderboardProps {
  profile: UserProfile;
  classGroups: ClassGroup[];
  students: StudentRecord[];
  mockExams: MockExamRecord[];
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

type SortCriteria = 'mockNet' | 'questions' | 'streak';

interface RankedStudent {
  id: string;
  name: string;
  isCurrentUser: boolean;
  score: number;
  secondaryScore: string;
  targetScore: string;
  status: 'HIGH' | 'STABLE' | 'NEEDS_ATTENTION';
  rank: number;
  avatarText: string;
}

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  profile,
  classGroups = [],
  students = [],
  mockExams = [],
  onNavigateTab,
  onUpdateProfile,
}) => {
  const safeClassGroups = Array.isArray(classGroups) ? classGroups : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeMockExams = Array.isArray(mockExams) ? mockExams : [];

  const [sortBy, setSortBy] = useState<SortCriteria>('mockNet');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    profile?.classGroupId || safeClassGroups[0]?.id || ''
  );

  // Find active class
  const activeClass = safeClassGroups.find((c) => c.id === selectedClassId) || safeClassGroups[0];

  // User's latest mock net or default
  const latestUserMock = safeMockExams[safeMockExams.length - 1];
  const userMockNet = latestUserMock && !isNaN(Number(latestUserMock.totalNet)) ? Number(latestUserMock.totalNet) : 89.25;
  const userTotalQuestions = (Number(profile?.todayQuestionsSolved) || 0) + 1280;
  const userStreak = Number(profile?.streakDays) || 1;

  // Filter students in this class and insert current user
  const rankedList = useMemo(() => {
    if (!activeClass) return [];

    const classStudents = safeStudents.filter((s) => s?.classGroupId === activeClass.id);

    // Current user representation
    const currentUserItem: RankedStudent = {
      id: 'current-user',
      name: `${profile?.name || 'Öğrenci'} (Sen)`,
      isCurrentUser: true,
      score:
        sortBy === 'mockNet'
          ? userMockNet
          : sortBy === 'questions'
          ? userTotalQuestions
          : userStreak,
      secondaryScore:
        sortBy === 'mockNet'
          ? `${userTotalQuestions} Soru`
          : sortBy === 'questions'
          ? `${userMockNet} Net`
          : `${userMockNet} Net`,
      targetScore: profile?.targetScore || '90.0',
      status: 'HIGH',
      rank: 0,
      avatarText: (profile?.name ? profile.name.slice(0, 2) : 'SE').toUpperCase(),
    };

    const studentItems: RankedStudent[] = classStudents.map((s) => {
      let scoreVal = s.latestMockNet;
      let secScore = `${s.totalQuestionsSolved} Soru`;

      if (sortBy === 'questions') {
        scoreVal = s.totalQuestionsSolved;
        secScore = `${s.latestMockNet} Net`;
      } else if (sortBy === 'streak') {
        scoreVal = s.streakDays || 0;
        secScore = `${s.latestMockNet} Net`;
      }

      return {
        id: s.id,
        name: s.name,
        isCurrentUser: false,
        score: scoreVal,
        secondaryScore: secScore,
        targetScore: s.targetScore,
        status: s.status,
        rank: 0,
        avatarText: s.name.slice(0, 2).toUpperCase(),
      };
    });

    // Merge and sort
    const all = [...studentItems, currentUserItem].sort((a, b) => b.score - a.score);

    // Assign 1-indexed ranks
    return all.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [
    activeClass,
    safeStudents,
    profile?.name,
    profile?.targetScore,
    userMockNet,
    userTotalQuestions,
    userStreak,
    sortBy,
  ]);

  const currentUserRankInfo = rankedList.find((r) => r.isCurrentUser);
  const userRank = currentUserRankInfo ? currentUserRankInfo.rank : 1;
  const totalStudents = rankedList.length;
  const topStudent = rankedList[0];

  // Class average
  const averageScore = useMemo(() => {
    if (rankedList.length === 0) return 0;
    const sum = rankedList.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((sum / rankedList.length) * 10) / 10;
  }, [rankedList]);

  const handleClassChange = (newId: string) => {
    setSelectedClassId(newId);
    onUpdateProfile({ classGroupId: newId });
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
          1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-6 h-6 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-6 h-6 rounded-lg bg-amber-700/30 text-amber-400 flex items-center justify-center font-bold text-xs">
          3
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-xs">
        {rank}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* 1. Header & Group Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                Sınıf & Dershane Sıralaması
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
                ({totalStudents} Öğrenci)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeClass ? `${activeClass.name} • ${activeClass.coachTeacher}` : 'Sınıf grubu'}
            </p>
          </div>
        </div>

        {/* Class Group Switcher */}
        <div className="flex items-center gap-2">
          <select
            id="classroom-selector-dropdown"
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition-colors"
          >
            {classGroups.map((grp) => (
              <option key={grp.id} value={grp.id}>
                {grp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. User Position Spotlight Banner */}
      <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-indigo-300 font-mono">
              #{userRank}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Sınıfında <strong className="text-indigo-400">{userRank}. sıradasın</strong>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Puanın: <span className="text-indigo-300 font-semibold">{currentUserRankInfo?.score} {sortBy === 'mockNet' ? 'Net' : sortBy === 'questions' ? 'Soru' : 'Gün'}</span> • Sınıf Ortalaması: <span className="text-slate-300 font-semibold">{averageScore}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('mock', 'PRACTICE')}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Deneme Gir</span>
        </button>
      </div>

      {/* 3. Sorting Criteria Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <span className="text-xs font-semibold text-slate-400">Sıralama Ölçütü:</span>
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSortBy('mockNet')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'mockNet'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deneme Neti
          </button>
          <button
            onClick={() => setSortBy('questions')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'questions'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toplam Soru
          </button>
          <button
            onClick={() => setSortBy('streak')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'streak'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Seri
          </button>
        </div>
      </div>

      {/* 4. Ranked Students Mini-List */}
      <div className="space-y-1.5">
        {rankedList.slice(0, 5).map((student) => {
          return (
            <div
              key={student.id}
              className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                student.isCurrentUser
                  ? 'bg-indigo-950/40 border-indigo-500/40'
                  : 'bg-slate-950/40 hover:bg-slate-950/80 border-slate-800/60'
              }`}
            >
              {/* Left Rank & Student Info */}
              <div className="flex items-center gap-2.5">
                {getRankBadge(student.rank)}

                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300 flex-shrink-0">
                  {student.avatarText}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate max-w-[140px] sm:max-w-[200px] ${
                        student.isCurrentUser ? 'text-indigo-300 font-bold' : 'text-white'
                      }`}
                    >
                      {student.name}
                    </span>
                    {student.isCurrentUser && (
                      <span className="text-[9px] font-bold uppercase bg-indigo-600 text-white px-1 py-0.2 rounded">
                        Sen
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Hedef: {student.targetScore} • {student.secondaryScore}
                  </span>
                </div>
              </div>

              {/* Right Score */}
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-xs font-bold font-mono block ${
                    student.isCurrentUser ? 'text-indigo-300' : 'text-white'
                  }`}
                >
                  {student.score} {sortBy === 'mockNet' ? 'Net' : sortBy === 'questions' ? 'S' : 'g'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {sortBy === 'mockNet' ? 'Son Deneme' : sortBy === 'questions' ? 'Çözülen' : 'Seri'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Footer Navigation Link */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-xs">
          Lider: <strong className="text-amber-400 font-medium">{topStudent?.name}</strong> ({topStudent?.score} {sortBy === 'mockNet' ? 'Net' : ''})
        </span>

        <button
          onClick={() => onNavigateTab('inst_students', 'INSTITUTION')}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          <span>Tüm Sınıfı Gör</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
