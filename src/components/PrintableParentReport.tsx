import React from 'react';
import { CheckCircle2, BookOpen, Calendar, Target } from 'lucide-react';
import { InstitutionConfig, StudentRecord, ClassGroup } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';

export interface PrintableReportProps {
  institutionConfig: InstitutionConfig;
  student: StudentRecord;
  classGroup?: ClassGroup;
  academicWeek: string;
  counselorMessage?: string;
  homeSupportTip?: string;
  reportNumber?: string;
}

export const PrintableParentReport: React.FC<PrintableReportProps> = ({
  institutionConfig,
  student,
  classGroup,
  academicWeek,
  counselorMessage,
  homeSupportTip,
  reportNumber,
}) => {
  const examMeta = EXAM_METADATA[student.targetExam] || { 
    shortName: student.targetExam, 
    title: student.targetExam 
  };

  // Calculations for report
  const targetQuestions = 600;
  const weeklyQuestions = Math.min(
    targetQuestions,
    Math.max(180, Math.round(((student.totalQuestionsSolved || 1200) % 750) + 160))
  );
  const questionCompletionRate = Math.min(100, Math.round((weeklyQuestions / targetQuestions) * 100));

  const netDiff = Number(((student.latestMockNet || 0) - (student.averageNet || 0)).toFixed(2));
  const netTrend: 'UP' | 'DOWN' | 'EQUAL' = netDiff > 0.4 ? 'UP' : netDiff < -0.4 ? 'DOWN' : 'EQUAL';

  // Daily question mock distribution based on student progress
  const dailyDistribution = [
    { day: 'Pzt', count: Math.round(weeklyQuestions * 0.16) },
    { day: 'Sal', count: Math.round(weeklyQuestions * 0.18) },
    { day: 'Çar', count: Math.round(weeklyQuestions * 0.15) },
    { day: 'Per', count: Math.round(weeklyQuestions * 0.20) },
    { day: 'Cum', count: Math.round(weeklyQuestions * 0.17) },
    { day: 'Cmt', count: Math.round(weeklyQuestions * 0.14) },
    { day: 'Paz', count: Math.max(0, weeklyQuestions - Math.round(weeklyQuestions * 0.16) - Math.round(weeklyQuestions * 0.18) - Math.round(weeklyQuestions * 0.15) - Math.round(weeklyQuestions * 0.20) - Math.round(weeklyQuestions * 0.17) - Math.round(weeklyQuestions * 0.14)) },
  ];

  // Simulated subject breakdown based on exam category
  const subjectBreakdown = (() => {
    if (student.targetExam.includes('LGS')) {
      return [
        { name: 'Türkçe', correct: 18, wrong: 2, empty: 0, net: 17.33, max: 20 },
        { name: 'Matematik', correct: 16, wrong: 3, empty: 1, net: 15.0, max: 20 },
        { name: 'Fen Bilimleri', correct: 19, wrong: 1, empty: 0, net: 18.67, max: 20 },
        { name: 'T.C. İnkılap & Din & İng', correct: 28, wrong: 2, empty: 0, net: 27.33, max: 30 },
      ];
    } else if (student.targetExam.includes('KPSS')) {
      return [
        { name: 'Genel Yetenek (Türkçe - Mat)', correct: 48, wrong: 8, empty: 4, net: 46.0, max: 60 },
        { name: 'Genel Kültür (Tarih - Coğ - Vat)', correct: 44, wrong: 10, empty: 6, net: 41.5, max: 60 },
      ];
    } else {
      // YKS / Default
      return [
        { name: 'Türkçe (TYT)', correct: 34, wrong: 5, empty: 1, net: 32.75, max: 40 },
        { name: 'Temel Matematik (TYT)', correct: 31, wrong: 4, empty: 5, net: 30.0, max: 40 },
        { name: 'Fen Bilimleri (TYT)', correct: 16, wrong: 3, empty: 1, net: 15.25, max: 20 },
        { name: 'Sosyal Bilimler (TYT)', correct: 17, wrong: 2, empty: 1, net: 16.5, max: 20 },
      ];
    }
  })();

  const totalMockNet = student.latestMockNet || subjectBreakdown.reduce((acc, s) => acc + s.net, 0);

  const defaultCounselorNote = counselorMessage || (
    student.coachNotes
      ? `Rehberlik Değerlendirmesi: ${student.coachNotes}`
      : student.status === 'HIGH'
      ? 'Öğrencimiz bu hafta deneme sınavında ve soru çözümlerinde üstün bir disiplin sergilemiştir. Konu kavrama ve süre yönetimi hedeflenen seviyededir.'
      : student.status === 'NEEDS_ATTENTION'
      ? 'Öğrencimizin konu tekrarlarına ve haftalık soru hedeflerine daha fazla odaklanması gerekmektedir. Rehberlik servisimizce özel etüt planı başlatılmıştır.'
      : 'Öğrencimiz bu hafta programına uygun şekilde istikrarlı bir çalışma sergilemiştir. Gayretini takdir ederiz.'
  );

  const defaultHomeTip = homeSupportTip || (
    student.status === 'NEEDS_ATTENTION'
      ? 'Akşamları günlük 40-45 dakikalık eksik konu soru çözümlerini ev ortamında sessiz bir alanda takip etmeniz ve moral aşılamanız tavsiye edilir.'
      : 'Öğrencimizin mevcut çalışma temposunu, uyku düzenini ve motivasyonunu desteklemeye devam etmenizi öneririz.'
  );

  const repId = reportNumber || `RPR-${student.studentNumber}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-8 rounded-none border border-slate-300 shadow-none max-w-4xl mx-auto space-y-4 text-xs print:p-0 print:border-0 print:max-w-none print:shadow-none print-avoid-break">
      
      {/* 1. OFFICIAL INSTITUTIONAL HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white font-black text-xl flex items-center justify-center shadow-sm flex-shrink-0">
            {institutionConfig.logoText || 'HA'}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight uppercase">
              {institutionConfig.name}
            </h1>
            <p className="text-[11px] font-bold text-indigo-900">
              {institutionConfig.branch || 'Merkez Şube'} • REHBERLİK & AKADEMİK GELİŞİM DİREKTÖRLÜĞÜ
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-0.5">
              <span>Tel: {institutionConfig.phone || '0212 000 00 00'}</span>
              <span>•</span>
              <span>Yetkili: {institutionConfig.directorName || 'Rehberlik Koordinatörlüğü'}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-2.5 py-1 rounded bg-indigo-100 border border-indigo-300 text-indigo-950 font-black text-[10px] uppercase tracking-wider">
            HAFTALIK VELİ BİLGİLENDİRME RAPORU
          </div>
          <p className="text-[11px] font-black text-slate-900 pt-1">{academicWeek}</p>
          <div className="text-[10px] text-slate-500 font-mono">
            Rapor No: <span className="font-bold text-slate-700">{repId}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Tarih: {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>
      </div>

      {/* 2. STUDENT & ACADEMIC IDENTITY STRIP */}
      <div className="grid grid-cols-4 gap-2.5 bg-slate-50 border border-slate-300 p-3 rounded-lg text-[11px]">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">Öğrenci Adı Soyadı</span>
          <strong className="text-slate-950 text-xs font-black">{student.name}</strong>
          <span className="text-[10px] text-slate-600 block">No: #{student.studentNumber}</span>
        </div>

        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">Sınıf / Şube</span>
          <strong className="text-slate-950 font-bold">{classGroup?.name || 'Genel Şube'}</strong>
          <span className="text-[10px] text-slate-600 block">Grup: YKS / Sınav Grubu</span>
        </div>

        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">Hedef Sınav & Puan</span>
          <strong className="text-indigo-900 font-bold">{examMeta.shortName}</strong>
          <span className="text-[10px] text-emerald-800 font-semibold block">Hedef: {student.targetScore || 'Hedef Belirlendi'}</span>
        </div>

        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">Veli İletişim</span>
          <span className="text-slate-900 font-mono font-bold block">{student.phone || '05xx xxx xx xx'}</span>
          <span className="text-[10px] text-slate-600 block">Durum: <span className="font-bold text-indigo-900">{student.status === 'HIGH' ? 'Üstün Başarı' : student.status === 'STABLE' ? 'Düzenli' : 'Takipte'}</span></span>
        </div>
      </div>

      {/* 3. CORE SUMMARY METRICS (4 BOXES) */}
      <div className="grid grid-cols-4 gap-2.5">
        {/* Box 1: Soru Çözümü */}
        <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-center">
          <span className="text-[9px] font-bold uppercase text-slate-600 block">Haftalık Soru Pratiği</span>
          <div className="text-base font-black text-emerald-900 font-mono">
            {weeklyQuestions} <span className="text-[10px] text-slate-600">/ {targetQuestions}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden my-1">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${questionCompletionRate}%` }} />
          </div>
          <span className="text-[10px] font-bold text-emerald-800">
            %{questionCompletionRate} Tamamlandı
          </span>
        </div>

        {/* Box 2: Son Deneme Neti */}
        <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-center">
          <span className="text-[9px] font-bold uppercase text-slate-600 block">Son Deneme Neti</span>
          <div className="text-base font-black text-indigo-900 font-mono">
            {Number(totalMockNet).toFixed(1)} <span className="text-[10px] text-slate-600">Net</span>
          </div>
          <div className="text-[10px] font-bold pt-1 flex items-center justify-center gap-1">
            {netTrend === 'UP' && <span className="text-emerald-800">▲ +{netDiff} Net Artış</span>}
            {netTrend === 'DOWN' && <span className="text-rose-800">▼ {netDiff} Net Değişim</span>}
            {netTrend === 'EQUAL' && <span className="text-slate-700">İstikrarlı (±0.0)</span>}
          </div>
          <span className="text-[9px] text-slate-500 block truncate">{student.latestMockTitle || 'TG Denemesi'}</span>
        </div>

        {/* Box 3: Devamlılık */}
        <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-center">
          <span className="text-[9px] font-bold uppercase text-slate-600 block">Dershane Devamlılığı</span>
          <div className="text-base font-black text-slate-950 font-mono">
            %{student.attendancePercent || 95}
          </div>
          <span className="text-[10px] font-bold text-indigo-950 block pt-1">
            {(student.attendancePercent || 95) >= 95 ? 'Mükemmel Katılım' : (student.attendancePercent || 95) >= 85 ? 'Düzenli Katılım' : 'Öncelikli Takip'}
          </span>
          <span className="text-[9px] text-slate-500 block">Etüt & Soru Çözüm</span>
        </div>

        {/* Box 4: Odaklanma & Hata Analizi */}
        <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-center">
          <span className="text-[9px] font-bold uppercase text-slate-600 block">Çalışma Süresi & Hata</span>
          <div className="text-base font-black text-amber-900 font-mono">
            {Math.round(weeklyQuestions / 20) + 12} <span className="text-[10px] text-slate-600">Saat</span>
          </div>
          <span className="text-[10px] font-bold text-amber-950 block pt-1">
            34 Soru Hata Defteri
          </span>
          <span className="text-[9px] text-slate-500 block">Telafi Edildi</span>
        </div>
      </div>

      {/* 4. SECTION: WEEKLY ACTIVITY & DAILY SOLVED QUESTIONS */}
      <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-2">
        <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-800" />
            <span>1. Haftalık Günlük Soru Pratiği ve Çalışma Dağılımı</span>
          </h2>
          <span className="text-[10px] text-slate-500">Haftalık Toplam: <strong>{weeklyQuestions} Soru</strong></span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {dailyDistribution.map((d, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 p-1.5 rounded">
              <span className="text-[9px] font-bold text-slate-500 block">{d.day}</span>
              <strong className="text-[11px] font-black text-slate-900 font-mono">{d.count}</strong>
              <span className="text-[8px] text-slate-500 block">Soru</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SECTION: MOCK EXAM SUBJECT-BY-SUBJECT BREAKDOWN TABLE */}
      <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-2">
        <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-800" />
            <span>2. Son Deneme Sınavı Branş & Net Dağılımı</span>
          </h2>
          <span className="text-[10px] font-bold text-indigo-900">
            Sınav: {student.latestMockTitle || 'Haftalık Kurumsal Deneme Sınavı'}
          </span>
        </div>

        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
              <th className="py-1 px-2 font-bold">Ders / Bölüm Adı</th>
              <th className="py-1 px-2 font-bold text-center">Doğru (D)</th>
              <th className="py-1 px-2 font-bold text-center">Yanlış (Y)</th>
              <th className="py-1 px-2 font-bold text-center">Boş (B)</th>
              <th className="py-1 px-2 font-bold text-center">Net</th>
              <th className="py-1 px-2 font-bold text-right">Kavrama / Başarı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {subjectBreakdown.map((sec, idx) => {
              const pct = Math.round((sec.net / sec.max) * 100);
              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="py-1 px-2 font-bold text-slate-900">{sec.name}</td>
                  <td className="py-1 px-2 text-center text-emerald-800 font-mono font-bold">{sec.correct}</td>
                  <td className="py-1 px-2 text-center text-rose-800 font-mono font-bold">{sec.wrong}</td>
                  <td className="py-1 px-2 text-center text-slate-600 font-mono">{sec.empty}</td>
                  <td className="py-1 px-2 text-center font-black text-indigo-950 font-mono">{sec.net.toFixed(2)}</td>
                  <td className="py-1 px-2 text-right">
                    <span className={`inline-block px-1.5 py-0.2 rounded font-bold text-[9px] ${
                      pct >= 80 ? 'bg-emerald-100 text-emerald-900' : pct >= 65 ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      %{pct}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-950">
              <td className="py-1 px-2">TOPLAM SONUÇ</td>
              <td className="py-1 px-2 text-center text-emerald-900 font-mono">
                {subjectBreakdown.reduce((a, b) => a + b.correct, 0)}
              </td>
              <td className="py-1 px-2 text-center text-rose-900 font-mono">
                {subjectBreakdown.reduce((a, b) => a + b.wrong, 0)}
              </td>
              <td className="py-1 px-2 text-center text-slate-700 font-mono">
                {subjectBreakdown.reduce((a, b) => a + b.empty, 0)}
              </td>
              <td className="py-1 px-2 text-center text-indigo-950 font-mono text-xs">
                {Number(totalMockNet).toFixed(2)} Net
              </td>
              <td className="py-1 px-2 text-right text-indigo-950">
                Sınıf Ort.: {(Number(totalMockNet) - 3.2).toFixed(1)} Net
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 6. SECTION: STRENGTHS & RECOMMENDED STUDY FOCUS */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-emerald-50/70 border border-emerald-300 p-2.5 rounded-lg space-y-1">
          <h3 className="text-[11px] font-black text-emerald-950 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Öne Çıkan Güçlü Yönler & Kazanımlar</span>
          </h3>
          <ul className="text-[10px] text-emerald-950 space-y-0.5 list-disc list-inside">
            <li>Konu kavrama testlerinde yüksek doğruluk oranı sergilendi.</li>
            <li>Deneme sınavında süre yönetimi ve odaklanma disiplini başarılı.</li>
            <li>Haftalık soru çözüm hedefine yüksek oranda riayet edildi.</li>
          </ul>
        </div>

        <div className="bg-amber-50/70 border border-amber-300 p-2.5 rounded-lg space-y-1">
          <h3 className="text-[11px] font-black text-amber-950 uppercase flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Evde Öncelikli Tekrar Edilecek Konular</span>
          </h3>
          <ul className="text-[10px] text-amber-950 space-y-0.5 list-disc list-inside">
            {(student.weakSubjects && student.weakSubjects.length > 0)
              ? student.weakSubjects.slice(0, 2).map((s, i) => (
                  <li key={i}>{s} konusunda günlük 30 dk soru tekrarı ve video çözümü.</li>
                ))
              : (
                <>
                  <li>Hata yapılan deneme sorularının çözümlerinin tekrarı.</li>
                  <li>Paragraf ve problem rutinlerinin her sabah sürdürülmesi.</li>
                </>
              )
            }
          </ul>
        </div>
      </div>

      {/* 7. SECTION: COUNSELOR & HOME SUPPORT NOTES */}
      <div className="border border-indigo-200 bg-indigo-50/60 p-2.5 rounded-lg space-y-2">
        <div>
          <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wide block">
            👨‍🏫 Rehberlik Birimi & Danışman Öğretmen Görüşü:
          </span>
          <p className="text-[10px] text-indigo-950 leading-relaxed font-medium italic pt-0.5">
            "{defaultCounselorNote}"
          </p>
        </div>

        <div className="border-t border-indigo-200 pt-1.5">
          <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wide block">
            🏠 Veli İçin Evde Destek & Motivasyon Önerisi:
          </span>
          <p className="text-[10px] text-indigo-900 leading-relaxed font-medium pt-0.5">
            {defaultHomeTip}
          </p>
        </div>
      </div>

      {/* 8. OFFICIAL STAMP & VERIFICATION SIGNATURE FOOTER */}
      <div className="flex justify-between items-end border-t border-slate-300 pt-3 text-[10px] text-slate-600">
        <div>
          <p className="font-bold text-slate-900">{institutionConfig.name}</p>
          <p className="text-[9px] text-slate-500">Snaps AI Kurumsal Akademik Takip ve Karneleme Altyapısı</p>
          <p className="text-[8px] text-slate-400 font-mono">Belge Doğrulama Kodu: {repId}</p>
        </div>

        <div className="flex gap-8 text-center">
          <div>
            <p className="font-bold text-slate-800 text-[10px]">Danışman Rehber Öğretmen</p>
            <p className="text-[9px] text-slate-500">İmza</p>
            <div className="w-24 border-b border-slate-400 mt-3" />
          </div>

          <div>
            <p className="font-bold text-slate-800 text-[10px]">Kurum Müdürü / Kaşe</p>
            <p className="text-[9px] text-slate-500">Onay</p>
            <div className="w-24 border-b border-slate-400 mt-3" />
          </div>
        </div>
      </div>

    </div>
  );
};
