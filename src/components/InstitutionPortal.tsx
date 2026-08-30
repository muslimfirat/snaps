import React, { useState, useEffect } from 'react';
import { Building2, Users, BarChart3, Sparkles, Plus, Settings, Search, Printer, CheckCircle2, AlertTriangle, TrendingUp, FileText, Layers, BookOpen, Phone, Megaphone, UserCheck, MessageSquare, Trash2, Share2, Camera, Calendar, Send, Upload, X, CreditCard, DollarSign, Receipt, HeartHandshake } from 'lucide-react';
import { haptics } from '../lib/haptics';
import { apiFetch } from '../lib/apiClient';
import { 
  InstitutionConfig, 
  ClassGroup, 
  StudentRecord, 
  InstitutionExam, 
  ClassAnalysisReport,
  CoachingSessionNote,
  ExamCategory 
} from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { InstitutionPricingPlans } from './InstitutionPricingPlans';
import { FinancialSummary } from './FinancialSummary';
import { ParentDashboard } from './ParentDashboard';

interface InstitutionPortalProps {
  institutionConfig: InstitutionConfig;
  classGroups: ClassGroup[];
  students: StudentRecord[];
  institutionExams: InstitutionExam[];
  onUpdateConfig: (config: InstitutionConfig) => void;
  onUpdateClassGroups: (groups: ClassGroup[]) => void;
  onUpdateStudents: (students: StudentRecord[]) => void;
  onUpdateInstitutionExams: (exams: InstitutionExam[]) => void;
  onSwitchToStudentMode: () => void;
  activeInstitutionEmail?: string;
  onLogoutInstitution?: () => void;
}

