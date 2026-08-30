import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, CheckCircle, XCircle, AlertTriangle, Bookmark, RotateCcw, Zap, Copy, Check, FileText, ExternalLink, Brain } from 'lucide-react';
import { SnapSolution, UserProfile } from '../types';
import { SAMPLE_QUESTIONS_FOR_SNAP } from '../data/curriculumData';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';

interface SnapSolverProps {
  profile: UserProfile;
  savedSnaps?: SnapSolution[];
  onSaveSnap: (snap: SnapSolution) => void;
  onIncrementQuestionCount?: (count?: number) => void;
  onNavigateToNotebook?: () => void;
}

export const SnapSolver: React.FC<SnapSolverProps> = ({
  profile,
  savedSnaps = [],
  onSaveSnap,
  onIncrementQuestionCount,
  onNavigateToNotebook,
}) => {
  const safeSnaps = Array.isArray(savedSnaps) ? savedSnaps : [];
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [questionText, setQuestionText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSolution, setCurrentSolution] = useState<SnapSolution | null>(null);
  const [userSelectedOption, setUserSelectedOption] = useState<string | null>(null);
  const [, setIsPracticingSimilar] = useState(false);
  const [studentNote, setStudentNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [filterSubject, setFilterSubject] = useState('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  // Start Camera
  const startCamera = async () => {
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  };

  // Capture Snapshot from Camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        setImageBase64(dataUrl);
        setMimeType('image/jpeg');
      }
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  // Select Sample Question
  const handleSelectSample = (sample: typeof SAMPLE_QUESTIONS_FOR_SNAP[0]) => {
    setImagePreview(null);
    setImageBase64(null);
    setQuestionText(sample.text);
    setSelectedSubject(sample.subject);
  };

  // Submit to AI Solver endpoint
  const handleSolveQuestion = async () => {
    if (!imageBase64 && !questionText.trim()) return;

    setIsLoading(true);
    setCurrentSolution(null);
    setUserSelectedOption(null);
    setIsPracticingSimilar(false);
    setIsSaved(false);
    setStudentNote('');
    haptics.medium();

    try {
      const data = await apiFetch('/api/snap/solve', {
        imageBase64,
        mimeType,
        questionText,
        examType: profile.targetExam,
        subject: selectedSubject,
      });

      const newSolution: SnapSolution = {
        id: 'snap-' + Date.now(),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        imageUrl: imagePreview || undefined,
        questionText: questionText || undefined,
        subject: data.subject || selectedSubject || 'Genel',
        topic: data.topic || 'Soru Çözümü',
        questionSummary: data.questionSummary || 'Soru Özeti',
        correctOption: data.correctOption || 'A',
        stepByStepSolution: data.stepByStepSolution || ['Çözüm adımı tamamlandı.'],
        keyConcept: data.keyConcept || 'ÖSYM bu tip sorularda kilit kavrama dikkat eder.',
        trapExplanation: data.trapExplanation || 'Yaygın hata analizine dikkat edin.',
        isMastered: false,
        similarPracticeQuestion: data.similarPracticeQuestion,
      };

      setCurrentSolution(newSolution);
      onIncrementQuestionCount?.(1);
      haptics.success();
    } catch (err) {
      console.error('Solve error:', err);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  // Save to Mistake Notebook
  const handleSaveToNotebook = () => {
    if (!currentSolution) return;
    const updated = {
      ...currentSolution,
      userNotes: studentNote,
    };
    onSaveSnap(updated);
    setIsSaved(true);
    haptics.success();
  };

  const copySolutionText = () => {
    if (!currentSolution) return;
    const text = `[${currentSolution.subject} - ${currentSolution.topic}]\nDoğru Seçenek: ${currentSolution.correctOption}\n\nÇözüm Adımları:\n${currentSolution.stepByStepSolution.join('\n')}\n\nPüf Noktası: ${currentSolution.keyConcept}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Yapay Zeka Soru Çözüm & Kavram Analizi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              📸 Soru Snap & Anında Koçluk Çözümü
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              KPSS veya YKS denemelerinde yapamadığın sorunun fotoğrafını çek ya da yapıştır. Yapay zeka adım adım çözsün, püf noktasını ve çeldirici tuzaklarını göstersin, pekiştirici benzer soru üretsin!
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="start-camera-button"
              onClick={startCamera}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Kamera ile Çek</span>
            </button>
            <button
              id="upload-file-button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Görsel Yükle</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Input Column & Solution Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Question Input Area (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Soru Girişi & Görsel</span>
              </h2>
              {imagePreview && (
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImageBase64(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Görseli Kaldır
                </button>
              )}
            </div>

            {/* Image Preview / Drag Drop Box */}
            {imagePreview ? (
              <div className="relative rounded-xl border border-indigo-500/40 overflow-hidden bg-slate-950 max-h-72 flex items-center justify-center p-2 group">
                <img
                  src={imagePreview}
                  alt="Soru Görseli"
                  className="max-h-64 object-contain rounded-lg shadow-md"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Değiştir
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/50 hover:bg-indigo-950/20"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-indigo-400 shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-300">
                  Sorunun fotoğrafını buraya sürükleyin veya tıklayıp seçin
                </p>
                <p className="text-2xs text-slate-500 mt-1">
                  JPG, PNG veya WEBP formatında net bir görsel yükleyin
                </p>
              </div>
            )}

            {/* Text Input / Extra Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Soru Metni veya Ek Açıklamanız (Opsiyonel)
              </label>
              <textarea
                id="question-text-input"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Örn: 2024 KPSS Matematik sorusu veya sorunun metnini doğrudan buraya yapıştırabilirsiniz..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Sample Questions Selector */}
            <div>
              <label className="block text-2xs font-semibold text-slate-400 mb-1.5">
                ⚡ Hızlı Deneme İçin Örnek Sorular:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_QUESTIONS_FOR_SNAP.map((sample, idx) => (
                  <button
                    key={idx}
                    id={`sample-question-${idx}`}
                    onClick={() => handleSelectSample(sample)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-left transition-colors"
                  >
                    <div className="text-3xs font-bold text-indigo-400 flex items-center justify-between">
                      <span>{sample.subject}</span>
                      <span className="text-3xs text-slate-400">{sample.topic}</span>
                    </div>
                    <p className="text-2xs text-slate-300 line-clamp-1 mt-0.5 font-medium">
                      {sample.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Solve Button */}
            <button
              id="solve-question-submit-button"
              disabled={isLoading || (!imageBase64 && !questionText.trim())}
              onClick={handleSolveQuestion}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                isLoading || (!imageBase64 && !questionText.trim())
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sorunuz Yapay Zeka Koçu Tarafından Çözülüyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Soruyu Çöz & Analiz Et</span>
                </>
              )}
            </button>
          </div>

          {/* Tips Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Snaps Koçluk Taktikleri</span>
            </div>
            <p>
              • Yapamadığınız soruları mutlaka <strong>Hata Defteri</strong>'ne ekleyin. Pazar günleri bu havuza geri dönüp tekrar çözmek netlerinizi ortalama %25 arttırır.
            </p>
          </div>
        </div>

        {/* Right Side: Solution Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex gap-2">
                  <Skeleton className="w-24 h-6 rounded-lg" />
                  <Skeleton className="w-32 h-6 rounded-lg" />
                </div>
                <Skeleton className="w-28 h-8 rounded-lg" />
              </div>
              <Skeleton className="w-full h-16 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="w-40 h-4" />
                <Skeleton className="w-full h-12" />
                <Skeleton className="w-full h-12" />
                <Skeleton className="w-full h-12" />
              </div>
              <p className="text-xs text-slate-400 text-center pt-2">
                Yapay Zeka Koçu soru görselini ve kavram haritasını inceliyor...
              </p>
            </div>
          ) : currentSolution ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-3">
              
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                    {currentSolution.subject}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                    {currentSolution.topic}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copySolutionText}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Çözümü Kopyala"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    id="save-to-notebook-button"
                    onClick={handleSaveToNotebook}
                    disabled={isSaved}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSaved
                        ? 'bg-success/20 text-success border border-success/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Hata Defterine Eklendi ✓' : 'Hata Defterine Kaydet'}</span>
                  </button>
                </div>
              </div>

              {/* Big Correct Answer Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold text-emerald-400 uppercase tracking-wider">
                    ÖSYM Doğru Cevap
                  </span>
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2 mt-0.5">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                      {currentSolution.correctOption}
                    </span>
                    <span>Seçeneği</span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Soru Tipi</span>
                  <span className="text-xs font-bold text-slate-200">Kavram & Analiz</span>
                </div>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span>Adım Adım Pedagojik Çözüm</span>
                </h4>
                <div className="space-y-3">
                  {(currentSolution?.stepByStepSolution || []).map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-surface-0 border border-border flex items-start gap-3.5"
                    >
                      <span className="w-7 h-7 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed font-normal">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Püf Noktası (Key Concept Box) */}
              <div className="bg-surface-2 border border-border-strong rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>💡 Altın Püf Nokta & Sınav Kuralı</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {currentSolution.keyConcept}
                </p>
              </div>

              {/* Çeldirici Uyarısı (Trap Explanation) */}
              <div className="bg-surface-2 border border-rose-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>⚠️ Çeldirici Tuzağı & Neden Yanılınır?</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {currentSolution.trapExplanation}
                </p>
              </div>

              {/* Interactive Similar Practice Question */}
              {currentSolution.similarPracticeQuestion && (
                <div className="bg-surface-0 border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        🎯 Benzer Soru ile Pekiştir
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                      Yeni Soru
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-medium text-slate-200 leading-relaxed">
                    {currentSolution.similarPracticeQuestion.question}
                  </p>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(currentSolution.similarPracticeQuestion?.options || []).map((opt, oIdx) => {
                      const optLetter = opt.trim().charAt(0);
                      const isSelected = userSelectedOption === optLetter;
                      const correctLetter = currentSolution.similarPracticeQuestion?.answer?.trim().charAt(0);

                      return (
                        <button
                          key={oIdx}
                          id={`practice-option-${optLetter.toLowerCase()}`}
                          onClick={() => {
                            setUserSelectedOption(optLetter);
                          }}
                          className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${
                            userSelectedOption
                              ? optLetter === correctLetter
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                                : isSelected
                                ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                                : 'bg-surface-1 border-border text-slate-400 opacity-60'
                              : 'bg-surface-1 hover:bg-surface-2 border-border text-slate-200 hover:border-indigo-500'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Evaluation Box */}
                  {userSelectedOption && (
                    <div className="p-4 rounded-xl bg-surface-1 border border-border text-sm space-y-1.5 animate-in fade-in">
                      <div className="font-bold flex items-center gap-2">
                        {userSelectedOption === currentSolution.similarPracticeQuestion.answer.trim().charAt(0) ? (
                          <span className="text-success flex items-center gap-1.5 font-semibold">
                            <CheckCircle className="w-4 h-4" /> Doğru Cevap!
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1.5 font-semibold">
                            <XCircle className="w-4 h-4" /> Yanlış! Doğru Seçenek: {currentSolution.similarPracticeQuestion.answer}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {currentSolution.similarPracticeQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Student Note Input */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  📝 Kendine Özel Hatırlatıcı Not Ekle:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={studentNote}
                    onChange={(e) => setStudentNote(e.target.value)}
                    placeholder="Örn: Formülü yanlış uyguladım, işaret hatasına dikkat!"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSaveToNotebook}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <EmptyState
              icon={Brain}
              title="Henüz Bir Soru Çözülmedi"
              description="Sol taraftan fotoğraf yükleyebilir, kamerayla çekebilir veya örnek sorulardan birini seçerek anında yapay zeka analizini başlatabilirsin."
              actionLabel="Örnek Soru Seç"
              onAction={() => handleSelectSample(SAMPLE_QUESTIONS_FOR_SNAP[0])}
            />
          )}

          {/* Recent Saved Snaps Mini Gallery */}
          {safeSnaps.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Son Kaydedilen Snap Soruları ({safeSnaps.length})</span>
                </h3>
                
                {/* Subject filter */}
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ALL">Tüm Dersler</option>
                  <option value="Matematik">Matematik</option>
                  <option value="Tarih">Tarih</option>
                  <option value="Türkçe">Türkçe</option>
                  <option value="Coğrafya">Coğrafya</option>
                  <option value="Vatandaşlık">Vatandaşlık</option>
                  <option value="Fen / Fizik">Fen / Fizik</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {safeSnaps
                  .filter((s) => filterSubject === 'ALL' || (s?.subject && s.subject.includes(filterSubject)))
                  .slice(0, 4)
                  .map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => setCurrentSolution(snap)}
                      className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-bold text-indigo-400">{snap.subject}</span>
                        <span className="text-slate-500 font-mono text-3xs">{snap.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 font-medium">
                        {snap.questionSummary}
                      </p>
                      <div className="flex items-center justify-between text-3xs text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Cevap: <strong className="text-emerald-400 font-bold">{snap.correctOption}</strong></span>
                        <span className="text-indigo-400 group-hover:underline flex items-center gap-0.5">
                          İncele <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Soru Fotoğrafı Çek</span>
              </h3>
              <button
                onClick={stopCamera}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Kapat ✕
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-4 border-2 border-indigo-500/50 border-dashed rounded-lg pointer-events-none" />
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                id="capture-photo-button"
                onClick={capturePhoto}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Fotoğrafı Çek</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
