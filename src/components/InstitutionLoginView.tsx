import React, { useEffect, useState } from 'react';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { InstitutionAccount } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyInstitution,
  createInstitution,
  seedDemoInstitution,
} from '../lib/institutionStore';
import { GoogleAuthButton } from './GoogleAuthButton';
import { haptics } from '../lib/haptics';

interface InstitutionLoginViewProps {
  onLoginSuccess: (account: InstitutionAccount) => void;
  onReturnToStudentMode: () => void;
}

type Phase = 'CHECKING' | 'NEEDS_GOOGLE' | 'NO_INSTITUTION' | 'RESOLVED';

export const InstitutionLoginView: React.FC<InstitutionLoginViewProps> = ({
  onLoginSuccess,
  onReturnToStudentMode,
}) => {
  const { currentUser } = useAuth();

  const [phase, setPhase] = useState<Phase>('CHECKING');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create-institution form state
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [director, setDirector] = useState('');
  const [phone, setPhone] = useState('');
  const [logoText, setLogoText] = useState('');
  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [withSampleData, setWithSampleData] = useState(false);

  // On sign-in, look up whether this Google account already owns / belongs to an institution.
  useEffect(() => {
    if (!currentUser) {
      setPhase('NEEDS_GOOGLE');
      return;
    }

    let cancelled = false;
    setPhase('CHECKING');
    setError(null);
    (async () => {
      try {
        const account = await fetchMyInstitution(currentUser.uid);
        if (cancelled) return;
        if (account) {
          setPhase('RESOLVED');
          haptics.success();
          onLoginSuccess(account);
        } else {
          setPhase('NO_INSTITUTION');
        }
      } catch (err) {
        console.error('Institution lookup failed:', err);
        if (!cancelled) {
          setError('Kurum bilgileri alınamadı. Lütfen tekrar deneyin.');
          setPhase('NO_INSTITUTION');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      setError('Kurum adı zorunludur.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const email = currentUser.email || '';
      const account = withSampleData
        ? await seedDemoInstitution(currentUser.uid, email)
        : await createInstitution(currentUser.uid, email, {
            name,
            branch,
            directorName: director,
            phone,
            logoText,
            themeColor,
          });
      haptics.success();
      onLoginSuccess(account);
    } catch (err) {
      console.error('Institution create failed:', err);
      haptics.error();
      setError('Kurum oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
      <div className="mb-6">
        <button
          id="return-to-student-mode-top-btn"
          onClick={() => {
            haptics.light();
            onReturnToStudentMode();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Öğrenci Çalışma Paneline Dön</span>
        </button>
      </div>

      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center max-w-xl mx-auto mb-8 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dershane & Kurumsal Yönetim Portalı
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Kurum yöneticileri ve rehberlik danışmanları için sınıf analizi, öğrenci takibi ve
            veli raporu araçları. Erişim Google hesabınıza bağlıdır; kurum verileriniz Firestore'da
            yalnızca yetkili üyelerinize açıktır.
          </p>
        </div>

        {error && (
          <div className="max-w-lg mx-auto mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase: not signed in with Google */}
        {phase === 'NEEDS_GOOGLE' && (
          <div className="max-w-md mx-auto space-y-4 text-center">
            <p className="text-sm text-slate-300">
              Kurum paneline erişmek için Google hesabınızla giriş yapın.
            </p>
            <GoogleAuthButton />
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-3 text-xs text-slate-400 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Öğrenci ve veli iletişim bilgileri yalnızca kurumunuzun `memberUids` listesindeki
                yetkili hesaplara açıktır (Firestore güvenlik kuralları).
              </span>
            </div>
          </div>
        )}

        {/* Phase: checking membership */}
        {phase === 'CHECKING' && (
          <div className="flex items-center justify-center gap-3 py-10 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Kurum yetkiniz kontrol ediliyor…</span>
          </div>
        )}

        {/* Phase: signed in, no institution yet → create one */}
        {phase === 'NO_INSTITUTION' && (
          <form onSubmit={handleCreate} className="max-w-2xl mx-auto space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-[12px] text-indigo-100/90 leading-relaxed">
              <strong className="text-white">{currentUser?.email}</strong> hesabına bağlı bir kurum
              bulunamadı. Yeni bir kurum oluşturun; sahibi ve ilk yetkili üyesi siz olursunuz.
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={withSampleData}
                onChange={(e) => setWithSampleData(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span>
                Örnek sınıf, öğrenci ve deneme verileriyle başlat (kurgusal; paneli denemek için).
              </span>
            </label>

            <fieldset disabled={withSampleData} className="space-y-4 disabled:opacity-40 transition-opacity">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Dershane / Kurum Adı *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: Zafer VIP Hazırlık Kursu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Şube / Kampüs</label>
                  <input
                    id="reg-inst-branch"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Örn: Ankara Çayyolu Şubesi"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">İletişim Telefonu</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-inst-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Örn: 0 (312) 234 56 78"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Kurucu / Müdür Adı</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="reg-inst-director"
                      type="text"
                      value={director}
                      onChange={(e) => setDirector(e.target.value)}
                      placeholder="Örn: Prof. Dr. Kemal Vural"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Logo (2-4 harf)</label>
                    <input
                      id="reg-inst-logotext"
                      type="text"
                      maxLength={4}
                      value={logoText}
                      onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                      placeholder="ZV"
                      className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Tema Rengi</label>
                    <input
                      id="reg-inst-themecolor"
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-full h-[42px] rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="pt-2">
              <button
                id="submit-register-institution-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {withSampleData
                        ? 'Örnek Verilerle Kurum Oluştur ve Panele Geç'
                        : 'Kurumu Oluştur ve Yönetim Paneline Geç'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-slate-500">
          Öğrenci misiniz?{' '}
          <button
            onClick={onReturnToStudentMode}
            className="text-indigo-400 hover:underline font-semibold"
          >
            Öğrenci Modu
          </button>
          'na dönebilirsiniz.
        </p>
      </div>
    </div>
  );
};
