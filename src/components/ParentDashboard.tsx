import React, { useState, useMemo } from 'react';
import { HeartHandshake, Printer, MessageCircle, Send, Sparkles, CheckCircle2, AlertCircle, Calendar, Search, Eye, Clock, Check, Users, FileText, FileCheck, Copy } from 'lucide-react';
import { InstitutionConfig, ClassGroup, StudentRecord } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';
import { haptics } from '../lib/haptics';
import { PrintableParentReport } from './PrintableParentReport';

interface ParentDashboardProps {
  institutionConfig: InstitutionConfig;
  students: StudentRecord[];
  classGroups: ClassGroup[];
  onUpdateStudents?: (students: StudentRecord[]) => void;
}

export interface WeeklyParentReportData {
  studentId: string;
  studentName: string;
  studentNumber: string;
  classGroupName: string;
  targetExamName: string;
  targetScore: string;
  parentPhone: string;
  academicWeek: string;
  dateRange: string;
  
  // 4 Simplified Weekly Focus Metrics for Parents
  weeklyQuestionsSolved: number;
  weeklyQuestionsTarget: number;
  weeklyAttendancePercent: number;
  weeklyAttendanceStatus: 'Mükemmel' | 'Düzenli' | 'Takip Gerekiyor';
  weeklyMockTitle: string;
  weeklyMockNet: number;
  netTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  netChange: number;
  generalRankInClass?: string;
  
  // High-level parent-friendly takeaways
  topStrengths: string[];
  recommendedHomeFocus: string[];
  
  // Counselor Guidance Note for the Family
  counselorWeeklyMessage: string;
  homeSupportTip: string;
}

