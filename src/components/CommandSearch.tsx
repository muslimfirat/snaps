import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, Bot, Calendar, BarChart3, BookOpen, Zap, Bookmark, Sparkles, Target, Clock, Share2, Building2, ArrowRight, X, Flame, Lightbulb } from 'lucide-react';
import { MainTabCategory } from '../types';
import { INSTITUTION_ENABLED } from '../lib/features';

export interface CommandItem {
  id: string;
  category: MainTabCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  keywords: string[];
}

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (category: MainTabCategory, subTab: string) => void;
}

export const COMMAND_ITEMS: CommandItem[] = [
  // 1. Anasayfa
  {
    id: 'dashboard',
    category: 'HOME',
    title: 'Genel Bakış & Günün Görevleri',
    subtitle: 'Sınav geri sayımı, günlük yapılacaklar listesi, çözülen soru ve haftalık özet',
    icon: Sparkles,
    keywords: ['ana sayfa', 'dashboard', 'genel bakış', 'özet', 'istatistik', 'seri', 'günlük', 'görev', 'görevler', 'kontrol listesi', 'todo', 'yapılacaklar'],
  },
  {
    id: 'curriculum',
    category: 'HOME',
    title: 'Müfredat, Konu Takibi & Hap Notlar',
    subtitle: 'ÖSYM konu dağılımları, hafıza teknikleri (mnemonic) ve mini quizler',
    icon: BookOpen,
    keywords: ['müfredat', 'konu', 'not', 'hap bilgi', 'hafıza', 'quiz', 'dersler', 'tarih', 'matematik'],
  },
  {
    id: 'notes',
    category: 'HOME',
    title: 'Defter Notları — El Yazısı Ders Notları',
    subtitle: 'Ekip el yazısı konu notları + kendi defter sayfalarını fotoğraflayıp ekle, tekrar et',
    icon: BookOpen,
    badge: 'YENİ',
    keywords: ['defter', 'not', 'ders notu', 'el yazısı', 'notlar', 'defter notları', 'konu notu', 'özet'],
  },
  {
    id: 'streak',
    category: 'HOME',
    title: 'İstikrar Analitiği & Seri Grafiği',
    subtitle: 'Haftalık 7 günlük çalışma tutarlılığı, soru ve dakika sütun grafiği',
    icon: Flame,
    badge: 'Analiz',
    keywords: ['seri', 'streak', 'istikrar', 'grafik', 'analiz', 'haftalık', 'sütun', 'tutarlılık', 'bar chart'],
  },
  {
    id: 'study_insight',
    category: 'HOME',
    title: '💡 Çalışma İpucu & Taktik Bildirimi',
    subtitle: 'Hafıza, turlama tekniği, odak veya soru çözme taktiğini ekranda anında göster',
    icon: Lightbulb,
    badge: 'İPUCU',
    keywords: ['ipucu', 'taktik', 'insight', 'hafıza', 'turlama', 'feynman', 'odak', 'çalışma', 'teknik'],
  },

  // 2. Takvim
  {
    id: 'planner',
    category: 'CALENDAR',
    title: 'Haftalık Koçluk & Çalışma Planı',
    subtitle: 'Yapay zeka ile kişiye özel 7 günlük optimize edilmiş ders programı ve saatlik takvim',
    icon: Calendar,
    keywords: ['plan', 'program', 'çalışma programı', 'haftalık plan', 'ders programı', 'çizelge', 'takvim'],
  },

  // 3. Antrenman & Soru & Yapay Zeka & Deneme
  {
    id: 'snap',
    category: 'TRAINING',
    title: 'Fotoğraftan Soru Çözdür (Snap)',
    subtitle: 'Kameradan veya galeriden soruyu yükle, anında adım adım çözümü gör',
    icon: Camera,
    badge: 'AI',
    keywords: ['soru çöz', 'snap', 'fotoğraf', 'kamera', 'ocr', 'çözüm', 'adım adım', 'ödev'],
  },
  {
    id: 'mock',
    category: 'TRAINING',
    title: 'Deneme Sınavı Net Takibi',
    subtitle: 'TG ve branş denemeleri net kaydı, grafik analizi ve eksik konu tespiti',
    icon: BarChart3,
    badge: 'DENEME',
    keywords: ['deneme', 'net', 'grafik', 'tg', 'türkiye geneli', 'puan', 'analiz', 'sonuç'],
  },
  {
    id: 'mistakes',
    category: 'TRAINING',
    title: 'Akıllı Hata Defteri & İkiz Soru',
    subtitle: '4 seviyeli Leitner kutusu, yanlış analizleri ve AI ikiz soru üretici',
    icon: Bookmark,
    badge: 'LEITNER',
    keywords: ['hata', 'yanlış', 'defter', 'leitner', 'ikiz soru', 'benzer soru', 'tekrar', 'aralıklı tekrar'],
  },
  {
    id: 'pomodoro',
    category: 'TRAINING',
    title: 'Odak & Pomodoro Zamanlayıcı',
    subtitle: 'Yağmur, beyaz gürültü ve 432Hz alfa frekansları eşliğinde derin çalışma',
    icon: Zap,
    badge: 'ODAK',
    keywords: ['pomodoro', 'odak', 'zamanlayıcı', 'kronometre', 'ses', 'müzik', 'yağmur', 'çalışma'],
  },
  {
    id: 'simulator',
    category: 'TRAINING',
    title: 'ÖSYM Hedef & Puan Simülatörü',
    subtitle: 'Hedeflenen üniversite, bölüm veya KPSS memurluk/öğretmenlik kazanma olasılığı',
    icon: Target,
    badge: 'ÖSYM',
    keywords: ['simülatör', 'hedef', 'üniversite', 'puan', 'kpss puanı', 'öğretmenlik', 'sıralama', 'kadro'],
  },
  {
    id: 'voice_coach',
    category: 'TRAINING',
    title: 'Sesli Snaps Koç & Sabah Brifingi',
    subtitle: 'Güne başlama sesli seslendirmesi, anlık motivasyon ve sesli soru yanıtlama',
    icon: Sparkles,
    badge: 'SESLİ',
    keywords: ['sesli', 'ses', 'koç', 'brifing', 'sabah', 'motivasyon', 'kaygı', 'konuş'],
  },
  {
    id: 'coach',
    category: 'TRAINING',
    title: 'Snaps Koç — Yazılı Sohbet',
    subtitle: 'Soru sorma, turlama tekniği, stres yönetimi ve sınav taktikleri danışmanı',
    icon: Bot,
    keywords: ['chat', 'sohbet', 'koç', 'danışman', 'rehberlik', 'taktik', 'stres', 'yapay zeka'],
  },
  {
    id: 'speed',
    category: 'TRAINING',
    title: 'Hızlı Okuma & WPM Antrenörü',
    subtitle: 'Türkçe ve Tarih paragraf okuma hızını ölç, okuma süreni yarıya indir',
    icon: Clock,
    badge: 'HIZ',
    keywords: ['hızlı okuma', 'wpm', 'paragraf', 'okuma hızı', 'dakika', 'kelime', 'antrenman'],
  },
  {
    id: 'duel',
    category: 'TRAINING',
    title: 'Canlı Soru Düellosu & Sıralama',
    subtitle: '5 soruluk zamana karşı yarış, puanları topla ve liderlik tablosuna gir',
    icon: Zap,
    badge: 'CANLI',
    keywords: ['düello', 'yarışma', 'quiz', 'canlı', 'liderlik', 'sıralama', 'oyun', 'meydan oku'],
  },
  {
    id: 'flashcards',
    category: 'TRAINING',
    title: 'KPSS Güncel & YKS Bilgi Kartları',
    subtitle: 'Çevirmeli hafıza kartları ile hap bilgi ezberi ve formül tekrarı',
    icon: Sparkles,
    keywords: ['kart', 'bilgi kartı', 'flashcard', 'ezber', 'güncel bilgiler', 'tarih notları', 'formül'],
  },

  // 4. Institution Portal
  {
    id: 'inst_analysis',
    category: 'INSTITUTION',
    title: 'Zümre Toplu Deneme Analizi',
    subtitle: 'Sınıf başarı ortalamaları, zayıf konu dağılımı ve 2 haftalık AI telafi planı',
    icon: Building2,
    badge: 'KURUM',
    keywords: ['dershane', 'kurum', 'deneme analizi', 'zümre', 'telafi', 'öğretmen', 'başarı'],
  },
  {
    id: 'inst_students',
    category: 'INSTITUTION',
    title: 'Öğrenci Karneleri & WhatsApp Raporu',
    subtitle: 'Bireysel öğrenci karneleri, devamsızlık ve tek tıkla WhatsApp veli bilgilendirme',
    icon: Share2,
    badge: 'VELİ',
    keywords: ['öğrenci', 'karne', 'whatsapp', 'veli', 'rapor', 'pdf', 'devamsızlık', 'bildirim'],
  },
  {
    id: 'inst_optical',
    category: 'INSTITUTION',
    title: 'Optik Form & Karne OCR Tarama',
    subtitle: 'Fotoğraftan optik form doğru/yanlış okuma ve otomatik net çıkarma',
    icon: Camera,
    badge: 'OCR',
    keywords: ['optik', 'form', 'tarama', 'ocr', 'kamera', 'fotoğraf', 'sınav kağıdı'],
  },
  {
    id: 'inst_coaching',
    category: 'INSTITUTION',
    title: 'Birebir Rehberlik & Randevu Defteri',
    subtitle: 'Koçluk görüşme notları, haftalık soru taahhütleri ve eylem maddeleri',
    icon: Calendar,
    keywords: ['rehberlik', 'randevu', 'görüşme', 'koçluk', 'öğrenci takip', 'notlar'],
  },
];

