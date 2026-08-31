import React, { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { LEGAL_DOCS } from '../data/legalContent';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Açılışta gösterilecek belge. */
  initialDoc?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialDoc = 'privacy' }) => {
  const [active, setActive] = useState<'privacy' | 'terms'>(initialDoc);

  useEffect(() => {
    if (isOpen) setActive(initialDoc);
  }, [isOpen, initialDoc]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const doc = LEGAL_DOCS.find((d) => d.id === active) || LEGAL_DOCS[0];

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="bg-surface-1 border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h3 id="legal-modal-title" className="text-sm sm:text-base font-bold text-white truncate">Yasal Bilgiler</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface-0 hover:bg-surface-2 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1.5 px-4 sm:px-6 pt-3 shrink-0">
          {LEGAL_DOCS.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active === d.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-surface-0'
              }`}
            >
              {d.id === 'privacy' ? 'Gizlilik & KVKK' : 'Kullanım Koşulları'}
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">{doc.title}</h4>
            <p className="text-3xs text-slate-500 mt-0.5">Son güncelleme: {doc.updated}</p>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{doc.intro}</p>
          {doc.sections.map((s, i) => (
            <div key={i} className="space-y-1.5">
              <h5 className="text-xs font-bold text-slate-100">{s.heading}</h5>
              {s.body.map((p, j) => (
                <p key={j} className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{p}</p>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