export const InstitutionPortal: React.FC<InstitutionPortalProps> = ({
  institutionConfig,
  classGroups = [],
  students = [],
  institutionExams = [],
  onUpdateConfig,
  onUpdateClassGroups,
  onUpdateStudents,
  onUpdateInstitutionExams,
  onSwitchToStudentMode,
  activeInstitutionEmail,
  onLogoutInstitution,
}) => {
  const safeClassGroups = Array.isArray(classGroups) ? classGroups : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeInstitutionExams = Array.isArray(institutionExams) ? institutionExams : [];

  const [activeSubTab, setActiveSubTab] = useState<'EXAM_ANALYSIS' | 'STUDENTS' | 'PARENT_DASHBOARD' | 'FINANCIALS' | 'PRICING_PLANS' | 'COACHING_NOTES' | 'CLASSES' | 'CUSTOMIZATION'>('EXAM_ANALYSIS');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedExamId, setSelectedExamId] = useState<string>(safeInstitutionExams[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentRecord | null>(null);
  const [selectedStudentForCoachNote, setSelectedStudentForCoachNote] = useState<StudentRecord | null>(null);
  const [karneStudent, setKarneStudent] = useState<StudentRecord | null>(null);

  // WhatsApp Report Generator State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppStudent, setWhatsAppStudent] = useState<StudentRecord | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [isGeneratingWhatsApp, setIsGeneratingWhatsApp] = useState(false);

  // Optical Form Reader State
  const [showOpticalModal, setShowOpticalModal] = useState(false);
  const [opticalImageBase64, setOpticalImageBase64] = useState<string | null>(null);
  const [isParsingOptical, setIsParsingOptical] = useState(false);
  const [opticalResult, setOpticalResult] = useState<any | null>(null);

  // Coaching Session Notes State
  const [coachingSessions, setCoachingSessions] = useState<CoachingSessionNote[]>(() => {
    const saved = localStorage.getItem('snaps_inst_coaching_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'cn-1',
        studentId: safeStudents[0]?.id || 'std-1',
        studentName: safeStudents[0]?.name || 'Ahmet Yılmaz',
        teacherName: institutionConfig?.directorName || 'Rehberlik Servisi',
        date: new Date().toLocaleDateString('tr-TR'),
        durationMinutes: 30,
        agendaTopic: 'Matematik Net Artışı & Branş Denemesi Sıklığı',
        studentMood: 'Motive',
        discussionNotes: 'Öğrencinin Geometri eksikleri tespit edildi. Günlük soru hedefi 120 adede yükseltildi. Haftalık 2 TYT branş denemesi çözmesi kararlaştırıldı.',
        actionItems: ['Geometri Üçgenler fasikülü bitirilecek', 'Hata defteri haftalık kontrol edilecek'],
        targetQuestionCommitment: 850,
        nextAppointmentDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      }
    ];
  });

  const [showAddCoachingModal, setShowAddCoachingModal] = useState(false);
  const [newCoachingSession, setNewCoachingSession] = useState({
    studentId: safeStudents[0]?.id || '',
    agendaTopic: '',
    studentMood: 'Motive' as const,
    discussionNotes: '',
    actionItemsText: '',
    targetQuestionCommitment: 750,
    nextAppointmentDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  // AI Diagnostic State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<ClassAnalysisReport | null>(null);

  // Customization Form State & Toast
  const [editConfig, setEditConfig] = useState<InstitutionConfig>({ ...institutionConfig });
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Synchronize editConfig whenever institutionConfig changes from storage/props
  useEffect(() => {
    if (institutionConfig) {
      setEditConfig({ ...institutionConfig });
    }
  }, [institutionConfig]);

  // Add Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    studentNumber: `2026${safeStudents.length + 10}`,
    classGroupId: safeClassGroups[0]?.id || '',
    targetExam: 'KPSS_LISANS' as ExamCategory,
    targetScore: '90.0',
    phone: '',
    attendancePercent: 95,
    averageNet: 80.0,
    coachNotes: 'Kayıt yeni oluşturuldu.',
    weakSubjects: ['Matematik'],
  });

  // Filtered Students
  const filteredStudents = safeStudents.filter((std) => {
    if (!std) return false;
    const matchClass = selectedClassId === 'ALL' || std.classGroupId === selectedClassId;
    const matchSearch =
      (std.name && std.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (std.studentNumber && std.studentNumber.includes(searchQuery)) ||
      (std.phone && std.phone.includes(searchQuery));
    return matchClass && matchSearch;
  });

  // Selected Exam Record
  const activeExam = safeInstitutionExams.find((e) => e?.id === selectedExamId) || safeInstitutionExams[0];

  // Key KPI calculations
  const totalStudents = safeStudents.length;
  const rawOverallAvg =
    safeStudents.reduce((acc, s) => acc + (Number(s?.averageNet) || 0), 0) / (totalStudents || 1);
  const overallAverageNet = isNaN(rawOverallAvg) ? '0.0' : rawOverallAvg.toFixed(1);
  const totalQuestionsSolved = safeStudents.reduce((acc, s) => acc + (Number(s?.totalQuestionsSolved) || 0), 0);
  const attentionStudentsCount = safeStudents.filter((s) => s?.status === 'NEEDS_ATTENTION').length;

  // Run AI Diagnostic for Class
  const handleGenerateClassAnalysis = async () => {
    if (!activeExam) return;
    setIsAnalyzing(true);
    setAnalysisReport(null);

    const relevantStudents = safeStudents.filter(
      (s) => s && (activeExam.classGroupId === 'ALL' || s.classGroupId === activeExam.classGroupId)
    );

    const className = safeClassGroups.find((c) => c?.id === activeExam.classGroupId)?.name || 'Tüm Kurum';

    try {
      const data = await apiFetch('/api/institution/analyze-class', {
        institutionName: institutionConfig.name,
        className,
        examTitle: activeExam.title,
        classAverageNet: activeExam.averageNet,
        sectionData: activeExam.sectionAverages,
        studentsData: relevantStudents.map((s) => ({
          name: s.name,
          net: s.latestMockNet,
          weak: s.weakSubjects,
          status: s.status,
        })),
      });
      setAnalysisReport(data);
    } catch (err) {
      console.error('Failed class analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    haptics.success();
    onUpdateConfig(editConfig);
    setShowConfigModal(false);
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
    }, 4000);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;

    const created: StudentRecord = {
      id: 'std-' + Date.now(),
      studentNumber: newStudent.studentNumber.trim(),
      name: newStudent.name.trim(),
      classGroupId: newStudent.classGroupId,
      targetExam: newStudent.targetExam,
      targetScore: newStudent.targetScore.trim(),
      phone: newStudent.phone.trim() || '05xx xxx xx xx',
      attendancePercent: newStudent.attendancePercent,
      totalQuestionsSolved: 0,
      averageNet: newStudent.averageNet,
      latestMockNet: newStudent.averageNet,
      latestMockTitle: 'Giriş Seviye Sınavı',
      errorCount: 0,
      weakSubjects: newStudent.weakSubjects,
      coachNotes: newStudent.coachNotes,
      status: 'STABLE',
      joinedDate: new Date().toLocaleDateString('tr-TR'),
    };

    onUpdateStudents([created, ...safeStudents]);
    setShowAddStudentModal(false);
    setNewStudent({
      name: '',
      studentNumber: `2026${safeStudents.length + 11}`,
      classGroupId: safeClassGroups[0]?.id || '',
      targetExam: 'KPSS_LISANS',
      targetScore: '90.0',
      phone: '',
      attendancePercent: 95,
      averageNet: 80.0,
      coachNotes: 'Kayıt yeni oluşturuldu.',
      weakSubjects: ['Matematik'],
    });
  };

  const handleUpdateStudentCoachNote = (studentId: string, note: string) => {
    const updated = safeStudents.map((s) => (s.id === studentId ? { ...s, coachNotes: note } : s));
    onUpdateStudents(updated);
    setSelectedStudentForCoachNote(null);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Bu öğrenci kaydını silmek istediğinizden emin misiniz?')) {
      onUpdateStudents(safeStudents.filter((s) => s.id !== id));
    }
  };

  // WhatsApp Report Generator
  const handleOpenWhatsAppModal = async (student: StudentRecord) => {
    setWhatsAppStudent(student);
    setShowWhatsAppModal(true);
    setIsGeneratingWhatsApp(true);
    setWhatsAppMessage('');

    try {
      const data = await apiFetch('/api/institution/generate-whatsapp-report', {
        student,
        institutionName: institutionConfig.name,
        latestExam: activeExam,
      });
      setWhatsAppMessage(data.formattedMessage || '');
    } catch (err) {
      console.error('WhatsApp report error:', err);
    } finally {
      setIsGeneratingWhatsApp(false);
    }
  };

  // Optical Form Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOpticalImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParseOpticalForm = async () => {
    if (!opticalImageBase64) return;
    setIsParsingOptical(true);
    setOpticalResult(null);

    try {
      const data = await apiFetch('/api/institution/parse-optical-form', {
        imageBase64: opticalImageBase64,
        examType: 'YKS_SAYISAL',
      });
      setOpticalResult(data);
    } catch (err) {
      console.error('Optical form OCR error:', err);
    } finally {
      setIsParsingOptical(false);
    }
  };

  // Coaching Session Add
  const handleAddCoachingSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = safeStudents.find((s) => s.id === newCoachingSession.studentId) || safeStudents[0];
    if (!student) return;
    const session: CoachingSessionNote = {
      id: `cn-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      teacherName: institutionConfig?.directorName || 'Rehberlik Servisi',
      date: new Date().toLocaleDateString('tr-TR'),
      durationMinutes: 30,
      agendaTopic: newCoachingSession.agendaTopic || 'Haftalık Koçluk & Net Değerlendirmesi',
      studentMood: newCoachingSession.studentMood,
      discussionNotes: newCoachingSession.discussionNotes,
      actionItems: newCoachingSession.actionItemsText
        ? newCoachingSession.actionItemsText.split('\n').filter(Boolean)
        : ['Haftalık soru hedefine uyulacak'],
      targetQuestionCommitment: newCoachingSession.targetQuestionCommitment,
      nextAppointmentDate: newCoachingSession.nextAppointmentDate,
    };

    const updatedSessions = [session, ...(Array.isArray(coachingSessions) ? coachingSessions : [])];
    setCoachingSessions(updatedSessions);
    localStorage.setItem('snaps_inst_coaching_notes', JSON.stringify(updatedSessions));
    setShowAddCoachingModal(false);
    setNewCoachingSession({
      studentId: safeStudents[0]?.id || '',
      agendaTopic: '',
      studentMood: 'Motive',
      discussionNotes: '',
      actionItemsText: '',
      targetQuestionCommitment: 750,
      nextAppointmentDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Toast Notification Banner */}
      {saveSuccessToast && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-300 text-xs shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">Kurum ve dershane bilgileri başarıyla güncellendi ve kaydedildi!</span>
          </div>
          <button 
            type="button"
            onClick={() => setSaveSuccessToast(false)}
            className="text-emerald-400 hover:text-emerald-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Institutional Header & Custom Branding Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-2 border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Logo & Institution Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 border-2 border-indigo-400/40 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-600/30 flex-shrink-0">
              {institutionConfig.logoText || 'HA'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {institutionConfig.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                  {institutionConfig.branch}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Kurumsal Sürüm v2.5
                </span>
              </div>
              <p className="text-xs text-indigo-300 font-medium">
                "{institutionConfig.slogan}"
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span>Müdür / Koçluk Koordinatörü: <strong className="text-slate-200">{institutionConfig.directorName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" /> {institutionConfig.phone}</span>
                {activeInstitutionEmail && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono text-[10px] border border-slate-700">
                      🔒 Giriş: {activeInstitutionEmail}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              id="open-pricing-tab-header-button"
              onClick={() => {
                haptics.selection();
                setActiveSubTab('PRICING_PLANS');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600/30 to-indigo-600/30 hover:from-amber-600/50 hover:to-indigo-600/50 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Lisans: 20.000 TL (Yıllık Paket)</span>
            </button>

            <button
              id="open-customization-modal-button"
              onClick={() => {
                haptics.selection();
                setEditConfig({ ...institutionConfig });
                setShowConfigModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Dershaneyi Özelleştir</span>
            </button>

            <button
              id="switch-to-student-mode-button"
              onClick={onSwitchToStudentMode}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Öğrenci Moduna Geç</span>
            </button>

            {onLogoutInstitution && (
              <button
                id="portal-logout-institution-button"
                onClick={() => {
                  haptics.light();
                  onLogoutInstitution();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                title="Kurum Oturumunu Kapat ve Çıkış Yap"
              >
                <span>🚪 Çıkış Yap</span>
              </button>
            )}
          </div>

        </div>

        {/* Live Announcement Bar */}
        {institutionConfig.announcement && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-3 text-xs bg-indigo-950/40 p-3 rounded-2xl border border-indigo-500/20 text-indigo-200">
            <Megaphone className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
            <span className="font-semibold">{institutionConfig.announcement}</span>
          </div>
        )}
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kayıtlı Öğrenci</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {totalStudents}
            </span>
            <span className="text-xs text-slate-400">({safeClassGroups.length} Sınıf)</span>
          </div>
          <p className="text-[11px] text-slate-500">Aktif hazırlık dönemi</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kurum Ortalama Net</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {overallAverageNet} Net
            </span>
            <span className="text-xs text-slate-400 font-bold">ÖSYM Bandı</span>
          </div>
          <p className="text-[11px] text-slate-500">Tüm şubeler dahil</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Çözülen Soru Havuzu</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400">
              {totalQuestionsSolved.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">Soru</span>
          </div>
          <p className="text-[11px] text-slate-500">Öğrencilerin toplam pratiği</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Özel İlgi / Risk Grubu</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">
              {attentionStudentsCount} Öğrenci
            </span>
            <span className="text-xs text-slate-400">Mentörlük</span>
          </div>
          <p className="text-[11px] text-slate-500">Devamsızlık veya net düşüşü</p>
        </div>

      </div>

      {/* Quick Financial Summary Widget Strip for School Administrators */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-indigo-950/30 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">Yönetici Finansal Ciro Göstergesi</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                {safeStudents.length} Aktif Öğrenci
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tahmini Aylık: <strong className="text-emerald-400 font-bold">{(safeStudents.length * 4500).toLocaleString('tr-TR')} TL/ay</strong> • Yıllık Projeksiyon: <strong className="text-white font-bold">{(safeStudents.length * 4500 * 10).toLocaleString('tr-TR')} TL</strong> • Yazılım Katma Değeri: <strong className="text-amber-400 font-bold">+{(safeStudents.length * 250 * 12).toLocaleString('tr-TR')} TL/yıl</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
          <button
            id="quick-open-financials-btn"
            onClick={() => {
              haptics.selection();
              setActiveSubTab('FINANCIALS');
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Finansal Analiz & Simülatör ↗</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'EXAM_ANALYSIS', label: '📊 Toplu Sınav & Net Analizi', icon: BarChart3 },
          { id: 'STUDENTS', label: `👥 Öğrenci Takip & Karneler (${safeStudents.length})`, icon: Users },
          { id: 'PARENT_DASHBOARD', label: '👨‍👩‍👧 Veli Portalı & Haftalık Karneler', icon: HeartHandshake },
          { id: 'FINANCIALS', label: '💰 Finansal Projeksiyon & Ciro', icon: DollarSign },
          { id: 'PRICING_PLANS', label: '💳 Lisans, Kontenjan & Paketler', icon: CreditCard },
          { id: 'COACHING_NOTES', label: `📅 Birebir Koçluk Görüşmeleri (${(coachingSessions || []).length})`, icon: MessageSquare },
          { id: 'CLASSES', label: `🏫 Sınıflar & Zümreler (${safeClassGroups.length})`, icon: Layers },
          { id: 'CUSTOMIZATION', label: '⚙️ Dershane Bilgileri & Şube', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`inst-subtab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXAM ANALYSIS & AI DIAGNOSTIC */}
      {activeSubTab === 'EXAM_ANALYSIS' && (
        <div className="space-y-6">
          
          {/* Exam Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-300">
                Analiz Edilen Kurum Denemesi:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {institutionExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="run-ai-class-analysis-button"
                disabled={isAnalyzing || !activeExam}
                onClick={handleGenerateClassAnalysis}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-black flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Zümre & Rehberlik Raporu Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI Kurumsal Teşhis & Zümre Raporu Çıkar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {activeExam && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Section Success Breakdown (7 Cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {activeExam.title} Ders Başarı Oranları
                    </h3>
                    <span className="text-xs text-slate-400">
                      Katılım: {activeExam.participantCount} Öğrenci • Sınıf Ortalaması: <strong>{activeExam.averageNet} Net</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      Zirve: {activeExam.highestNet} Net
                    </span>
                  </div>
                </div>

                {/* Section Success Bars */}
                <div className="space-y-4">
                  {(activeExam?.sectionAverages || []).map((sec, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">
                          {sec.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-indigo-400 font-bold">
                            Ort: {sec.avgNet} Net (Hedef: {sec.targetNet})
                          </span>
                          <span className={`font-bold ${sec.successRate >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            %{sec.successRate} Başarı
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            sec.successRate >= 75
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-amber-500 to-rose-400'
                          }`}
                          style={{ width: `${sec.successRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Critical Topic Deficiencies */}
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sınıf Genelinde En Çok Yanlış Yapılan Konular:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(activeExam?.weakTopics || []).map((topic, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                        <span>{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: AI Diagnostic & Action Plan (5 Cols) */}
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Rehberlik & Zümre Raporu
                    </h3>
                    <span className="text-[11px] text-slate-400">Yapay Zeka Kurumsal Teşhisi</span>
                  </div>
                </div>

                {analysisReport ? (
                  <div className="space-y-4 text-xs">
                    
                    {/* Overview */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-100 leading-relaxed font-medium">
                      {analysisReport.overview}
                    </div>

                    {/* Top Deficient Topics & Recommended actions */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                        🚨 Zümre Telafi & Etüt Önerileri:
                      </span>
                      <div className="space-y-2">
                        {(analysisReport?.topDeficientTopics || []).map((t, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {t.subject} • {t.topic}
                              </span>
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/40">
                                %{t.failRate} Hata Oranı
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                              💡 {t.recommendedAction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Institutional Action Plan */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        📋 Kurumsal 2 Haftalık Eylem Planı:
                      </span>
                      <div className="space-y-1.5">
                        {(analysisReport?.institutionalActionPlan || []).map((step, sIdx) => (
                          <div key={sIdx} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <p className="text-xs text-slate-400 font-medium">
                        Bu denemenin sonuçlarını yapay zeka ile analiz ederek zümre öğretmenlerine özel telafi etüt ve ödev raporu oluşturmak için butona tıklayın.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: STUDENTS LIST & REPORT CARDS */}
      {activeSubTab === 'STUDENTS' && (
        <div className="space-y-6">
          
          {/* Filter and Add Student Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              
              {/* Class selector */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">Tüm Sınıflar ({safeStudents.length} Öğrenci)</option>
                {safeClassGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Öğrenci adı, no veya tel ara..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>

            <div className="flex items-center gap-2">
              <button
                id="switch-to-parent-dashboard-btn"
                onClick={() => {
                  haptics.selection();
                  setActiveSubTab('PARENT_DASHBOARD');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-500/40 text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <HeartHandshake className="w-4 h-4 text-indigo-400" />
                <span>Veli Portalı & Karneler ↗</span>
              </button>

              <button
                id="open-optical-modal-button"
                onClick={() => {
                  setOpticalImageBase64(null);
                  setOpticalResult(null);
                  setShowOpticalModal(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Optik Form / Karne Tara (OCR)</span>
              </button>

              <button
                id="open-add-student-modal-button"
                onClick={() => setShowAddStudentModal(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Öğrenci Kaydet</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Öğrenci</th>
                    <th className="p-4">Sınıf & Hedef</th>
                    <th className="p-4 text-center">Devamsızlık</th>
                    <th className="p-4 text-center">Ortalama Net</th>
                    <th className="p-4 text-center">Son Deneme</th>
                    <th className="p-4">Zayıf Konuları</th>
                    <th className="p-4 text-center">Durum</th>
                    <th className="p-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((std) => {
                    const classObj = safeClassGroups.find((c) => c.id === std.classGroupId);
                    return (
                      <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                        
                        {/* Student Name & Number */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                              {std.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{std.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">No: {std.studentNumber}</span>
                            </div>
                          </div>
                        </td>

                        {/* Class & Target */}
                        <td className="p-4">
                          <span className="font-semibold text-slate-200 block truncate max-w-[150px]">
                            {classObj?.name || 'Sınıf Belirtilmedi'}
                          </span>
                          <span className="text-[10px] text-indigo-400">Hedef: {std.targetScore}</span>
                        </td>

                        {/* Attendance */}
                        <td className="p-4 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            std.attendancePercent >= 90 ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                          }`}>
                            %{std.attendancePercent}
                          </span>
                        </td>

                        {/* Average Net */}
                        <td className="p-4 text-center font-mono font-bold text-slate-100">
                          {std.averageNet} Net
                        </td>

                        {/* Latest Mock */}
                        <td className="p-4 text-center font-mono">
                          <span className="text-emerald-400 font-bold block">{std.latestMockNet} Net</span>
                          <span className="text-[9px] text-slate-500 truncate block max-w-[100px]">{std.latestMockTitle}</span>
                        </td>

                        {/* Weak Subjects */}
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(std?.weakSubjects || []).map((sub, sIdx) => (
                              <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            std.status === 'HIGH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : std.status === 'NEEDS_ATTENTION'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {std.status === 'HIGH' ? 'Zirvede' : std.status === 'NEEDS_ATTENTION' ? 'Riskli / İlgi' : 'Stabil'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenWhatsAppModal(std)}
                              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                              title="WhatsApp Veli & Öğrenci Raporu"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedStudentForReport(std)}
                              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
                              title="Öğrenci Karnesi & PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedStudentForCoachNote(std)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                              title="Koçluk Notu Yaz"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(std.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB: COACHING NOTES & APPOINTMENTS */}
      {activeSubTab === 'COACHING_NOTES' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Birebir Koçluk Görüşme Notları & Randevu Takip Defteri</span>
              </h3>
              <p className="text-xs text-slate-400">
                Rehberlik ve mentörlük görüşmelerini, verilen haftalık soru hedeflerini ve aksiyon maddelerini kayıt altına alın.
              </p>
            </div>

            <button
              onClick={() => setShowAddCoachingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Koçluk Görüşmesi Ekle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coachingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-bold text-white block text-sm">{session.studentName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Görüşme Tarihi: {session.date} ({session.durationMinutes} dk)
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    session.studentMood === 'Çok Yüksek' || session.studentMood === 'Motive'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    Ruh Hali: {session.studentMood}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-indigo-400 block text-[11px] uppercase tracking-wider">Gündem & Konu:</strong>
                    <span className="text-slate-200 font-semibold">{session.agendaTopic}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-300 leading-relaxed">
                    {session.discussionNotes}
                  </div>

                  <div>
                    <strong className="text-slate-400 block text-[11px] mb-1">Kararlaştırılan Aksiyonlar:</strong>
                    <ul className="space-y-1">
                      {(session?.actionItems || []).map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Haftalık Hedef: <strong className="text-amber-400">{session.targetQuestionCommitment} Soru</strong>
                  </span>
                  <span className="text-indigo-300 font-medium">
                    Sonraki Randevu: <strong>{session.nextAppointmentDate}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLASS GROUPS */}
      {activeSubTab === 'CLASSES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {safeClassGroups.map((grp) => {
              const classStudents = safeStudents.filter((s) => s.classGroupId === grp.id);
              const rawClassAvg =
                classStudents.reduce((acc, s) => acc + (Number(s?.averageNet) || 0), 0) / (classStudents.length || 1);
              const classAvgNet = isNaN(rawClassAvg) ? '0.0' : rawClassAvg.toFixed(1);

              return (
                <div
                  key={grp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                        {EXAM_METADATA[grp.examType]?.shortName || 'Sınav Grubu'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {grp.roomNumber}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {grp.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Koç / Danışman: <strong className="text-slate-200">{grp.coachTeacher}</strong>
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Öğrenci Mevcudu:</span>
                      <span className="font-bold text-white">{classStudents.length} Öğrenci</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Sınıf Net Ortalaması:</span>
                      <span className="font-bold text-emerald-400 font-mono">{classAvgNet} Net</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Hedef Skor:</span>
                      <span className="font-bold text-indigo-300">{grp.targetScoreAverage}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedClassId(grp.id);
                      setActiveSubTab('STUDENTS');
                    }}
                    className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Bu Sınıfın Öğrencilerini Listele →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: INSTITUTION CUSTOMIZATION */}
      {activeSubTab === 'CUSTOMIZATION' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Dershane & Kurs Profili Özelleştirme
              </h3>
              <p className="text-xs text-slate-400">Kurum adını, logosunu ve şube duyurularını özelleştirin</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kurum / Dershane Adı
                </label>
                <input
                  type="text"
                  required
                  value={editConfig.name}
                  onChange={(e) => setEditConfig({ ...editConfig, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Şube / Kampüs Adı
                </label>
                <input
                  type="text"
                  required
                  value={editConfig.branch}
                  onChange={(e) => setEditConfig({ ...editConfig, branch: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Logo İnisiyali (1-3 Harf)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={editConfig.logoText}
                  onChange={(e) => setEditConfig({ ...editConfig, logoText: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Koordinatör / Müdür
                </label>
                <input
                  type="text"
                  value={editConfig.directorName}
                  onChange={(e) => setEditConfig({ ...editConfig, directorName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  İletişim Telefonu
                </label>
                <input
                  type="text"
                  value={editConfig.phone}
                  onChange={(e) => setEditConfig({ ...editConfig, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kurum Sloganı / Vizyonu
              </label>
              <input
                type="text"
                value={editConfig.slogan}
                onChange={(e) => setEditConfig({ ...editConfig, slogan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Öğrenci & Veli Duyurusu (Üst Banner)
              </label>
              <textarea
                rows={2}
                value={editConfig.announcement}
                onChange={(e) => setEditConfig({ ...editConfig, announcement: e.target.value })}
                placeholder="Örn: 4. TG Denemesi bu Pazar saat 10:00'da uygulanacaktır..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Kurum Bilgilerini Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: PARENT DASHBOARD & WEEKLY REPORT CARDS */}
      {activeSubTab === 'PARENT_DASHBOARD' && (
        <div className="space-y-6">
          <ParentDashboard
            institutionConfig={institutionConfig}
            students={safeStudents}
            classGroups={safeClassGroups}
            onUpdateStudents={onUpdateStudents}
          />
        </div>
      )}

      {/* TAB: FINANCIAL SUMMARY & REVENUE PROJECTIONS */}
      {activeSubTab === 'FINANCIALS' && (
        <div className="space-y-6">
          <FinancialSummary
            institutionConfig={institutionConfig}
            students={safeStudents}
            onNavigateToPricing={() => setActiveSubTab('PRICING_PLANS')}
          />
        </div>
      )}

      {/* TAB 6: PRICING & SUBSCRIPTION PLANS */}
      {activeSubTab === 'PRICING_PLANS' && (
        <div className="space-y-6">
          <InstitutionPricingPlans
            institutionConfig={institutionConfig}
            studentsCount={safeStudents.length}
            onUpdateConfig={onUpdateConfig}
          />
        </div>
      )}

      {/* MODAL: Student Report Card / Karne & PDF Print */}
      {selectedStudentForReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Printable Report Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl">
                  {institutionConfig.logoText}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {institutionConfig.name}
                  </h3>
                  <p className="text-xs text-indigo-300">Öğrenci Gelişim & Deneme Karnesi</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Karnesi Yazdır</span>
                </button>
                <button
                  onClick={() => setSelectedStudentForReport(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Öğrenci Adı</span>
                <span className="font-bold text-white">{selectedStudentForReport.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Öğrenci No</span>
                <span className="font-bold text-indigo-400 font-mono">{selectedStudentForReport.studentNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Hedef Skor</span>
                <span className="font-bold text-emerald-400">{selectedStudentForReport.targetScore}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Devamsızlık</span>
                <span className="font-bold text-slate-200">%{selectedStudentForReport.attendancePercent}</span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Genel Ortalama Net</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{selectedStudentForReport.averageNet}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Son Deneme Neti</span>
                <span className="text-xl font-black text-indigo-400 font-mono">{selectedStudentForReport.latestMockNet}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Toplam Soru Pratiği</span>
                <span className="text-xl font-black text-blue-400 font-mono">{selectedStudentForReport.totalQuestionsSolved}</span>
              </div>
            </div>

            {/* Weak Topics */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Öncelikli Geliştirilmesi Gereken Konular:
              </span>
              <div className="flex flex-wrap gap-2">
                {(selectedStudentForReport?.weakSubjects || []).map((sub, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-bold">
                    ⚠️ {sub}
                  </span>
                ))}
              </div>
            </div>

            {/* Coach & Counselor Notes */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                Danışman & Koçluk Görüşü:
              </span>
              <p className="text-xs text-indigo-100/90 leading-relaxed font-medium">
                "{selectedStudentForReport.coachNotes || 'Öğrenci çalışma programına uygun devam ediyor.'}"
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudentForReport(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Add New Student */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Yeni Öğrenci Kaydı</h3>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="Örn: Merve Şen"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Öğrenci No</label>
                  <input
                    type="text"
                    required
                    value={newStudent.studentNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, studentNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sınıf / Grup</label>
                  <select
                    value={newStudent.classGroupId}
                    onChange={(e) => setNewStudent({ ...newStudent, classGroupId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {safeClassGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hedef Sınav</label>
                  <select
                    value={newStudent.targetExam}
                    onChange={(e) => setNewStudent({ ...newStudent, targetExam: e.target.value as ExamCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {Object.entries(EXAM_METADATA).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.shortName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hedef Puan / Net</label>
                  <input
                    type="text"
                    value={newStudent.targetScore}
                    onChange={(e) => setNewStudent({ ...newStudent, targetScore: e.target.value })}
                    placeholder="Örn: 90.0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">İletişim / Veli Tel</label>
                  <input
                    type="text"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    placeholder="05xx xxx xx xx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Koçluk Başlangıç Notu</label>
                <textarea
                  rows={2}
                  value={newStudent.coachNotes}
                  onChange={(e) => setNewStudent({ ...newStudent, coachNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Öğrenciyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Coach Note */}
      {selectedStudentForCoachNote && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {selectedStudentForCoachNote.name} Koçluk Notu
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentForCoachNote(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={4}
              defaultValue={selectedStudentForCoachNote.coachNotes || ''}
              id="student-coach-note-textarea"
              placeholder="Öğrencinin haftalık ödev, deneme temposu ve motivasyonu hakkında notunuzu yazın..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForCoachNote(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = (document.getElementById('student-coach-note-textarea') as HTMLTextAreaElement)?.value;
                  handleUpdateStudentCoachNote(selectedStudentForCoachNote.id, val || '');
                }}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
              >
                Notu Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WhatsApp Report Generator */}
      {showWhatsAppModal && whatsAppStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">WhatsApp Veli & Öğrenci Raporu</h3>
                  <p className="text-xs text-slate-400">{whatsAppStudent.name} • {whatsAppStudent.targetScore} Hedefi</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {isGeneratingWhatsApp ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-bold">Yapay Zeka WhatsApp Raporu Hazırlıyor...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Gönderilecek Mesaj Metni (Düzenlenebilir):
                </label>
                <textarea
                  rows={8}
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Öğrenci Tel: <strong className="text-slate-200">{whatsAppStudent.phone || 'Girilmedi'}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWhatsAppModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      Kapat
                    </button>
                    <a
                      href={`https://wa.me/${whatsAppStudent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                    >
                      <Send className="w-4 h-4" />
                      <span>WhatsApp ile Gönder</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Optical Form / Exam Image OCR */}
      {showOpticalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 shadow-2xl my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Optik Form / Sonuç Belgesi OCR</h3>
                  <p className="text-xs text-slate-400">Fotoğraftan Doğru, Yanlış ve Net Ayrıştırma</p>
                </div>
              </div>
              <button
                onClick={() => setShowOpticalModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* File upload area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center space-y-2 cursor-pointer bg-slate-950/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="optical-file-input"
                />
                <label htmlFor="optical-file-input" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-200">
                    Optik Form veya Sınav Belgesi Fotoğrafını Seç / Sürükle
                  </div>
                  <div className="text-[11px] text-slate-400">PNG, JPG veya JPEG desteklenir</div>
                </label>
              </div>

              {opticalImageBase64 && (
                <div className="space-y-3">
                  <div className="max-h-40 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
                    <img src={opticalImageBase64} alt="Optik Form" className="max-h-40 object-contain" />
                  </div>

                  <button
                    disabled={isParsingOptical}
                    onClick={handleParseOpticalForm}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    {isParsingOptical ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Optik Form Taranıyor ve Okunuyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Yapay Zeka ile Netleri Çıkar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* OCR Results Display */}
              {opticalResult && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{opticalResult.studentName || 'Öğrenci Adı Belirsiz'}</span>
                    <span className="text-emerald-400 font-extrabold text-sm">{opticalResult.totalNet} Toplam Net</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {opticalResult.sections?.map((sec: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300 bg-slate-900/60 p-2 rounded-lg">
                        <span className="font-medium">{sec.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {sec.correct} D / {sec.wrong} Y / {sec.empty} B = <strong className="text-emerald-400">{sec.net} Net</strong>
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 italic">{opticalResult.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Coaching Session */}
      {showAddCoachingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 shadow-2xl my-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Birebir Koçluk Görüşmesi Kaydı</span>
              </h3>
              <button
                onClick={() => setShowAddCoachingModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCoachingSessionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Öğrenci Seç</label>
                <select
                  value={newCoachingSession.studentId}
                  onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {safeStudents.map((std) => (
                    <option key={std.id} value={std.id}>
                      {std.name} ({std.studentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Görüşme Gündemi</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Matematik Net Artışı & Zaman Yönetimi"
                  value={newCoachingSession.agendaTopic}
                  onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, agendaTopic: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Öğrenci Ruh Hali</label>
                  <select
                    value={newCoachingSession.studentMood}
                    onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, studentMood: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="Çok Yüksek">Çok Yüksek / Özgüvenli</option>
                    <option value="Motive">Motive / İstikrarlı</option>
                    <option value="Kaygılı">Kaygılı / Sınav Stresi</option>
                    <option value="Yorgun">Yorgun / İsteksiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Haftalık Soru Hedefi</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={newCoachingSession.targetQuestionCommitment}
                    onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, targetQuestionCommitment: parseInt(e.target.value) || 500 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Görüşme Notları & Rehberlik Tespiti</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Öğrencinin durumu, deneme analizi ve rehberlik tavsiyeleri..."
                  value={newCoachingSession.discussionNotes}
                  onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, discussionNotes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Aksiyon Maddeleri (Her satıra bir madde)</label>
                <textarea
                  rows={2}
                  placeholder="Haftada 2 branş denemesi çözülecek&#10;Hata defteri tekrar edilecek"
                  value={newCoachingSession.actionItemsText}
                  onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, actionItemsText: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sonraki Randevu Tarihi</label>
                <input
                  type="date"
                  value={newCoachingSession.nextAppointmentDate}
                  onChange={(e) => setNewCoachingSession((prev) => ({ ...prev, nextAppointmentDate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCoachingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                >
                  Görüşmeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dershaneyi Özelleştir / Kurum Yapılandırma */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Dershane & Kurs Profili Özelleştirme
                  </h3>
                  <p className="text-xs text-slate-400">Kurum adı, logosu, şube ve duyurularını düzenleyin</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Interactive Preview */}
            <div className="bg-gradient-to-r from-indigo-950/80 to-slate-950 border border-indigo-500/20 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Canlı Önizleme</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 border border-indigo-400/40 flex items-center justify-center font-black text-lg text-white shadow-md flex-shrink-0">
                  {editConfig.logoText || 'HA'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{editConfig.name || 'Dershane Adı'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      {editConfig.branch || 'Merkez Şube'}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-300/80 italic">{editConfig.slogan || 'Hedeflerinize Ulaştırır'}</p>
                </div>
              </div>
              {editConfig.announcement && (
                <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                  <Megaphone className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  <span className="truncate">{editConfig.announcement}</span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kurum / Dershane Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={editConfig.name}
                    onChange={(e) => setEditConfig({ ...editConfig, name: e.target.value })}
                    placeholder="Örn: Hedef Akademi & VIP Kurs"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Şube / Kampüs Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={editConfig.branch}
                    onChange={(e) => setEditConfig({ ...editConfig, branch: e.target.value })}
                    placeholder="Örn: Kadıköy Şubesi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Logo İnisiyali (1-3 Harf)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editConfig.logoText}
                    onChange={(e) => setEditConfig({ ...editConfig, logoText: e.target.value.toUpperCase() })}
                    placeholder="HA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Koordinatör / Müdür
                  </label>
                  <input
                    type="text"
                    value={editConfig.directorName}
                    onChange={(e) => setEditConfig({ ...editConfig, directorName: e.target.value })}
                    placeholder="Örn: Uzm. Psk. Serdar Kaya"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    İletişim Telefonu
                  </label>
                  <input
                    type="text"
                    value={editConfig.phone}
                    onChange={(e) => setEditConfig({ ...editConfig, phone: e.target.value })}
                    placeholder="0212 555 01 23"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kurum Sloganı / Vizyonu
                </label>
                <input
                  type="text"
                  value={editConfig.slogan}
                  onChange={(e) => setEditConfig({ ...editConfig, slogan: e.target.value })}
                  placeholder="Örn: Başarıya Giden Yolda Güvenilir Rehberiniz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Öğrenci & Veli Duyurusu (Üst Banner)
                </label>
                <textarea
                  rows={2}
                  value={editConfig.announcement}
                  onChange={(e) => setEditConfig({ ...editConfig, announcement: e.target.value })}
                  placeholder="Örn: 4. TG Denemesi bu Pazar saat 10:00'da uygulanacaktır..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  Kurum Bilgilerini Kaydet
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
