import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, Check, LogOut, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface GoogleAuthButtonProps {
  compact?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  compact = false,
  className = '',
  onSuccess,
}) => {
  const { currentUser, loading, syncStatus, signInWithGoogle, signOut, authError, clearAuthError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    clearAuthError();
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
      </div>
    );
  }

  // If user is logged in
  if (currentUser) {
    if (compact) {
      return (
        <div className={`relative shrink-0 ${className}`}>
          <button
            id="google-user-compact-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-xl bg-[#161822] hover:bg-[#1f2230] border border-[#2D3245] hover:border-emerald-500/40 text-xs text-slate-200 transition-all cursor-pointer shadow-sm shrink-0"
            title="Google Hesabı & Bulut Durumu"
          >
            <div className="relative shrink-0">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Kullanıcı'}
                  className="w-5 h-5 rounded-full object-cover border border-emerald-400/80"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
            </div>

            <span className="hidden md:inline max-w-[70px] lg:max-w-[90px] truncate font-medium text-slate-300">
              {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Bulut'}
            </span>
          </button>

          {showDropdown && (
            <div 
              className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-24px)] rounded-2xl bg-slate-900 border border-slate-700 p-3 shadow-2xl z-[100] animate-in fade-in zoom-in-95 space-y-3 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-full border border-emerald-400 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Google Kullanıcısı'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Firestore Bulut Eşitlemesi Aktif</span>
              </div>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  signOut();
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Oturumu Kapat</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 text-white space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'Kullanıcı'}
                className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 font-bold text-white flex items-center justify-center text-sm shadow-sm">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-white truncate">
                  {currentUser.displayName || 'Google Kullanıcısı'}
                </h4>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore Bulut Senkronizasyonu Aktif</span>
          </div>
          <span className="text-[11px] text-slate-400">Verileriniz güvende</span>
        </div>
      </div>
    );
  }

  // If user is NOT logged in and in compact mode
  if (compact) {
    return (
      <button
        id="google-signin-compact-btn"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-sm cursor-pointer ${
          isSigningIn ? 'opacity-70 cursor-wait' : ''
        } ${className}`}
        title="Google ile Giriş Yap & Buluta Yedekle"
      >
        {isSigningIn ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
        ) : (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
          </svg>
        )}
        <span className="hidden sm:inline">Giriş Yap</span>
      </button>
    );
  }

  // If user is NOT logged in
  return (
    <div className={`space-y-2 ${className}`}>
      <button
        id="google-signin-main-btn"
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer ${
          isSigningIn ? 'opacity-70 cursor-wait' : ''
        }`}
      >
        {isSigningIn ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>{isSigningIn ? 'Google Girişi Yapılıyor...' : 'Google ile Giriş Yap & Buluta Yedekle'}</span>
      </button>

      {authError && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between">
          <span>{authError}</span>
          <button onClick={clearAuthError} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
        </div>
      )}
    </div>
  );
};
