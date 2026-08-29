import React, { useState } from 'react';
import { 
  Compass, 
  Target, 
  Sparkles, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  Building2, 
  GraduationCap,
  Scale,
  RefreshCw,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, TargetPreset, TargetSimulationResult, MockExamRecord } from '../types';
import { TARGET_PRESETS } from '../data/curriculumData';

interface TargetSimulatorProps {
  profile: UserProfile;
  mockExams: MockExamRecord[];
  onUpdateProfileTarget?: (targetTitle: string, targetScore: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const TargetSimulator: React.FC<TargetSimulatorProps> = ({
  profile,
  mockExams = [],
  onUpdateProfileTarget,
  onNavigateTab,
}) => {
  const safeMockExams = Array.isArray(mockExams) ? mockExams : [];
  const [selectedTarget, setSelectedTarget] = useState<TargetPreset>(TARGET_PRESETS[0]);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'KPSS' | 'YKS'>('ALL');
  
  // Custom or editable current nets
  const [customNets, setCustomNets] = useState<Record<string, number>>({});
  
  // Simulation analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TargetSimulationResult | null>(null);

  const filteredPresets = TARGET_PRESETS.filter((p) => {
    if (categoryFilter === 'ALL') return true;
    return p.category === categoryFilter;
  });

  // Calculate average nets from mock exams if available
  const getAverageNetForSection = (sectionName: string, defaultTarget: number) => {
    if (customNets[sectionName] !== undefined) {
      const val = Number(customNets[sectionName]);
      return isNaN(val) ? 0 : val;
    }
    const safeTarget = Number(defaultTarget) || 20;
    if (safeMockExams.length > 0) {
      const matchingExams = safeMockExams.filter((m) =>
        Array.isArray(m?.sections) && m.sections.some((s) => s?.name?.toLowerCase().includes(sectionName.toLowerCase().slice(0, 4)))
      );
      if (matchingExams.length > 0) {
        const sum = matchingExams.reduce((acc, m) => {
          const sec = (m.sections || []).find((s) => s?.name?.toLowerCase().includes(sectionName.toLowerCase().slice(0, 4)));
          return acc + (sec ? (Number(sec.net) || 0) : 0);
        }, 0);
        const res = Math.round((sum / matchingExams.length) * 10) / 10;
        return isNaN(res) ? 0 : res;
      }
    }
    // Fallback reasonable current baseline
    const fallback = Math.max(0, Math.round((safeTarget * 0.72) * 10) / 10);
    return isNaN(fallback) ? 0 : fallback;
  };

  const handleRunSimulation = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const netsPayload = (selectedTarget?.requiredNets || []).map((n) => ({
      section: n.section,
      currentNet: getAverageNetForSection(n.section, n.targetNet),
      targetNet: n.targetNet,
    }));

    try {
      const res = await fetch('/api/target-simulator/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: selectedTarget,
          currentNets: netsPayload,
          examType: selectedTarget.category,
        }),
      });
      const data = await res.json();
      setAnalysisResult({
        matchPercentage: data.matchPercentage || 75,
        scoreDifference: data.scoreDifference || -10,
        netDifferences: netsPayload.map((np) => ({
          ...np,
          diff: Math.round((np.currentNet - np.targetNet) * 10) / 10,
        })),
        aiAdvice: data.aiAdvice || 'Hedefine ulaşmak için eksik branşlardaki haftalık soru sayısını %25 artırmalısın.',
        criticalFocusAreas: data.criticalFocusAreas || ['Alan / Matematik Net Artışı', 'Haftalık Deneme'],
      });