export const CommandSearch: React.FC<CommandSearchProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // `onClose` her App render'ında yeni referans → effect'i yalnız `isOpen`'a bağla,
  // en güncel onClose'a ref üzerinden ulaş.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setQuery('');
    setSelectedIndex(0);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Odak input'tan çıksa bile ESC modalı kapatsın (doküman düzeyi yedek)
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onEsc);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onEsc);
    };
  }, [isOpen]);

  const filteredItems = COMMAND_ITEMS.filter((item) => {
    if (item.category === 'INSTITUTION' && !INSTITUTION_ENABLED) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        onSelectAction(selected.category, selected.id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Evrensel arama ve komut paleti"
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Search Header Input */}
        <div className="relative border-b border-slate-800 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Modül, araç, soru çöz, deneme, karne veya rehberlik ara..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-3xs text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Quick Suggestion Chips */}
        {!query && (
          <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-2xs text-slate-500 font-semibold uppercase tracking-wider shrink-0">
              Hızlı Öneriler:
            </span>
            {['📸 Soru Çöz', '🎙️ Sesli Koç', '🎯 Hedef Simülatörü', '⚡ Hızlı Okuma', '📲 WhatsApp Raporu'].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(chip.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, '').trim())}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold">Sonuç bulunamadı</p>
              <p className="text-xs text-slate-500">"{query}" ile eşleşen bir özellik bulunamadı.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectAction(item.category, item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-md'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-3xs font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 ml-2 transition-transform ${
                    isSelected ? 'text-indigo-400 translate-x-1' : 'text-slate-600'
                  }`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-2xs text-slate-500 flex items-center justify-between px-4">
          <span>Seçmek için <strong className="text-slate-400">↑↓</strong> ve <strong className="text-slate-400">Enter</strong></span>
          <span>4 Ana Kategori • 16 Entegre Araç</span>
        </div>

      </div>
    </div>
  );
};
