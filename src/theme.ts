// src/theme.ts - JS renk sabitleri (recharts / SVG / dinamik className için)
//
// ⚠️ TEK RENK KAYNAĞI: src/index.css `@theme` bloğu. Buradaki hex değerleri onu
// YANSITIR — ikisi birbirini tutmalı. Yeni renk eklerken önce @theme'e ekle.
// Yüzey (surface) ve metin (text) renkleri artık burada TUTULMUYOR; onlar için
// `bg-canvas / bg-surface-1 / text-fg-muted` gibi Tailwind util'lerini kullan.

export const THEME = {
  brand: {
    primary: '#4F46E5', // --color-brand (tek indigo tonu)
    hover: '#4338CA',   // --color-brand-hover
    surface: 'rgba(79, 70, 229, 0.12)',
    border: 'rgba(79, 70, 229, 0.30)',
    tailwind: {
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30',
      activeTab: 'bg-indigo-600 text-white shadow-sm',
    }
  },

  // 6 Temel Ders Renkleri
  subjects: {
    turkish: {
      id: 'turkish',
      name: 'Türkçe',
      hex: '#059669', // emerald-600
      bg: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.30)',
      textColor: 'text-emerald-400',
      barBg: 'bg-emerald-600',
      badgeClass: 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
    },
    math: {
      id: 'math',
      name: 'Matematik',
      hex: '#0284C7', // sky-600
      bg: 'rgba(2, 132, 199, 0.12)',
      border: 'rgba(2, 132, 199, 0.30)',
      textColor: 'text-sky-400',
      barBg: 'bg-sky-600',
      badgeClass: 'bg-sky-600/15 text-sky-300 border-sky-600/30',
    },
    history: {
      id: 'history',
      name: 'Tarih',
      hex: '#D97706', // amber-600
      bg: 'rgba(217, 119, 6, 0.12)',
      border: 'rgba(217, 119, 6, 0.30)',
      textColor: 'text-amber-400',
      barBg: 'bg-amber-600',
      badgeClass: 'bg-amber-600/15 text-amber-300 border-amber-600/30',
    },
    geography: {
      id: 'geography',
      name: 'Coğrafya',
      hex: '#DB2777', // pink-600 (Türkçe ile ayrıştı)
      bg: 'rgba(219, 39, 119, 0.12)',
      border: 'rgba(219, 39, 119, 0.30)',
      textColor: 'text-pink-400',
      barBg: 'bg-pink-600',
      badgeClass: 'bg-pink-600/15 text-pink-300 border-pink-600/30',
    },
    citizenship: {
      id: 'citizenship',
      name: 'Vatandaşlık / Hukuk',
      hex: '#475569', // slate-600 (Mordan uzak, resmi/gri-mavi)
      bg: 'rgba(71, 85, 105, 0.15)',
      border: 'rgba(71, 85, 105, 0.30)',
      textColor: 'text-slate-300',
      barBg: 'bg-slate-600',
      badgeClass: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
    },
    science: {
      id: 'science',
      name: 'Fen Bilimleri',
      hex: '#65A30D', // lime-600 (Hata kırmızısından ayrıldı)
      bg: 'rgba(101, 163, 13, 0.12)',
      border: 'rgba(101, 163, 13, 0.30)',
      textColor: 'text-lime-400',
      barBg: 'bg-lime-600',
      badgeClass: 'bg-lime-600/15 text-lime-300 border-lime-600/30',
    },
  },

  // Fonksiyonel Durum Renkleri — @theme semantik token'larını yansıtır
  status: {
    success: {
      hex: '#35C393', // --color-success
      lightHex: '#4CD3A6',
      bg: 'rgba(53, 195, 147, 0.12)',
      border: 'rgba(53, 195, 147, 0.30)',
      textClass: 'text-emerald-400',
      barBg: 'bg-emerald-500',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    error: {
      hex: '#E26571', // --color-danger
      lightHex: '#EC7B85',
      bg: 'rgba(226, 101, 113, 0.12)',
      border: 'rgba(226, 101, 113, 0.30)',
      textClass: 'text-rose-400',
      barBg: 'bg-rose-500',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    },
    warning: {
      hex: '#DDA544', // --color-warning
      lightHex: '#E6B968',
      bg: 'rgba(221, 165, 68, 0.12)',
      border: 'rgba(221, 165, 68, 0.30)',
      textClass: 'text-amber-400',
      barBg: 'bg-amber-500',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
  },
} as const;

export type ThemeSubjectKey = keyof typeof THEME.subjects;

// Helper to resolve subject theme from subject name or category
export function getSubjectTheme(nameOrCategory: string) {
  const normalized = (nameOrCategory || '').toLowerCase();
  
  if (normalized.includes('türkçe') || normalized.includes('edebiyat') || normalized.includes('dil')) {
    return THEME.subjects.turkish;
  }
  if (normalized.includes('matematik') || normalized.includes('geometri') || normalized.includes('sayısal')) {
    return THEME.subjects.math;
  }
  if (normalized.includes('tarih') || normalized.includes('inkılap')) {
    return THEME.subjects.history;
  }
  if (normalized.includes('coğrafya')) {
    return THEME.subjects.geography;
  }
  if (normalized.includes('vatandaşlık') || normalized.includes('anayasa') || normalized.includes('güncel') || normalized.includes('felsefe') || normalized.includes('din')) {
    return THEME.subjects.citizenship;
  }
  if (normalized.includes('fizik') || normalized.includes('kimya') || normalized.includes('biyoloji') || normalized.includes('fen')) {
    return THEME.subjects.science;
  }

  // Fallback to math/sky style
  return THEME.subjects.math;
}
