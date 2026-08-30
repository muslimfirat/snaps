import React, { useState } from 'react';
import { 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  X, 
  Check, 
  Lock
} from 'lucide-react';
import { UserProfile, MockExamRecord, SnapSolution, AchievementBadge } from '../types';
import { calculateBadges } from '../lib/badgeSystem';

interface AchievementBadgesProps {
  profile: UserProfile;
  mockExams: MockExamRecord[];
  snaps: SnapSolution[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  profile,
  mockExams,
  snaps,
  onUpdateProfile,
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unlocked' | 'streak' | 'questions' | 'focus'>('all');

  const { badges, unlockedCount, currentRank } = calculateBadges(profile, mockExams, snaps);

  const activeTitle = profile.activeTitle || currentRank;

  const handleSelectTitle = (badge: AchievementBadge) => {
    if (!badge.isUnlocked) return;
    onUpdateProfile({ activeTitle: badge.statusTitle });
  };

  const filteredBadges = badges.filter((b) => {
    if (selectedFilter === 'unlocked') return b.isUnlocked;
    if (selectedFilter === 'streak') return b.category === 'streak';
    if (selectedFilter === 'questions') return b.category === 'questions';
    if (selectedFilter === 'focus') return b.category === 'focus';
    return true;
  });

  const getTierBadgeStyle = (tier: AchievementBadge['tier'], isUnlocked: boolean) => {
    if (!isUnlocked) {
      return 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
    }
    switch (tier) {
      case 'diamond':
        return 'bg-slate-900 border-indigo-500/50 text-indigo-300';
      case 'gold':
        return 'bg-slate-900 border-amber-500/50 text-amber-300';
      case 'silver':
        return 'bg-slate-900 border-slate-700 text-slate-200';
      case 'bronze':
      default:
        return 'bg-slate-900 border-amber-700/40 text-amber-200';
    }
  };

  return (
    <>
      {/* Dashboard Compact Achievement Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left Title & Active Rank */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg flex-shrink-0">
              🏆
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  Başarı Rozetleri & Ünvanlar
                </h2>
                <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {unlockedCount}/{badges.length} Açıldı
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">Ünvanın:</span>
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {activeTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Badges Preview Row + View All Button */}
          <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
            <div className="flex items-center -space-x-1.5">
              {badges.slice(0, 5).map((badge) => (
                <div
                  key={badge.id}
                  title={`${badge.title} (${badge.isUnlocked ? 'Kazanıldı' : `%${badge.progress}`})`}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-transform hover:scale-105 relative ${
                    badge.isUnlocked
                      ? 'bg-slate-900 border-amber-500/40 z-10'
                      : 'bg-slate-950 border-slate-800 text-slate-600 grayscale opacity-60'
                  }`}
                >
                  <span>{badge.icon}</span>
                  {badge.isUnlocked && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                  )}
                </div>
              ))}
            </div>

            <button
              id="open-achievement-badges-btn"
              onClick={() => setIsOpenModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Tüm Rozetler</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-base">
                  🏆
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Başarı Rozetleri & Ünvanlar</span>
                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                      {unlockedCount} / {badges.length} Kazanıldı
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rozetlerini incele ve profilinde kullanmak istediğin ünvanı seç.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpenModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tümü ({badges.length})
              </button>
              <button
                onClick={() => setSelectedFilter('unlocked')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFilter === 'unlocked'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kazanılanlar ({unlockedCount})
              </button>
              <button
                onClick={() => setSelectedFilter('streak')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFilter === 'streak'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Seri & Disiplin
              </button>
              <button
                onClick={() => setSelectedFilter('questions')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFilter === 'questions'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Soru & Çözüm
              </button>
              <button
                onClick={() => setSelectedFilter('focus')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedFilter === 'focus'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Odak & Süre
              </button>
            </div>

            {/* Badges Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[55vh] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBadges.map((badge) => {
                const isSelectedTitle = profile.activeTitle === badge.statusTitle;

                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between ${getTierBadgeStyle(
                      badge.tier,
                      badge.isUnlocked
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                        {badge.isUnlocked ? badge.icon : <Lock className="w-4 h-4 text-slate-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">{badge.title}</h4>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">
                            {badge.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar or Title Selector */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      {badge.isUnlocked ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400">
                            Ünvan: <strong className="text-amber-300 font-semibold">{badge.statusTitle}</strong>
                          </span>

                          <button
                            onClick={() => handleSelectTitle(badge)}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                              isSelectedTitle
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSelectedTitle ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <span>Ünvanı Seç</span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>İlerleme</span>
                            <span className="font-mono">%{badge.progress}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${badge.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end">
              <button
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
