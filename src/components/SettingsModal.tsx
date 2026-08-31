import React, { useState, useEffect } from 'react';
import { Settings, Save, Target, Smartphone, Check, Zap, ShieldCheck, Lightbulb, Cloud, X, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react';
import { UserProfile, ExamCategory } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { isHapticsSupported, getHapticsEnabled, setHapticsEnabled, triggerHaptic, haptics } from '../lib/haptics';
import { INDIVIDUAL_STUDENT_PRICING } from '../data/institutionData';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../lib/useModalA11y';
import { getThemeMode, setThemeMode, type ThemeMode } from '../lib/themeMode';
import { isTelemetryEnabled, setTelemetryEnabled } from '../lib/telemetry';

interface SettingsModalProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onClose: () => void;
  /** İlk açılış kurulum akışı: kapatma engellenir, hoş geldin metni gösterilir. */
  isOnboarding?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
  isOnboarding = false,
}) => {
  const { currentUser } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(() => getThemeMode());
  const [name, setName] = useState(profile.name === 'Sınav Adayı' ? '' : profile.name);
  const [targetExam, setTargetExam] = useState<ExamCategory>(profile.targetExam);
  const [targetScore, setTargetScore] = useState(profile.targetScore);
  const [dailyQuestionTarget, setDailyQuestionTarget] = useState(profile.dailyQuestionTarget);
  const [dailyStudyHourTarget, setDailyStudyHourTarget] = useState(profile.dailyStudyHourTarget);
  const [examDate, setExamDate] = useState(profile.examDate);
  const [hapticEnabled, setHapticState] = useState(getHapticsEnabled());
  const [telemetryEnabled, setTelemetryState] = useState(isTelemetryEnabled());
  const [hasVibrated, setHasVibrated] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('snaps_study_insights_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [insightsFrequency, setInsightsFrequency] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('snaps_study_insights_frequency');
      return saved !== null ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleToggleInsights = (enabled: boolean) => {
    setInsightsEnabled(enabled);
    try {
      localStorage.setItem('snaps_study_insights_enabled', String(enabled));
    } catch {}
    window.dispatchEvent(
      new CustomEvent('update-study-insights-config', {
        detail: { enabled, frequency: insightsFrequency },
      })
    );
    haptics.light();
  };

  const handleFrequencyChange = (minutes: number) => {
    setInsightsFrequency(minutes);
    try {
      localStorage.setItem('snaps_study_insights_frequency', String(minutes));
    } catch {}
    window.dispatchEvent(
      new CustomEvent('update-study-insights-config', {
        detail: { enabled: insightsEnabled, frequency: minutes },
      })
    );
    haptics.selection();
  };

  const handleToggleHaptic = (enabled: boolean) => {
    setHapticState(enabled);
    setHapticsEnabled(enabled);
    if (enabled) {
      triggerHaptic('success');
    }
  };

  const handleTestHaptic = () => {
    haptics.success();
    setHasVibrated(true);
    setTimeout(() => setHasVibrated(false), 1500);
  };

  const handleSelectExam = (key: ExamCategory) => {
    haptics.selection();
    setTargetExam(key);
    if (EXAM_METADATA[key]?.defaultDate) {
      setExamDate(EXAM_METADATA[key].defaultDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    haptics.success();
    onUpdateProfile({
      ...profile,
      name: name.trim() || 'Aday Öğrenci',
      targetExam,
      targetScore: targetScore.trim() || '88.5',
      dailyQuestionTarget: Math.max(10, dailyQuestionTarget),
      dailyStudyHourTarget: Math.max(1, dailyStudyHourTarget),
      examDate,
    });
    onClose();
  };

  const dialogRef = useModalA11y<HTMLDivElement>();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Sticky Modal Header (Always Visible) */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-4 shrink-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="settings-modal-title" className="text-sm sm:text-base font-bold text-white truncate">
                {isOnboarding ? 'Snaps’e Hoş Geldin 👋' : 'Öğrenci Profili & Sınav Ayarları'}
              </h3>
              <p className="text-2xs text-slate-400 truncate">
                {isOnboarding
                  ? 'Başlamadan önce hedef sınavını ve günlük hedeflerini belirle'
                  : 'Hedef sınavınızı ve kişisel çalışma parametrelerinizi belirleyin'}
              </p>
            </div>
          </div>
          {!isOnboarding && (
            <button
              id="close-settings-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
              title="Kapat (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Form Body (Scrolls smoothly within modal) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* 1. HEDEF SINAV SEÇİMİ (Büyük Görsel Kartlar) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span>Hedef Sınavınızı Seçin</span>
                </label>
                <span className="text-2xs text-indigo-400 font-medium">
                  {EXAM_METADATA[targetExam]?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(EXAM_METADATA).map(([key, meta]) => {
                  const isSelected = targetExam === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectExam(key as ExamCategory)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold font-mono text-indigo-300">
                          {meta.shortName}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                        )}
                      </div>
                      <span className="text-2xs font-medium leading-tight text-slate-300 line-clamp-1">
                        {meta.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. AD & HİTAP ŞEKLİ */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Adınız / Hitap Şekli
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Müslüm Fırat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 3. HEDEF PUAN & SINAV TARİHİ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hedef Puan / Net
                </label>
                <input
                  type="text"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder="Örn: 89.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sınav Tarihi
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 4. GÜNLÜK HEDEFLER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Günlük Soru Hedefi (Adet)
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={dailyQuestionTarget}
                  onChange={(e) => setDailyQuestionTarget(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Günlük Çalışma (Saat)
                </label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={dailyStudyHourTarget}
                  onChange={(e) => setDailyStudyHourTarget(parseInt(e.target.value) || 4)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 5. GOOGLE CLOUD BACKUP */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span>Bulut Yedekleme & Google Hesabı</span>
                </div>
                <span className={`text-2xs font-mono font-medium ${currentUser ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {currentUser ? 'Buluta bağlı' : 'Yalnız bu cihazda'}
                </span>
              </div>
              <GoogleAuthButton />
            </div>

            {/* 5b. GÖRÜNÜM / TEMA */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Sun className="w-4 h-4 text-indigo-400" />
                <span>Görünüm</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { val: 'system', label: 'Sistem', Icon: Monitor },
                  { val: 'light', label: 'Gündüz', Icon: Sun },
                  { val: 'dark', label: 'Gece', Icon: Moon },
                ] as const).map(({ val, label, Icon }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { setThemeState(val); setThemeMode(val); haptics.selection(); }}
                    className={`py-2 px-1 rounded-xl text-2xs font-semibold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      theme === val
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. DOKUNSAL TİTREŞİM AYARLARI */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Dokunsal Titreşim Geri Bildirimi</span>
                    <span className="text-2xs text-slate-400 block">
                      Buton tıklamalarında ve soru seanslarında fiziksel haptic titreşim
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hapticEnabled}
                    onChange={(e) => handleToggleHaptic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {hapticEnabled && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-2xs text-slate-400">
                    {isHapticsSupported()
                      ? '✓ Cihazınızda Web Vibration API destekleniyor'
                      : 'ℹ️ Cihazınız titreşim desteğini kısıtlamış olabilir'}
                  </span>
                  <button
                    type="button"
                    onClick={handleTestHaptic}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-2xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {hasVibrated ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Titreşti!</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Titreşimi Test Et</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 7. ÇALIŞMA ESNASI AKILLI İPUÇLARI */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">Çalışma İpuçları (Study Insights)</span>
                    <span className="text-2xs text-slate-400 block">
                      Çalışma esnasında rehberlik ve odaklanma stratejileri
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insightsEnabled}
                    onChange={(e) => handleToggleInsights(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {insightsEnabled && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        İpucu Sıklığı:
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {insightsFrequency === 0 ? 'Yalnızca İstendiğinde' : `Her ${insightsFrequency} dakikada bir`}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: '5 dk', val: 5 },
                        { label: '15 dk', val: 15 },
                        { label: '30 dk', val: 30 },
                        { label: '60 dk', val: 60 },
                        { label: 'Manuel', val: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleFrequencyChange(opt.val)}
                          className={`py-1.5 px-1 rounded-xl text-2xs font-semibold border transition-all text-center cursor-pointer ${
                            insightsFrequency === opt.val
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 7b. GİZLİLİK — ANONİM HATA RAPORLAMA */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Anonim Hata Raporlama</span>
                    <span className="text-2xs text-slate-400 block">
                      Sadece hata mesajları — kişisel veri veya çalışma içeriği gönderilmez. Üçüncü taraf yok.
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telemetryEnabled}
                    onChange={(e) => { setTelemetryState(e.target.checked); setTelemetryEnabled(e.target.checked); haptics.light(); }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'privacy' }))}
                className="text-2xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Gizlilik &amp; KVKK metnini oku →
              </button>
            </div>

            {/* 8. LİSANS & ÜYELİK BİLGİSİ */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-indigo-950/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{INDIVIDUAL_STUDENT_PRICING.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-3xs font-bold">
                        Erken Erişim
                      </span>
                    </div>
                    <span className="text-2xs text-slate-400">
                      Öğrenci Sınav Koçluğu Paketi
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-400">
                  Tüm özellikler açık
                </span>
              </div>
            </div>

          </div>

          {/* Sticky Modal Footer (Always Visible at Bottom) */}
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-800 shrink-0 bg-slate-900/95 backdrop-blur-sm z-10">
            {!isOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
            )}
            <button
              id="save-settings-button"
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isOnboarding ? 'Kaydet ve Başla' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
