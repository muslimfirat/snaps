import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ApiErrorDetail {
  message: string;
  status: number;
}

/**
 * Listens for `snaps:api-error` events dispatched by {@link apiFetch} and shows a
 * single dismissible toast. Repeated identical messages within a few seconds are
 * collapsed so a burst of failed requests doesn't stack.
 */
export const ApiErrorToast: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShownRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ApiErrorDetail>).detail;
      if (!detail?.message) return;

      const now = Date.now();
      if (detail.message === lastShownRef.current.msg && now - lastShownRef.current.at < 4000) {
        return;
      }
      lastShownRef.current = { msg: detail.message, at: now };

      setMessage(detail.message);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setMessage(null), 6000);
    };

    window.addEventListener('snaps:api-error', handler);
    return () => {
      window.removeEventListener('snaps:api-error', handler);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 sm:bottom-6 z-[200] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto max-w-sm w-full flex items-start gap-3 rounded-2xl bg-rose-950/95 border border-rose-500/40 text-rose-100 px-4 py-3 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed flex-1">{message}</p>
        <button
          onClick={() => setMessage(null)}
          className="text-rose-400 hover:text-white transition-colors shrink-0"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