// Preset Counselor Guidance Message Templates for Quick Selection
const COUNSELOR_PRESET_TEMPLATES = [
  {
    id: 'tpl-high-performance',
    title: '🌟 Yüksek Başarı & Tebrik',
    message: 'Öğrencimiz bu hafta deneme sınavında ve soru hedeflerinde harika bir disiplin gösterdi. Net artışı istikrarlı şekilde yükseliyor. Evdeki çalışma ortamına verdiğiniz destek için teşekkür ederiz.',
    homeTip: 'Öğrencinin motivasyonunu ve uyku düzenini bu şekilde korumasına destek olabilirsiniz.',
  },
  {
    id: 'tpl-study-boost',
    title: '📈 Gelişime Açık & Motivasyon',
    message: 'Öğrencimizin ders içi dikkati ve gayreti olumlu yönde ilerliyor. Bu hafta belirlediğimiz konu tekrarlarını tamamladığında netlerine hızla yansıyacaktır.',
    homeTip: 'Akşamları günlük 40-45 dakikalık Geometri/Paragraf soru çözüm süresini evde takip etmenizi öneririz.',
  },
  {
    id: 'tpl-attendance-warning',
    title: '⚠️ Devamsızlık & Odak Uyarısı',
    message: 'Öğrencimizin bu hafta bazı etüt ve soru çözüm saatlerine katılımında aksama gözlemlenmiştir. Konu eksiği oluşmaması için dershane saatlerine hassasiyet göstermesi önem taşımaktadır.',
    homeTip: 'Dershane giriş-çıkış saatleri ve günlük planlaması hakkında kurum rehberlik servisimizle iletişime geçebilirsiniz.',
  },
  {
    id: 'tpl-exam-calm',
    title: '🎯 Sınav Kaygısı & Rutin Desteği',
    message: 'Deneme sınavı süre yönetiminde gelişim kaydedildi. Hata yaptığı soruların çözümlerini video çözümlerden inceleyerek hatalarını kazanıma dönüştürüyor.',
    homeTip: 'Sınav yaklaştıkça kıyaslama yapmadan moral ve özgüven aşılamaya devam ediniz.',
  },
];

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  institutionConfig,
  students = [],
  classGroups = [],
  onUpdateStudents,
}) => {
  const safeStudents = Array.isArray(students) ? students : [];
  const safeClasses = Array.isArray(classGroups) ? classGroups : [];

  // Filter States
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HIGH' | 'STABLE' | 'NEEDS_ATTENTION'>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<string>('2026 - 34. Hafta (18 - 24 Ağustos)');

  // Modal States
  const [selectedReportStudent, setSelectedReportStudent] = useState<StudentRecord | null>(null);
  const [activeCounselorMessage, setActiveCounselorMessage] = useState<string>('');
  const [activeHomeTip, setActiveHomeTip] = useState<string>('');
  
  // PDF Report Specific States
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [pdfTargetStudent, setPdfTargetStudent] = useState<StudentRecord | null>(null);
  const [pdfScope, setPdfScope] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [, setIsPdfGenerating] = useState<boolean>(false);

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [sentReportsRecord, setSentReportsRecord] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('snaps_inst_parent_reports_sent');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return safeStudents.filter((student) => {
      const matchesClass = selectedClassId === 'ALL' || student.classGroupId === selectedClassId;
      const matchesSearch = 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentNumber.includes(searchQuery) ||
        (student.phone && student.phone.includes(searchQuery));
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      return matchesClass && matchesSearch && matchesStatus;
    });
  }, [safeStudents, selectedClassId, searchQuery, statusFilter]);

  // Transform StudentRecord into a Simplified Parent Report format
  const generateParentReportData = (student: StudentRecord): WeeklyParentReportData => {
    const classGroup = safeClasses.find((c) => c.id === student.classGroupId);
    const examMeta = EXAM_METADATA[student.targetExam] || { shortName: student.targetExam };

    const weeklyQuestionsTarget = 500;
    const weeklyQuestionsSolved = Math.min(
      weeklyQuestionsTarget, 
      Math.max(120, Math.round(((student.totalQuestionsSolved || 1200) % 800) + 150))
    );
    
    const netDiff = Number(((student.latestMockNet || 0) - (student.averageNet || 0)).toFixed(2));
    const netTrend: 'INCREASING' | 'STABLE' | 'DECREASING' = 
      netDiff > 0.5 ? 'INCREASING' : netDiff < -0.5 ? 'DECREASING' : 'STABLE';

    const attendanceStatus: 'Mükemmel' | 'Düzenli' | 'Takip Gerekiyor' = 
      (student.attendancePercent || 90) >= 95 ? 'Mükemmel' : (student.attendancePercent || 90) >= 85 ? 'Düzenli' : 'Takip Gerekiyor';

    const topStrengths = student.status === 'HIGH' 
      ? ['Konu tarama testlerinde yüksek kavrama', 'Deneme sınavı süre kontrolü ve odaklanma', 'Düzenli etüt katılımı']
      : ['Soru çözümünde gösterilen gayret', 'Dershane denemelerine tam katılım'];

    const recommendedHomeFocus = (student.weakSubjects && student.weakSubjects.length > 0)
      ? student.weakSubjects.slice(0, 2).map((s) => `${s} konusunda evde günlük 30 dk soru tekrarı`)
      : ['Günlük belirlenen soru hedefini aksatmadan tamamlama', 'Hata yapılan soruların video çözümlerini izleme'];

    const defaultMsg = student.coachNotes 
      ? `Rehberlik Notu: ${student.coachNotes}`
      : 'Öğrencimiz bu hafta programına uygun şekilde çalışmalarını sürdürmüştür. Gayretini takdir eder, destekleriniz için teşekkür ederiz.';

    const defaultHomeTip = student.status === 'NEEDS_ATTENTION'
      ? 'Bu hafta akşamları soru hedeflerini tamamlayıp tamamlamadığını birlikte kontrol etmeniz faydalı olacaktır.'
      : 'Öğrencimize gösterdiği çalışma disiplini için evde moral ve motivasyon desteği sağlayabilirsiniz.';

    return {
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.studentNumber,
      classGroupName: classGroup?.name || 'Genel Şube',
      targetExamName: examMeta.shortName,
      targetScore: student.targetScore || 'Hedef Belirlendi',
      parentPhone: student.phone || '05xx xxx xx xx',
      academicWeek: selectedWeek,
      dateRange: 'Pazartesi - Pazar Dönemi',
      weeklyQuestionsSolved,
      weeklyQuestionsTarget,
      weeklyAttendancePercent: student.attendancePercent || 90,
      weeklyAttendanceStatus: attendanceStatus,
      weeklyMockTitle: student.latestMockTitle || 'Dershane Haftalık TG Denemesi',
      weeklyMockNet: student.latestMockNet || 0,
      netTrend,
      netChange: netDiff,
      generalRankInClass: `${Math.floor(Math.random() * 5) + 1} / ${Math.max(12, safeStudents.length)} Öğrenci`,
      topStrengths,
      recommendedHomeFocus,
      counselorWeeklyMessage: defaultMsg,
      homeSupportTip: defaultHomeTip,
    };
  };

  // One-Click Generate PDF Handler
  const handleOneClickGeneratePdf = (student?: StudentRecord, scope: 'SINGLE' | 'BATCH' = 'SINGLE') => {
    haptics.success();
    setIsPdfGenerating(true);
    
    if (student) {
      setPdfTargetStudent(student);
      setPdfScope('SINGLE');
      const rep = generateParentReportData(student);
      setActiveCounselorMessage(rep.counselorWeeklyMessage);
      setActiveHomeTip(rep.homeSupportTip);
    } else {
      setPdfTargetStudent(filteredStudents[0] || safeStudents[0] || null);
      setPdfScope(scope);
      if (filteredStudents[0]) {
        const rep = generateParentReportData(filteredStudents[0]);
        setActiveCounselorMessage(rep.counselorWeeklyMessage);
        setActiveHomeTip(rep.homeSupportTip);
      }
    }
    
    setShowPdfModal(true);
    setIsPdfGenerating(false);
  };

  // Instant Direct Trigger to Print/Save PDF
  const handleDirectPrintPdf = (studentId?: string) => {
    haptics.success();
    if (studentId) {
      handleMarkAsSent(studentId);
    } else if (pdfTargetStudent) {
      handleMarkAsSent(pdfTargetStudent.id);
    }
    window.print();
  };

  // Open Preview Modal for Single Student
  const handleOpenReportModal = (student: StudentRecord) => {
    haptics.selection();
    setSelectedReportStudent(student);
    const reportData = generateParentReportData(student);
    setActiveCounselorMessage(reportData.counselorWeeklyMessage);
    setActiveHomeTip(reportData.homeSupportTip);
  };

  // Apply a Counselor Preset Template
  const handleApplyPreset = (template: typeof COUNSELOR_PRESET_TEMPLATES[0]) => {
    haptics.success();
    setActiveCounselorMessage(template.message);
    setActiveHomeTip(template.homeTip);
  };

  // Mark Report as Sent
  const handleMarkAsSent = (studentId: string) => {
    const updated = { ...sentReportsRecord, [studentId]: true };
    setSentReportsRecord(updated);
    try {
      localStorage.setItem('snaps_inst_parent_reports_sent', JSON.stringify(updated));
    } catch {}
  };

  // Generate WhatsApp Message text for the Parent
  const generateWhatsAppMessage = (student: StudentRecord, customMsg?: string, customHomeTip?: string) => {
    const report = generateParentReportData(student);
    const counselorNote = customMsg || report.counselorWeeklyMessage;
    const homeTip = customHomeTip || report.homeSupportTip;

    return `Sayın Velimiz,

🏫 *${institutionConfig.name.toUpperCase()}*
📅 *Haftalık Veli Bilgilendirme Raporu* (${selectedWeek})

👤 *Öğrenci:* ${student.name} (No: ${student.studentNumber})
🎯 *Hedef Sınav:* ${report.targetExamName} | ${report.classGroupName}

📊 *BU HAFTAKİ PERFORMANS ÖZETİ:*
• 📝 *Soru Çözümü:* ${report.weeklyQuestionsSolved} / ${report.weeklyQuestionsTarget} Soru (%${Math.round((report.weeklyQuestionsSolved / report.weeklyQuestionsTarget) * 100)})
• 📈 *Son Deneme Neti:* ${report.weeklyMockNet} Net (${report.weeklyMockTitle}) [Trend: ${report.netChange >= 0 ? '+' : ''}${report.netChange} Net]
• ⏱️ *Dershane Yoklama:* %${report.weeklyAttendancePercent} (${report.weeklyAttendanceStatus})

💡 *ÖNCELİKLİ ÇALIŞMA ODAĞI:*
${report.recommendedHomeFocus.map((f) => `• ${f}`).join('\n')}

👨‍🏫 *REHBERLİK & DANIŞMAN NOTU:*
"${counselorNote}"

🏠 *EVDE DESTEK ÖNERİSİ:*
"${homeTip}"

📞 *Dershane İletişim:* ${institutionConfig.phone || '0212 000 00 00'}
Detaylı karne ve koçluk görüşmesi için kurumumuza her zaman bekleriz.`;
  };

  // Open Direct WhatsApp
  const handleSendWhatsApp = (student: StudentRecord) => {
    haptics.success();
    handleMarkAsSent(student.id);
    const msg = generateWhatsAppMessage(student, activeCounselorMessage, activeHomeTip);
    const encoded = encodeURIComponent(msg);
    const cleanPhone = (student.phone || '').replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
    
    if (finalPhone && finalPhone.length >= 10) {
      window.open(`https://wa.me/${finalPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWhatsAppText = (student: StudentRecord) => {
    haptics.selection();
    const msg = generateWhatsAppMessage(student, activeCounselorMessage, activeHomeTip);
    navigator.clipboard.writeText(msg);
    setCopiedNotification(student.id);
    handleMarkAsSent(student.id);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Aggregated Summary Statistics
  const totalSentCount = Object.keys(sentReportsRecord).filter((id) => 
    safeStudents.some((s) => s.id === id)
  ).length;

  const averageWeeklyAttendance = safeStudents.length 
    ? Math.round(safeStudents.reduce((acc, s) => acc + (s.attendancePercent || 0), 0) / safeStudents.length)
    : 92;

  const attentionCount = safeStudents.filter((s) => s.status === 'NEEDS_ATTENTION').length;

  return (
    <div className="space-y-8" id="parent-dashboard-container">
      
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>Veli WhatsApp bilgilendirme mesajı panoya kopyalandı!</span>
        </div>
      )}

      {/* TOP HERO BANNER: PARENT DASHBOARD HUB */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-2 border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <HeartHandshake className="w-4 h-4 text-indigo-400" />
              <span>Veli İletişimi & Sadeleştirilmiş Haftalık Karneler</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ebeveyn Bilgilendirme & Haftalık Veli Karneleri
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Velilerin karmaşık istatistiklerle boğulmadan öğrencinin haftalık çalışma gayretini, deneme netini, dershane devamlılığını ve evde destek önerilerini tek bakışta görebileceği sadeleştirilmiş A4 karneler ve WhatsApp özetleri üretin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* ONE-CLICK GENERATE PDF REPORT HERO BUTTON */}
            <button
              id="one-click-generate-pdf-hero-btn"
              onClick={() => handleOneClickGeneratePdf(undefined, 'BATCH')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 border border-indigo-400/40"
            >
              <FileCheck className="w-4 h-4 text-indigo-200" />
              <span>Tek Tıkla PDF Raporu Oluştur</span>
            </button>

            <button
              id="batch-print-all-cards-btn"
              onClick={() => handleOneClickGeneratePdf(undefined, 'BATCH')}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Toplu Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY PARENT ENGAGEMENT METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Enrolled & Ready Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Hazır Veli Karneleri</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-3xs font-bold">
              Bu Hafta
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {safeStudents.length} <span className="text-xs font-normal text-slate-400">Öğrenci</span>
          </div>
          <span className="text-2xs text-slate-400 block">
            Tüm şube ve sınıflar için haftalık veri güncel
          </span>
        </div>

        {/* Metric 2: Dispatched Reports */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>İletilen / Gönderilen</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-3xs font-bold">
              WhatsApp / PDF
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {totalSentCount} / {safeStudents.length} <span className="text-xs font-normal text-slate-400">Veli</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${safeStudents.length ? Math.round((totalSentCount / safeStudents.length) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Average Attendance Discipline */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Ortalama Devamlılık</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-3xs font-bold">
              Dershane & Etüt
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            %{averageWeeklyAttendance}
          </div>
          <span className="text-2xs text-slate-400 block">
            Haftalık ders ve soru çözüm saatlerine katılım
          </span>
        </div>

        {/* Metric 4: Attention Needed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Görüşme Önerilen</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-3xs font-bold">
              Öncelikli Veli
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400">
            {attentionCount} <span className="text-xs font-normal text-slate-400">Öğrenci</span>
          </div>
          <span className="text-2xs text-slate-400 block">
            Net düşüşü veya devamsızlık uyarısı olanlar
          </span>
        </div>

      </div>

      {/* FILTER & WEEK SELECTOR BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Week Selector */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xs text-slate-400 font-bold uppercase block">Rapor Dönemi / Hafta</span>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  haptics.selection();
                  setSelectedWeek(e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="2026 - 34. Hafta (18 - 24 Ağustos)">2026 - 34. Hafta (18 - 24 Ağustos) [Güncel]</option>
                <option value="2026 - 33. Hafta (11 - 17 Ağustos)">2026 - 33. Hafta (11 - 17 Ağustos)</option>
                <option value="2026 - 32. Hafta (04 - 10 Ağustos)">2026 - 32. Hafta (04 - 10 Ağustos)</option>
                <option value="2026 - 31. Hafta (28 Temmuz - 03 Ağustos)">2026 - 31. Hafta (28 Temmuz - 03 Ağustos)</option>
              </select>
            </div>
          </div>

          {/* Search and Class Filter */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Öğrenci veya veli ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Class Group Select */}
            <select
              value={selectedClassId}
              onChange={(e) => {
                haptics.selection();
                setSelectedClassId(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tüm Sınıflar & Zümreler ({safeStudents.length})</option>
              {safeClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                  statusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setStatusFilter('HIGH')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                  statusFilter === 'HIGH' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Yüksek
              </button>
              <button
                onClick={() => setStatusFilter('NEEDS_ATTENTION')}
                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${
                  statusFilter === 'NEEDS_ATTENTION' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Destek Bekleyen
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* STUDENT CARDS TABLE / LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white">Öğrenci Haftalık Veli Karneleri</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
              {filteredStudents.length} Öğrenci Listeleniyor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">
              Tek tıkla PDF indirilebilir & WhatsApp mesajı olarak paylaşılabilir
            </span>
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-800/60">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">Arama kriterlerine uygun öğrenci bulunamadı.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClassId('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-indigo-400 hover:underline font-bold"
              >
                Filtreleri Sıfırla
              </button>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const report = generateParentReportData(student);
              const isSent = sentReportsRecord[student.id];

              return (
                <div
                  key={student.id}
                  className="p-5 sm:p-6 hover:bg-slate-800/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left: Student Basic Info */}
                  <div className="flex items-start gap-4 min-w-[240px]">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-base flex items-center justify-center flex-shrink-0 shadow-md">
                      {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{student.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-300 text-3xs font-mono font-bold">
                          #{student.studentNumber}
                        </span>
                        {isSent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-3xs font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> İletildi
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 pt-0.5">
                        {report.classGroupName} • <strong className="text-slate-300">{report.targetExamName}</strong>
                      </p>
                      <p className="text-2xs text-slate-500 pt-0.5">
                        Veli İletişim: <span className="font-mono text-slate-400">{student.phone || 'Belirtilmedi'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Middle: 3 Key Weekly Stats */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 min-w-[320px]">
                    
                    {/* Soru Çözümü */}
                    <div className="text-center">
                      <span className="text-3xs text-slate-400 font-bold block uppercase">Haftalık Soru</span>
                      <div className="text-sm font-black text-emerald-400 font-mono">
                        {report.weeklyQuestionsSolved} <span className="text-3xs text-slate-500">/ {report.weeklyQuestionsTarget}</span>
                      </div>
                      <span className="text-3xs text-slate-500">
                        %{Math.round((report.weeklyQuestionsSolved / report.weeklyQuestionsTarget) * 100)} Hedef
                      </span>
                    </div>

                    {/* Deneme Neti */}
                    <div className="text-center border-x border-slate-800/80 px-2">
                      <span className="text-3xs text-slate-400 font-bold block uppercase">Son Deneme</span>
                      <div className="text-sm font-black text-indigo-400 font-mono">
                        {report.weeklyMockNet} <span className="text-3xs text-slate-500">Net</span>
                      </div>
                      <span className={`text-3xs font-bold ${report.netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {report.netChange >= 0 ? `▲ +${report.netChange}` : `▼ ${report.netChange}`} Net
                      </span>
                    </div>

                    {/* Devamsızlık */}
                    <div className="text-center">
                      <span className="text-3xs text-slate-400 font-bold block uppercase">Yoklama</span>
                      <div className="text-sm font-black text-white font-mono">
                        %{report.weeklyAttendancePercent}
                      </div>
                      <span className={`text-3xs font-bold ${
                        report.weeklyAttendanceStatus === 'Mükemmel' ? 'text-emerald-400' : 
                        report.weeklyAttendanceStatus === 'Düzenli' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {report.weeklyAttendanceStatus}
                      </span>
                    </div>

                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    
                    {/* ONE-CLICK GENERATE PDF BUTTON PER STUDENT */}
                    <button
                      id={`generate-pdf-btn-${student.id}`}
                      onClick={() => handleOneClickGeneratePdf(student, 'SINGLE')}
                      className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                      title="Bu Öğrenci İçin Tek Tıkla PDF Raporu Oluştur"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                      <span>PDF Raporu</span>
                    </button>

                    <button
                      id={`preview-parent-card-${student.id}`}
                      onClick={() => handleOpenReportModal(student)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>İncele</span>
                    </button>

                    <button
                      id={`send-whatsapp-parent-${student.id}`}
                      onClick={() => handleSendWhatsApp(student)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                      title="Veliye Doğrudan WhatsApp Gönder"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleCopyWhatsAppText(student)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
                      title="Mesaj Metnini Kopyala"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY ONE-CLICK PDF REPORT GENERATOR & PREVIEW MODAL                    */}
      {/* ========================================================================= */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 my-auto max-h-[94vh] flex flex-col">
            
            {/* Modal Top Control Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Haftalık Veli Bilgilendirme & Akademik Gelişim PDF Raporu</span>
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    Öğrenci soru aktivitesi, deneme puanları ve haftalık rehberlik özeti derlendi
                  </p>
                </div>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                
                {/* Scope Switcher: Single vs Batch */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => {
                      haptics.selection();
                      setPdfScope('SINGLE');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      pdfScope === 'SINGLE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tek Öğrenci
                  </button>
                  <button
                    onClick={() => {
                      haptics.selection();
                      setPdfScope('BATCH');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      pdfScope === 'BATCH' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Toplu Sınıf ({filteredStudents.length})
                  </button>
                </div>

                {/* THE PRIMARY ONE-CLICK PDF PRINT / SAVE BUTTON */}
                <button
                  id="one-click-pdf-print-confirm-btn"
                  onClick={() => handleDirectPrintPdf(pdfTargetStudent?.id)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF Olarak Kaydet / Yazdır</span>
                </button>

                <button
                  onClick={() => setShowPdfModal(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm p-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scope / Student Selector Toolbar */}
            {pdfScope === 'SINGLE' && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold">Öğrenci Seç:</span>
                  <select
                    value={pdfTargetStudent?.id || ''}
                    onChange={(e) => {
                      haptics.selection();
                      const std = safeStudents.find((s) => s.id === e.target.value);
                      if (std) {
                        setPdfTargetStudent(std);
                        const rep = generateParentReportData(std);
                        setActiveCounselorMessage(rep.counselorWeeklyMessage);
                        setActiveHomeTip(rep.homeSupportTip);
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    {filteredStudents.map((std) => (
                      <option key={std.id} value={std.id}>
                        {std.name} (#{std.studentNumber}) - {std.targetExam}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preset Guidance Bar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-2xs text-slate-400 font-medium">Şablon Not:</span>
                  {COUNSELOR_PRESET_TEMPLATES.slice(0, 2).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyPreset(tpl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-2xs font-semibold transition-colors"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Document Scrollable Preview Viewport */}
            <div className="flex-1 overflow-y-auto pr-1 bg-slate-950/60 p-3 sm:p-5 rounded-2xl border border-slate-800 space-y-6">
              
              {pdfScope === 'SINGLE' && pdfTargetStudent && (
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden print-page-break">
                  <PrintableParentReport
                    institutionConfig={institutionConfig}
                    student={pdfTargetStudent}
                    classGroup={safeClasses.find((c) => c.id === pdfTargetStudent.classGroupId)}
                    academicWeek={selectedWeek}
                    counselorMessage={activeCounselorMessage}
                    homeSupportTip={activeHomeTip}
                  />
                </div>
              )}

              {pdfScope === 'BATCH' && (
                <div className="space-y-6">
                  {filteredStudents.map((std, idx) => (
                    <div key={std.id} className="bg-white rounded-xl shadow-2xl overflow-hidden print-page-break">
                      <PrintableParentReport
                        institutionConfig={institutionConfig}
                        student={std}
                        classGroup={safeClasses.find((c) => c.id === std.classGroupId)}
                        academicWeek={selectedWeek}
                        reportNumber={`RPR-${std.studentNumber}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                      />
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Bottom Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                {pdfTargetStudent && (
                  <>
                    <button
                      onClick={() => handleCopyWhatsAppText(pdfTargetStudent)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>WhatsApp Metnini Kopyala</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(pdfTargetStudent)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Veliye WhatsApp Gönder</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Kapat
                </button>
                <button
                  onClick={() => handleDirectPrintPdf(pdfTargetStudent?.id)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Tek Tıkla PDF Yazdır / İndir</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SINGLE STUDENT DETAILED KARNE INSPECTOR & EDIT MODAL              */}
      {/* ========================================================================= */}
      {selectedReportStudent && !showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Controls Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Haftalık Sadeleştirilmiş Veli Karnesi
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    {selectedReportStudent.name} • {selectedWeek}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOneClickGeneratePdf(selectedReportStudent, 'SINGLE')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Tek Tıkla PDF İndir</span>
                </button>
                <button
                  onClick={() => setSelectedReportStudent(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* QUICK PRESET TEMPLATES SELECTOR FOR COUNSELORS */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Rehber Öğretmen Hazır Veli Mesaj Şablonları:</span>
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {COUNSELOR_PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyPreset(tpl)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all hover:border-indigo-500"
                  >
                    <span>{tpl.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRINTABLE REPORT CARD SHEET */}
            <div 
              id="printable-parent-card-sheet" 
              className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <PrintableParentReport
                institutionConfig={institutionConfig}
                student={selectedReportStudent}
                classGroup={safeClasses.find((c) => c.id === selectedReportStudent.classGroupId)}
                academicWeek={selectedWeek}
                counselorMessage={activeCounselorMessage}
                homeSupportTip={activeHomeTip}
              />
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyWhatsAppText(selectedReportStudent)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>WhatsApp Metnini Kopyala</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSendWhatsApp(selectedReportStudent)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Veliye WhatsApp ile Gönder</span>
                </button>

                <button
                  onClick={() => handleOneClickGeneratePdf(selectedReportStudent, 'SINGLE')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF Raporunu Yazdır</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN PRINT-ONLY WRAPPER FOR INSTANT CLEAN VECTOR PDF EXPORT             */}
      {/* ========================================================================= */}
      <div className="hidden print:block print-only-wrapper">
        {pdfScope === 'SINGLE' && (pdfTargetStudent || selectedReportStudent) ? (
          <PrintableParentReport
            institutionConfig={institutionConfig}
            student={pdfTargetStudent || selectedReportStudent!}
            classGroup={safeClasses.find((c) => c.id === (pdfTargetStudent || selectedReportStudent)!.classGroupId)}
            academicWeek={selectedWeek}
            counselorMessage={activeCounselorMessage}
            homeSupportTip={activeHomeTip}
          />
        ) : (
          filteredStudents.map((std) => (
            <div key={std.id} className="print-page-break">
              <PrintableParentReport
                institutionConfig={institutionConfig}
                student={std}
                classGroup={safeClasses.find((c) => c.id === std.classGroupId)}
                academicWeek={selectedWeek}
              />
            </div>
          ))
        )}
      </div>

    </div>
  );
};
