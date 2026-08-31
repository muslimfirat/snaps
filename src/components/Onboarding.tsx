import React, { useState } from 'react';
import {
  Sparkles, Camera, BarChart3, Flame, Target, Calendar, ArrowRight, ArrowLeft,
  Check, Minus, Plus, LayoutGrid, ClipboardList,
} from 'lucide-react';
import { UserProfile, ExamCategory } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { LEGAL_VERSION } from '../data/legalContent';
import { GoogleAuthButton } from './GoogleAuthButton';
import { haptics } from '../lib/haptics';

interface OnboardingProps {
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onOpenLegal: (doc: 'privacy' | 'terms') => void;
}

const VALUE_PROPS = [
  { icon: Camera, title: 'Fotoğrafla çöz', desc: 'Takıldığın soruyu çek, yapay zeka ÖSYM mantığıyla adım adım çözsün.' },
  { icon: BarChart3, title: 'Kişisel plan & analiz', desc: 'Haftalık program, deneme takibi ve eksik konu haritan bir arada.' },
  { icon: Flame, title: 'Zinciri kırma', desc: 'Çalışma serini koru, momentumunu gör, motivasyonunu yüksek tut.' },
];

const FEATURE_CARDS = [
  { icon: Camera, title: 'Soru Çöz', desc: 'Fotoğraftan anında çözüm' },
  { icon: LayoutGrid, title: 'Çalışma Araçları', desc: 'Deneme, hata defteri, pomodoro, koç' },
  { icon: Flame, title: 'İstikrar Merkezi', desc: 'Seri, momentum, ısı haritası' },
  { icon: ClipboardList, title: 'Takvim', desc: 'Geri sayım, günlük odak, planlı deneme' },
];

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v || min)));

