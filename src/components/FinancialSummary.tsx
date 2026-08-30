import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Calendar, Award, ShieldCheck, Sparkles, Printer, Receipt } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { InstitutionConfig, StudentRecord } from '../types';
import { ANNUAL_ENTERPRISE_INSTITUTION_PLAN, INDIVIDUAL_STUDENT_PRICING } from '../data/institutionData';
import { haptics } from '../lib/haptics';

interface FinancialSummaryProps {
  institutionConfig: InstitutionConfig;
  students: StudentRecord[];
  onNavigateToPricing?: () => void;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  institutionConfig,
  students = [],
  onNavigateToPricing,
}) => {
  const activeStudentCount = students.length || 18;

  // State for administrator customizable scenario planning
  const [tuitionPerStudentMonth, setTuitionPerStudentMonth] = useState<number>(4500); // 4.500 TL/month average tuition
  const [tuitionMonthsPerYear] = useState<number>(10); // 10 months academic term
  const [collectionRatePercent, setCollectionRatePercent] = useState<number>(94); // 94% on-time collection
  const [simulatedStudentCount, setSimulatedStudentCount] = useState<number>(activeStudentCount);
  const [chartViewMode, setChartViewMode] = useState<'REVENUE' | 'CASHFLOW'>('REVENUE');

  // Software value calculations
  const studentMonthlySoftwarePrice = INDIVIDUAL_STUDENT_PRICING.monthlyPrice; // 250 TL
  const isEnterprisePlan = institutionConfig.activePlanId === ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id;
  const annualSoftwareLicenseCost = isEnterprisePlan 
    ? ANNUAL_ENTERPRISE_INSTITUTION_PLAN.annualPrice 
    : 12000;
  const monthlySoftwareLicenseCost = isEnterprisePlan 
    ? Math.round(annualSoftwareLicenseCost / 12) 
    : 1000;

  // Active Student Financials
  const currentMonthlyTuitionRevenue = activeStudentCount * tuitionPerStudentMonth;
  const currentAnnualTuitionRevenue = activeStudentCount * tuitionPerStudentMonth * tuitionMonthsPerYear;
  const currentNetCollectedAnnual = Math.round((currentAnnualTuitionRevenue * collectionRatePercent) / 100);

  // Student Software Value created by Institution
  const currentMonthlySoftwareValue = activeStudentCount * studentMonthlySoftwarePrice;
  const currentAnnualSoftwareValue = activeStudentCount * studentMonthlySoftwarePrice * 12;
  const currentSoftwareNetSavings = Math.max(0, currentAnnualSoftwareValue - annualSoftwareLicenseCost);
  const currentSoftwareROI = Math.round((currentAnnualSoftwareValue / annualSoftwareLicenseCost) * 100);

  // Simulated Scenario Financials
  const simMonthlyTuitionRevenue = simulatedStudentCount * tuitionPerStudentMonth;
  const simAnnualTuitionRevenue = simulatedStudentCount * tuitionPerStudentMonth * tuitionMonthsPerYear;
  const simAnnualSoftwareValue = simulatedStudentCount * studentMonthlySoftwarePrice * 12;

  // 12-Month Academic Revenue and Cashflow Projection Data
  const monthlyProjectionData = useMemo(() => {
    const months = [
      { name: 'Eylül', weight: 1.2, isTerm: true },
      { name: 'Ekim', weight: 1.0, isTerm: true },
      { name: 'Kasım', weight: 1.0, isTerm: true },
      { name: 'Aralık', weight: 1.0, isTerm: true },
      { name: 'Ocak', weight: 0.95, isTerm: true },
      { name: 'Şubat', weight: 1.1, isTerm: true },
      { name: 'Mart', weight: 1.0, isTerm: true },
      { name: 'Nisan', weight: 1.0, isTerm: true },
      { name: 'Mayıs', weight: 1.0, isTerm: true },
      { name: 'Haziran', weight: 0.85, isTerm: true },
      { name: 'Temmuz', weight: 0.4, isTerm: false }, // Summer camp / prep
      { name: 'Ağustos', weight: 0.6, isTerm: false }, // Early registration
    ];

    return months.map((m) => {
      const baseMonthly = simMonthlyTuitionRevenue * (m.isTerm ? 1 : 0.4);
      const tuitionRev = Math.round(baseMonthly * m.weight);
      const collectedRev = Math.round((tuitionRev * collectionRatePercent) / 100);
      const softwareVal = Math.round(simulatedStudentCount * studentMonthlySoftwarePrice);
      const netOperatingEstimated = Math.round(collectedRev - monthlySoftwareLicenseCost);

      return {
        month: m.name,
        tuitionRevenue: tuitionRev,
        collectedRevenue: collectedRev,
        softwareValue: softwareVal,
        netOperating: netOperatingEstimated,
      };
    });
  }, [simulatedStudentCount, tuitionPerStudentMonth, collectionRatePercent, studentMonthlySoftwarePrice, simMonthlyTuitionRevenue, monthlySoftwareLicenseCost]);

  const handlePrintFinancialReport = () => {
    haptics.selection();
    window.print();
  };

  return (
    <div className="space-y-8" id="financial-summary-dashboard-widget">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Yönetici Finansal Gelir & Projeksiyon Paneli</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {institutionConfig.name} Gelir & Katma Değer Özeti
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mevcut <strong className="text-emerald-400 font-bold">{activeStudentCount} aktif öğrenciniz</strong> üzerinden hesaplanan aylık ciro, yıllık tahsilat ve yapay zeka yazılım yatırım getirisi (ROI) projeksiyonları.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={handlePrintFinancialReport}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Raporu Yazdır / PDF</span>
            </button>
            {onNavigateToPricing && (
              <button
                onClick={() => {
                  haptics.selection();
                  onNavigateToPricing();
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Lisans Paketini İncele</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Monthly Projected Revenue (MRR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-3 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Aylık Düzenli Gelir (MRR)</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-3xs font-bold">
              {activeStudentCount} Öğrenci
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              {currentMonthlyTuitionRevenue.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-400">TL</span>
            </div>
            <span className="text-xs text-slate-400 font-medium pt-0.5 block">
              Öğrenci başı ort. {tuitionPerStudentMonth.toLocaleString('tr-TR')} TL/ay
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-2xs text-slate-400">
            <span>Net Tahsilat ({collectionRatePercent}%):</span>
            <span className="font-bold text-slate-200">
              {Math.round((currentMonthlyTuitionRevenue * collectionRatePercent) / 100).toLocaleString('tr-TR')} TL
            </span>
          </div>
        </div>

        {/* 2. Annual Projected Revenue (ARR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Yıllık Ciro Projeksiyonu</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-3xs font-bold">
              {tuitionMonthsPerYear} Aylık Sezon
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              {currentAnnualTuitionRevenue.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-400">TL</span>
            </div>
            <span className="text-xs text-indigo-300 font-medium pt-0.5 block">
              Tahsil Edilecek Net: {currentNetCollectedAnnual.toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-2xs text-slate-400">
            <span>Öğrenci Başı Yıllık Ciro:</span>
            <span className="font-bold text-slate-200">
              {(tuitionPerStudentMonth * tuitionMonthsPerYear).toLocaleString('tr-TR')} TL
            </span>
          </div>
        </div>

        {/* 3. AI Software Value Provided to Students */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-3 relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Öğrenci Yazılım Değeri</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-3xs font-bold">
              250 TL / ay
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-amber-400 tracking-tight">
              {currentAnnualSoftwareValue.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-400">TL / Yıl</span>
            </div>
            <span className="text-xs text-slate-400 font-medium pt-0.5 block">
              Aylık {currentMonthlySoftwareValue.toLocaleString('tr-TR')} TL öğrenci faydası
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-2xs text-slate-400">
            <span>Bireysel Paket Eşdeğeri:</span>
            <span className="font-bold text-slate-200">{activeStudentCount} × 250 ₺ × 12</span>
          </div>
        </div>

        {/* 4. Software Cost & ROI Gain */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-3 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Yazılım Getirisi & ROI</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-3xs font-black">
              +{currentSoftwareROI}%
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              +{currentSoftwareNetSavings.toLocaleString('tr-TR')} <span className="text-xs font-bold text-slate-400">TL</span>
            </div>
            <span className="text-xs text-slate-400 font-medium pt-0.5 block">
              Yıllık {annualSoftwareLicenseCost.toLocaleString('tr-TR')} TL lisans maliyetine karşılık
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-2xs text-slate-400">
            <span>Öğrenci Başı Yazılım Maliyeti:</span>
            <span className="font-bold text-emerald-400">
              {Math.round(annualSoftwareLicenseCost / Math.max(1, activeStudentCount))} TL / Yıl
            </span>
          </div>
        </div>

      </div>

      {/* DETAILED MONTHLY PROJECTION CHART & REVENUE BREAKDOWN */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                12 Aylık Finansal Ciro & Tahsilat Projeksiyonu
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                {simulatedStudentCount} Öğrenci
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dönemsel kayıt ağırlıkları, net tahsilat ve yazılım katma değer dağılımı
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
            <button
              onClick={() => {
                haptics.selection();
                setChartViewMode('REVENUE');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartViewMode === 'REVENUE'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ciro & Net Gelir
            </button>
            <button
              onClick={() => {
                haptics.selection();
                setChartViewMode('CASHFLOW');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartViewMode === 'CASHFLOW'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tahsilat & Katma Değer
            </button>
          </div>
        </div>

        {/* Recharts Graphical Display */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'REVENUE' ? (
              <BarChart data={monthlyProjectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3340" vertical={false} />
                <XAxis dataKey="month" stroke="#8b94a4" tick={{ fontSize: 11 }} />
                <YAxis 
                  stroke="#8b94a4" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('tr-TR')} TL`,
                    name === 'tuitionRevenue' 
                      ? 'Toplam Ciro' 
                      : name === 'collectedRevenue' 
                        ? 'Net Tahsilat' 
                        : name === 'netOperating' 
                          ? 'Net Kalan Gelir' 
                          : 'Yazılım Değeri'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  formatter={(value) => {
                    if (value === 'tuitionRevenue') return 'Brüt Kurs Ciro Projeksiyonu';
                    if (value === 'collectedRevenue') return 'Net Tahsilat (Fiili)';
                    return value;
                  }}
                />
                <Bar dataKey="tuitionRevenue" name="tuitionRevenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collectedRevenue" name="collectedRevenue" fill="#35c393" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={monthlyProjectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSoftware" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3340" vertical={false} />
                <XAxis dataKey="month" stroke="#8b94a4" tick={{ fontSize: 11 }} />
                <YAxis 
                  stroke="#8b94a4" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('tr-TR')} TL`,
                    name === 'collectedRevenue' ? 'Tahsilat Nakit Akışı' : 'Öğrenci Yazılım Değeri'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  formatter={(value) => (value === 'collectedRevenue' ? 'Tahsilat Akışı (TL)' : 'Öğrenci Yazılım Katma Değeri (TL)')}
                />
                <Area type="monotone" dataKey="collectedRevenue" stroke="#35c393" fillOpacity={1} fill="url(#colorCollected)" strokeWidth={2} />
                <Area type="monotone" dataKey="softwareValue" stroke="#dda544" fillOpacity={1} fill="url(#colorSoftware)" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* INTERACTIVE WHAT-IF SCENARIO MODELER FOR SCHOOL ADMINISTRATORS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                İnteraktif Ciro & Kontenjan Simülatörü
              </h3>
              <p className="text-xs text-slate-400">
                Öğrenci sayısı ve aylık kurs ücreti parametrelerini değiştirerek anlık finansal modelinizi oluşturun
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              haptics.selection();
              setSimulatedStudentCount(activeStudentCount);
              setTuitionPerStudentMonth(4500);
              setCollectionRatePercent(94);
            }}
            className="text-xs text-indigo-300 hover:text-white underline font-semibold self-start sm:self-auto"
          >
            Varsayılana Sıfırla
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Slider 1: Simulated Student Count */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Öğrenci Kontenjanı:</span>
              <span className="text-indigo-400 font-black text-sm">{simulatedStudentCount} Öğrenci</span>
            </div>
            <input
              type="range"
              min="5"
              max="250"
              step="5"
              value={simulatedStudentCount}
              onChange={(e) => {
                haptics.selection();
                setSimulatedStudentCount(Number(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-3xs text-slate-500">
              <span>5 Öğrenci</span>
              <span>100 Öğrenci</span>
              <span>250 Öğrenci</span>
            </div>
          </div>

          {/* Slider 2: Monthly Tuition per Student */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Aylık Kurs Ücreti:</span>
              <span className="text-emerald-400 font-black text-sm">{tuitionPerStudentMonth.toLocaleString('tr-TR')} TL</span>
            </div>
            <input
              type="range"
              min="1500"
              max="15000"
              step="250"
              value={tuitionPerStudentMonth}
              onChange={(e) => {
                haptics.selection();
                setTuitionPerStudentMonth(Number(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-3xs text-slate-500">
              <span>1.500 TL</span>
              <span>7.500 TL</span>
              <span>15.000 TL</span>
            </div>
          </div>

          {/* Slider 3: Collection Rate */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold">Tahsilat / Ödeme Oranı:</span>
              <span className="text-amber-400 font-black text-sm">%{collectionRatePercent}</span>
            </div>
            <input
              type="range"
              min="70"
              max="100"
              step="1"
              value={collectionRatePercent}
              onChange={(e) => {
                haptics.selection();
                setCollectionRatePercent(Number(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-3xs text-slate-500">
              <span>%70</span>
              <span>%85</span>
              <span>%100</span>
            </div>
          </div>

        </div>

        {/* Live Scenario Outcome Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div>
            <span className="text-2xs text-slate-400 block font-semibold">Simüle Edilen Aylık Ciro</span>
            <span className="text-xl font-black text-white">
              {simMonthlyTuitionRevenue.toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div>
            <span className="text-2xs text-slate-400 block font-semibold">Yıllık Tahsil Edilen Net</span>
            <span className="text-xl font-black text-emerald-400">
              {Math.round((simAnnualTuitionRevenue * collectionRatePercent) / 100).toLocaleString('tr-TR')} TL
            </span>
          </div>

          <div>
            <span className="text-2xs text-slate-400 block font-semibold">Yapay Zeka Değer Yaratımı</span>
            <span className="text-xl font-black text-amber-400">
              +{simAnnualSoftwareValue.toLocaleString('tr-TR')} TL / Yıl
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
