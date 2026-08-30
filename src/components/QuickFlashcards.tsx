import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RotateCw, CheckCircle2, Layers, Plus, ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX, Shuffle, Search, Trash2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, UserProfile } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';

interface QuickFlashcardsProps {
  profile: UserProfile;
  flashcards: Flashcard[];
  onUpdateFlashcards: (cards: Flashcard[]) => void;
}

const PRESET_TOPIC_OPTIONS = [
  { label: '💡 KPSS 2026 Güncel Bilgiler', subject: 'KPSS Güncel Bilgiler', topic: '2026 Kültür Başkenti, Uluslararası Örgütler ve Zirveler', tag: 'Güncel Bilgiler' },
  { label: '🏛️ Vatandaşlık & Anayasa Hukuku', subject: 'KPSS Vatandaşlık', topic: 'Cumhurbaşkanlığı Kararnameleri, TBMM ve Yüksek Mahkemeler', tag: 'Anayasa' },
  { label: '📜 Tarih Şifreleri (G-M-K & Antlaşmalar)', subject: 'KPSS / YKS Tarih', topic: 'Milli Mücadele Dönemi Antlaşmaları ve Divan Görevlileri', tag: 'Tarih' },
  { label: '🗺️ Coğrafya Şifreleri (Kayıp Sakal & Madenler)', subject: 'KPSS Coğrafya', topic: 'Yerel Rüzgarlar, Kırık/Kıvrım Dağları ve Maden Yatakları', tag: 'Coğrafya' },
  { label: '📐 Matematik & Geometri Formülleri', subject: 'Matematik & Geometri', topic: 'Özel Dik Üçgenler, Hız/İşçi Problemleri ve Özdeşlikler', tag: 'Formül' },
  { label: '✍️ Türkçe Yazım Kuralları (SOMBAHÇEMİ)', subject: 'Türkçe', topic: 'Bitişik/Ayrı Yazılan Ki, De/Da ve Ses Olayları', tag: 'Türkçe' },
  { label: '🔬 YKS AYT Formülleri (Fizik-Kimya-Biyo)', subject: 'AYT Fen Bilimleri', topic: 'F=m.a, P.V=n.R.T, İdeal Gaz ve Hücre Organelleri', tag: 'Formül' },
  { label: '📚 YKS Edebiyat Yazar - Eser', subject: 'YKS Edebiyat', topic: 'Milli Edebiyat ve Fecr-i Âti Topluluğu Anahtar Eserler', tag: 'Edebiyat' },
];

