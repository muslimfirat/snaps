import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  ImagePlus,
  X,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Layers,
} from 'lucide-react';
import type {
  Subject,
  SubjectTopic,
  UserProfile,
  MainTabCategory,
  NoteProgress,
  UserNote,
  LectureNotePage,
} from '../types';
import {
  LECTURE_NOTES,
  getLectureNotesForSubject,
  lectureNoteCounts,
} from '../data/lectureNotes';
import { getTopicStat } from '../data/examTopicStats';
import {
  getUserNotes,
  putUserNote,
  deleteUserNote,
  storeImageFiles,
  getImage,
  isNoteStoreAvailable,
} from '../lib/noteStore';
import { haptics } from '../lib/haptics';

interface LectureNotesProps {
  profile: UserProfile;
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onNavigateTab?: (tab: string, category?: MainTabCategory) => void;
  noteProgress: Record<string, NoteProgress>;
  onUpdateNoteProgress: (next: Record<string, NoteProgress>) => void;
}

const lectureKey = (topicId: string) => `lecture:${topicId}`;
const userKey = (noteId: string) => `user:${noteId}`;

/** IndexedDB blob anahtarını gösterilebilir bir object URL'e çevirir. */
function useBlobUrl(imageKey: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let alive = true;
    if (!imageKey) {
      setUrl(null);
      return;
    }
    getImage(imageKey)
      .then((blob) => {
        if (!alive || !blob) return;
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [imageKey]);
  return url;
}

const UserNoteImage: React.FC<{ imageKey: string; className?: string; alt: string }> = ({
  imageKey,
  className,
  alt,
}) => {
  const url = useBlobUrl(imageKey);
  if (!url) return <div className={`bg-slate-800 animate-pulse ${className || ''}`} />;
  return <img src={url} className={className} alt={alt} />;
};

export const LectureNotes: React.FC<LectureNotesProps> = ({
  subjects = [],
  onUpdateSubjects,
  onNavigateTab,
  noteProgress,
  onUpdateNoteProgress,
}) => {
  const [section, setSection] = useState<'TYT' | 'AYT'>('TYT');
  const [view, setView] = useState<'subjects' | 'topics' | 'viewer' | 'review'>('subjects');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [noteTab, setNoteTab] = useState<'team' | 'mine'>('team');
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const storeReady = isNoteStoreAvailable();
  const counts = useMemo(() => lectureNoteCounts(), []);

  const refreshUserNotes = () => {
    getUserNotes().then(setUserNotes).catch(() => setUserNotes([]));
  };
  useEffect(() => {
    if (storeReady) refreshUserNotes();
  }, [storeReady]);

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const sectionSubjects = safeSubjects.filter((s) => s.category === section);
  const activeSubject = safeSubjects.find((s) => s.id === activeSubjectId) || null;

  const setProgress = (key: string, patch: Partial<NoteProgress>) => {
    const next = {
      ...noteProgress,
      [key]: { ...noteProgress[key], ...patch, lastViewedAt: new Date().toISOString() },
    };
    onUpdateNoteProgress(next);
  };

  // ── Konu için tüm not sayfaları (ekip + öğrenci) ──
  const topicTeamNotes = activeTopicId
    ? getLectureNotesForSubject(activeSubjectId || '')?.topics.find((t) => t.topicId === activeTopicId)
    : undefined;
  const topicUserNotes = userNotes.filter((n) => n.topicId === activeTopicId);

  const activeTopic: SubjectTopic | undefined = activeSubject?.topics.find((t) => t.id === activeTopicId);

  const teamPages: LectureNotePage[] = topicTeamNotes?.pages || [];
  const minePages: { noteId: string; imageKey: string; title: string }[] = topicUserNotes.flatMap((n) =>
    n.imageKeys.map((k) => ({ noteId: n.id, imageKey: k, title: n.title })),
  );

  const openViewer = (subjectId: string, topicId: string, tab: 'team' | 'mine') => {
    setActiveSubjectId(subjectId);
    setActiveTopicId(topicId);
    setNoteTab(tab);
    setPageIndex(0);
    setZoom(1);
    setView('viewer');
    haptics.selection();
  };

  const markTopicStudied = () => {
    if (!activeSubject || !activeTopic) return;
    const updated = safeSubjects.map((s) =>
      s.id !== activeSubject.id
        ? s
        : { ...s, topics: s.topics.map((t) => (t.id === activeTopic.id ? { ...t, isStudied: true } : t)) },
    );
    onUpdateSubjects(updated);
    haptics.success();
  };

  // ── Tekrar listesi ──
  const reviewItems = useMemo(() => {
    const items: { key: string; label: string; sub: string; onOpen: () => void }[] = [];
    for (const [key, prog] of Object.entries(noteProgress)) {
      if (!prog?.needsReview) continue;
      if (key.startsWith('lecture:')) {
        const topicId = key.slice('lecture:'.length);
        const owner = LECTURE_NOTES.find((s) => s.topics.some((t) => t.topicId === topicId));
        const t = owner?.topics.find((x) => x.topicId === topicId);
        if (owner && t) {
          items.push({
            key,
            label: t.title,
            sub: owner.label,
            onOpen: () => openViewer(owner.subjectId, topicId, 'team'),
          });
        }
      } else if (key.startsWith('user:')) {
        const noteId = key.slice('user:'.length);
        const n = userNotes.find((x) => x.id === noteId);
        if (n) {
          items.push({
            key,
            label: n.title,
            sub: 'Benim Notlarım',
            onOpen: () => n.topicId && openViewer(n.subjectId, n.topicId, 'mine'),
          });
        }
      }
    }
    return items;
  }, [noteProgress, userNotes]);

  const totalReview = reviewItems.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
          <NotebookPen className="w-3.5 h-3.5" />
          <span>El Yazısı Ders Notları</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">📓 Defter Notları</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xl">
          Ekip tarafından hazırlanan el yazısı konu notlarını çalış; kendi defter
          sayfalarını fotoğraflayıp konuya ekle. Notlar cihazında saklanır.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-2xs">
          <span className="px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
            {counts.topics} konu · {counts.pages} ekip sayfası
          </span>
          <span className="px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300">
            {userNotes.length} kendi notun
          </span>
          {totalReview > 0 && (
            <button
              onClick={() => setView('review')}
              className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 font-semibold"
            >
              🔁 Tekrar: {totalReview} sayfa
            </button>
          )}
        </div>
      </div>

      {!storeReady && (
        <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
          Tarayıcın yerel depolamayı (IndexedDB) desteklemiyor — kendi notlarını
          ekleyemezsin ama ekip notlarını görebilirsin.
        </p>
      )}

      {/* ── REVIEW ── */}
      {view === 'review' && (
        <div className="space-y-3">
          <button
            onClick={() => setView('subjects')}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Derslere dön
          </button>
          <h2 className="text-base font-bold text-white">🔁 Tekrar Edilecek Sayfalar</h2>
          {reviewItems.length === 0 ? (
            <p className="text-xs text-slate-500">Tekrar işareti koyduğun sayfa yok.</p>
          ) : (
            reviewItems.map((it) => (
              <button
                key={it.key}
                onClick={it.onOpen}
                className="w-full text-left p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-100">{it.label}</div>
                  <div className="text-2xs text-slate-500">{it.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {/* ── SUBJECTS ── */}
      {view === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-xl border border-slate-800 overflow-hidden">
              {(['TYT', 'AYT'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                    section === s ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {storeReady && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Not Ekle
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {sectionSubjects.map((sub) => {
              const team = getLectureNotesForSubject(sub.id);
              const teamTopics = team?.topics.length || 0;
              const mine = userNotes.filter((n) => n.subjectId === sub.id).length;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubjectId(sub.id);
                    setView('topics');
                  }}
                  className="text-left p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="text-sm font-bold text-slate-100">{sub.name}</div>
                  <div className="text-2xs text-slate-400 mt-1">
                    {teamTopics > 0 ? `${teamTopics} ekip konusu` : 'Ekip notu yakında'}
                    {mine > 0 ? ` · ${mine} kendi notun` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOPICS ── */}
      {view === 'topics' && activeSubject && (
        <div className="space-y-3">
          <button
            onClick={() => setView('subjects')}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {section} dersleri
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{activeSubject.name}</h2>
            {storeReady && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Not Ekle
              </button>
            )}
          </div>

          {(() => {
            const team = getLectureNotesForSubject(activeSubject.id);
            const rows = activeSubject.topics
              .map((t) => {
                const tn = team?.topics.find((x) => x.topicId === t.id);
                const mine = userNotes.filter((n) => n.subjectId === activeSubject.id && n.topicId === t.id);
                const minePageCount = mine.reduce((a, n) => a + n.imageKeys.length, 0);
                if (!tn && minePageCount === 0) return null;
                const read = noteProgress[lectureKey(t.id)]?.read;
                return { topic: t, teamPages: tn?.pages.length || 0, minePageCount, read };
              })
              .filter(Boolean) as {
              topic: SubjectTopic;
              teamPages: number;
              minePageCount: number;
              read?: boolean;
            }[];

            if (rows.length === 0) {
              return (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Bu ders için henüz not yok. “Not Ekle” ile kendi defter sayfanı ekleyebilirsin.
                </p>
              );
            }
            return rows.map(({ topic, teamPages, minePageCount, read }) => {
              const stat = getTopicStat(topic.statKey);
              return (
                <button
                  key={topic.id}
                  onClick={() => openViewer(activeSubject.id, topic.id, teamPages > 0 ? 'team' : 'mine')}
                  className="w-full text-left p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100">{topic.name}</span>
                      <span
                        className={`text-3xs font-bold px-1.5 py-0.5 rounded border ${
                          topic.weight === 'YÜKSEK'
                            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                            : topic.weight === 'ORTA'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {topic.weight}
                      </span>
                      {read && (
                        <span className="text-3xs text-emerald-300 inline-flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> okundu
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-slate-500 mt-0.5">
                      {teamPages > 0 && `${teamPages} ekip sayfası`}
                      {teamPages > 0 && minePageCount > 0 && ' · '}
                      {minePageCount > 0 && `${minePageCount} kendi sayfan`}
                      {stat && ` · yıllık ort. ${stat.avgPerYear} soru`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              );
            });
          })()}
        </div>
      )}

      {/* ── VIEWER ── */}
      {view === 'viewer' && activeTopic && (
        <div className="space-y-3">
          <button
            onClick={() => setView('topics')}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {activeSubject?.name}
          </button>

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-white">{activeTopic.name}</h2>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={markTopicStudied}
                disabled={activeTopic.isStudied}
                className={`text-2xs font-bold px-2 py-1 rounded-lg border ${
                  activeTopic.isStudied
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {activeTopic.isStudied ? '✓ Çalışıldı' : 'Konu Takip’te işaretle'}
              </button>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('curriculum', 'HOME')}
                  className="text-2xs font-bold px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" /> Konu Takip
                </button>
              )}
            </div>
          </div>

          {/* team / mine tabs */}
          <div className="inline-flex rounded-lg border border-slate-800 overflow-hidden text-xs">
            <button
              onClick={() => {
                setNoteTab('team');
                setPageIndex(0);
                setZoom(1);
              }}
              className={`px-3 py-1.5 font-bold ${noteTab === 'team' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Ekip Notları ({teamPages.length})
            </button>
            <button
              onClick={() => {
                setNoteTab('mine');
                setPageIndex(0);
                setZoom(1);
              }}
              className={`px-3 py-1.5 font-bold ${noteTab === 'mine' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Benim Notlarım ({minePages.length})
            </button>
          </div>

          <NoteViewer
            noteTab={noteTab}
            teamPages={teamPages}
            minePages={minePages}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            zoom={zoom}
            setZoom={setZoom}
            topicId={activeTopic.id}
            noteProgress={noteProgress}
            setProgress={setProgress}
            onDeleteUserNote={async (noteId) => {
              await deleteUserNote(noteId);
              refreshUserNotes();
              setPageIndex(0);
            }}
            onAdd={() => setShowAdd(true)}
            storeReady={storeReady}
          />
        </div>
      )}

      {showAdd && (
        <AddNoteModal
          subjects={safeSubjects}
          defaultSubjectId={activeSubjectId}
          defaultTopicId={activeTopicId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            refreshUserNotes();
          }}
        />
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────

const NoteViewer: React.FC<{
  noteTab: 'team' | 'mine';
  teamPages: LectureNotePage[];
  minePages: { noteId: string; imageKey: string; title: string }[];
  pageIndex: number;
  setPageIndex: (n: number) => void;
  zoom: number;
  setZoom: (n: number) => void;
  topicId: string;
  noteProgress: Record<string, NoteProgress>;
  setProgress: (key: string, patch: Partial<NoteProgress>) => void;
  onDeleteUserNote: (noteId: string) => void;
  onAdd: () => void;
  storeReady: boolean;
}> = ({
  noteTab,
  teamPages,
  minePages,
  pageIndex,
  setPageIndex,
  zoom,
  setZoom,
  topicId,
  noteProgress,
  setProgress,
  onDeleteUserNote,
  onAdd,
  storeReady,
}) => {
  const count = noteTab === 'team' ? teamPages.length : minePages.length;
  const idx = Math.min(pageIndex, Math.max(0, count - 1));
  const progressKey = noteTab === 'team' ? lectureKey(topicId) : userKey(minePages[idx]?.noteId || '');
  const prog = noteProgress[progressKey] || {};

  useEffect(() => {
    // Sayfa görüntülendi -> ekip notunda son sayfaya gelince "okundu"
    if (noteTab === 'team' && count > 0 && idx === count - 1 && !prog.read) {
      setProgress(lectureKey(topicId), { read: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, count, noteTab]);

  if (count === 0) {
    return (
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <p className="text-xs text-slate-400">
          {noteTab === 'team'
            ? 'Bu konu için ekip notu henüz eklenmedi.'
            : 'Bu konuya kendi notunu eklemedin.'}
        </p>
        {noteTab === 'mine' && storeReady && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            <ImagePlus className="w-4 h-4" /> Sayfa Ekle
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-auto max-h-[70vh]">
        <div
          className="origin-top-left transition-transform"
          style={{ transform: `scale(${zoom})`, width: zoom > 1 ? `${zoom * 100}%` : '100%' }}
          onDoubleClick={() => setZoom(zoom > 1 ? 1 : 2)}
        >
          {noteTab === 'team' ? (
            <img
              src={teamPages[idx].src}
              alt={teamPages[idx].caption || `Sayfa ${idx + 1}`}
              className="w-full h-auto block select-none"
            />
          ) : (
            <UserNoteImage
              imageKey={minePages[idx].imageKey}
              alt={minePages[idx].title}
              className="w-full h-auto block select-none"
            />
          )}
        </div>

        {/* zoom controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => setZoom(Math.min(3, Math.round((zoom + 0.5) * 10) / 10))}
            className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 flex items-center justify-center"
            aria-label="Yakınlaştır"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(Math.max(1, Math.round((zoom - 0.5) * 10) / 10))}
            className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 flex items-center justify-center"
            aria-label="Uzaklaştır"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* caption + nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            setPageIndex(Math.max(0, idx - 1));
            setZoom(1);
          }}
          disabled={idx === 0}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-2xs text-slate-400 text-center flex-1 truncate">
          Sayfa {idx + 1} / {count}
          {noteTab === 'team' && teamPages[idx].caption ? ` · ${teamPages[idx].caption}` : ''}
        </div>
        <button
          onClick={() => {
            setPageIndex(Math.min(count - 1, idx + 1));
            setZoom(1);
          }}
          disabled={idx === count - 1}
          className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* progress toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setProgress(progressKey, { read: !prog.read })}
          className={`text-2xs font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
            prog.read
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          <Check className="w-3 h-3" /> Okundu
        </button>
        <button
          onClick={() => setProgress(progressKey, { needsReview: !prog.needsReview })}
          className={`text-2xs font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
            prog.needsReview
              ? 'bg-amber-600/30 text-amber-200 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          <RotateCcw className="w-3 h-3" /> Tekrar lazım
        </button>
        {noteTab === 'mine' && minePages[idx] && (
          <button
            onClick={() => {
              if (confirm('Bu not silinsin mi? (tüm sayfaları)')) onDeleteUserNote(minePages[idx].noteId);
            }}
            className="text-2xs font-bold px-2.5 py-1 rounded-lg border bg-slate-800 text-rose-300 border-slate-700 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Notu sil
          </button>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────

const AddNoteModal: React.FC<{
  subjects: Subject[];
  defaultSubjectId: string | null;
  defaultTopicId: string | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ subjects, defaultSubjectId, defaultTopicId, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || subjects[0]?.id || '');
  const [topicId, setTopicId] = useState(defaultTopicId || '');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const subject = subjects.find((s) => s.id === subjectId);

  const save = async () => {
    if (files.length === 0 || saving) return;
    setSaving(true);
    try {
      const id = `un-${Date.now()}`;
      const imageKeys = await storeImageFiles(id, files);
      const now = new Date().toISOString();
      const note: UserNote = {
        id,
        subjectId,
        topicId: topicId || undefined,
        title: title.trim() || subject?.name || 'Not',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        imageKeys,
        createdAt: now,
        updatedAt: now,
      };
      await putUserNote(note);
      haptics.success();
      onSaved();
    } catch (e) {
      console.error('Not kaydedilemedi:', e);
      alert('Not kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white inline-flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-indigo-400" /> Kendi Notunu Ekle
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Başlık</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ör. Türev — Zincir Kuralı özet"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase">Ders</span>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase">Konu (ops.)</span>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100"
            >
              <option value="">—</option>
              {(subject?.topics || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-2xs font-bold text-slate-400 uppercase">Etiketler (virgülle)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="formül, sınav öncesi"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <div className="space-y-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-300 text-xs font-semibold hover:border-indigo-500/50 inline-flex items-center justify-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            {files.length > 0 ? `${files.length} sayfa seçildi` : 'Defter sayfası fotoğrafı seç / çek'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          {files.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {files.map((f, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(f)}
                  alt={`sayfa ${i + 1}`}
                  className="h-16 w-12 object-cover rounded border border-slate-700 shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
            Vazgeç
          </button>
          <button
            onClick={save}
            disabled={files.length === 0 || saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LectureNotes;