export const Onboarding: React.FC<OnboardingProps> = ({ initialProfile, onComplete, onOpenLegal }) => {
  const [step, setStep] = useState(0);
  const [targetExam, setTargetExam] = useState<ExamCategory>(initialProfile.targetExam || 'KPSS_LISANS');
  const [examDate, setExamDate] = useState(initialProfile.examDate || EXAM_METADATA[initialProfile.targetExam]?.defaultDate || '');
  const [name, setName] = useState(initialProfile.name && initialProfile.name !== 'Sınav Adayı' ? initialProfile.name : '');
  const [targetScore, setTargetScore] = useState(initialProfile.targetScore || '');
  const [dailyQuestionTarget, setDailyQuestionTarget] = useState(initialProfile.dailyQuestionTarget || 100);
  const [dailyStudyHourTarget, setDailyStudyHourTarget] = useState(initialProfile.dailyStudyHourTarget || 4);
  const [consent, setConsent] = useState(false);

  const go = (n: number) => { haptics.selection(); setStep(n); };

  const pickExam = (key: ExamCategory) => {
    haptics.selection();
    setTargetExam(key);
    if (EXAM_METADATA[key]?.defaultDate) setExamDate(EXAM_METADATA[key].defaultDate);
  };

  const finish = () => {
    haptics.success();
    try { localStorage.setItem('snaps_legal_accepted', JSON.stringify({ version: LEGAL_VERSION, at: new Date().toISOString() })); } catch { /* ignore */ }
    onComplete({
      ...initialProfile,
      name: name.trim() || 'Aday Öğrenci',
      targetExam,
      targetScore: targetScore.trim() || '88.5',
      examDate,
      dailyQuestionTarget: clampInt(dailyQuestionTarget, 10, 500),
      dailyStudyHourTarget: clampInt(dailyStudyHourTarget, 1, 16),
      onboarded: true,
    });
  };

  const canContinueStep1 = !!targetExam && !!examDate;
  const canContinueStep2 = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] bg-canvas flex flex-col overflow-y-auto">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-5 py-8 sm:py-12">

        {/* İlerleme */}
        <div className="flex items-center gap-1.5 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : 'bg-surface-2'}`} />
          ))}
        </div>

        {/* ADIM 0 — Karşılama */}
        {step === 0 && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Sparkles className="w-6 h-6 fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white leading-tight">Snaps</h1>
                <p className="text-xs text-slate-400">KPSS &amp; YKS AI Sınav Koçu</p>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white leading-tight mb-2">
              Sınav hazırlığını akıllı bir koça dönüştür
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              30 saniyede kurulum yap, ilk günden verimli çalışmaya başla.
            </p>

            <div className="space-y-3 mb-8">
              {VALUE_PROPS.map((v) => (
                <div key={v.title} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface-1 border border-border">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center shrink-0">
                    <v.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{v.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-3">
              <button
                onClick={() => go(1)}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Hadi başlayalım <ArrowRight className="w-4 h-4" />
              </button>
              <div className="rounded-2xl bg-surface-1 border border-border p-3">
                <p className="text-2xs text-slate-400 mb-2 text-center">Zaten hesabın var mı? Verilerini geri yükle.</p>
                <GoogleAuthButton />
              </div>
            </div>
          </div>
        )}

        {/* ADIM 1 — Sınav & tarih */}
        {step === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" /> Hangi sınava hazırlanıyorsun?
            </h2>
            <p className="text-xs text-slate-400 mb-5">Müfredat ve çıkmış soru verileri buna göre yüklenir.</p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {(Object.entries(EXAM_METADATA) as [ExamCategory, typeof EXAM_METADATA[ExamCategory]][]).map(([key, meta]) => {
                const sel = targetExam === key;
                return (
                  <button
                    key={key}
                    onClick={() => pickExam(key)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      sel ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-surface-1 border-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">{meta.shortName}</span>
                      {sel && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <span className="text-2xs text-slate-400 leading-tight block mt-1">{meta.name}</span>
                  </button>
                );
              })}
            </div>

            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Sınav tarihi
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />

            <div className="mt-auto pt-8 flex gap-3">
              <button onClick={() => go(0)} className="h-12 px-5 rounded-2xl bg-surface-1 border border-border text-slate-300 font-semibold flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
              <button
                onClick={() => go(2)}
                disabled={!canContinueStep1}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Devam <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ADIM 2 — Sen */}
        {step === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <h2 className="text-xl font-black text-white mb-1">Seni tanıyalım</h2>
            <p className="text-xs text-slate-400 mb-5">Koçluk mesajları ve hedeflerin bunlara göre kişiselleşir.</p>

            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Adın / hitap şeklin</label>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Elif"
              className="w-full bg-surface-1 border border-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
            />

            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Hedef puan / sıralama</label>
            <input
              type="text"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder={EXAM_METADATA[targetExam]?.targetHint?.replace('Hedef: ', '') || 'Örn: 88.5'}
              className="w-full bg-surface-1 border border-border rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-5"
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Stepper label="Günlük soru" value={dailyQuestionTarget} step={10} min={10} max={500} onChange={setDailyQuestionTarget} suffix="soru" />
              <Stepper label="Günlük çalışma" value={dailyStudyHourTarget} step={1} min={1} max={16} onChange={setDailyStudyHourTarget} suffix="saat" />
            </div>
            <p className="text-2xs text-slate-500 leading-snug">
              💡 Küçük ve her gün tutabileceğin bir hedef, büyük ama sık kaçırılan hedeften daha çok ilerletir. Sonra artırabilirsin.
            </p>

            <div className="mt-auto pt-8 flex gap-3">
              <button onClick={() => go(1)} className="h-12 px-5 rounded-2xl bg-surface-1 border border-border text-slate-300 font-semibold flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
              <button
                onClick={() => go(3)}
                disabled={!canContinueStep2}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Devam <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ADIM 3 — Hazırsın + onay */}
        {step === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in">
            <h2 className="text-xl font-black text-white mb-1">Hazırsın{name.trim() ? `, ${name.trim()}` : ''}! 🎯</h2>
            <p className="text-xs text-slate-400 mb-5">İşte en çok kullanacağın 4 alan:</p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {FEATURE_CARDS.map((f) => (
                <div key={f.title} className="p-3.5 rounded-2xl bg-surface-1 border border-border">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center mb-2">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white">{f.title}</h3>
                  <p className="text-2xs text-slate-400 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-surface-1 border border-border p-3.5 mb-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  <button type="button" onClick={() => onOpenLegal('privacy')} className="text-indigo-400 hover:underline">Gizlilik &amp; KVKK Metni</button>
                  {' '}ve{' '}
                  <button type="button" onClick={() => onOpenLegal('terms')} className="text-indigo-400 hover:underline">Kullanım Koşulları</button>
                  {"'nı okudum, kabul ediyorum."}
                </span>
              </label>
            </div>

            <div className="mt-auto flex gap-3">
              <button onClick={() => go(2)} className="h-12 px-5 rounded-2xl bg-surface-1 border border-border text-slate-300 font-semibold flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
              <button
                onClick={finish}
                disabled={!consent}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Snaps'i Aç <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Stepper: React.FC<{
  label: string; value: number; step: number; min: number; max: number;
  onChange: (v: number) => void; suffix: string;
}> = ({ label, value, step, min, max, onChange, suffix }) => (
  <div className="rounded-2xl bg-surface-1 border border-border p-3">
    <span className="text-2xs text-slate-400 block mb-1.5">{label}</span>
    <div className="flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => { haptics.selection(); onChange(clampInt(value - step, min, max)); }}
        className="w-7 h-7 rounded-lg bg-surface-0 border border-border text-slate-300 flex items-center justify-center hover:text-white shrink-0"
        aria-label="Azalt"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="text-center">
        <span className="text-base font-black font-mono text-white">{value}</span>
        <span className="text-3xs text-slate-500 block leading-none">{suffix}</span>
      </div>
      <button
        type="button"
        onClick={() => { haptics.selection(); onChange(clampInt(value + step, min, max)); }}
        className="w-7 h-7 rounded-lg bg-surface-0 border border-border text-slate-300 flex items-center justify-center hover:text-white shrink-0"
        aria-label="Artır"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
