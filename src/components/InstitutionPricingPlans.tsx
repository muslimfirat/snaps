import React, { useState } from 'react';
import { 
  Building2, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Download, 
  Printer, 
  MessageCircle, 
  HelpCircle, 
  Users, 
  TrendingUp, 
  Award, 
  Calendar, 
  ChevronRight, 
  Calculator, 
  FileText,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { InstitutionConfig, InstitutionPlanItem, StudentRecord } from '../types';
import { 
  INSTITUTION_TIERED_PLANS, 
  ANNUAL_ENTERPRISE_INSTITUTION_PLAN, 
  INDIVIDUAL_STUDENT_PRICING 
} from '../data/institutionData';
import { haptics } from '../lib/haptics';

interface InstitutionPricingPlansProps {
  institutionConfig: InstitutionConfig;
  studentsCount: number;
  onUpdateConfig: (config: InstitutionConfig) => void;
}

export const InstitutionPricingPlans: React.FC<InstitutionPricingPlansProps> = ({
  institutionConfig,
  studentsCount = 0,
  onUpdateConfig,
}) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(
    institutionConfig.planBillingCycle || 'ANNUAL'
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    institutionConfig.activePlanId || 'plan-annual-enterprise'
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [simulatedStudents, setSimulatedStudents] = useState<number>(
    Math.max(15, studentsCount || 30)
  );

  // Active Plan Details
  const isCurrentEnterprise = selectedPlanId === ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id;
  const currentTieredPlan = INSTITUTION_TIERED_PLANS.find((p) => p.id === selectedPlanId);
  const currentQuota = isCurrentEnterprise
    ? 100
    : currentTieredPlan?.studentQuota || 50;

  // Simulator Calculations
  const individualMonthlyTotal = simulatedStudents * INDIVIDUAL_STUDENT_PRICING.monthlyPrice;
  const individualAnnualTotal = individualMonthlyTotal * 12;

  // Tiered match for simulated student count
  const matchedTier = INSTITUTION_TIERED_PLANS.find((t) => t.studentQuota >= simulatedStudents) ||
    INSTITUTION_TIERED_PLANS[INSTITUTION_TIERED_PLANS.length - 1];
  
  const tieredAnnualTotal = billingCycle === 'ANNUAL'
    ? matchedTier.annualPricePerMonth * 12
    : matchedTier.monthlyPrice * 12;

  const enterpriseAnnualTotal = ANNUAL_ENTERPRISE_INSTITUTION_PLAN.annualPrice;
  const enterpriseSavingsVsIndividual = Math.max(0, individualAnnualTotal - enterpriseAnnualTotal);

  const handleSelectPlan = (planId: string, quota: number) => {
    haptics.success();
    setSelectedPlanId(planId);
    onUpdateConfig({
      ...institutionConfig,
      activePlanId: planId,
      studentQuota: quota,
      planBillingCycle: billingCycle,
    });
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 4000);
  };

  const handleOpenWhatsAppSales = () => {
    haptics.selection();
    const msg = encodeURIComponent(
      `Merhaba, ${institutionConfig.name} (${institutionConfig.branch}) adına Kurumsal Dershane Lisans Paketi hakkında detaylı bilgi ve faturalandırma için görüşmek istiyorum.`
    );
    window.open(`https://wa.me/905420000000?text=${msg}`, '_blank');
  };

  const handlePrintProposal = () => {
    haptics.selection();
    window.print();
  };

  return (
    <div className="space-y-10">
      
      {/* Toast Notification */}
      {showSuccessNotification && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-emerald-300 text-xs shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">Kurum lisans ve kontenjan paketiniz başarıyla güncellendi!</span>
          </div>
          <button onClick={() => setShowSuccessNotification(false)} className="p-1 hover:text-emerald-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STRATEGIC EXPLANATION & ARCHITECTURE BANNER (Where is pricing shown?) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Dershane & Bireysel Ücretlendirme Mimarisi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Fiyatlandırma Nerede & Nasıl Konumlandırılmalıdır?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Öğrencilerin ve kurum yöneticilerinin kullanıcı deneyimini korumak için iki ayrı seviyeli model uygulanır:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>1. Öğrenci Ekranı (Bireysel 250 ₺ / Ay)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Öğrenci yalnızca kendi bireysel <strong className="text-slate-200">250 TL/aylık</strong> PRO üyeliğini veya <strong className="text-slate-200">"Dershane Tarafından Karşılanıyor"</strong> lisans durumunu görür. Karmaşık 20.000 TL kurumsal rakamlar öğrenciye gösterilmez.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>2. Dershane Portalı (Yıllık 20.000 ₺ & Kademeli Kotasyon)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Yalnızca kurum yetkilileri bu sekmede <strong className="text-slate-200">Yıllık 20.000 TL</strong> kurumsal paketi, 5-50 arası kademeli kotaları ve öğrenci başına 250 TL'lik birim maliyetleri yönetir.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-shrink-0">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Kurumsal Proforma Teklif Gör</span>
            </button>
            <button
              onClick={handleOpenWhatsAppSales}
              className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Kurumsal Danışman</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE SUBSCRIPTION STATUS BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-white">
                {institutionConfig.name} Lisans Durumu
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                Aktif Lisans
              </span>
            </div>
            <p className="text-xs text-slate-400 pt-0.5">
              Paket: <strong className="text-amber-400 font-bold">{isCurrentEnterprise ? ANNUAL_ENTERPRISE_INSTITUTION_PLAN.name : `${currentQuota} Öğrenci Takip Paketi`}</strong> ({institutionConfig.planBillingCycle === 'ANNUAL' ? 'Yıllık Faturalandırma' : 'Aylık'})
            </p>
          </div>
        </div>

        {/* Quota Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="space-y-1.5 min-w-[200px]">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Kontenjan Kullanımı:</span>
              <span className="text-white font-bold">{studentsCount} / {currentQuota} Öğrenci</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  studentsCount / currentQuota > 0.85 
                    ? 'bg-rose-500' 
                    : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((studentsCount / currentQuota) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block text-right">
              {Math.max(0, currentQuota - studentsCount)} boş kontenjan mevcut
            </span>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[11px] text-slate-500 block">Yenileme Tarihi</span>
            <span className="text-xs font-bold text-slate-200">
              {institutionConfig.planExpiryDate || '01.09.2027'}
            </span>
          </div>
        </div>
      </div>

      {/* BILLING CYCLE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Kurumsal & Butik Paket Seçenekleri
          </h3>
          <p className="text-xs text-slate-400">
            Dershanenizin öğrenci kapasitesine göre en uygun lisans modelini belirleyin
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => {
              haptics.selection();
              setBillingCycle('MONTHLY');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Aylık Ödeme
          </button>
          <button
            onClick={() => {
              haptics.selection();
              setBillingCycle('ANNUAL');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'ANNUAL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Yıllık Ödeme</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[10px] font-black text-slate-950">
              %20 İndirim
            </span>
          </button>
        </div>
      </div>

      {/* 1. HERO CARD: YILLIK KURUMSAL DERSHANE PAKETİ (20.000 TL / YIL) */}
      <div className={`relative overflow-hidden rounded-3xl border-2 transition-all p-7 sm:p-9 shadow-2xl ${
        selectedPlanId === ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id
          ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-amber-500/60 ring-2 ring-amber-500/20'
          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-500/40 hover:border-indigo-500'
      }`}>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{ANNUAL_ENTERPRISE_INSTITUTION_PLAN.badge}</span>
          </div>

          <span className="px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            100+ Öğrenci & Tüm Şubeler
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left info */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {ANNUAL_ENTERPRISE_INSTITUTION_PLAN.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {ANNUAL_ENTERPRISE_INSTITUTION_PLAN.description}
            </p>

            {/* Feature Checkmarks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {ANNUAL_ENTERPRISE_INSTITUTION_PLAN.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Price & CTA Box */}
          <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5 text-center sm:text-left">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                Kurumsal Lisans Bedeli
              </span>
              <div className="flex items-baseline justify-center sm:justify-start gap-2 pt-1">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                  20.000 TL
                </span>
                <span className="text-xs font-bold text-slate-400">/ Yıllık</span>
              </div>
              <span className="text-[11px] text-indigo-300 font-medium block pt-1">
                (Aylık ~1.666 TL eşdeğeri • Sınırsız öğretmen & optik form okuyucu)
              </span>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleSelectPlan(ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id, 100)}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
                  selectedPlanId === ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {selectedPlanId === ANNUAL_ENTERPRISE_INSTITUTION_PLAN.id ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Şu Anda Aktif Paketi Kullanıyorsunuz</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Yıllık 20.000 TL Kurumsal Paketi Seç</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Resmi Proforma Fatura İndir</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. TIERED STUDENT CAPACITY PLANS (Exact match from images: 5 - 50 Students) */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Kademeli Öğrenci Takip Paketleri
            </h3>
            <p className="text-xs text-slate-400">
              Butik sınıflar ve özel çalışma grupları için öğrenci kotasına göre aylık/yıllık paketler
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400 hidden sm:block">
            10 Farklı Kapasite Seçeneği
          </span>
        </div>

        {/* Grid of 10 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INSTITUTION_TIERED_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const price = billingCycle === 'ANNUAL' ? plan.annualPricePerMonth : plan.monthlyPrice;
            const formattedPrice = price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between gap-6 transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/20'
                    : 'bg-[#12141a] border border-[#232733] hover:border-slate-700 hover:bg-[#161922]'
                }`}
              >
                {/* Popular Pill */}
                {plan.isPopular && (
                  <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                    Popüler
                  </div>
                )}

                {/* Card Title & Price */}
                <div className="space-y-4 text-center">
                  <h4 className="text-lg font-black text-white">
                    {plan.studentQuota} Öğrenci
                  </h4>

                  <div className="space-y-1">
                    <div className="text-3xl font-black text-emerald-400 tracking-tight">
                      {formattedPrice} <span className="text-xs text-slate-400 font-bold">TL</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">/ aylık</span>
                    {billingCycle === 'ANNUAL' && (
                      <span className="block text-[10px] text-indigo-300 font-medium">
                        (Yıllık peşin faturalandırılır)
                      </span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-left border-t border-slate-800/80 pt-4">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Select Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id, plan.studentQuota)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-black shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isSelected ? '✓ Seçili Paket' : `${plan.studentQuota} Öğrenciyi Seç`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. INTERACTIVE SIMULATOR & SAVINGS CALCULATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Akıllı Fiyatlandırma & Tasarruf Hesaplayıcı
              </h3>
              <p className="text-xs text-slate-400">
                Öğrenci sayınızı girin, kurumunuz için en karlı paketi ve yıllık tasarrufunuzu görün
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400">Öğrenci Sayınız:</span>
            <span className="text-base font-black text-white">{simulatedStudents} Öğrenci</span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="5"
            max="150"
            step="5"
            value={simulatedStudents}
            onChange={(e) => setSimulatedStudents(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
            <span>5 Öğrenci</span>
            <span>25 Öğrenci</span>
            <span>50 Öğrenci</span>
            <span>100 Öğrenci</span>
            <span>150+ Öğrenci</span>
          </div>
        </div>

        {/* Comparison Result Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Option 1: Individual Student Model (250 TL/mo) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">
              Bireysel Öğrenci Modeli (250 TL/ay)
            </span>
            <div className="text-xl font-black text-slate-300">
              {individualAnnualTotal.toLocaleString('tr-TR')} TL <span className="text-xs font-normal text-slate-500">/ yıl</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {simulatedStudents} öğrenci × 250 TL × 12 ay
            </p>
          </div>

          {/* Option 2: Tiered Quota Package */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">
              Kademeli Paket ({matchedTier.studentQuota} Kontenjan)
            </span>
            <div className="text-xl font-black text-slate-200">
              {Math.round(tieredAnnualTotal).toLocaleString('tr-TR')} TL <span className="text-xs font-normal text-slate-500">/ yıl</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Aylık {matchedTier.monthlyPrice} TL baz alınarak
            </p>
          </div>

          {/* Option 3: Yıllık Kurumsal 20.000 TL (Best) */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-black">
                Yıllık Kurumsal Dershane
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">
                En Karlı
              </span>
            </div>
            <div className="text-xl font-black text-emerald-400">
              20.000 TL <span className="text-xs font-normal text-slate-400">/ yıl</span>
            </div>
            <div className="text-[11px] text-emerald-300 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Yılda {enterpriseSavingsVsIndividual.toLocaleString('tr-TR')} TL Tasarruf!</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PROFORMA PROPOSAL / INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kurumsal Lisans Proforma Teklif Mektubu
                  </h3>
                  <p className="text-xs text-slate-400">Teklif No: PRO-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs text-slate-300">
              
              {/* Top Details */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-black text-white">{institutionConfig.name}</h4>
                  <p className="text-slate-400">{institutionConfig.branch}</p>
                  <p className="text-slate-400">Yetkili: {institutionConfig.directorName}</p>
                  <p className="text-slate-400">Tel: {institutionConfig.phone}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-400">SNAPS AI KURUMSAL YAZILIM</span>
                  <p className="text-slate-400">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
                  <p className="text-slate-400">Geçerlilik: 30 Gün</p>
                </div>
              </div>

              {/* Package Table */}
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Paket & Hizmet Tanımı</th>
                    <th className="py-2 text-center">Süre</th>
                    <th className="py-2 text-right">Tutar (KDV Dahil)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  <tr>
                    <td className="py-3">
                      <strong className="text-white block font-bold">Yıllık Kurumsal Dershane Lisans Paketi</strong>
                      <span className="text-[11px] text-slate-400">100+ Öğrenci, Sınırsız Öğretmen, AI Optik Okuma, WhatsApp Karne</span>
                    </td>
                    <td className="py-3 text-center">12 Ay (1 Yıl)</td>
                    <td className="py-3 text-right font-black text-emerald-400 text-sm">20.000,00 TL</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Summary */}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm font-black">
                <span className="text-white">TOPLAM ÖDENECEK TUTAR:</span>
                <span className="text-emerald-400 text-base">20.000,00 TL</span>
              </div>

              {/* Notes */}
              <div className="bg-slate-900/60 p-3 rounded-xl text-[11px] text-slate-400 space-y-1">
                <p>• Kurumunuz adına e-Fatura / Kurumsal Fatura düzenlenecektir.</p>
                <p>• Bireysel öğrenciler için sistem kullanım bedeli standart 250 TL/ay olarak tanımlıdır.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={handlePrintProposal}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Yazdır / PDF Kaydet</span>
              </button>

              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  handleOpenWhatsAppSales();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Teklifi Onayla & İletişime Geç</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