export const QuickFlashcards: React.FC<QuickFlashcardsProps> = ({
  profile,
  flashcards = [],
  onUpdateFlashcards,
}) => {
  const safeFlashcards = useMemo(() => Array.isArray(flashcards) ? flashcards : [], [flashcards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPresetTopic, setSelectedPresetTopic] = useState(PRESET_TOPIC_OPTIONS[0]);
  const [isCustomCardModalOpen, setIsCustomCardModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // New Custom Card Form State
  const [customFront, setCustomFront] = useState('');
  const [customBack, setCustomBack] = useState('');
  const [customCategory, setCustomCategory] = useState('KPSS / YKS Hap Bilgi');
  const [customTag, setCustomTag] = useState('Güncel Bilgiler');

  // Dynamic tags extracted from existing cards + standard presets
  const availableTags = useMemo(() => {
    const set = new Set<string>(['ALL', 'Güncel Bilgiler', 'Anayasa', 'Tarih', 'Coğrafya', 'Formül', 'Türkçe', 'Edebiyat', 'AI Kart']);
    safeFlashcards.forEach((c) => {
      if (c.tag) set.add(c.tag);
    });
    return Array.from(set);
  }, [safeFlashcards]);

  // Filtered flashcards based on tag & search query
  const filteredCards = useMemo(() => {
    return safeFlashcards.filter((c) => {
      if (!c) return false;
      const matchesTag =
        selectedTag === 'ALL' ||
        c.tag === selectedTag ||
        c.category?.toLowerCase().includes(selectedTag.toLowerCase());

      const matchesSearch =
        !searchQuery.trim() ||
        c.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tag?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTag && matchesSearch;
    });
  }, [safeFlashcards, selectedTag, searchQuery]);

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  // Reset index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedTag, searchQuery]);

  // Keyboard navigation support (ArrowLeft, ArrowRight, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        haptics.selection();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCards.length, currentIndex]);

  const handleNext = () => {
    haptics.selection();
    setIsFlipped(false);
    if (filteredCards.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    haptics.selection();
    setIsFlipped(false);
    if (filteredCards.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const markLearned = () => {
    if (!currentCard) return;
    haptics.success();
    const updated = safeFlashcards.map((c) =>
      c.id === currentCard.id ? { ...c, isLearned: !c.isLearned } : c
    );
    onUpdateFlashcards(updated);
    if (!currentCard.isLearned) {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
    }
  };

  const handleShuffle = () => {
    haptics.light();
    const shuffled = [...safeFlashcards].sort(() => Math.random() - 0.5);
    onUpdateFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetProgress = () => {
    haptics.warning();
    const resetCards = safeFlashcards.map((c) => ({ ...c, isLearned: false }));
    onUpdateFlashcards(resetCards);
  };

  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.warning();
    const updated = safeFlashcards.filter((c) => c.id !== cardId);
    onUpdateFlashcards(updated);
    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    }
  };

  // Text-To-Speech (Sesli Oku)
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const textToRead = isFlipped
        ? `Cevap: ${currentCard.back}`
        : `Soru: ${currentCard.front}`;

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.95;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      haptics.light();
    }
  };

  // Generate new AI card using selected preset or topic
  const handleGenerateAICard = async () => {
    setIsGenerating(true);
    haptics.selection();
    try {
      const data = await apiFetch('/api/coach/topic-summary', {
        subject: selectedPresetTopic.subject,
        topic: selectedPresetTopic.topic,
        examType: EXAM_METADATA[profile.targetExam]?.name || 'KPSS & YKS',
      });
      const newCard: Flashcard = {
        id: 'fc-' + Date.now(),
        category: data.subject || selectedPresetTopic.subject,
        front: `${data.topic || selectedPresetTopic.topic}: ${data.quickSummary || 'Bu konunun ÖSYM için kritik hap bilgisi nedir?'}`,
        back: `${data.mnemonicCode ? `⚡ ${data.mnemonicCode}\n\n` : ''}${(data.keyFormulasAndRules || []).join('\n')}`,
        tag: selectedPresetTopic.tag || 'AI Kart',
        isLearned: false,
      };

      onUpdateFlashcards([newCard, ...safeFlashcards]);
      setSelectedTag('ALL');
      setCurrentIndex(0);
      setIsFlipped(false);

      confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Flashcard AI error:', err);
      // Fallback custom card insertion
      const fallbackCard: Flashcard = {
        id: 'fc-' + Date.now(),
        category: selectedPresetTopic.subject,
        front: `${selectedPresetTopic.topic}: ÖSYM kilit soru tipi ve altın kuralı`,
        back: `ŞİFRELEME / HAP BİLGİ:\n• ${selectedPresetTopic.topic} konusunda sınavın en çok sorguladığı kavramları düzenli tekrar edin.\n• Soru kökündeki anahtar kelimeleri belirleyip çeldirici şıkları eleyin.`,
        tag: selectedPresetTopic.tag,
        isLearned: false,
      };
      onUpdateFlashcards([fallbackCard, ...safeFlashcards]);
      setSelectedTag('ALL');
      setCurrentIndex(0);
      setIsFlipped(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save manual custom flashcard
  const handleSaveCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFront.trim() || !customBack.trim()) return;

    haptics.success();
    const newCard: Flashcard = {
      id: 'fc-user-' + Date.now(),
      category: customCategory.trim() || 'Özel Not',
      front: customFront.trim(),
      back: customBack.trim(),
      tag: customTag || 'Özel',
      isLearned: false,
    };

    onUpdateFlashcards([newCard, ...safeFlashcards]);
    setCustomFront('');
    setCustomBack('');
    setIsCustomCardModalOpen(false);
    setSelectedTag('ALL');
    setCurrentIndex(0);
    setIsFlipped(false);

    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
  };

  const learnedCount = safeFlashcards.filter((c) => c && c.isLearned).length;
  const progressPercent = safeFlashcards.length > 0 ? Math.round((learnedCount / safeFlashcards.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hızlı Hafıza, Şifreleme & Flashcard Sistemi</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            💡 Hap Bilgiler & Akılda Kalıcı Şifreler
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Sınava girmeden önce mutlaka bilinmesi gereken KPSS güncel bilgileri, anayasa maddeleri, tarih şifreleri (G-M-K), coğrafya rüzgarları (Kayıp Sakal) ve YKS formülleri.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="open-custom-card-modal-btn"
            onClick={() => setIsCustomCardModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Kart Ekle</span>
          </button>

          <button
            id="generate-ai-card-button"
            disabled={isGenerating}
            onClick={handleGenerateAICard}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Kart Üretiliyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Hap Bilgi Üret</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Subject Preset Selector */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Hızlı AI Kart Üretim Konusu:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedPresetTopic.label}
            onChange={(e) => {
              const found = PRESET_TOPIC_OPTIONS.find((opt) => opt.label === e.target.value);
              if (found) setSelectedPresetTopic(found);
            }}
            className="w-full sm:w-80 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
          >
            {PRESET_TOPIC_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress & Quick Tools Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
              Öğrenme İlerlemesi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-emerald-400">{learnedCount}</span>
              <span className="text-xs text-slate-400">/ {safeFlashcards.length} Kart Öğrenildi (%{progressPercent})</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-500 flex items-center justify-center font-extrabold text-xs text-slate-200">
            %{progressPercent}
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hap bilgi, formül veya şifre ara..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-500 hover:text-white">✕</button>
          )}
        </div>

        {/* Action Controls (Shuffle & Reset) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleShuffle}
            title="Kartları Karıştır"
            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Karıştır</span>
          </button>
          <button
            onClick={handleResetProgress}
            title="Öğrenme Durumunu Sıfırla"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setSelectedTag(tag);
              haptics.selection();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedTag === tag
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            {tag === 'ALL' ? 'Tüm Kartlar' : tag}
          </button>
        ))}
      </div>

      {/* Main Flashcard Stage */}
      {currentCard ? (
        <div className="space-y-6 flex flex-col items-center">
          {/* Flip Card Container */}
          <div
            id="interactive-flashcard"
            onClick={() => {
              setIsFlipped(!isFlipped);
              haptics.selection();
            }}
            className={`w-full max-w-xl min-h-[340px] rounded-3xl p-8 shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between select-none relative group border-2 ${
              isFlipped
                ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-950/40'
                : 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-slate-800 hover:border-indigo-500/60 shadow-indigo-950/30'
            }`}
          >
            {/* Top Card Info */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-2xs">
                  {currentCard.category || 'Hap Bilgi'}
                </span>
                {currentCard.tag && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-3xs font-semibold">
                    #{currentCard.tag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Audio TTS Button */}
                <button
                  onClick={handleSpeak}
                  title="Sesli Dinle"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-indigo-300" />
                  )}
                </button>

                {/* Delete button for user created cards */}
                {currentCard.id.startsWith('fc-user-') && (
                  <button
                    onClick={(e) => handleDeleteCard(currentCard.id, e)}
                    title="Kartı Sil"
                    className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="text-slate-500 font-mono text-xs font-bold">
                  {currentIndex + 1} / {filteredCards.length}
                </span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="py-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isFlipped ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'
                }`}>
                  {isFlipped ? '💡 CEVAP / HAP NOT & ŞİFRE' : '❓ SORU / KAVRAM / KURAL'}
                </span>
              </div>

              <p className={`leading-relaxed whitespace-pre-line transition-all ${
                isFlipped 
                  ? 'text-sm md:text-base font-semibold text-emerald-200' 
                  : 'text-base md:text-lg font-bold text-white'
              }`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom Card Footer */}
            <div className="flex items-center justify-between text-2xs text-slate-400 pt-3 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5 text-indigo-400 group-hover:text-indigo-300 font-medium">
                <RotateCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500" />
                <span>Kartı Çevir (Boşluk Tuşu)</span>
              </span>

              {currentCard.isLearned ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Öğrenildi ✓
                </span>
              ) : (
                <span className="text-slate-500">Tekrar Listesinde</span>
              )}
            </div>
          </div>

          {/* Navigation & Action Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Önceki Kart (Sol Ok)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={markLearned}
              className={`px-6 py-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                currentCard.isLearned
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{currentCard.isLearned ? 'Öğrenildi Durumunu Kaldır' : 'Öğrendim Olarak İşaretle ✓'}</span>
            </button>

            <button
              onClick={handleNext}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Sonraki Kart (Sağ Ok)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="text-2xs text-slate-500 flex items-center gap-3">
            <span>İpucu: <strong>Boşluk</strong> çevirir, <strong>← →</strong> kartlar arası geçiş yapar.</span>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-300">Bu filtrelere uygun kart bulunamadı</h3>
            <p className="text-xs text-slate-500">Arama kelimesini değiştirebilir veya yukarıdaki butondan AI ile yeni kart üretebilirsiniz.</p>
          </div>
          <button
            onClick={() => {
              setSelectedTag('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}

      {/* Manual Custom Flashcard Modal */}
      {isCustomCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Yeni Bilgi Kartı / Hap Not Ekle</h3>
              </div>
              <button
                onClick={() => setIsCustomCardModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomCard} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-400">Ders / Kategori</label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Örn: KPSS Vatandaşlık"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-400">Etiket</label>
                  <select
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Güncel Bilgiler">Güncel Bilgiler</option>
                    <option value="Anayasa">Anayasa</option>
                    <option value="Tarih">Tarih</option>
                    <option value="Coğrafya">Coğrafya</option>
                    <option value="Formül">Formül</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="Edebiyat">Edebiyat</option>
                    <option value="Özel">Özel Not</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-400">Ön Yüz (Soru / Kavram)</label>
                <textarea
                  required
                  rows={2}
                  value={customFront}
                  onChange={(e) => setCustomFront(e.target.value)}
                  placeholder="Örn: 2026 yılı Türk Dünyası Kültür Başkenti neresidir?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-400">Arka Yüz (Cevap / Hap Not / Şifreleme)</label>
                <textarea
                  required
                  rows={3}
                  value={customBack}
                  onChange={(e) => setCustomBack(e.target.value)}
                  placeholder="Örn: TÜRKSOY tarafından ilan edilen kültür başkenti ve Türk Dünyası ortak etkinlik merkezi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-colors"
                >
                  Kartı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
