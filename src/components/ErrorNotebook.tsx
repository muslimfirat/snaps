import React, { useState } from 'react';
import { Bookmark, CheckCircle2, Trash2, Sparkles, Search } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SnapSolution } from '../types';

interface ErrorNotebookProps {
  snaps: SnapSolution[];
  onUpdateSnap: (snap: SnapSolution) => void;
  onDeleteSnap: (id: string) => void;
}

export const ErrorNotebook: React.FC<ErrorNotebookProps> = ({
  snaps = [],
  onUpdateSnap,
  onDeleteSnap,
}) => {
  const safeSnaps = Array.isArray(snaps) ? snaps : [];
  const [selectedSnapId, setSelectedSnapId] = useState<string | null>(safeSnaps[0]?.id || null);
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNMASTERED' | 'MASTERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSnaps = safeSnaps.filter((s) => {
    if (!s) return false;
    const matchesSubject = filterSubject === 'ALL' || (s.subject && s.subject.toLowerCase().includes(filterSubject.toLowerCase()));
    const matchesStatus =
      filterStatus === 'ALL'
        ? true
        : filterStatus === 'MASTERED'
        ? s.isMastered
        : !s.isMastered;
    const matchesSearch =
      (s.questionSummary && s.questionSummary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.topic && s.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.userNotes && s.userNotes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSubject && matchesStatus && matchesSearch;
  });

  const selectedSnap = safeSnaps.find((s) => s.id === selectedSnapId) || filteredSnaps[0];

  const toggleMastered = (snap: SnapSolution) => {
    const updated = { ...snap, isMastered: !snap.isMastered };
    onUpdateSnap(updated);
    if (updated.isMastered) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Kişisel Hata Defteri & Yanlış Havuzu</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            📝 Hata Defteri ({safeSnaps.length} Soru)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Sınav kazandıran en önemli alışkanlık: Yapamadığın soruları tekrar çözmek ve kavram eksiklerini kapatmaktır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            {safeSnaps.filter((s) => s && s.isMastered).length} Öğrenildi / {safeSnaps.length} Toplam
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Soru, konu veya notlarda ara..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Subject filter */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tüm Dersler</option>
            <option value="Matematik">Matematik</option>
            <option value="Tarih">Tarih</option>
            <option value="Türkçe">Türkçe</option>
            <option value="Coğrafya">Coğrafya</option>
            <option value="Vatandaşlık">Vatandaşlık</option>
            <option value="Fen">Fen Bilimleri</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="UNMASTERED">Tekrar Edilecekler</option>
            <option value="MASTERED">Öğrenilenler ✓</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Snaps List (5 Cols) + Detail View (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* List Column */}
        <div className="lg:col-span-5 space-y-3">
          {filteredSnaps.length > 0 ? (
            filteredSnaps.map((snap) => {
              const isSelected = selectedSnap?.id === snap.id;
              return (
                <div
                  key={snap.id}
                  id={`error-snap-item-${snap.id}`}
                  onClick={() => setSelectedSnapId(snap.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      {snap.subject} • {snap.topic}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      snap.isMastered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {snap.isMastered ? 'Öğrenildi ✓' : 'Tekrar Et'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2 font-medium">
                    {snap.questionSummary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Doğru Cevap: <strong className="text-emerald-400">{snap.correctOption}</strong></span>
                    <span>{snap.timestamp}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs">
              Bu filtreye uygun hata sorusu bulunamadı.
            </div>
          )}
        </div>

        {/* Detail Column */}
        {selectedSnap ? (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in">
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                    {selectedSnap.subject}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {selectedSnap.topic}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Kaydedilme: {selectedSnap.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="toggle-mastered-snap-button"
                  onClick={() => toggleMastered(selectedSnap)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    selectedSnap.isMastered
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedSnap.isMastered ? 'Öğrenildi Olarak İşaretli' : 'Öğrendim Olarak İşaretle'}</span>
                </button>
                <button
                  onClick={() => onDeleteSnap(selectedSnap.id)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Soruyu Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Summary / Image */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Soru Kökü
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {selectedSnap.questionSummary}
              </p>
            </div>

            {/* Answer banner */}
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">
                Doğru Seçenek: <strong>{selectedSnap.correctOption}</strong>
              </span>
            </div>

            {/* Step by step */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Çözüm Adımları:
              </span>
              <div className="space-y-2">
                {(selectedSnap?.stepByStepSolution || []).map((step, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Concept */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Püf Noktası / Formül
              </span>
              <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                {selectedSnap.keyConcept}
              </p>
            </div>

            {/* User Notes */}
            {selectedSnap.userNotes && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  📝 Özel Notun:
                </span>
                <p className="text-xs text-indigo-300 font-medium italic">
                  "{selectedSnap.userNotes}"
                </p>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
            <p className="text-xs text-slate-400">Detaylarını görmek için soldan bir soru seçin.</p>
          </div>
        )}

      </div>
    </div>
  );
};
