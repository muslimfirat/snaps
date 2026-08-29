import React from 'react';
import { 
  X, 
  Sparkles, 
  Camera, 
  Bot, 
  Calendar, 
  Trophy, 
  CheckCircle2, 
  ArrowRight,
  HelpCircle,
  Flame,
  Layers,
  GraduationCap
} from 'lucide-react';
import { MainTabCategory } from '../types';

interface QuickStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, category?: MainTabCategory) => void;
}

export const QuickStartModal: React.FC<QuickStartModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: '1',
      title: 'Hedefini & Sınavını Belirle',
      desc: 'Üst bardan hedef sınavını (KPSS / YKS) ve hedef puanını seç. Geri sayım sayacın otomatik olarak başlayacaktır.',
      icon: Trophy,
      color: 'from-amber-500 to-orange-500',
      actionText: 'Hedef Ayarlarına Git',
      action: () => {
        onClose();
        onNavigateTab('dashboard', 'OVERVIEW');
      },
    },
    {
      step: '2',
      title: 'Yapamadığın Soruyu Fotoğrafla',
      desc: 'Denemede veya testte çözemediğin sorunun fotoğrafını yükle. Yapay zeka adım adım ÖSYM mantığıyla çözsün ve Hata Bankana kaydetsin.',
      icon: Camera,
      color: 'from-indigo-500 to-cyan-500',
      actionText: 'Soru Çözdürmeyi Dene',
      action: () => {
        onClose();
        onNavigateTab('snap', 'AI_STUDIO');
      },
    },
    {
      step: '3',
      title: 'AI Koçunla Strateji Belirle',
      desc: 'Sesli veya yazılı yapay zeka koçuna takıldığın konuları sor, haftalık ders çalışma programını otomatik planla.',
      icon: Bot,
      color: 'from-pink-500 to-rose-500',
      actionText: 'Sesli Koçla Konuş',
      action: () => {
        onClose();
        onNavigateTab('voice_coach', 'AI_STUDIO');
      },
    },
    {
      step: '4',
      title: 'Günlük Halkalarını Kapat & Rozetleri Kazan',
      desc: 'Her gün çözdüğün soruları ve ders sürelerini kaydet, çalışma serini (Streak) bozma ve başarı ünvanlarını profilinde kuşan!',
      icon: Flame,
      color: 'from-emerald-500 to-teal-500',
      actionText: 'Hedeflerimi Gör',
      action: () => {
        onClose();
        onNavigateTab('dashboard', 'OVERVIEW');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-lg">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Snaps Nasıl Kullanılır? (Hızlı Başlangıç)
              </h3>
              <p className="text-xs text-slate-400">
                Sınav hazırlığını 4 adımda disiplinli ve verimli hale getir.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[65vh]">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.color} text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                        Adım {s.step}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {s.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                      {s.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={s.action}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-end sm:self-center flex-shrink-0 shadow-sm"
                >
                  <span>{s.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Dilediğin an arama çubuğundan veya başlıktan bu rehbere ulaşabilirsin.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md"
          >
            Anladım, Başla!
          </button>
        </div>

      </div>
    </div>
  );
};