      if ((data.matchPercentage || 0) >= 80) {
        confetti({ particleCount: 60, spread: 60 });
      }
    } catch (err) {
      console.error('Target simulation error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSetAsMainTarget = () => {
    if (onUpdateProfileTarget) {
      onUpdateProfileTarget(selectedTarget.title, `${selectedTarget.requiredScore} Puan`);
      confetti({ particleCount: 50, spread: 50 });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>YKS Üniversite & KPSS Kadro Simülatörü</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hedef Simülatörü & Net Eksik Haritası
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Hayalindeki üniversite veya KPSS kadrosunu seç; mevcut netlerinle kıyasla. Yapay zeka ile kazanma olasılığını, eksik kalan netlerini ve hedefine ulaştıracak stratejiyi anında gör.
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            {(['ALL', 'KPSS', 'YKS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'Tümü' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => {
          const isSelected = selectedTarget.id === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedTarget(preset);
                setAnalysisResult(null);
              }}
              className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                    preset.category === 'KPSS'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  }`}>
                    {preset.category}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    Taban: {preset.requiredScore}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">{preset.title}</h3>
                <p className="text-xs text-indigo-300 font-medium">{preset.subTitle}</p>
                <p className="text-[11px] text-slate-400 line-clamp-2">{preset.quotaOrInfo}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>{(preset?.requiredNets || []).length} Branş Hedefi</span>
                <span className="text-indigo-400 flex items-center gap-1">
                  {isSelected ? 'Seçildi' : 'Seç & Kıyasla'} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Target Deep Dive & Net Comparator */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">{selectedTarget.title}</h2>
            </div>
            <p className="text-xs text-slate-400">{selectedTarget.subTitle} • {selectedTarget.careerOutlook}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSetAsMainTarget}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              🎯 Profilime Ana Hedef Yap
            </button>
            <button
              id="run-target-simulation-button"
              disabled={isAnalyzing}
              onClick={handleRunSimulation}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Simüle Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Yapay Zeka ile Kazanma Simülasyonu Yap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Net Comparison Table / Sliders */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Branş Bazlı Net Kıyaslaması (Mevcut Durumun vs. Gereken Hedef)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(selectedTarget?.requiredNets || []).map((item) => {
              const currentNet = getAverageNetForSection(item.section, item.targetNet);
              const safeCurrent = isNaN(currentNet) ? 0 : currentNet;
              const safeTarget = isNaN(item.targetNet) || item.targetNet <= 0 ? 1 : item.targetNet;
              const rawDiff = Math.round((safeCurrent - safeTarget) * 10) / 10;
              const diff = isNaN(rawDiff) ? 0 : rawDiff;
              const isAhead = diff >= 0;
              const rawProgress = Math.round((safeCurrent / safeTarget) * 100);
              const progressPercent = isNaN(rawProgress) ? 0 : Math.min(100, Math.max(0, rawProgress));

              return (
                <div key={item.section} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{item.section}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      isAhead ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isAhead ? `+${diff} Net Fazla` : `${diff} Net Eksik`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPercent >= 100 ? 'bg-emerald-500' : progressPercent >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Mevcut: <strong className="text-slate-200">{currentNet} Net</strong></span>
                      <span>Hedef: <strong className="text-indigo-400">{item.targetNet} Net</strong></span>
                    </div>
                  </div>

                  {/* Quick adjustment input */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-900">
                    <span>Mevcut Netini Düzenle:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="120"
                      value={currentNet}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomNets((prev) => ({ ...prev, [item.section]: val }));
                      }}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs font-bold text-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Simulation Result Box */}
        {analysisResult && (
          <div className="p-6 rounded-3xl bg-indigo-950/40 border border-indigo-800/60 space-y-5 animate-in zoom-in-95">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl ${
                  analysisResult.matchPercentage >= 80
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : analysisResult.matchPercentage >= 60
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  %{analysisResult.matchPercentage}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Kazanma ve Ulaşma Olasılığı</h4>
                  <p className="text-xs text-slate-300">
                    {analysisResult.matchPercentage >= 80
                      ? 'Harika bir seviyedesin! Eksikleri koruyarak hedefi garantileyebilirsin.'
                      : analysisResult.matchPercentage >= 60
                      ? 'İyi bir temel var, kritik branş odaklanmasıyla bu hedefe ulaşabilirsin.'
                      : 'Ciddi bir net artışı gerekiyor. Yoğun çalışma ve telafi planı önerilir.'}
                  </p>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('planner')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md whitespace-nowrap"
                >
                  Bu Hedefe Göre Plan Hazırla
                </button>
              )}
            </div>

            {/* AI Advice & Focus Areas */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/50 text-xs text-slate-200 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Yapay Zeka Tercih & Sınav Koçu Tavsiyesi:</span>
                </div>
                <p className="whitespace-pre-wrap">{analysisResult.aiAdvice}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-400 mb-2">Öncelikli Odaklanman Gereken Noktalar:</h5>
                <div className="flex flex-wrap gap-2">
                  {(analysisResult?.criticalFocusAreas || []).map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{area}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
