import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  LogIn, 
  Phone, 
  User, 
  Palette,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { InstitutionAccount } from '../types';
import { 
  getInstitutionAccounts, 
  loginInstitution, 
  registerInstitution 
} from '../lib/institutionAuth';
import { haptics } from '../lib/haptics';

interface InstitutionLoginViewProps {
  onLoginSuccess: (account: InstitutionAccount) => void;
  onReturnToStudentMode: () => void;
}

export const InstitutionLoginView: React.FC<InstitutionLoginViewProps> = ({
  onLoginSuccess,
  onReturnToStudentMode,
}) => {
  const [activeMode, setActiveMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regBranch, setRegBranch] = useState('');
  const [regDirector, setRegDirector] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLogoText, setRegLogoText] = useState('');
  const [regThemeColor, setRegThemeColor] = useState('#4f46e5');
  const [regError, setRegError] = useState<string | null>(null);

  const availableAccounts = getInstitutionAccounts();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = loginInstitution(loginEmail, loginPassword);
      setIsLoading(false);
      if (result.success && result.account) {
        haptics.success();
        onLoginSuccess(result.account);
      } else {
        haptics.error();
        setLoginError(result.error || 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.');
      }
    }, 300);
  };

  const handleQuickDemoLogin = (account: InstitutionAccount) => {
    haptics.selection();
    setLoginEmail(account.email);
    setLoginPassword(account.password);
    setLoginError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = loginInstitution(account.email, account.password);
      setIsLoading(false);
      if (result.success && result.account) {
        haptics.success();
        onLoginSuccess(result.account);
      }
    }, 250);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = registerInstitution({
        name: regName,
        branch: regBranch,
        directorName: regDirector,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        logoText: regLogoText,
        themeColor: regThemeColor,
      });

      setIsLoading(false);
      if (result.success && result.account) {
        haptics.success();
        onLoginSuccess(result.account);
      } else {
        haptics.error();
        setRegError(result.error || 'Kurum kaydı oluşturulamadı.');
      }
    }, 350);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Return to Student Mode Top Link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          id="return-to-student-mode-top-btn"
          onClick={() => {
            haptics.light();
            onReturnToStudentMode();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>← Öğrenci Çalışma Paneline Dön</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Şifreli & İzole Kurum Girişi</span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
        
        {/* Subtle Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Portal Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dershane & Kurumsal Yönetim Portalı
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Kurum yöneticileri, zümre başkanları ve rehberlik danışmanları için şifreli giriş. Her dershane kendi e-posta ve şifresiyle oturum açarak sadece kendi öğrencilerini ve sınavlarını yönetir.
          </p>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex p-1 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-md mx-auto mb-8">
          <button
            id="tab-institution-login"
            onClick={() => {
              haptics.selection();
              setActiveMode('LOGIN');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'LOGIN'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Kurumsal Giriş Yap</span>
          </button>

          <button
            id="tab-institution-register"
            onClick={() => {
              haptics.selection();
              setActiveMode('REGISTER');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'REGISTER'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Dershane Kaydı</span>
          </button>
        </div>

        {/* MODE 1: LOGIN FORM */}
        {activeMode === 'LOGIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Email & Password Form */}
            <div className="lg:col-span-7 space-y-5">
              <form onSubmit={handleLogin} className="space-y-4">
                
                {loginError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Kurumsal E-Posta Adresi
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="inst-login-email-input"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ornek@akademi.k12.tr"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Kurum Giriş Şifresi
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Örn: hedef2026
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="inst-login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="inst-submit-login-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Kurum Hesabına Güvenli Giriş Yap</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Security Banner */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-bit Veri Güvenliği: Öğrenci ve veli telefon kayıtları sadece kurumunuzun yetkili oturumuna açıktır.</span>
              </div>
            </div>

            {/* Right: Quick Demo Accounts (Click to Login) */}
            <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Hazır Test Kurumları
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Tek tıkla giriş
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Farklı dershanelerin kendi izole öğrenci ve karne verilerini anında test etmek için bir kurumu seçin:
              </p>

              <div className="space-y-2.5 pt-1">
                {availableAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    id={`quick-login-${acc.id}`}
                    onClick={() => handleQuickDemoLogin(acc)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shadow-sm shrink-0"
                        style={{ backgroundColor: acc.themeColor || '#4f46e5' }}
                      >
                        {acc.logoText || 'KD'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5 font-mono">
                          <span>{acc.email}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-indigo-400/90">{acc.password}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* MODE 2: REGISTER NEW INSTITUTION */}
        {activeMode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="max-w-2xl mx-auto space-y-4">
            
            {regError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{regError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Dershane / Kurum Adı *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Örn: Zafer VIP Hazırlık Kursu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Şube / Kampüs
                </label>
                <input
                  id="reg-inst-branch"
                  type="text"
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  placeholder="Örn: Ankara Çayyolu Şubesi"
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kurucu / Müdür Adı
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-director"
                    type="text"
                    value={regDirector}
                    onChange={(e) => setRegDirector(e.target.value)}
                    placeholder="Örn: Prof. Dr. Kemal Vural"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  İletişim Telefonu
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-phone"
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Örn: 0 (312) 234 56 78"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kurumsal Giriş E-Postası *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="yonetim@zafer.k12.tr"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Giriş Şifresi Belirleyin *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reg-inst-password"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="En az 4 karakter"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Logo Kısaltması (2 Harf)
                </label>
                <input
                  id="reg-inst-logotext"
                  type="text"
                  maxLength={4}
                  value={regLogoText}
                  onChange={(e) => setRegLogoText(e.target.value.toUpperCase())}
                  placeholder="Örn: ZV"
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kurum Tema Rengi
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="reg-inst-themecolor"
                    type="color"
                    value={regThemeColor}
                    onChange={(e) => setRegThemeColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs text-slate-400 font-mono">{regThemeColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                id="submit-register-institution-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dershaneyi Kaydet ve Yönetim Paneline Geç</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Bottom Student Switcher Footer Note */}
      <div className="text-center mt-6">
        <p className="text-xs text-slate-500">
          Öğrenci misiniz? Şifre girmeden doğrudan ders çalışmak için{' '}
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
